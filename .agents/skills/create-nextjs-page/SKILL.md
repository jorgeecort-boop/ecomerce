---
name: create-nextjs-page
description: Crea una nueva página o componente en Next.js 14 con App Router, TypeScript y Tailwind CSS. Sigue las convenciones del proyecto Ecomerce.
compatibility: Codex
metadata:
  audience: frontend-developers
  workflow: nextjs
  project: ecomerce
---

# Skill: Crear Página Next.js

## Cuándo Usar Este Skill
Cuando necesites crear una nueva página, layout o componente en `apps/web/src/`.

## Arquitectura App Router
```
apps/web/src/
├── app/                         ← Rutas de Next.js (App Router)
│   ├── layout.tsx               ← Root layout
│   ├── page.tsx                 ← Home page
│   ├── (auth)/                  ← Route groups (sin URL)
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   └── store/
│       └── [slug]/
│           ├── page.tsx         ← Página de tienda
│           └── [product]/
│               └── page.tsx     ← Página de producto
├── components/
│   ├── ui/                      ← Primitivos (Button, Input...)
│   └── features/                ← Componentes de dominio
├── hooks/                       ← Custom React hooks
├── lib/
│   ├── api.ts                   ← Cliente HTTP para el backend
│   └── utils.ts                 ← Utilidades
└── types/                       ← Tipos TypeScript
```

## Pasos de Implementación

### 1. Determinar el Tipo de Componente
- **Server Component** (default): Para fetch de datos, SEO, sin interactividad
- **Client Component** (`'use client'`): Para hooks, eventos, estado local

### 2. Crear la Página (Server Component por defecto)
```typescript
// app/<ruta>/page.tsx
import { Metadata } from 'next';
import { ComponenteDeRuta } from '@/components/features/<ruta>';

export const metadata: Metadata = {
  title: '<Título de la Página> | Ecomerce',
  description: 'Descripción para SEO',
};

interface PageProps {
  params: { slug: string };
  searchParams: { [key: string]: string | string[] | undefined };
}

export default async function <Nombre>Page({ params, searchParams }: PageProps) {
  // Fetch de datos en el servidor
  const data = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/<recurso>`, {
    cache: 'no-store', // o 'force-cache' para datos estáticos
  }).then(res => res.json());

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6"><Título></h1>
      {/* Contenido */}
    </main>
  );
}
```

### 3. Crear Componente Interactivo (Client Component)
```typescript
// components/features/<nombre>/<Nombre>.tsx
'use client';

import { useState } from 'react';

interface <Nombre>Props {
  initialData: <Tipo>;
  onAction?: (data: <Tipo>) => void;
}

export function <Nombre>({ initialData, onAction }: <Nombre>Props) {
  const [state, setState] = useState(initialData);

  const handleAction = async () => {
    // Lógica de interacción
    onAction?.(state);
  };

  return (
    <div className="rounded-lg border border-gray-200 p-6 shadow-sm">
      {/* Contenido del componente */}
      <button
        onClick={handleAction}
        className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
      >
        Acción
      </button>
    </div>
  );
}
```

### 4. Crear Custom Hook (si necesario)
```typescript
// hooks/use<Nombre>.ts
'use client';

import { useState, useEffect } from 'react';

interface Use<Nombre>Options {
  id?: string;
}

export function use<Nombre>({ id }: Use<Nombre>Options = {}) {
  const [data, setData] = useState<<Tipo> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/<recurso>/${id}`)
      .then(res => res.json())
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [id]);

  return { data, loading, error };
}
```

### 5. Convenciones de Tailwind
```typescript
// ✅ Correcto: clases específicas
className="flex items-center gap-4 px-6 py-3 bg-white rounded-xl shadow-md"

// ❌ Evitar: estilos inline
style={{ display: 'flex', padding: '12px' }}
```

### 6. Tipado de API responses
```typescript
// types/<recurso>.ts
export interface <Recurso> {
  id: string;
  campo: string;
  campoOpcional?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Paginated<<T>> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
```

## Verificación Final
```bash
npm run dev           # Ver en http://localhost:3000
npm run build         # Verificar que no hay errores de build
npm run lint          # Sin errores de lint
```

## Checklist
- [ ] Metadata (title, description) para SEO
- [ ] Tipado TypeScript completo (sin `any`)
- [ ] `'use client'` solo cuando sea necesario
- [ ] Manejo de estados loading/error en Client Components
- [ ] Clases Tailwind en lugar de estilos inline
- [ ] Componente exportado con nombre descriptivo
- [ ] Props interface definida para cada componente
