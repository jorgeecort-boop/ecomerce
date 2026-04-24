export interface FeatureItem {
  id: string;
  icon: string;
  title: string;
  description: string;
}

export interface FeaturesProps {
  heading?: string;
  items?: FeatureItem[];
}

export const mockFeatures: FeatureItem[] = [
  {
    id: 'viral-detection',
    icon: '🚀',
    title: 'Deteccion de productos virales',
    description: 'Identifica tendencias en redes y agrega productos con potencial de venta.',
  },
  {
    id: 'auto-import',
    icon: '⚡',
    title: 'Importacion automatica',
    description: 'Conecta catalogos y publica productos con reglas de precio y margen.',
  },
  {
    id: 'smart-fulfillment',
    icon: '📦',
    title: 'Fulfillment inteligente',
    description: 'Sincroniza inventario y pedidos para reducir errores operativos.',
  },
  {
    id: 'scale-analytics',
    icon: '📈',
    title: 'Analitica para escalar',
    description: 'Mide conversion, ticket medio y canales para decisiones de crecimiento.',
  },
];

export function Features({
  heading = 'Feature Highlights',
  items = mockFeatures,
}: FeaturesProps) {
  return (
    <section aria-label="Feature highlights" className="bg-surface py-14">
      <div className="mx-auto w-full max-w-site px-4 sm:px-6 lg:px-10">
        <h2 className="mb-8 text-center text-2xl font-extrabold text-text sm:text-3xl">{heading}</h2>

        <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item) => (
            <li
              key={item.id}
              className="rounded-card bg-white p-6 shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hover"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-2xl">
                <span aria-hidden="true">{item.icon}</span>
              </div>
              <h3 className="mb-2 text-lg font-semibold text-primary">{item.title}</h3>
              <p className="text-sm leading-6 text-secondary">{item.description}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export default Features;
