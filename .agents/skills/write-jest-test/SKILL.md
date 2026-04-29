---
name: write-jest-test
description: Escribe tests unitarios y de integración con Jest para el proyecto Ecomerce. Cubre NestJS services, controllers y funciones utilitarias.
compatibility: Codex
metadata:
  audience: backend-developers
  workflow: testing
  project: ecomerce
---

# Skill: Escribir Tests Jest

## Cuándo Usar Este Skill
Cuando necesites escribir tests para módulos NestJS, servicios, controladores, o utilidades del backend en `apps/api/`.

## Tipos de Tests Disponibles

### 1. Test Unitario de Servicio NestJS
```typescript
// <nombre>.spec.ts (junto al servicio)
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { <Nombre>Service } from './<nombre>.service';
import { PrismaService } from '../../prisma/prisma.service';

// Tipo parcial del mock de Prisma
type PrismaMock = {
  <modelo>: {
    create: jest.MockedFunction<any>;
    findMany: jest.MockedFunction<any>;
    findUnique: jest.MockedFunction<any>;
    update: jest.MockedFunction<any>;
    delete: jest.MockedFunction<any>;
  };
};

describe('<Nombre>Service', () => {
  let service: <Nombre>Service;
  let prisma: PrismaMock;

  beforeEach(async () => {
    const prismaMock: PrismaMock = {
      <modelo>: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        <Nombre>Service,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<<Nombre>Service>(<Nombre>Service);
    prisma = module.get(PrismaService) as unknown as PrismaMock;
  });

  // Limpiar mocks entre tests
  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create successfully', async () => {
      // Arrange
      const dto = { campo: 'valor' };
      const expected = { id: 'uuid-123', ...dto, createdAt: new Date() };
      prisma.<modelo>.create.mockResolvedValue(expected);

      // Act
      const result = await service.create(dto);

      // Assert
      expect(result).toEqual(expected);
      expect(prisma.<modelo>.create).toHaveBeenCalledWith({ data: dto });
      expect(prisma.<modelo>.create).toHaveBeenCalledTimes(1);
    });

    it('should throw on invalid data', async () => {
      // Arrange
      prisma.<modelo>.create.mockRejectedValue(new Error('DB error'));

      // Act & Assert
      await expect(service.create({ campo: '' })).rejects.toThrow();
    });
  });

  describe('findOne', () => {
    it('should return item when found', async () => {
      // Arrange
      const expected = { id: 'uuid-123', campo: 'valor' };
      prisma.<modelo>.findUnique.mockResolvedValue(expected);

      // Act
      const result = await service.findOne('uuid-123');

      // Assert
      expect(result).toEqual(expected);
    });

    it('should throw NotFoundException when not found', async () => {
      // Arrange
      prisma.<modelo>.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne('not-found')).rejects.toThrow(NotFoundException);
    });
  });
});
```

### 2. Test de Controlador NestJS
```typescript
// <nombre>.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { <Nombre>Controller } from './<nombre>.controller';
import { <Nombre>Service } from './<nombre>.service';

describe('<Nombre>Controller', () => {
  let controller: <Nombre>Controller;
  let service: jest.Mocked<<Nombre>Service>;

  beforeEach(async () => {
    const serviceMock = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [<Nombre>Controller],
      providers: [{ provide: <Nombre>Service, useValue: serviceMock }],
    }).compile();

    controller = module.get<<Nombre>Controller>(<Nombre>Controller);
    service = module.get(<Nombre>Service);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call service.create with correct dto', async () => {
      const dto = { campo: 'valor' };
      const expected = { id: 'uuid', ...dto };
      service.create.mockResolvedValue(expected);

      const result = await controller.create(dto);

      expect(service.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expected);
    });
  });
});
```

### 3. Test de Integración (Supertest)
```typescript
// test/<nombre>.integration.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('<Nombre> Integration Tests', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /<ruta>', () => {
    it('should create successfully', async () => {
      const dto = { campo: 'valor de prueba' };

      const response = await request(app.getHttpServer())
        .post('/<ruta>')
        .send(dto)
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        campo: dto.campo,
      });
    });

    it('should return 400 with invalid body', async () => {
      await request(app.getHttpServer())
        .post('/<ruta>')
        .send({})  // body vacío/inválido
        .expect(400);
    });
  });

  describe('GET /<ruta>/:id', () => {
    it('should return 404 for non-existent id', async () => {
      await request(app.getHttpServer())
        .get('/<ruta>/non-existent-id')
        .expect(404);
    });
  });
});
```

## Configuración Jest (Referencia)
```javascript
// jest.config.js (apps/api/)
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: { '^.+\\.(t|j)s$': 'ts-jest' },
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
};
```

## Convenciones Obligatorias
- **Patrón AAA**: Arrange / Act / Assert en cada `it()`
- **Nombres descriptivos**: `it('should <hacer algo> when <condición>')`
- **`afterEach(() => jest.clearAllMocks())`** para limpiar entre tests
- **Mocks específicos**: No mockear más de lo necesario
- **Happy path primero**, luego edge cases, luego errores

## Comandos de Ejecución
```bash
npm run test                    # Todos los tests unitarios
npm run test -- --testPathPattern=<nombre>   # Tests de un módulo
npm run test:cov                # Con reporte de coverage
npm run test:watch              # Modo watch para desarrollo
```

## Checklist
- [ ] `describe` con nombre del módulo
- [ ] `it` con descripción en forma `should...`
- [ ] Patrón AAA en cada test
- [ ] `afterEach(() => jest.clearAllMocks())`
- [ ] Happy path cubierto
- [ ] Casos de error cubiertos (NotFoundException, etc.)
- [ ] Sin `console.log` en tests
- [ ] Mocks tipados correctamente
