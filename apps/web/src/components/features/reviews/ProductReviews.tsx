'use client';

import { useState, useEffect } from 'react';
import { ProductReviewForm } from './ProductReviewForm';

interface Review {
  id: string;
  productId: string;
  rating: number;
  comment: string;
  createdAt: string;
}

interface ProductReviewsProps {
  productId: string;
}

export function ProductReviews({ productId }: ProductReviewsProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchReviews = async () => {
    try {
      const nextApiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      const res = await fetch(`${nextApiUrl}/reviews/product/${productId}`);
      if (res.ok) {
        const data = await res.json();
        setReviews(data);
      }
    } catch (e) {
      console.error('Error fetching reviews:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [productId]);

  const handleReviewSubmitted = (newReview: Review) => {
    // Agregarla de inmediato a la lista sin recargar
    setReviews((prev) => [newReview, ...prev]);
  };

  return (
    <div className="flex flex-col md:flex-row gap-10">
      <div className="flex-1">
        <ProductReviewForm productId={productId} onReviewSubmitted={handleReviewSubmitted} />
      </div>

      <div className="flex-1 bg-gray-50 dark:bg-gray-800 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">
          Reseñas recientes ({reviews.length})
        </h3>

        {isLoading ? (
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded-xl" />
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <p className="text-gray-500 text-sm">Nadie ha comentado aún. ¡Sé el primero!</p>
        ) : (
          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
            {reviews.map((review) => (
              <div key={review.id} className="bg-white dark:bg-gray-900 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-1 mb-2 text-yellow-400 text-sm">
                  {[...Array(review.rating)].map((_, i) => (
                    <span key={i}>★</span>
                  ))}
                  {[...Array(5 - review.rating)].map((_, i) => (
                    <span key={i} className="text-gray-300 dark:text-gray-600">★</span>
                  ))}
                  <span className="text-xs text-gray-400 ml-2">
                    {new Date(review.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {review.comment}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
