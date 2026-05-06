# Autenticação

Fluxo completo de autenticação: registro, login, tokens JWT, refresh, e redefinição de senha.

---

## Visão Geral

O sistema usa **dois tokens JWT**:

| Token | Expiração padrão | Armazenado no banco |
|---|---|---|
| **Access Token** | `7d` (`JWT_EXPIRES_IN`) | Não |
| **Refresh Token** | `30d` (`JWT_REFRESH_EXPIRES_IN`) | Sim (hash bcrypt em `users.refreshToken`) |

O payload do JWT contém:
```json
{
  "sub": "<userId>",
  "email": "usuario@email.com"
}
```

---

## Fluxo de Registro

```
POST /api/v1/auth/register
Body: { name, email, password }

1. UsersService.create() → verifica e-mail único
2. Hash bcrypt da senha
3. Salva o User no banco
4. Chama AuthService.login() → retorna tokens
```

**Resposta:**
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ..."
}
```

---

## Fluxo de Login

```
POST /api/v1/auth/login
Body: { email, password }

1. LocalAuthGuard → LocalStrategy
2. LocalStrategy.validate() → AuthService.validateUser()
   - Busca User pelo e-mail
   - bcrypt.compare(senha, hash) → retorna User ou null
3. Se válido → AuthService.login()
   - Gera access token e refresh token
   - Salva hash bcrypt do refresh token em users.refreshToken
4. Retorna { accessToken, refreshToken }
```

---

## Fluxo de Refresh

```
POST /api/v1/auth/refresh
Body: { refreshToken }

1. Verifica assinatura JWT com JWT_REFRESH_SECRET
2. Extrai userId do payload
3. Busca User no banco
4. bcrypt.compare(refreshToken recebido, users.refreshToken)
5. Se válido → gera novo par de tokens
6. Salva novo hash no banco
7. Retorna { accessToken, refreshToken }
```

---

## Rotas Protegidas (JwtAuthGuard)

Toda rota protegida exige o header:

```
Authorization: Bearer <accessToken>
```

O `JwtAuthGuard` usa a `JwtStrategy`:
1. Extrai o token do header.
2. Verifica assinatura com `JWT_SECRET`.
3. Verifica expiração.
4. Injeta `{ userId, email }` em `req.user`.

Para acessar o usuário autenticado no controller:

```typescript
@Get('profile')
@UseGuards(JwtAuthGuard)
getProfile(@CurrentUser() user: JwtPayload) {
  return user; // { userId, email }
}
```

---

## Fluxo de Redefinição de Senha

```
1. POST /api/v1/auth/forgot-password
   Body: { email }
   - Gera token aleatório
   - Hash bcrypt → salva em users.passwordResetToken
   - Define users.passwordResetExpires (1 hora)
   - Envia e-mail com link: APP_URL/reset-password?token=<token>

2. POST /api/v1/auth/reset-password
   Body: { token, newPassword }
   - Hash bcrypt do token recebido
   - Busca User onde passwordResetToken = hash E passwordResetExpires > now
   - Hash bcrypt da nova senha
   - Atualiza senha, limpa token e expires
```

---

## Rota `/auth/me`

```
GET /api/v1/auth/me
Headers: Authorization: Bearer <accessToken>

Retorna o User completo do banco (sem campos excluídos: password, refreshToken, passwordResetToken)
```

---

## Arquivos do módulo

| Arquivo | Responsabilidade |
|---|---|
| `auth.module.ts` | Configura PassportModule, JwtModule (com segredos do .env) |
| `auth.controller.ts` | Define os endpoints de auth |
| `auth.service.ts` | Lógica de registro, login, refresh e reset de senha |
| `strategies/local.strategy.ts` | Valida email + senha no login |
| `strategies/jwt.strategy.ts` | Valida access token e injeta user |
| `guards/local-auth.guard.ts` | Aplica LocalStrategy |
| `guards/jwt-auth.guard.ts` | Aplica JwtStrategy |
| `decorators/current-user.decorator.ts` | Extrai `req.user` no controller |
| `interfaces/jwt-payload.interface.ts` | Interface `{ userId, email }` |
| `dto/login.dto.ts` | `{ email, password }` |
| `dto/register.dto.ts` | `{ name, email, password }` |
| `dto/refresh-token.dto.ts` | `{ refreshToken }` |
| `dto/forgot-password.dto.ts` | `{ email }` |
| `dto/reset-password.dto.ts` | `{ token, newPassword }` |

---

## Segurança

- Senhas: nunca armazenadas em texto puro — sempre hash bcrypt.
- Refresh tokens: nunca armazenados em texto puro — sempre hash bcrypt.
- Tokens de reset de senha: expiram em 1 hora.
- Campos sensíveis (`password`, `refreshToken`, `passwordResetToken`) têm `@Exclude()` e são omitidos de todas as respostas por padrão pelo `ClassSerializerInterceptor`.
- CORS restrito à `FRONTEND_URL` definida no `.env`.
