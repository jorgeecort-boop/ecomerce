# Tech Spec — SarahBits E-commerce Landing

## Dependencias

| Paquete | Versión | Propósito |
|---------|---------|-----------|
| `react` | ^18.3 | Framework UI |
| `react-dom` | ^18.3 | Renderizado DOM |
| `vite` | ^6.0 | Bundler / dev server |
| `@vitejs/plugin-react` | ^4.3 | Plugin React para Vite |
| `tailwindcss` | ^4.0 | Estilos utilitarios |
| `@tailwindcss/vite` | ^4.0 | Integración Tailwind + Vite |
| `gsap` | ^3.12 | Motor de animaciones (timelines, tweens, ScrollTrigger) |
| `lenis` | ^1.1 | Smooth scroll con inercia |
| `three` | ^0.170 | Motor 3D para el carrusel de productos |

> **Nota**: No se requieren wrappers de React para Three.js (react-three-fiber). El carrusel 3D se maneja imperativamente con vanilla Three.js montado en un ref, lo cual da control directo sobre el loop de render, shaders custom y la lógica de scroll/touch sin overhead de reconciliación de React.

---

## Inventario de Componentes

### Layout (compartidos)

| Componente | Fuente | Notas |
|------------|--------|-------|
| `Navigation` | Custom | Fixed top bar. Transparent → blur+fondo al hacer scroll. Drawer mobile desde la derecha. |
| `Footer` | Custom | 3 columnas en desktop, stack en mobile. |

### Secciones (página Home, orden de aparición)

| Componente | Fuente | Notas |
|------------|--------|-------|
| `HeroSection` | Custom | Split 40/60 (contenido/video). Secuencia de entrada GSAP timeline. Incluye CategoryOrbit como sub-componente posicionado absolutamente. |
| `TrustBar` | Custom | Banda de 80px con 4 items de confianza. Horizontal scroll con snap en mobile. |
| `ProductCarousel` | Custom | Wrapper de la sección. Contiene el canvas Three.js y header de sección. |
| `CategoryGrid` | Custom | Bento grid CSS de 6 categorías con hover effects. |
| `StatsSection` | Custom | 3 bloques de stats con números animados + marquee 3D. |
| `BenefitsSection` | Custom | Grid de 4 tarjetas de ventajas. |
| `TestimonialsSection` | Custom | 2 filas de marquee en direcciones opuestas. |
| `FlashSaleCTA` | Custom | CTA con fondo gradiente + countdown timer real. |

### Componentes Reutilizables

| Componente | Fuente | Usado en | Notas |
|------------|--------|----------|-------|
| `SectionHeader` | Custom | Todas las secciones excepto Hero, TrustBar, FlashSaleCTA | Patrón repetitivo: tagline pill + headline H2 + subtitle opcional. Recibe variantes de color para el badge. |
| `CategoryOrbit` | Custom | HeroSection | Órbita CSS pura de 6 iconos de categoría. Se oculta en ≤768px. |
| `ProductCarousel3D` | Custom | ProductCarousel | Canvas Three.js montado imperativamente en un div ref. Contiene toda la lógica 3D (shaders, scene, camera, loop de animación). Inicialización lazy via IntersectionObserver. |
| `CountdownTimer` | Custom | FlashSaleCTA | Lee deadline de sessionStorage. setInterval de 1s. Formato HH:MM:SS. |
| `ScrollReveal` | Custom | Todas las secciones | Wrapper genérico que aplica la animación de entrada por defecto (translateY + fade) usando ScrollTrigger. Recibe children, stagger delay opcional, y threshold. |

---

## Plan de Animaciones

| Animación | Biblioteca | Enfoque de Implementación | Complejidad |
|-----------|------------|---------------------------|-------------|
| **Hero entrance sequence** | GSAP Timeline | Timeline maestra con 7 tweens encadenados (video fade+scale → tagline → headline → description → CTAs → stats → orbit start). Delays escalonados definidos en el timeline. La palabra "Setup" usa background-clip:text con CSS animation de shimmer. | 🔒 Alta |
| **Navegación scroll transition** | CSS + JS | Listener de scroll (o Lenis scroll event) que aplica clase al nav cuando scroll > 80px. Background y backdrop-filter con transition CSS. | Baja |
| **Product Carousel 3D** | Three.js (vanilla) | ShaderMaterial custom con barrel distortion + edge brightness. 12 cards en layout cilíndrico vertical. Scroll wheel y touch drag modifican scrollTarget; cada frame aplica lerp(0.08) para suavizado. Posiciones calculadas con trigonometría (sin/cos). Wrap infinito vía módulo. Inicialización lazy con IntersectionObserver. | 🔒 Alta |
| **Category Orbit** | CSS @keyframes | Contenedor padre rota 360° en 60s (linear infinite). Iconos hijos posicionados con rotate+translateX radial. Efecto tooltip en hover. | Media |
| **3D Perspective Marquee** | CSS @keyframes | Flex track con contenido duplicado. translateX(-50%) en loop. Transform rotateY(-25deg) en el track. 3 instancias con duraciones diferentes (12s, 14s, 16s). | Media |
| **Testimonial marquee bidireccional** | CSS @keyframes | Dos filas: fila 1 translateX negativo, fila 2 translateX positivo. Contenido duplicado para loop infinito. Pausa en hover del contenedor (animation-play-state: paused). | Media |
| **ScrollReveal (global)** | GSAP + ScrollTrigger | Componente wrapper reutilizable. IntersectionObserver activa ScrollTrigger que ejecuta translateY(30→0) + opacity(0→1) con stagger entre siblings. | Baja |
| **Stats count-up** | GSAP | gsap.to() con snap para forzar valores enteros. Triggered por ScrollTrigger cuando la sección entra en viewport. Stagger 0.3s entre los 3 números. | Media |
| **Flash Sale entrance** | GSAP Timeline | Timeline: tagline fade → headline slideUp → timer blocks pop+scale(0.9→1) stagger 0.1s → CTAs fadeUp. Triggered por ScrollTrigger. | Media |
| **Trust bar stagger** | GSAP + ScrollTrigger | 4 items fade+translateY con stagger 0.1s. | Baja |
| **Bento grid card entrance** | GSAP + ScrollTrigger | 6 cards stagger desde translateY(40) + opacity, 0.1s stagger. | Baja |
| **Benefits card entrance** | GSAP + ScrollTrigger | 4 cards stagger desde translateY + opacity, 0.15s stagger. | Baja |
| **Countdown timer** | Vanilla JS | setInterval de 1s. Lee deadline de sessionStorage. Calcula diff, formatea con padStart(2,'0'). Al expirar: muestra "¡Terminó!" y deshabilita CTAs. | Baja |
| **Hero video entrance** | GSAP | Opacity 0→1, scale(1.05→1), 1.8s power2.out. Primer paso del timeline maestro. | Baja |
| **Logo pulse, fire emoji pulse, scroll indicator** | CSS @keyframes | Animaciones CSS puras, no requieren JS. | Baja |
| **Link underline hover** | CSS | scaleX(0→1) con transform-origin:center, transition 0.3s. | Baja |
| **Card hover lifts (Category, Benefits, Testimonial)** | CSS transition | translateY(-4px) + box-shadow en hover. Transición 0.4-0.5s cubic-bezier. | Baja |

---

## Estado y Lógica — Decisiones Arquitectónicas

### Three.js: Montaje imperativo con ref, no R3F

El carrusel 3D usa Three.js vanilla montado en un `useRef` container. Esto evita:
- Reconciliación innecesaria de React para un canvas 60fps
- Complicación de shaders custom en R3F
- Overhead de @react-three/fiber y @react-three/drei

El componente `ProductCarousel3D` encapsula toda la lógica: creación de renderer/scene/camera, carga de texturas, loop de requestAnimationFrame, manejo de wheel/touch/resize, y cleanup al desmontar. La inicialización es lazy (solo cuando el contenedor entra al viewport vía IntersectionObserver).

### Sincronización Lenis ↔ GSAP ScrollTrigger

Lenis debe propagar su posición de scroll a ScrollTrigger para que las animaciones scroll-triggered funcionen correctamente. Esto requiere:

1. Una única instancia de Lenis creada a nivel de App (o layout)
2. Conectar `lenis.on('scroll', ScrollTrigger.update)`
3. Usar `ScrollTrigger.scrollerProxy` si fuera necesario (en setup estándar Lenis + GSAP, el hook de scroll event suele ser suficiente)

### Manejo de Scroll Events en el Canvas 3D

El carrusel 3D captura eventos de wheel y touch directamente sobre su canvas. Cuando el cursor/puntero está sobre el canvas, Lenis debe pausar su procesamiento de scroll para evitar que la página haga scroll mientras el usuario interactúa con el carrusel. Esto se maneja detectando mouseenter/mouseleave (o touchstart/touchend) sobre el canvas container y llamando `lenis.stop()` / `lenis.start()` respectivamente.

### Countdown: Persistencia con sessionStorage

El deadline se calcula una sola vez (`Date.now() + 24h`) y se guarda en `sessionStorage` como `saleDeadline`. En subsiguientes renders/mounts, se lee el valor existente. El componente `CountdownTimer` encapsula toda esta lógica — no hay estado global necesario. Al expirar, limpia el interval y aplica clases CSS para deshabilitar los botones.

---

## Otras Decisiones Clave

### Raw Three.js vs. React Three Fiber

Se elige **raw Three.js** montado imperativamente. El carrusel es un sistema cerrado (shaders custom, loop propio, interacción directa) que no se beneficia de la declarative paradigm de R3F. El componente React solo actúa como contenedor del div donde se monta el canvas.

### Estrategia de Productos

Los 8 productos se definen como un array estático de objetos (nombre, precio, precio anterior, descuento, imagen). Las 12 cards del carrusel hacen cycling sobre estos 8 productos (índice módulo 8). No requieren fetching ni estado reactivo.

### Hero Video: Sin React Video Library

El video del hero usa la etiqueta `<video>` nativa de HTML con atributos `autoPlay muted loop playsInline`. No se requiere librería de video. Se provee un fallback de gradiente estático si el video falla al cargar (detectado vía evento `error`).
