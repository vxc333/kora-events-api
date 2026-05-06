# Arquitetura

Visão geral da stack tecnológica, estrutura de módulos e como uma requisição flui pela aplicação.

---

## Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| Framework | NestJS 11 (Node.js + TypeScript) |
| ORM | TypeORM 0.3 |
| Banco de dados | PostgreSQL 14+ |
| Autenticação | Passport.js + JWT (access + refresh tokens) |
| Validação | class-validator + class-transformer |
| Upload de arquivos | Multer (via `@nestjs/platform-express`) |
| E-mail | Nodemailer |
| Agendamentos | `@nestjs/schedule` (cron jobs) |
| Geração de PDF | Puppeteer (certificados) + pdfmake (relatórios) |
| Documentação | Swagger (`@nestjs/swagger`) |
| Hashing | bcryptjs |

---

## Configuração Global (main.ts)

Ao iniciar, a aplicação configura:

| Configuração | Valor |
|---|---|
| Prefixo global das rotas | `/api/v1` |
| CORS | Origem permitida via `FRONTEND_URL` |
| Arquivos estáticos | `/uploads` → pasta `./uploads/` |
| ValidationPipe | `whitelist: true`, `transform: true`, `forbidNonWhitelisted: true` |
| ClassSerializerInterceptor | Aplica `@Exclude()` globalmente nas entidades |
| HttpExceptionFilter | Normaliza todos os erros HTTP |
| Swagger | Disponível em `/api/docs` |

---

## Mapa de Módulos

```
AppModule
├── ConfigModule (global)
├── TypeOrmModule (async, global)
├── MailModule
├── AuthModule
│   └── UsersModule
├── UsersModule
├── EventsModule
├── TicketsModule
├── ParticipantsModule
│   ├── TicketsModule
│   ├── CouponsModule
│   └── MailModule
├── CheckinModule
│   └── ParticipantsModule
├── CertificatesModule
│   ├── ParticipantsModule
│   └── EventsModule
├── CouponsModule
├── EventPartnersModule
├── ReportsModule
├── CertificateSignersModule
└── PaymentsModule (placeholder)
```

---

## Ciclo de uma Requisição HTTP

```
Cliente HTTP
    │
    ▼
[NestJS Router]
    │
    ▼
[Guards] ─── JwtAuthGuard ou LocalAuthGuard
    │           └─ Valida JWT → injeta req.user
    │
    ▼
[Pipes] ─── ValidationPipe (global)
    │          └─ Valida e transforma o DTO automaticamente
    │
    ▼
[Controller] ─── Extrai parâmetros, chama o Service
    │
    ▼
[Service] ─── Lógica de negócio, acesso ao banco via Repository
    │
    ▼
[TypeORM Repository] ─── Queries ao PostgreSQL
    │
    ▼
[ClassSerializerInterceptor] ─── Remove campos com @Exclude()
    │
    ▼
Resposta JSON ao cliente
```

Em caso de erro em qualquer etapa, o `HttpExceptionFilter` intercepta e formata:

```json
{
  "statusCode": 404,
  "message": "Evento não encontrado",
  "timestamp": "2025-05-06T13:00:00.000Z",
  "path": "/api/v1/events/abc-123"
}
```

---

## Estrutura de um Módulo (padrão NestJS)

Cada funcionalidade segue a mesma estrutura:

```
src/<modulo>/
├── <modulo>.module.ts          # Declara imports, providers, controllers, exports
├── <modulo>.controller.ts      # Rotas HTTP, decorators, guards
├── <modulo>.service.ts         # Lógica de negócio
├── <entidade>.entity.ts        # Definição da tabela TypeORM
├── dto/
│   ├── create-<entidade>.dto.ts
│   └── update-<entidade>.dto.ts
└── (opcional)
    ├── guards/
    ├── strategies/
    └── decorators/
```

---

## Autenticação e Autorização

- **Rotas públicas:** sem guard, qualquer cliente acessa.
- **Rotas protegidas:** decoradas com `@UseGuards(JwtAuthGuard)`.
- O `JwtAuthGuard` valida o `Authorization: Bearer <token>` e injeta o payload no `req.user`.
- O decorator `@CurrentUser()` extrai o usuário autenticado dentro do controller.
- Ver [04-auth.md](04-auth.md) para o fluxo completo.

---

## Upload de Arquivos

Uploads são salvos localmente na pasta `uploads/` e servidos como estáticos em `/uploads/<arquivo>`.

Estratégia de nomeamento: `<timestamp>-<uuid>.<extensão>` para evitar colisões.

Campos afetados:
| Campo | Endpoint |
|---|---|
| `avatarUrl` (User) | `POST /users/avatar` |
| `bannerUrl` (Event) | `POST /events/:id/banner` |
| `logoUrl` (Event) | `POST /events/:id/logo` |
| `logoUrl` (EventPartner) | `POST /events/:eventId/partners/:id/logo` |
| `signatureUrl` (CertificateSigner) | `POST /events/:eventId/signers/:id/signature` |

---

## E-mail e Agendamentos

O `MailModule` utiliza Nodemailer e é importado globalmente.

O `MailSchedulerService` roda um **cron job a cada 30 minutos** que:
1. Busca eventos `PUBLISHED` ou `ONGOING` com data/hora próxima.
2. Envia lembrete de 24h para participantes com `reminderSent24h = false`.
3. Envia lembrete de 1h para participantes com `reminderSent1h = false`.
4. Marca as flags para não reenviar.

---

## Planos de Usuário

A entidade `User` possui um campo `plan` com as opções:

| Plano | Limite |
|---|---|
| `FREE` | Máximo de 5 eventos ativos simultaneamente |
| `PRO` | Sem limite documentado |
| `ENTERPRISE` | Sem limite documentado |

A validação é feita no `EventsService.create()`.
