import Link from 'next/link';

export interface AsSeenOnItem {
  id: string;
  name: string;
  href: string;
}

export interface AsSeenOnProps {
  items?: AsSeenOnItem[];
}

export const mockPressLogos: AsSeenOnItem[] = [
  { id: 'nyt', name: 'The New York Times', href: '#' },
  { id: 'wired', name: 'WIRED', href: '#' },
  { id: 'forbes', name: 'Forbes', href: '#' },
  { id: 'gq', name: 'GQ', href: '#' },
  { id: 'bonappetit', name: 'Bon Appetit', href: '#' },
];

export function AsSeenOn({ items = mockPressLogos }: AsSeenOnProps) {
  return (
    <section aria-label="As seen on" className="bg-surface py-10">
      <div className="mx-auto w-full max-w-site px-4 sm:px-6 lg:px-10">
        <p className="mb-6 text-center text-xs font-semibold uppercase tracking-[0.16em] text-secondary">
          As seen on
        </p>

        <ul className="grid grid-cols-2 gap-4 md:grid-cols-5">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className="flex h-14 items-center justify-center rounded-card border border-black/10 bg-white px-3 text-center text-sm font-semibold text-primary shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hover"
              >
                {item.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export default AsSeenOn;
