import { useEffect, useState } from 'react';

interface WakeUpLoaderProps {
  retryCallback: () => Promise<void>;
  message?: string;
  retryDelayMs?: number;
}

export const WakeUpLoader = ({ 
  retryCallback, 
  message = 'La tienda se está despertando...', 
  retryDelayMs = 5000 
}: WakeUpLoaderProps) => {
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Automatic retry after delay
  useEffect(() => {
    if (!isRetrying && retryCount < 3) {
      const timer = setTimeout(async () => {
        setIsRetrying(true);
        try {
          await retryCallback();
        } catch (error) {
          console.error('Wake up retry failed:', error);
        } finally {
          setIsRetrying(false);
          setRetryCount(prev => prev + 1);
        }
      }, retryDelayMs);
      return () => clearTimeout(timer);
    }
  }, [isRetrying, retryCallback, retryCount, retryDelayMs]);

  const handleManualRetry = async () => {
    setIsRetrying(true);
    try {
      await retryCallback();
    } catch (error) {
      console.error('Manual retry failed:', error);
    } finally {
      setIsRetrying(false);
      setRetryCount(prev => prev + 1);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#03045E' }}>
      <div className="text-center max-w-md">
        <div className="text-6xl mb-6 animate-pulse">🚀</div>
        <h1 className="text-2xl font-extrabold text-white mb-3">
          La tienda se esta despertando
        </h1>
        <p className="text-[rgba(255,255,255,0.5)] mb-6">
          {message}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={handleManualRetry}
            disabled={isRetrying}
            className={`px-6 py-3 rounded-full gradient-hero-cta text-white font-bold hover:shadow-lg transition-colors ${
              isRetrying ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isRetrying ? 'Reintentando...' : 'Reintentar ahora'}
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="px-6 py-3 rounded-full border border-[rgba(255,255,255,0.2)] text-white font-semibold hover:bg-[rgba(255,255,255,0.08)] transition-colors"
          >
            Volver al inicio
          </button>
        </div>
        {retryCount > 0 && (
          <p className="text-xs text-[rgba(255,255,255,0.3)] mt-4">
            Intento {retryCount} de 3
          </p>
        )}
      </div>
    </div>
  );
};