# Getting Started

Guia completo para configurar e rodar o backend do **Kora Events** localmente.

---

## Pré-requisitos

| Ferramenta | Versão mínima |
|---|---|
| Node.js | 20.x |
| npm | 10.x |
| PostgreSQL | 14.x |

---

## 1. Clonar e instalar

```bash
cd backend
npm install
```

---

## 2. Variáveis de ambiente

Copie o arquivo de exemplo e preencha os valores:

```bash
cp .env.example .env
```

### Referência completa do `.env`

| Variável | Descrição | Exemplo |
|---|---|---|
| `PORT` | Porta HTTP do servidor | `3333` |
| `NODE_ENV` | Ambiente (`development` / `production`) | `development` |
| `DB_HOST` | Host do PostgreSQL | `localhost` |
| `DB_PORT` | Porta do PostgreSQL | `5432` |
| `DB_USER` | Usuário do banco | `postgres` |
| `DB_PASS` | Senha do banco | `minhasenha` |
| `DB_NAME` | Nome do banco de dados | `kora_events` |
| `JWT_SECRET` | Chave secreta do access token (mín. 32 chars) | `chave_super_secreta_aqui` |
| `JWT_EXPIRES_IN` | Expiração do access token | `7d` |
| `JWT_REFRESH_SECRET` | Chave secreta do refresh token (mín. 32 chars) | `outra_chave_secreta_aqui` |
| `JWT_REFRESH_EXPIRES_IN` | Expiração do refresh token | `30d` |
| `FRONTEND_URL` | URL do frontend (usado no CORS) | `http://localhost:5173` |
| `STORAGE_PATH` | Diretório de upload de arquivos | `./uploads` |
| `SMTP_HOST` | Host do servidor de e-mail | `smtp.gmail.com` |
| `SMTP_PORT` | Porta SMTP | `587` |
| `SMTP_USER` | Usuário SMTP | `seu@email.com` |
| `SMTP_PASS` | Senha SMTP / App Password | `senha_app_gmail` |
| `SMTP_FROM` | Nome/e-mail remetente | `"Kora Events <noreply@koraevents.com>"` |
| `APP_URL` | URL pública da API (usada em links de e-mail) | `http://localhost:3333` |

> **Segurança:** Nunca commite o `.env`. Ele está no `.gitignore`.

---

## 3. Criar o banco de dados

```sql
-- No psql ou em qualquer cliente PostgreSQL:
CREATE DATABASE kora_events;
```

---

## 4. Rodar as migrações

```bash
npm run migration:run
```

Isso cria todas as tabelas necessárias na sequência correta. Ver [03-database.md](03-database.md) para detalhes de cada migration.

---

## 5. Iniciar o servidor

```bash
# Desenvolvimento com hot-reload
npm run start:dev

# Produção
npm run build
npm run start:prod
```

O servidor estará disponível em:
- **API:** `http://localhost:3333/api/v1`
- **Swagger:** `http://localhost:3333/api/docs`
- **Uploads estáticos:** `http://localhost:3333/uploads/<arquivo>`

---

## 6. Verificar que está funcionando

```bash
curl http://localhost:3333/api/v1
# retorna: "Hello World!"
```

---

## Comandos úteis de desenvolvimento

```bash
# Testes unitários
npm run test

# Testes com cobertura de código
npm run test:cov

# Linting e formatação
npm run lint

# Gerar nova migration após alterar uma entidade
npm run migration:generate src/database/migrations/NomeDaMigration

# Reverter última migration
npm run migration:revert
```

---

## Estrutura de pastas raiz

```
backend/
├── src/                   # Código-fonte principal
│   ├── auth/              # Autenticação e autorização
│   ├── users/             # Perfil e conta do organizador
│   ├── events/            # CRUD de eventos
│   ├── tickets/           # Ingressos dos eventos
│   ├── participants/      # Inscrições e participantes
│   ├── checkin/           # Check-in por QR Code, CPF ou nome
│   ├── coupons/           # Cupons de desconto
│   ├── certificates/      # Geração de certificados PDF
│   ├── certificate-signers/ # Assinantes dos certificados
│   ├── event-partners/    # Patrocinadores/parceiros do evento
│   ├── payments/          # Módulo de pagamentos (placeholder)
│   ├── reports/           # Relatórios de presença e financeiro
│   ├── mail/              # Serviço de e-mail e agendamentos
│   ├── common/            # Filtros, validators e utilitários globais
│   ├── database/          # Migrations TypeORM
│   ├── app.module.ts      # Módulo raiz da aplicação
│   └── main.ts            # Bootstrap do servidor
├── uploads/               # Arquivos enviados (banners, logos, assinaturas)
├── dist/                  # Build compilado (gerado pelo build)
├── test/                  # Testes e2e
├── typeorm.config.ts      # Configuração TypeORM para CLI de migrations
├── .env.example           # Modelo de variáveis de ambiente
└── nest-cli.json          # Configuração do NestJS CLI
```
