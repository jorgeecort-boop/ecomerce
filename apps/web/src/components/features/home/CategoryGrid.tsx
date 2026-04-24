import Image from 'next/image';
import Link from 'next/link';

export interface CategoryItem {
  id: string;
  title: string;
  imageSrc: string;
  href: string;
}

export interface CategoryGridProps {
  categories?: CategoryItem[];
}

export const mockCategories: CategoryItem[] = [
  {
    id: 'cat-machines',
    title: 'Maquinas de Cafe',
    imageSrc:
      'data:image/svg+xml;charset=UTF-8,' +
      encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600"><rect width="800" height="600" fill="#b6ddea"/><circle cx="640" cy="110" r="80" fill="#f58a6c"/><rect x="120" y="180" width="560" height="280" rx="24" fill="#004e7c"/><rect x="220" y="230" width="170" height="170" rx="12" fill="#edf8f8"/></svg>'
      ),
    href: '#',
  },
  {
    id: 'cat-capsules',
    title: 'Capsulas Premium',
    imageSrc:
      'data:image/svg+xml;charset=UTF-8,' +
      encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600"><rect width="800" height="600" fill="#d8edf6"/><circle cx="170" cy="140" r="70" fill="#527293"/><g fill="#004e7c"><circle cx="260" cy="350" r="90"/><circle cx="420" cy="310" r="90"/><circle cx="580" cy="350" r="90"/></g></svg>'
      ),
    href: '#',
  },
  {
    id: 'cat-accessories',
    title: 'Accesorios',
    imageSrc:
      'data:image/svg+xml;charset=UTF-8,' +
      encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600"><rect width="800" height="600" fill="#edf8f8"/><rect x="180" y="120" width="440" height="360" rx="28" fill="#527293"/><rect x="240" y="190" width="120" height="220" rx="18" fill="#f58a6c"/><rect x="430" y="190" width="140" height="220" rx="18" fill="#004e7c"/></svg>'
      ),
    href: '#',
  },
  {
    id: 'cat-subscription',
    title: 'Suscripcion',
    imageSrc:
      'data:image/svg+xml;charset=UTF-8,' +
      encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600"><rect width="800" height="600" fill="#cfe8f4"/><path d="M100 460c120-140 240-200 360-180 90 15 170 55 250 130v150H100z" fill="#004e7c"/><circle cx="620" cy="170" r="95" fill="#f58a6c"/><path d="M620 115v55h45" stroke="#fff" stroke-width="18" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>'
      ),
    href: '#',
  },
];

export function CategoryGrid({ categories = mockCategories }: CategoryGridProps) {
  return (
    <section aria-label="Categorias destacadas" className="bg-white py-12">
      <div className="mx-auto w-full max-w-site px-4 sm:px-6 lg:px-10">
        <div className="mb-8 flex items-end justify-between">
          <h2 className="text-2xl font-extrabold text-text sm:text-3xl">Explora por categoria</h2>
          <Link href="#" className="text-sm font-semibold text-primary hover:opacity-90">
            Ver todo
          </Link>
        </div>

        <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {categories.map((category) => (
            <li key={category.id} data-testid="category-card">
              <Link
                href={category.href}
                className="group block overflow-hidden rounded-card bg-white shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hover"
              >
                <div className="relative aspect-[4/5] w-full overflow-hidden">
                  <Image
                    src={category.imageSrc}
                    alt={category.title}
                    fill
                    sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 50vw"
                    className="object-cover transition duration-300 group-hover:scale-[1.03]"
                  />
                </div>
                <div className="px-4 py-3">
                  <h3 className="text-sm font-semibold text-primary sm:text-base">{category.title}</h3>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export default CategoryGrid;
