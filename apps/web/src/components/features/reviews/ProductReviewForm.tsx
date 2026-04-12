'use client';

import { useState } from 'react';

interface ProductReviewFormProps {
  productId: string;
  onReviewSubmitted?: (review: any) => void;
}

export function ProductReviewForm({ productId, onReviewSubmitted }: ProductReviewFormProps) {
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      // Usaremos una URL relativa asumiendo que el proxy o rewrite en Next está configurado o
      // que usamos la URL base del API. Por ahora usamos un mock si no existiera Next rewrites
      const nextApiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      
      const response = await fetch(`${nextApiUrl}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId,
          rating,
          comment,
        }),
      });

      if (!response.ok) {
        throw new Error('Error al enviar la reseña');
      }

      const data = await response.json();
      setSuccess(true);
      setComment('');
      setRating(5);
      
      if (onReviewSubmitted) {
        onReviewSubmitted(data);
      }
      
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error inesperado');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-lg p-6 bg-white border border-gray-100 rounded-2xl shadow-sm">
      <h3 className="text-xl font-bold text-gray-900 mb-4">Dejar una Reseña</h3>
      
      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded-xl">
          ¡Gracias! Tu reseña ha sido enviada exitosamente.
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Selector de Estrellas */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Calificación
          </label>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className={`text-2xl transition-colors focus:outline-none ${
                  star <= rating ? 'text-yellow-400' : 'text-gray-200 hover:text-yellow-200'
                }`}
              >
                ★
              </button>
            ))}
            <span className="ml-2 text-sm text-gray-500 font-medium">
              {rating} de 5
            </span>
          </div>
        </div>

        {/* Input de Comentario */}
        <div>
          <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-1">
            Comentario
          </label>
          <textarea
            id="comment"
            rows={4}
            required
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="w-full px-4 py-2 text-gray-900 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow resize-none"
            placeholder="¿Qué te pareció este producto?"
          />
        </div>

        {/* Botón Submit */}
        <button
          type="submit"
          disabled={isSubmitting || !comment.trim()}
          className="w-full bg-black hover:bg-gray-800 disabled:bg-gray-300 text-white font-medium py-3 px-4 rounded-xl transition-colors flex justify-center items-center"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Enviando...
            </span>
          ) : (
            'Enviar Reseña'
          )}
        </button>
      </form>
    </div>
  );
}
