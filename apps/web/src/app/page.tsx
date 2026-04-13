import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col bg-white dark:bg-gray-900 transition-colors">
      {/* Header */}
      <header className="border-b dark:border-gray-800">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400">Ecomerce</h1>
          <nav className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
            >
              Dashboard
            </Link>
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              Login
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex-1 flex items-center">
        <div className="container mx-auto px-4 py-20 text-center">
          <h2 className="text-5xl font-bold mb-6 tracking-tight text-gray-900 dark:text-white">
            Build Your <span className="text-blue-600 dark:text-blue-400">Dropshipping Empire</span>
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
            Automated platform for high-volume stores. Detect viral products, import automatically,
            and scale to 7-8 figures.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/register"
              className="px-8 py-4 text-lg font-medium bg-blue-600 text-white rounded-xl hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors"
            >
              Get Started Free
            </Link>
            <Link
              href="/store/tienda-demo"
              className="px-8 py-4 text-lg font-medium border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Ver Demostración
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-gray-50 dark:bg-gray-800 transition-colors">
        <div className="container mx-auto px-4">
          <h3 className="text-3xl font-bold text-center mb-12 text-gray-900 dark:text-white">
            Platform Features
          </h3>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white dark:bg-gray-700 p-6 rounded-xl shadow-sm transition-colors">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">🚀</span>
              </div>
              <h4 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                Viral Product Detection
              </h4>
              <p className="text-gray-600 dark:text-gray-300">
                Automatically detect trending products on TikTok and social media
              </p>
            </div>
            <div className="bg-white dark:bg-gray-700 p-6 rounded-xl shadow-sm transition-colors">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">⚡</span>
              </div>
              <h4 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                Auto Import
              </h4>
              <p className="text-gray-600 dark:text-gray-300">
                Import products from AliExpress, CJ, Zendrop with automatic pricing
              </p>
            </div>
            <div className="bg-white dark:bg-gray-700 p-6 rounded-xl shadow-sm transition-colors">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">📈</span>
              </div>
              <h4 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                Scale to 7 Figures
              </h4>
              <p className="text-gray-600 dark:text-gray-300">
                Built for high-volume stores with automated order fulfillment
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t dark:border-gray-800 py-8">
        <div className="container mx-auto px-4 text-center text-gray-600 dark:text-gray-400">
          <p>&copy; {new Date().getFullYear()} Ecomerce. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}
