---
name: create-nestjs-endpoint
description: Crea un nuevo endpoint REST en NestJS con controlador, servicio, módulo y DTOs. Sigue las convenciones del proyecto Ecomerce.
compatibility: Codex
metadata:
  audience: backend-developers
  workflow: nestjs
  project: ecomerce
---

# Skill: Crear Endpoint NestJS

## Cuándo Usar Este Skill
Cuando necesites crear o extender un endpoint de API REST en el proyecto backend NestJS ubicado en `apps/api/src/modules/`.

## Estructura Esperada
Cada módulo sigue este patrón:
```
apps/api/src/modules/<nombre>/
├── <nombre>.module.ts       ← Módulo NestJS
├── <nombre>.controller.ts   ← Controlador (rutas HTTP)
├── <nombre>.service.ts      ← Lógica de negocio
├── <nombre>.spec.ts         ← Tests unitarios del servicio
└── dto/
    ├── create-<nombre>.dto.ts
    └── update-<nombre>.dto.ts
```

## Pasos de Implementación

### 1. Verificar Módulo Existente
```bash
ls apps/api/src/modules/<nombre>/
```
Si ya existe el módulo, solo agregar el endpoint nuevo al controlador y servicio.

### 2. Crear DTO con Validaciones
```typescript
// dto/create-<nombre>.dto.ts
import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class Create<Nombre>Dto {
  @ApiProperty({ description: 'Descripción del campo' })
  @IsString()
  @IsNotEmpty()
  campo: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  campoOpcional?: number;
}
```

### 3. Implementar el Servicio
```typescript
// <nombre>.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Create<Nombre>Dto } from './dto/create-<nombre>.dto';

@Injectable()
export class <Nombre>Service {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: Create<Nombre>Dto) {
    return this.prisma.<modelo>.create({ data: dto });
  }

  async findAll() {
    return this.prisma.<modelo>.findMany();
  }

  async findOne(id: string) {
    const item = await this.prisma.<modelo>.findUnique({ where: { id } });
    if (!item) throw new NotFoundException(`<Nombre> ${id} no encontrado`);
    return item;
  }
}
```

### 4. Crear el Controlador con Swagger
```typescript
// <nombre>.controller.ts
import { Controller, Get, Post, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { <Nombre>Service } from './<nombre>.service';
import { Create<Nombre>Dto } from './dto/create-<nombre>.dto';

@ApiTags('<nombre>')
@ApiBearerAuth()
@Controller('<nombre>')
export class <Nombre>Controller {
  constructor(private readonly <nombre>Service: <Nombre>Service) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear nuevo <nombre>' })
  @ApiResponse({ status: 201, description: '<Nombre> creado exitosamente' })
  create(@Body() dto: Create<Nombre>Dto) {
    return this.<nombre>Service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos los <nombre>' })
  @ApiResponse({ status: 200, description: 'Lista de <nombre>' })
  findAll() {
    return this.<nombre>Service.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener <nombre> por ID' })
  @ApiResponse({ status: 200, description: '<Nombre> encontrado' })
  @ApiResponse({ status: 404, description: '<Nombre> no encontrado' })
  findOne(@Param('id') id: string) {
    return this.<nombre>Service.findOne(id);
  }
}
```

### 5. Registrar en el Módulo
```typescript
// <nombre>.module.ts
import { Module } from '@nestjs/common';
import { <Nombre>Controller } from './<nombre>.controller';
import { <Nombre>Service } from './<nombre>.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [<Nombre>Controller],
  providers: [<Nombre>Service],
  exports: [<Nombre>Service],
})
export class <Nombre>Module {}
```

### 6. Importar en AppModule
Agregar `<Nombre>Module` al array `imports` en `apps/api/src/app.module.ts`.

### 7. Escribir Test Unitario
```typescript
// <nombre>.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { <Nombre>Service } from './<nombre>.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('<Nombre>Service', () => {
  let service: <Nombre>Service;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        <Nombre>Service,
        {
          provide: PrismaService,
          useValue: { <modelo>: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn() } },
        },
      ],
    }).compile();

    service = module.get<<Nombre>Service>(<Nombre>Service);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a <nombre>', async () => {
      const dto = { campo: 'valor' };
      const expected = { id: 'uuid', ...dto };
      prisma.<modelo>.create.mockResolvedValue(expected);

      const result = await service.create(dto);
      expect(result).toEqual(expected);
      expect(prisma.<modelo>.create).toHaveBeenCalledWith({ data: dto });
    });
  });
});
```

## Verificación Final
```bash
npm run lint          # Sin errores de lint
npm run test          # Tests pasan
npm run build         # Build exitoso
```

## Checklist
- [ ] DTO con validaciones `class-validator`
- [ ] Decorators Swagger en controlador
- [ ] Manejo de errores con excepciones HTTP correctas
- [ ] Test unitario del servicio
- [ ] Módulo registrado en AppModule
- [ ] Sin `any` TypeScript sin justificar
