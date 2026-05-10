# Deploy Render + Vercel

Este proyecto esta configurado para desplegar el backend NestJS en Render y el frontend Next.js en Vercel.

## Estado verificado

- API Render: `https://ecomerce-api-zulc.onrender.com/api/health`
- Web Vercel: `https://ecomerce-web.vercel.app`
- API publica para frontend: `https://ecomerce-api-zulc.onrender.com/api`

## Variables necesarias en Vercel Production

Configurar en Vercel Project Settings -> Environment Variables:

```bash
NEXT_PUBLIC_API_URL=https://ecomerce-api-zulc.onrender.com/api
NEXT_PUBLIC_SUPABASE_URL=<supabase-url>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<supabase-publishable-key>
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=<mercadopago-public-key>
JWT_SECRET=<same-value-as-render-jwt-secret>
```

`JWT_SECRET` no debe ser publico. Se necesita en Vercel porque el middleware de Next.js valida el JWT emitido por la API en Render.

## Variables necesarias en Render

Configurar en Render Environment:

```bash
DATABASE_URL=<postgres-url>
JWT_SECRET=<strong-secret>
JWT_REFRESH_SECRET=<strong-refresh-secret>
WEB_URL=https://ecomerce-web.vercel.app
MERCADOPAGO_ACCESS_TOKEN=<token>
MERCADOPAGO_PUBLIC_KEY=<public-key>
MERCADOPAGO_CLIENT_SECRET=<webhook-secret>
SHOPIFY_API_SECRET=<shopify-webhook-secret>
SHOPIFY_ACCESS_TOKEN=<shopify-access-token>
CJ_API_EMAIL=<cj-email>
CJ_API_KEY=<cj-api-key-or-password>
CLOUDINARY_CLOUD_NAME=<cloud-name>
CLOUDINARY_API_KEY=<api-key>
CLOUDINARY_API_SECRET=<api-secret>
SHIPPO_API_KEY=<shippo-key>
```

## Webhooks de produccion

MercadoPago:

```text
https://ecomerce-api-zulc.onrender.com/api/payments/webhook
```

Shopify:

```text
https://ecomerce-api-zulc.onrender.com/api/shopify/webhooks/orders/create
https://ecomerce-api-zulc.onrender.com/api/shopify/webhooks/orders/fulfilled
https://ecomerce-api-zulc.onrender.com/api/shopify/webhooks/products/update
https://ecomerce-api-zulc.onrender.com/api/shopify/webhooks/app/uninstalled
```

## Smoke test despues de deploy

1. Abrir `https://ecomerce-web.vercel.app`.
2. Registrar un usuario con email real, por ejemplo Gmail. Evitar `@example.com`.
3. Crear tienda.
4. Buscar productos en suppliers.
5. Importar producto a tienda.
6. Abrir tienda publica `/store/<slug>`.
7. Hacer checkout con MercadoPago sandbox.
8. Confirmar que el webhook actualiza la orden.
