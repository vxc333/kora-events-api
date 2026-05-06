# Convenções e Padrões de Código

Guia de padrões adotados no projeto para manter consistência ao contribuir.

---

## Estrutura de um Módulo

Todo módulo segue a mesma estrutura:

```
src/<modulo>/
├── <modulo>.module.ts
├── <modulo>.controller.ts
├── <modulo>.service.ts
├── <entidade>.entity.ts        # nem todo módulo tem entidade (ex: checkin)
└── dto/
    ├── create-<entidade>.dto.ts
    └── update-<entidade>.dto.ts
```

Módulos com necessidades especiais incluem subpastas:
```
src/auth/
├── guards/
│   ├── jwt-auth.guard.ts
│   └── local-auth.guard.ts
├── strategies/
│   ├── jwt.strategy.ts
│   └── local.strategy.ts
├── decorators/
│   └── current-user.decorator.ts
└── interfaces/
    └── jwt-payload.interface.ts
```

---

## DTOs (Data Transfer Objects)

Toda entrada de dados da API é validada por DTOs com `class-validator`.

### Padrões
- Nomeação: `CreateEventDto`, `UpdateParticipantDto`, `RegisterParticipantDto`
- Use `@IsOptional()` para campos opcionais (não use `?` sozinho)
- Use `@Type(() => Number)` para campos numéricos recebidos via query string
- Prefira `@IsUUID()` para IDs, `@IsEmail()` para e-mails, `@IsEnum()` para enums

### Exemplo de DTO
```typescript
import { IsString, IsEmail, IsOptional, IsUUID } from 'class-validator';

export class CreateParticipantDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  cpf?: string;

  @IsUUID()
  ticketId: string;

  @IsOptional()
  @IsString()
  couponCode?: string;
}
```

### ValidationPipe (global)
Configurado em `main.ts` com:
- `whitelist: true` — remove campos não declarados no DTO automaticamente
- `forbidNonWhitelisted: true` — retorna erro se campos extras forem enviados
- `transform: true` — converte tipos automaticamente (string → number, string → Date)

---

## Entidades (TypeORM)

### Padrões
- Use `@PrimaryGeneratedColumn('uuid')` para PKs
- Use `@CreateDateColumn()` e `@UpdateDateColumn()` para timestamps automáticos
- Use `@Column({ nullable: true })` para campos opcionais (nunca `?` sem `nullable`)
- Use `@Exclude()` do `class-transformer` para campos sensíveis (password, tokens)

### Exemplo de entidade
```typescript
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { Exclude } from 'class-transformer';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Exclude()
  @Column()
  password: string;

  @Column({ nullable: true })
  phone: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

O `ClassSerializerInterceptor` (global) aplica `@Exclude()` automaticamente em todas as respostas.

---

## Controllers

### Padrões
- Use `@ApiTags()` para documentar no Swagger
- Use `@UseGuards(JwtAuthGuard)` para proteger rotas
- Use `@CurrentUser()` para acessar o usuário autenticado
- Não coloque lógica de negócio no controller — apenas extração de parâmetros e chamada do service

### Exemplo de controller
```typescript
@ApiTags('events')
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @Body() createEventDto: CreateEventDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.eventsService.create(createEventDto, user.userId);
  }

  @Get('public/:slug')
  findBySlug(@Param('slug') slug: string) {
    return this.eventsService.findBySlug(slug);
  }
}
```

---

## Services

### Padrões
- Injete o `Repository` via `@InjectRepository(Entity)`
- Prefira `findOneOrFail` → lance `NotFoundException` explícita quando o recurso não existir
- Sempre verifique propriedade do recurso antes de mutações (`organizerId === user.userId`)
- Lance `ForbiddenException` para problemas de autorização, `ConflictException` para duplicatas

### Exemplo de verificação de propriedade
```typescript
async update(id: string, userId: string, dto: UpdateEventDto) {
  const event = await this.eventsRepository.findOne({ where: { id } });
  if (!event) throw new NotFoundException('Evento não encontrado');
  if (event.organizerId !== userId) throw new ForbiddenException('Sem permissão');

  Object.assign(event, dto);
  return this.eventsRepository.save(event);
}
```

---

## Guards e Decorators

### `JwtAuthGuard`
```typescript
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Get('profile')
getProfile() { ... }
```

### `@CurrentUser()`
```typescript
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@Get('profile')
@UseGuards(JwtAuthGuard)
getProfile(@CurrentUser() user: JwtPayload) {
  // user = { userId: string, email: string }
}
```

### `@IsCpf()` (validator customizado)
```typescript
import { IsCpf } from '../common/validators/is-cpf.validator';

export class RegisterParticipantDto {
  @IsOptional()
  @IsCpf()
  cpf?: string;
}
```

---

## Upload de Arquivos

Use `FileInterceptor` do Multer para endpoints de upload:

```typescript
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadedFile, UseInterceptors } from '@nestjs/common';

@Post(':id/banner')
@UseGuards(JwtAuthGuard)
@UseInterceptors(FileInterceptor('file'))
uploadBanner(
  @Param('id') id: string,
  @UploadedFile() file: Express.Multer.File,
  @CurrentUser() user: JwtPayload,
) {
  const fileUrl = `/uploads/${file.filename}`;
  return this.eventsService.updateBanner(id, user.userId, fileUrl);
}
```

Os arquivos são salvos em `./uploads/` e servidos em `/uploads/<filename>`.

---

## Migrações

### Quando criar uma migration
- Sempre que adicionar, remover ou alterar colunas/tabelas em entidades.
- **Nunca** use `synchronize: true` em produção — apenas em desenvolvimento local se quiser.

### Como criar
```bash
# Gera a migration automaticamente comparando entidades com o banco
npm run migration:generate src/database/migrations/NomeDaMigration

# Revise o arquivo gerado ANTES de commitar
# Execute localmente para testar
npm run migration:run
```

### Nomenclatura
- Formato: `<timestamp>-<DescricaoEmPascalCase>.ts`
- Ex: `1746600000000-AddReminderSentToParticipants.ts`
- O timestamp garante a ordem de execução.

---

## Tratamento de Erros

Use sempre as exceções do `@nestjs/common`:

| Situação | Exceção |
|---|---|
| Recurso não encontrado | `NotFoundException` |
| Sem permissão para o recurso | `ForbiddenException` |
| Dado duplicado (e-mail, slug) | `ConflictException` |
| Dados inválidos de negócio | `BadRequestException` |
| Não autenticado | `UnauthorizedException` |
| Não implementado | `NotImplementedException` (501) |

O `HttpExceptionFilter` global formata a resposta de erro automaticamente.

---

## Variáveis de Ambiente

- **Nunca** use valores hardcoded — sempre referencie via `ConfigService`.
- Adicione novos campos ao `.env.example` ao introduzir novas variáveis.
- Documente cada nova variável no [01-getting-started.md](01-getting-started.md).

```typescript
import { ConfigService } from '@nestjs/config';

constructor(private configService: ConfigService) {}

const secret = this.configService.get<string>('JWT_SECRET');
```

---

## Linting e Formatação

O projeto usa **ESLint** + **Prettier**:

```bash
# Verificar e corrigir automaticamente
npm run lint

# Formatar código
npx prettier --write "src/**/*.ts"
```

Configuração do Prettier em `.prettierrc`:
```json
{
  "singleQuote": true,
  "trailingComma": "all"
}
```

---

## Testes

Os testes unitários ficam ao lado dos arquivos (`*.spec.ts`) e os e2e em `test/`.

```bash
npm run test          # todos os testes unitários
npm run test:watch    # modo watch
npm run test:cov      # com relatório de cobertura
npm run test:e2e      # testes end-to-end
```

Padrão de teste com NestJS Testing Module:
```typescript
describe('EventsService', () => {
  let service: EventsService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        EventsService,
        { provide: getRepositoryToken(Event), useValue: mockRepository },
      ],
    }).compile();

    service = module.get<EventsService>(EventsService);
  });

  it('should create an event', async () => {
    // ...
  });
});
```
