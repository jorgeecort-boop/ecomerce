export function Button({ children }: { children: React.ReactNode }) {
  return (
    <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
      {children}
    </button>
  );
}

export function Card({ children }: { children: React.ReactNode }) {
  return <div className="bg-white rounded-xl shadow-md p-6">{children}</div>;
}
