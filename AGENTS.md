# Ecomerce - Proyecto

## Proyecto
Tienda de comercio electrónico con integración Shopify y Alibaba.

## Stack Tecnológico
| Capa | Tecnología |
|------|-----------|
| Backend | NestJS + TypeScript |
| Frontend | Next.js 14 + Tailwind CSS |
| Base de Datos | Prisma + PostgreSQL |
| Testing | Jest + Playwright |
| CI/CD | GitHub Actions |
| Deploy | VPS (Docker + Nginx) |

## Ubicación
`C:\Users\quant\OneDrive\Desktop\Ecomerce`

---

## Reglas del Proyecto

### Regla de Oro
No realices cambios en el código, ni crees archivos, ni guardes modificaciones sin autorización explícita y previa. Siempre analiza el problema, propón la solución detallada y espera a que se diga **"Autorizado"** o **"Sí"**.

### Mentalidad Test-First
Por cada nueva funcionalidad o módulo, la primera respuesta debe incluir cómo automatizar su validación. No proponer código de producción sin proponer sus Tests de Unidad, Integración o Seguridad.

### Cero Revisiones Manuales
Diseñar soluciones para pipelines de CI/CD. El código generado debe ser modular y fácil de someter a pruebas automatizadas.

### Flujo de Trabajo Lineal
Cuando se reciba autorización para escribir código, entregar el bloque de implementación y, de forma contigua, el bloque del test automatizado.

---

## Agentes Especializados

Usar el subagente correspondiente según el tipo de tarea:

| Agente | Uso | Activación |
|--------|-----|-----------|
| `@backend` | APIs NestJS, servicios, DTOs, Prisma | `@backend <tarea>` |
| `@frontend` | Páginas Next.js, componentes, hooks | `@frontend <tarea>` |
| `@test` | Tests Jest, Playwright, integración | `@test <tarea>` |
| `@deploy` | CI/CD, Docker, GitHub Actions, VPS | `@deploy <tarea>` |

**Ejemplos:**
```
@backend crea un endpoint para gestión de inventario
@frontend crea una página de dashboard de analytics
@test escribe tests para el módulo de usuarios
@deploy configura un nuevo environment en GitHub Actions
```

---

## Flujo de Trabajo por Tipo de Tarea

### Backend (NestJS)
1. Usar skill `create-nestjs-endpoint` como referencia
2. Crear DTO → Servicio → Controlador → Módulo
3. Test unitario junto al código (`*.spec.ts`)
4. Verificar: `npm run test` → `npm run lint` → `npm run build`

### Frontend (Next.js)
1. Usar skill `create-nextjs-page` como referencia
2. Determinar Server vs Client Component
3. Componentes en `apps/web/src/components/`
4. Pages en `apps/web/src/app/`
5. Verificar: `npm run dev` → `npm run build` → `npm run lint`

### Testing
1. Backend unitario: `apps/api/src/modules/*/*.spec.ts`
2. Integración: `apps/api/test/*.integration.spec.ts`
3. E2E: `apps/web/e2e/*.spec.ts` con Playwright
4. Usar skill `write-jest-test` como referencia para patrones

### Deployment
1. CI: GitHub Actions en `.github/workflows/`
2. Deploy manual: `./deploy.sh` o `./deploy-vps.ps1`
3. Verificar health checks post-deploy

---

## Estructura del Monorepo
```
apps/
├── api/          ← Backend NestJS (puerto 3001)
└── web/          ← Frontend Next.js (puerto 3000)

packages/         ← Librerías compartidas
infra/            ← Docker, Nginx, configs de infra
.github/          ← GitHub Actions workflows
```

---

## Memoria Persistente
Mantener información aprendida a través de las conversaciones de forma permanente.

---

## Bucle de Aprendizaje Continuo
Implementar un ciclo de feedback continuo donde aprendo de cada interacción:
- Después de cada proyecto o módulo completado, guardar lessons learned
- Registrar tanto errores como éxitos para informar futuras decisiones
- Mantener un registro de qué aproximaciones funcionaron mejor con este usuario específico
