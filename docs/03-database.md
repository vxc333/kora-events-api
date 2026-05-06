# Banco de Dados

Referência completa de entidades, relacionamentos e migrações.

---

## Diagrama de Relacionamentos

```
User
 └──< Event (organizer)
        └──< Ticket
        └──< Participant
        │      └── Ticket (FK)
        │      └── Coupon (FK, opcional)
        │      └──< CouponUsage
        └──< Coupon
        │      └──< CouponUsage
        └──< EventPartner
        └──< CertificateSigner
```

---

## Entidades

### `User`

Tabela: `users`

| Coluna | Tipo | Detalhes |
|---|---|---|
| `id` | `uuid` | PK, gerado automaticamente |
| `name` | `varchar` | Nome do organizador |
| `email` | `varchar` | Único |
| `password` | `varchar` | Hash bcrypt — **excluído das respostas** |
| `phone` | `varchar` | Nullable |
| `avatarUrl` | `varchar` | Nullable |
| `role` | `enum` | `ADMIN` \| `ORGANIZER` |
| `isEmailVerified` | `boolean` | Default `false` |
| `refreshToken` | `varchar` | Hash bcrypt do refresh token — **excluído** |
| `passwordResetToken` | `varchar` | Token de redefinição — **excluído** |
| `passwordResetExpires` | `timestamp` | Nullable |
| `plan` | `enum` | `FREE` \| `PRO` \| `ENTERPRISE` |
| `createdAt` | `timestamp` | Gerado automaticamente |
| `updatedAt` | `timestamp` | Atualizado automaticamente |

---

### `Event`

Tabela: `events`

| Coluna | Tipo | Detalhes |
|---|---|---|
| `id` | `uuid` | PK |
| `slug` | `varchar` | Único, gerado a partir do título |
| `title` | `varchar` | |
| `description` | `text` | Nullable |
| `bannerUrl` | `varchar` | Nullable |
| `logoUrl` | `varchar` | Nullable |
| `startDate` | `date` | |
| `endDate` | `date` | |
| `startTime` | `varchar` | Ex: `"19:00"` |
| `endTime` | `varchar` | Ex: `"22:00"` |
| `location` | `varchar` | Nullable |
| `onlineLink` | `varchar` | Nullable |
| `isOnline` | `boolean` | Default `false` |
| `minimumAttendancePercentage` | `int` | Nullable (para certificado) |
| `workloadHours` | `int` | Nullable (carga horária) |
| `status` | `enum` | `DRAFT` \| `PUBLISHED` \| `ONGOING` \| `FINISHED` \| `CANCELLED` |
| `isPublic` | `boolean` | Default `true` |
| `requiresApproval` | `boolean` | Default `false` |
| `maxParticipants` | `int` | Nullable |
| `hasPaidTickets` | `boolean` | Default `false` |
| `primaryColor` | `varchar` | Nullable (cor da página pública) |
| `certificateTemplate` | `enum` | `DEFAULT` \| `LANDSCAPE` \| `MINIMALIST` |
| `certificateBodyText` | `text` | Texto do certificado com variáveis |
| `pageBlocks` | `jsonb` | Blocos do page builder |
| `pageSettings` | `jsonb` | Configurações visuais da página |
| `organizerId` | `uuid` | FK → `users.id` |
| `createdAt` | `timestamp` | |
| `updatedAt` | `timestamp` | |

**Relações:**
- `organizer` → `User` (ManyToOne)
- `tickets` → `Ticket[]` (OneToMany)

---

### `Ticket`

Tabela: `tickets`

| Coluna | Tipo | Detalhes |
|---|---|---|
| `id` | `uuid` | PK |
| `name` | `varchar` | Ex: `"Lote 1"` |
| `description` | `varchar` | Nullable |
| `price` | `decimal(10,2)` | Default `0` |
| `currency` | `varchar` | Default `"BRL"` |
| `quantity` | `int` | Total disponível |
| `quantitySold` | `int` | Default `0` |
| `isActive` | `boolean` | Default `true` |
| `salesStartDate` | `timestamp` | Nullable |
| `salesEndDate` | `timestamp` | Nullable |
| `isHalfPrice` | `boolean` | Default `false` |
| `feePassthrough` | `boolean` | Default `false` |
| `discountCode` | `varchar` | Nullable |
| `discountPercentage` | `decimal` | Nullable |
| `eventId` | `uuid` | FK → `events.id` (cascade delete) |
| `createdAt` | `timestamp` | |
| `updatedAt` | `timestamp` | |

**Campos derivados** (retornados pelo service, não no banco):
- `isSoldOut`: `quantitySold >= quantity`
- `isOnSale`: `isActive && salesStart <= now <= salesEnd`
- `effectivePrice`: `price` com desconto aplicado

---

### `Participant`

Tabela: `participants`

| Coluna | Tipo | Detalhes |
|---|---|---|
| `id` | `uuid` | PK |
| `eventId` | `uuid` | FK → `events.id` |
| `ticketId` | `uuid` | FK → `tickets.id` |
| `couponId` | `uuid` | Nullable (sem FK forçada — armazena ID do cupom usado) |
| `name` | `varchar` | |
| `email` | `varchar` | |
| `cpf` | `varchar` | Nullable |
| `phone` | `varchar` | Nullable |
| `status` | `enum` | `PENDING` \| `CONFIRMED` \| `CANCELLED` |
| `qrToken` | `uuid` | Único, gerado na inscrição |
| `checkedInAt` | `timestamp` | Nullable |
| `certificateReleased` | `boolean` | Default `false` |
| `reminderSent24h` | `boolean` | Default `false` |
| `reminderSent1h` | `boolean` | Default `false` |
| `registeredAt` | `timestamp` | |
| `updatedAt` | `timestamp` | |

**Índice único:** `(eventId, email)` — um e-mail por evento.

**Relações:**
- `event` → `Event` (ManyToOne)
- `ticket` → `Ticket` (ManyToOne)

---

### `Coupon`

Tabela: `coupons`

| Coluna | Tipo | Detalhes |
|---|---|---|
| `id` | `uuid` | PK |
| `eventId` | `uuid` | FK → `events.id` |
| `code` | `varchar` | Código do cupom |
| `discountType` | `enum` | `PERCENTAGE` \| `FIXED` |
| `discountValue` | `decimal` | Valor/percentual do desconto |
| `maxUses` | `int` | Nullable (sem limite se null) |
| `usedCount` | `int` | Default `0` |
| `isActive` | `boolean` | Default `true` |
| `expiresAt` | `timestamp` | Nullable |
| `createdAt` | `timestamp` | |
| `updatedAt` | `timestamp` | |

**Índice único:** `(eventId, code)`

**Relações:**
- `event` → `Event`
- `usages` → `CouponUsage[]`

---

### `CouponUsage`

Tabela: `coupon_usages`

| Coluna | Tipo | Detalhes |
|---|---|---|
| `id` | `uuid` | PK |
| `couponId` | `uuid` | FK → `coupons.id` |
| `participantId` | `uuid` | FK → `participants.id` |
| `usedAt` | `timestamp` | |

---

### `EventPartner`

Tabela: `event_partners`

| Coluna | Tipo | Detalhes |
|---|---|---|
| `id` | `uuid` | PK |
| `eventId` | `uuid` | FK → `events.id` |
| `name` | `varchar` | Nome do parceiro/patrocinador |
| `logoUrl` | `varchar` | Nullable |
| `displayOrder` | `int` | Default `0` (ordenação) |
| `createdAt` | `timestamp` | |
| `updatedAt` | `timestamp` | |

---

### `CertificateSigner`

Tabela: `certificate_signers`

| Coluna | Tipo | Detalhes |
|---|---|---|
| `id` | `uuid` | PK |
| `eventId` | `uuid` | FK → `events.id` |
| `name` | `varchar` | Nome do assinante |
| `title` | `varchar` | Cargo/título |
| `signatureUrl` | `varchar` | Nullable (imagem da assinatura) |
| `displayOrder` | `int` | Default `0` |
| `createdAt` | `timestamp` | |
| `updatedAt` | `timestamp` | |

**Limite:** máximo de 5 assinantes por evento.

---

## Migrações

As migrações ficam em `src/database/migrations/` e são executadas em ordem cronológica pelo timestamp no nome do arquivo.

| Arquivo | O que cria/altera |
|---|---|
| `1714000000000-CreateUsersTable` | Tabela `users` |
| `1714100000000-CreateEventsTable` | Tabela `events` |
| `1714200000000-CreateTicketsTable` | Tabela `tickets` |
| `1714300000000-CreateEventPartnersTable` | Tabela `event_partners` |
| `1714400000000-CreateParticipantsTable` | Tabela `participants` |
| `1714500000000-CreateCouponsTable` | Tabela `coupons` |
| `1714600000000-CreateCouponUsagesTable` | Tabela `coupon_usages` |
| `1714700000000-CreateCertificateSignersTable` | Tabela `certificate_signers` |
| `1746000000000-AddCheckinFieldsToParticipants` | Colunas `qrToken`, `checkedInAt` |
| `1746100000000-AddCertificateReleasedToParticipant` | Coluna `certificateReleased` |
| `1746200000000-MakeWorkloadHoursNullable` | Torna `workloadHours` nullable |
| `1746300000000-AddPhoneToParticipants` | Coluna `phone` em participants |
| `1746400000000-AddPageBuilderToEvents` | Colunas `pageBlocks`, `pageSettings` |
| `1746500000000-AddCertificateBodyTextToEvents` | Coluna `certificateBodyText` |
| `1746600000000-AddReminderSentToParticipants` | Colunas `reminderSent24h`, `reminderSent1h` |

### Comandos de migration

```bash
# Executar todas as migrações pendentes
npm run migration:run

# Gerar migration a partir de mudanças nas entidades
npm run migration:generate src/database/migrations/NomeDaMigration

# Reverter a última migration aplicada
npm run migration:revert
```

> A configuração da CLI fica em `typeorm.config.ts` na raiz do backend.
