# API Reference

Referência completa de todos os endpoints. Base URL: `/api/v1`

**Legenda:**
- 🔓 Público — sem autenticação
- 🔐 Autenticado — requer `Authorization: Bearer <accessToken>`

---

## Auth

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| POST | `/auth/register` | 🔓 | Registra novo organizador |
| POST | `/auth/login` | 🔓 | Login com e-mail e senha |
| POST | `/auth/refresh` | 🔓 | Renova tokens com refresh token |
| POST | `/auth/forgot-password` | 🔓 | Envia e-mail de redefinição de senha |
| POST | `/auth/reset-password` | 🔓 | Redefine senha com token |
| GET | `/auth/me` | 🔐 | Retorna dados do usuário autenticado |

### POST `/auth/register`
```json
// Body
{ "name": "João", "email": "joao@email.com", "password": "senha123" }

// Response 201
{ "accessToken": "eyJ...", "refreshToken": "eyJ..." }
```

### POST `/auth/login`
```json
// Body
{ "email": "joao@email.com", "password": "senha123" }

// Response 200
{ "accessToken": "eyJ...", "refreshToken": "eyJ..." }
```

### POST `/auth/refresh`
```json
// Body
{ "refreshToken": "eyJ..." }

// Response 200
{ "accessToken": "eyJ...", "refreshToken": "eyJ..." }
```

### POST `/auth/forgot-password`
```json
// Body
{ "email": "joao@email.com" }
// Response 200 — e-mail enviado silenciosamente (mesmo se e-mail não existe)
```

### POST `/auth/reset-password`
```json
// Body
{ "token": "<token-do-email>", "newPassword": "novaSenha123" }
// Response 200
```

---

## Users

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| GET | `/users/profile` | 🔐 | Perfil do usuário autenticado |
| PATCH | `/users/profile` | 🔐 | Atualiza nome e telefone |
| POST | `/users/avatar` | 🔐 | Upload de avatar (multipart/form-data) |
| PATCH | `/users/change-password` | 🔐 | Troca de senha autenticada |

### PATCH `/users/profile`
```json
// Body
{ "name": "João Silva", "phone": "11999999999" }
```

### POST `/users/avatar`
```
// Content-Type: multipart/form-data
// Campo: file (imagem)

// Response 200
{ "avatarUrl": "/uploads/1234567890-uuid.jpg" }
```

### PATCH `/users/change-password`
```json
// Body
{ "oldPassword": "senhaAtual", "newPassword": "novaSenha" }
```

---

## Events

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| GET | `/events/public/:slug` | 🔓 | Dados públicos de um evento pelo slug |
| POST | `/events` | 🔐 | Cria novo evento |
| GET | `/events/my` | 🔐 | Lista eventos do organizador |
| GET | `/events/:id` | 🔐 | Detalha um evento |
| PATCH | `/events/:id` | 🔐 | Atualiza um evento |
| DELETE | `/events/:id` | 🔐 | Cancela um evento (soft) |
| POST | `/events/:id/publish` | 🔐 | Publica um evento |
| POST | `/events/:id/finish` | 🔐 | Finaliza um evento |
| GET | `/events/:id/stats` | 🔐 | Estatísticas do evento |
| POST | `/events/:id/banner` | 🔐 | Upload do banner (multipart) |
| POST | `/events/:id/logo` | 🔐 | Upload do logo (multipart) |

### POST `/events`
```json
// Body
{
  "title": "Workshop de Node.js",
  "description": "...",
  "startDate": "2025-06-01",
  "endDate": "2025-06-01",
  "startTime": "19:00",
  "endTime": "22:00",
  "location": "São Paulo, SP",
  "isOnline": false,
  "maxParticipants": 100,
  "workloadHours": 3
}
```

### GET `/events/my` — Query params
| Param | Tipo | Descrição |
|---|---|---|
| `page` | number | Página (default: 1) |
| `limit` | number | Itens por página (default: 10) |

**Status do evento:**
- `DRAFT` → rascunho, não visível publicamente
- `PUBLISHED` → publicado, aceita inscrições
- `ONGOING` → em andamento
- `FINISHED` → encerrado
- `CANCELLED` → cancelado

---

## Tickets

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| GET | `/events/:eventId/tickets/available` | 🔓 | Ingressos disponíveis para inscrição |
| POST | `/events/:eventId/tickets` | 🔐 | Cria ingresso |
| GET | `/events/:eventId/tickets` | 🔐 | Lista ingressos do evento |
| PATCH | `/events/:eventId/tickets/:id` | 🔐 | Atualiza ingresso |
| DELETE | `/events/:eventId/tickets/:id` | 🔐 | Remove ingresso (apenas se não vendido) |

> **Atenção:** Ingressos pagos retornam `501 Not Implemented`. Apenas ingressos gratuitos são suportados no momento.

### POST `/events/:eventId/tickets`
```json
// Body
{
  "name": "Lote 1",
  "description": "Ingresso padrão",
  "quantity": 100,
  "salesStartDate": "2025-05-01T00:00:00Z",
  "salesEndDate": "2025-05-31T23:59:59Z"
}
```

---

## Participants

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| POST | `/events/:eventId/participants` | 🔓 | Inscrição no evento |
| GET | `/events/:eventId/participants` | 🔐 | Lista participantes |
| GET | `/events/:eventId/participants/export` | 🔐 | Exporta CSV de participantes |
| POST | `/events/:eventId/participants/csv` | 🔐 | Importa participantes via CSV |
| PATCH | `/events/:eventId/participants/:id` | 🔐 | Atualiza dados/status do participante |
| DELETE | `/events/:eventId/participants/:id` | 🔐 | Cancela inscrição |

### POST `/events/:eventId/participants`
```json
// Body
{
  "name": "Maria Silva",
  "email": "maria@email.com",
  "cpf": "123.456.789-09",
  "phone": "11999999999",
  "ticketId": "uuid-do-ingresso",
  "couponCode": "DESCONTO10" // opcional
}
```

Após o registro:
- Decrementa `quantitySold` do ingresso
- Registra uso do cupom (se aplicado)
- Gera `qrToken` único
- Envia e-mail de confirmação

### GET `/events/:eventId/participants` — Query params
| Param | Tipo | Descrição |
|---|---|---|
| `page` | number | Página |
| `limit` | number | Itens por página |
| `status` | string | `PENDING` \| `CONFIRMED` \| `CANCELLED` |
| `ticketId` | uuid | Filtrar por ingresso |
| `search` | string | Busca por nome ou e-mail |

### PATCH `/events/:eventId/participants/:id`
```json
// Body — campos opcionais
{
  "name": "...",
  "phone": "...",
  "status": "CONFIRMED",
  "certificateReleased": true  // dispara e-mail de certificado disponível
}
```

---

## Checkin

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| POST | `/checkin/:token` | 🔓 | Check-in por QR Code (token UUID) |
| POST | `/checkin/by-cpf` | 🔐 | Check-in por CPF |
| POST | `/checkin/by-name` | 🔐 | Check-in por nome |
| GET | `/events/:eventId/checkin/stats` | 🔐 | Estatísticas de check-in |

### POST `/checkin/:token`
```
// token = qrToken do participante (gerado na inscrição)
// Response 200: { message: "Check-in realizado com sucesso" }
// Response 409: Já realizou check-in anteriormente
```

### POST `/checkin/by-cpf`
```json
// Body
{ "cpf": "123.456.789-09", "eventId": "uuid-do-evento" }
```

### POST `/checkin/by-name`
```json
// Body
{ "name": "Maria", "eventId": "uuid-do-evento" }
// Erro 409 se múltiplos participantes encontrados com o mesmo nome
```

### GET `/events/:eventId/checkin/stats`
```json
// Response
{ "total": 100, "checkedIn": 75, "pending": 25 }
```

---

## Coupons

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| POST | `/events/:eventId/coupons/validate` | 🔓 | Valida um cupom |
| POST | `/events/:eventId/coupons` | 🔐 | Cria cupom |
| GET | `/events/:eventId/coupons` | 🔐 | Lista cupons do evento |
| PATCH | `/events/:eventId/coupons/:id` | 🔐 | Atualiza cupom |
| DELETE | `/events/:eventId/coupons/:id` | 🔐 | Desativa cupom |

### POST `/events/:eventId/coupons/validate`
```json
// Body
{ "code": "DESCONTO10" }

// Response 200
{ "valid": true, "discountType": "PERCENTAGE", "discountValue": 10 }
// Response 400: Cupom expirado, inativo ou limite atingido
```

### POST `/events/:eventId/coupons`
```json
// Body
{
  "code": "DESCONTO10",
  "discountType": "PERCENTAGE",  // ou "FIXED"
  "discountValue": 10,
  "maxUses": 50,                 // opcional
  "expiresAt": "2025-06-01T00:00:00Z"  // opcional
}
```

---

## Event Partners

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| POST | `/events/:eventId/partners` | 🔐 | Adiciona parceiro |
| GET | `/events/:eventId/partners` | 🔐 | Lista parceiros |
| PATCH | `/events/:eventId/partners/:id` | 🔐 | Atualiza parceiro |
| POST | `/events/:eventId/partners/:id/logo` | 🔐 | Upload de logo (multipart) |
| DELETE | `/events/:eventId/partners/:id` | 🔐 | Remove parceiro |

### POST `/events/:eventId/partners`
```json
// Body
{ "name": "Empresa XYZ", "displayOrder": 1 }
```

---

## Certificate Signers

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| POST | `/events/:eventId/signers` | 🔐 | Adiciona assinante |
| GET | `/events/:eventId/signers` | 🔐 | Lista assinantes |
| PATCH | `/events/:eventId/signers/:id` | 🔐 | Atualiza assinante |
| POST | `/events/:eventId/signers/:id/signature` | 🔐 | Upload de imagem de assinatura |
| DELETE | `/events/:eventId/signers/:id` | 🔐 | Remove assinante |

> Limite: máximo de **5 assinantes por evento**.

### POST `/events/:eventId/signers`
```json
// Body
{ "name": "Dr. Carlos", "title": "Coordenador", "displayOrder": 1 }
```

---

## Certificates

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| GET | `/certificates/by-token/:qrToken` | 🔓 | Gera/baixa certificado pelo QR token |
| GET | `/certificates/by-participant/:participantId` | 🔐 | Gera certificado pelo ID do participante |

### GET `/certificates/by-token/:qrToken`
Regras de disponibilidade:
- Participante deve existir com o token informado.
- Se `certificateReleased = false`: evento deve estar `FINISHED` **e** participante deve ter check-in.
- Se `certificateReleased = true`: disponível imediatamente.

**Response:** PDF binário do certificado.

**Variáveis disponíveis no `certificateBodyText`:**
| Variável | Substitui por |
|---|---|
| `{{nome}}` | Nome do participante |
| `{{evento}}` | Título do evento |
| `{{data}}` | Data de início/fim formatada |
| `{{carga_horaria}}` | `workloadHours` horas |

**Templates:**
- `DEFAULT` — padrão vertical
- `LANDSCAPE` — horizontal
- `MINIMALIST` — minimalista

---

## Reports

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| GET | `/events/:eventId/reports/attendance` | 🔐 | PDF de lista de presença |
| GET | `/financeiro` | 🔐 | Resumo financeiro do organizador |

### GET `/financeiro`
```json
// Response — por evento
[
  {
    "eventId": "...",
    "eventTitle": "...",
    "grossRevenue": 1500.00,
    "platformFee": 150.00,
    "payout": 1350.00
  }
]
```

---

## Payments

O módulo de pagamentos é um **placeholder** e não possui endpoints implementados no momento.
