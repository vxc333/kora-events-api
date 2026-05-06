# Kora Events — Backend

API REST do sistema **Kora Events**, plataforma de gerenciamento de eventos com suporte a inscrições, ingressos, check-in por QR Code, emissão de certificados e relatórios.

Construída com **NestJS** + **TypeORM** + **PostgreSQL**.

---

## Documentação

| Arquivo | Conteúdo |
|---|---|
| [docs/01-getting-started.md](docs/01-getting-started.md) | Setup local, variáveis de ambiente, comandos |
| [docs/02-architecture.md](docs/02-architecture.md) | Stack, estrutura de pastas, ciclo de requisição |
| [docs/03-database.md](docs/03-database.md) | Entidades, relações, migrações |
| [docs/04-auth.md](docs/04-auth.md) | Fluxo de autenticação, JWT, refresh tokens |
| [docs/05-api-reference.md](docs/05-api-reference.md) | Referência completa de todos os endpoints |
| [docs/06-modules.md](docs/06-modules.md) | Lógica de negócio módulo a módulo |
| [docs/07-conventions.md](docs/07-conventions.md) | Padrões de código, DTOs, guards, decorators |

---

## Quick Start

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env
# edite o .env com suas credenciais locais

# 3. Subir o banco de dados (PostgreSQL)
# Crie o banco: kora_events

# 4. Rodar as migrações
npm run migration:run

# 5. Iniciar o servidor em modo desenvolvimento
npm run start:dev
```

O servidor sobe em `http://localhost:3333`.  
Swagger disponível em `http://localhost:3333/api/docs`.

---

## Scripts disponíveis

| Comando | Descrição |
|---|---|
| `npm run start:dev` | Servidor com hot-reload |
| `npm run start:prod` | Servidor em produção (via `dist/`) |
| `npm run build` | Compila TypeScript para `dist/` |
| `npm run test` | Testes unitários |
| `npm run test:cov` | Testes com cobertura |
| `npm run lint` | Linting com ESLint + Prettier |
| `npm run migration:generate` | Gera nova migration a partir das entidades |
| `npm run migration:run` | Executa migrations pendentes |
| `npm run migration:revert` | Reverte a última migration |
