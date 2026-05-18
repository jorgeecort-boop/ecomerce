import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { ArrowRight } from 'lucide-react';

const products = [
  { name: 'Mini Proyector LED Portátil 4K', price: 320000, oldPrice: 420000, discount: 24, image: '/images/product-1.jpg' },
  { name: 'Traductor de Idiomas Portátil', price: 189000, oldPrice: 250000, discount: 24, image: '/images/product-2.jpg' },
  { name: 'Kit Ring Light 26cm con Trípode 2m', price: 145000, oldPrice: 199900, discount: 27, image: '/images/product-3.jpg' },
  { name: 'Soporte Aluminio Ajustable Laptop/Tablet', price: 35000, oldPrice: 55000, discount: 36, image: '/images/product-4.jpg' },
  { name: 'Lámpara LED RGB de Escritorio', price: 79900, oldPrice: 109900, discount: 27, image: '/images/product-5.jpg' },
  { name: 'Cámara Web 4K USB con Micrófono', price: 119900, oldPrice: 169900, discount: 29, image: '/images/product-6.jpg' },
  { name: 'Mouse Gamer Inalámbrico RGB 7200 DPI', price: 79900, oldPrice: 119900, discount: 33, image: '/images/product-1.jpg' },
  { name: 'Power Bank 20000mAh PD 22.5W', price: 110000, oldPrice: 150000, discount: 27, image: '/images/product-2.jpg' },
];

const CARD_WIDTH = 2.8;
const CARD_HEIGHT = 3.6;
const CARD_COUNT = 12;
const CYLINDER_RADIUS = 3.5;

const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
varying vec2 vUv;
uniform sampler2D uTexture;
uniform vec2 uPlaneSizes;
uniform vec2 uImageSizes;
uniform float uBorderRadius;
uniform float uBarrelDistortion;
uniform float uEdgeBrightness;

float roundedBoxSDF(vec2 center, vec2 halfSize, float radius) {
  vec2 q = abs(center) - halfSize + radius;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - radius;
}

void main() {
  vec2 ratio = vec2(
    min((uPlaneSizes.x / uPlaneSizes.y) / (uImageSizes.x / uImageSizes.y), 1.0),
    min((uPlaneSizes.y / uPlaneSizes.x) / (uImageSizes.y / uImageSizes.x), 1.0)
  );
  vec2 uv = vec2(
    vUv.x * ratio.x + (1.0 - ratio.x) * 0.5,
    vUv.y * ratio.y + (1.0 - ratio.y) * 0.5
  );

  vec2 centered = uv - 0.5;
  float dist = length(centered);
  float distortion = 1.0 + uBarrelDistortion * dist * dist;
  vec2 distortedUV = centered * distortion + 0.5;

  vec4 tex = texture2D(uTexture, distortedUV);

  float box = roundedBoxSDF(vUv - 0.5, vec2(0.5), uBorderRadius);
  float alpha = 1.0 - smoothstep(0.0, 0.002, box);

  float edgeDist = max(abs(vUv.x - 0.5), abs(vUv.y - 0.5)) * 2.0;
  float brightness = mix(uEdgeBrightness, 1.0, 1.0 - pow(edgeDist, 3.0));
  tex.rgb *= brightness;

  gl_FragColor = vec4(tex.rgb, tex.a * alpha);
}
`;

function formatPrice(n: number) {
  return '$' + n.toLocaleString('es-CO');
}

export default function ProductCarousel() {
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const cardsRef = useRef<THREE.Mesh[]>([]);
  const scrollRef = useRef({ current: 0, target: 0 });
  const rafRef = useRef<number>(0);
  const isDraggingRef = useRef(false);
  const lastYRef = useRef(0);
  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;

    // IntersectionObserver for lazy init
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            init3D();
            observer.disconnect();
          }
        });
      },
      { threshold: 0.1 }
    );
    observer.observe(container);

    function init3D() {
      if (!container) return;

      const width = container.clientWidth;
      const height = container.clientHeight;

      // Renderer
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      container.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      // Camera
      const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
      camera.position.set(0, 0, 6);
      cameraRef.current = camera;

      // Scene
      const scene = new THREE.Scene();
      sceneRef.current = scene;

      // Shared geometry
      const geometry = new THREE.PlaneGeometry(1, 1, 16, 16);

      // Load textures and create cards
      const loader = new THREE.TextureLoader();
      const meshes: THREE.Mesh[] = [];

      for (let i = 0; i < CARD_COUNT; i++) {
        const product = products[i % products.length];
        const texture = loader.load(product.image);
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;

        const material = new THREE.ShaderMaterial({
          vertexShader,
          fragmentShader,
          uniforms: {
            uTexture: { value: texture },
            uPlaneSizes: { value: new THREE.Vector2(CARD_WIDTH, CARD_HEIGHT) },
            uImageSizes: { value: new THREE.Vector2(600, 600) },
            uBorderRadius: { value: 0.05 },
            uBarrelDistortion: { value: 0.25 },
            uEdgeBrightness: { value: 0.65 },
          },
          transparent: true,
          side: THREE.DoubleSide,
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.scale.set(CARD_WIDTH, CARD_HEIGHT, 1);
        scene.add(mesh);
        meshes.push(mesh);
      }

      cardsRef.current = meshes;

      // Event listeners
      const onWheel = (e: WheelEvent) => {
        e.preventDefault();
        scrollRef.current.target += e.deltaY * 0.005;
      };

      const onTouchStart = (e: TouchEvent) => {
        isDraggingRef.current = true;
        lastYRef.current = e.touches[0].clientY;
      };

      const onTouchMove = (e: TouchEvent) => {
        if (!isDraggingRef.current) return;
        const delta = lastYRef.current - e.touches[0].clientY;
        scrollRef.current.target += delta * 0.005;
        lastYRef.current = e.touches[0].clientY;
      };

      const onTouchEnd = () => {
        isDraggingRef.current = false;
      };

      container.addEventListener('wheel', onWheel, { passive: false });
      container.addEventListener('touchstart', onTouchStart, { passive: true });
      container.addEventListener('touchmove', onTouchMove, { passive: true });
      container.addEventListener('touchend', onTouchEnd);

      // Animation loop
      function animate() {
        rafRef.current = requestAnimationFrame(animate);

        scrollRef.current.current +=
          (scrollRef.current.target - scrollRef.current.current) * 0.08;

        const scrollOffset = scrollRef.current.current;

        cardsRef.current.forEach((mesh, index) => {
          const angle =
            (index / CARD_COUNT) * Math.PI * 2 + scrollOffset - Math.PI / 2;
          mesh.position.y = Math.sin(angle) * CYLINDER_RADIUS;
          mesh.position.z = Math.cos(angle) * CYLINDER_RADIUS - CYLINDER_RADIUS;
          mesh.rotation.x = -angle * 0.3;

          // Brightness based on position
          const normalizedY = mesh.position.y / CYLINDER_RADIUS;
          const brightness = 1.0 - Math.abs(normalizedY) * 0.3;
          const mat = mesh.material as THREE.ShaderMaterial;
          mat.uniforms.uEdgeBrightness.value = 0.5 + brightness * 0.3;
        });

        renderer.render(scene, camera);
      }

      animate();

      // Resize
      const onResize = () => {
        const w = container.clientWidth;
        const h = container.clientHeight;
        renderer.setSize(w, h);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      };

      let resizeTimeout: ReturnType<typeof setTimeout>;
      const debouncedResize = () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(onResize, 200);
      };

      window.addEventListener('resize', debouncedResize);

      // Store cleanup
      (container as any).__cleanup = () => {
        cancelAnimationFrame(rafRef.current);
        container.removeEventListener('wheel', onWheel);
        container.removeEventListener('touchstart', onTouchStart);
        container.removeEventListener('touchmove', onTouchMove);
        container.removeEventListener('touchend', onTouchEnd);
        window.removeEventListener('resize', debouncedResize);
        renderer.dispose();
        geometry.dispose();
        meshes.forEach((m) => {
          (m.material as THREE.ShaderMaterial).dispose();
        });
        if (container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
        }
      };
    }

    return () => {
      observer.disconnect();
      const container = canvasContainerRef.current;
      if (container && (container as any).__cleanup) {
        (container as any).__cleanup();
      }
    };
  }, []);

  return (
    <section id="productos" className="relative py-20" style={{ backgroundColor: '#03045E' }}>
      {/* Radial gradient overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(0,119,182,0.08) 0%, transparent 70%)',
        }}
      />

      {/* Section Header */}
      <div className="relative z-10 px-10 max-[768px]:px-5 mb-8">
        <div className="flex items-end justify-between max-w-[1200px] mx-auto">
          <div>
            <span className="inline-block px-3 py-1 rounded-lg text-xs font-medium tracking-[0.48px] uppercase bg-[rgba(228,255,26,0.15)] text-[#E4FF1A] mb-4">
              🔥 TENDENCIA
            </span>
            <h2 className="text-white text-[42px] max-[768px]:text-[28px] font-medium tracking-[-1.26px]">
              Productos más vendidos
            </h2>
          </div>
          <a
            href="#tienda"
            className="text-[#90E0EF] text-sm hover:text-white transition-colors duration-200 flex items-center gap-1 max-[768px]:hidden"
          >
            Ver todos <ArrowRight size={14} />
          </a>
        </div>
      </div>

      {/* 3D Carousel Canvas */}
      <div
        ref={canvasContainerRef}
        className="relative z-10 w-full h-[600px] max-[1024px]:h-[500px] max-[768px]:h-[420px] cursor-grab active:cursor-grabbing"
      />

      {/* Fallback Product Grid for mobile / when 3D not loaded */}
      <div className="relative z-10 px-10 max-[768px]:px-5 max-w-[1200px] mx-auto mt-8">
        <div className="grid grid-cols-4 max-[1024px]:grid-cols-3 max-[768px]:grid-cols-2 max-[480px]:grid-cols-1 gap-6">
          {products.slice(0, 8).map((product, i) => (
            <div
              key={i}
              className="group bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.12)] rounded-3xl overflow-hidden hover:-translate-y-1 hover:shadow-[0_20px_60px_rgba(0,180,216,0.15)] transition-all duration-500"
            >
              <div className="relative p-4">
                <span className="absolute top-4 left-4 gradient-sale text-white text-xs font-medium px-2.5 py-1 rounded-lg">
                  -{product.discount}%
                </span>
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full aspect-square object-contain group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="px-5 pb-5">
                <h3 className="text-white text-sm font-medium line-clamp-2 mb-2">
                  {product.name}
                </h3>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[#90E0EF] font-medium">
                    {formatPrice(product.price)}
                  </span>
                  <span className="text-[rgba(255,255,255,0.5)] text-sm line-through">
                    {formatPrice(product.oldPrice)}
                  </span>
                </div>
                <button className="w-full py-2 border border-[rgba(255,255,255,0.12)] rounded-full text-xs text-white/70 hover:bg-[rgba(0,180,216,0.15)] hover:text-[#90E0EF] hover:border-[#00B4D8] transition-all duration-300">
                  Ver producto
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
