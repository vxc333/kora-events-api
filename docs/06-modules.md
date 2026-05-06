# Módulos — Lógica de Negócio

Detalhamento das regras de negócio e decisões de implementação de cada módulo.

---

## Auth

**Arquivo principal:** `src/auth/auth.service.ts`

### Registro
- Cria o usuário via `UsersService.create()`.
- Imediatamente faz login e retorna os tokens — sem etapa de confirmação de e-mail obrigatória (campo `isEmailVerified` existe mas não bloqueia o acesso).

### Login
- Usa Passport `LocalStrategy` que chama `validateUser(email, password)`.
- `validateUser` busca o usuário, faz `bcrypt.compare` e retorna o objeto `User` (sem campos sensíveis) ou `null`.
- Ao logar, gera access + refresh token e salva **hash bcrypt** do refresh token no banco — nunca o token em si.

### Refresh
- O refresh token recebido é comparado com o hash no banco via `bcrypt.compare`.
- Se válido, um **novo par** de tokens é gerado e o hash no banco é atualizado.
- Isso implementa **refresh token rotation** — cada refresh invalida o anterior.

### Redefinição de senha
- O token de reset é um UUID gerado aleatoriamente.
- É enviado via e-mail e salvo **hasheado** no banco junto com um prazo de 1 hora.
- Na redefinição, o token recebido é hasheado e comparado com o do banco.

---

## Users

**Arquivo principal:** `src/users/users.service.ts`

- `create()` garante unicidade por e-mail com exceção `ConflictException`.
- `changePassword()` valida a senha atual antes de trocar — não usa o fluxo de reset.
- `updateAvatar()` recebe a URL já processada pelo controller (Multer salva o arquivo antes).
- O campo `password` é decorado com `@Exclude()` — nunca aparece nas respostas.

---

## Events

**Arquivo principal:** `src/events/events.service.ts`

### Limite do plano FREE
```typescript
// Em EventsService.create()
if (organizer.plan === UserPlan.FREE) {
  const activeCount = await countActiveEvents(organizerId);
  if (activeCount >= 5) throw new ForbiddenException('Limite de eventos atingido');
}
```

### Geração de slug
- Gerado a partir do título: lowercase, sem acentos, espaços viram `-`.
- Em caso de colisão, um sufixo numérico é adicionado: `meu-evento-2`.

### Status e transições
```
DRAFT → PUBLISHED (via /publish)
PUBLISHED → FINISHED (via /finish)
PUBLISHED → CANCELLED (via DELETE)
ONGOING → FINISHED
```
- Cancelamento é **soft**: muda o status para `CANCELLED`, não remove do banco.

### Rota pública
- `GET /events/public/:slug` retorna os dados do evento + ingressos disponíveis + parceiros + assinantes.
- Usado pela página de inscrição do frontend.

### Stats (em desenvolvimento)
- `getStats()` atualmente retorna zeros — implementação futura.

---

## Tickets

**Arquivo principal:** `src/tickets/tickets.service.ts`

### Ingressos pagos
- Ao criar um ingresso com `price > 0`, o serviço retorna **501 Not Implemented**.
- O gateway de pagamento (módulo `payments`) ainda não está integrado.

### `findAvailable(eventId)`
Retorna os ingressos com campos derivados calculados em memória:
```typescript
{
  ...ticket,
  isSoldOut: ticket.quantitySold >= ticket.quantity,
  isOnSale: ticket.isActive && now >= salesStart && now <= salesEnd,
  effectivePrice: calcularPrecoComDesconto(ticket),
}
```

### Remoção
- Um ingresso só pode ser removido se `quantitySold === 0`.
- Isso protege a integridade dos dados de participantes já inscritos.

---

## Participants

**Arquivo principal:** `src/participants/participants.service.ts`

### Fluxo de inscrição (`register`)
1. Valida se o evento existe e está publicado.
2. Verifica duplicata por `(eventId, email)` — cada e-mail só se inscreve uma vez.
3. Verifica disponibilidade do ingresso (`isSoldOut`).
4. Valida e aplica cupom (se informado):
   - Verifica `isActive`, `expiresAt`, `usedCount < maxUses`.
   - Cria `CouponUsage` e incrementa `coupon.usedCount`.
5. Decrementa `ticket.quantitySold`.
6. Gera `qrToken` (UUID único) para check-in e certificado.
7. Cria o `Participant` com status inicial `CONFIRMED`.
8. Envia e-mail de confirmação com o QR Code.

### Cancelamento de inscrição
- Muda status para `CANCELLED`.
- **Restaura** `ticket.quantitySold` (devolve a vaga).
- Envia e-mail de cancelamento.
- Não remove do banco — mantém histórico.

### Liberação de certificado
- Ao atualizar um participante com `certificateReleased: true`, o serviço dispara automaticamente `MailService.sendCertificateReleased()`.

### Exportação CSV
- Endpoint `GET /participants/export` só pode ser acessado pelo organizador do evento.
- Retorna campos: `nome, email, cpf, telefone, ingresso, status, checkin_em, registrado_em`.

### Importação CSV
- Endpoint `POST /participants/csv` aceita arquivo CSV.
- Processa linha por linha, tolerante a falhas individuais.
- Retorna lista de sucessos e lista de falhas com motivo.

---

## Checkin

**Arquivo principal:** `src/checkin/checkin.service.ts`

### Por QR Code (`/checkin/:token`)
- Rota pública — usada pelo leitor de QR Code do organizador.
- Busca participante pelo `qrToken`.
- Se `checkedInAt` já preenchido → retorna `409 Conflict`.
- Caso contrário, define `checkedInAt = now()`.

### Por CPF (`/checkin/by-cpf`)
- Rota autenticada — o operador deve ser dono do evento.
- Normaliza o CPF (remove pontuação) antes de buscar.

### Por nome (`/checkin/by-name`)
- Se mais de um participante tem o mesmo nome no evento → retorna `409 Conflict` com a lista de candidatos.
- O operador deve usar outro método (CPF ou QR) para resolver a ambiguidade.

---

## Coupons

**Arquivo principal:** `src/coupons/coupons.service.ts`

### Validação (`validate`)
O endpoint público de validação verifica:
1. O cupom existe e pertence ao evento.
2. `isActive === true`.
3. `expiresAt` não ultrapassado (ou null).
4. `usedCount < maxUses` (ou `maxUses === null`).

Retorna os dados do desconto para o frontend calcular o preço.

### Desativação
- `DELETE /coupons/:id` **não remove** — apenas seta `isActive = false`.
- Isso preserva o histórico de uso do cupom.

---

## Certificates

**Arquivo principal:** `src/certificates/certificates.service.ts`

### Geração de PDF
- Usa **Puppeteer** para renderizar HTML em PDF.
- O HTML do certificado é gerado dinamicamente com dados do evento e participante.
- Imagens (logo do evento, assinaturas) são lidas do sistema de arquivos (`uploads/`).

### Templates disponíveis
| Template | Layout |
|---|---|
| `DEFAULT` | Vertical, padrão |
| `LANDSCAPE` | Horizontal |
| `MINIMALIST` | Visual limpo, minimalista |

### Variáveis do texto do certificado
Configuradas pelo organizador em `event.certificateBodyText`. Ex:
```
Certificamos que {{nome}} participou de {{evento}} em {{data}}, com carga horária de {{carga_horaria}}.
```

### Regras de acesso por QR Token (rota pública)
```
certificateReleased = true → PDF disponível imediatamente
certificateReleased = false → evento precisa estar FINISHED E participante ter check-in
```

---

## Certificate Signers

- Limite **rígido de 5 assinantes por evento** — validado no `create()`.
- A assinatura é uma imagem enviada via upload e referenciada por URL.
- `displayOrder` controla a ordem de exibição no certificado.

---

## Event Partners

- Parceiros/patrocinadores exibidos na página pública do evento.
- `displayOrder` controla a ordem de exibição.
- Logo enviada via upload.

---

## Mail

**Arquivo principal:** `src/mail/mail.service.ts`

Usa **Nodemailer** com configuração SMTP do `.env`.

### E-mails disparados

| Evento | Método | Quando |
|---|---|---|
| Redefinição de senha | `sendPasswordReset` | `POST /auth/forgot-password` |
| Confirmação de inscrição | `sendRegistrationConfirmation` | Após `participants.register()` |
| Lembrete 24h antes | `sendEventReminder(participant, event, 24)` | Cron job |
| Lembrete 1h antes | `sendEventReminder(participant, event, 1)` | Cron job |
| Certificado disponível | `sendCertificateReleased` | Ao setar `certificateReleased = true` |
| Cancelamento | `sendCancellation` | Ao cancelar inscrição |

### Agendador de lembretes

`MailSchedulerService` usa `@Cron(CronExpression.EVERY_30_MINUTES)`:

```
A cada 30 minutos:
1. Busca eventos PUBLISHED ou ONGOING com startDate/startTime próximos
2. Para cada evento:
   a. Busca participantes com reminderSent24h = false E evento em ~24h
      → envia lembrete, marca reminderSent24h = true
   b. Busca participantes com reminderSent1h = false E evento em ~1h
      → envia lembrete, marca reminderSent1h = true
```

---

## Reports

**Arquivo principal:** `src/reports/reports.service.ts`

### Lista de Presença (PDF)
- Gerado com **pdfmake**.
- Inclui: nome do evento, data, tabela com nome/e-mail/status/check-in de cada participante.
- Apenas o organizador do evento pode gerar.

### Resumo Financeiro
- Agrega dados de todos os eventos do organizador.
- Calcula receita bruta (soma de vendas), taxa da plataforma e valor de repasse.
- Retornado como JSON (rota `GET /financeiro`).

---

## Common

### `HttpExceptionFilter`

Intercepta todas as exceções `HttpException` e retorna:
```json
{
  "statusCode": 400,
  "message": "Mensagem de erro",
  "timestamp": "2025-05-06T13:00:00.000Z",
  "path": "/api/v1/rota"
}
```

### `@IsCpf()` validator

Decorator de validação de CPF com verificação dos dígitos verificadores (algoritmo completo).

```typescript
// Uso em DTOs
@IsCpf()
cpf: string;
```

Aceita CPF com ou sem pontuação (`123.456.789-09` ou `12345678909`).
