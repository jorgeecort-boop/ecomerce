import { useState, useEffect, useRef } from 'react';

function getDeadline(): number {
  const stored = sessionStorage.getItem('saleDeadline');
  if (stored) return parseInt(stored, 10);
  const deadline = Date.now() + 24 * 60 * 60 * 1000;
  sessionStorage.setItem('saleDeadline', String(deadline));
  return deadline;
}

export default function CountdownTimer() {
  const [timeLeft, setTimeLeft] = useState({ hours: 23, minutes: 59, seconds: 59 });
  const [expired, setExpired] = useState(false);
  const deadlineRef = useRef(getDeadline());

  useEffect(() => {
    const update = () => {
      const diff = deadlineRef.current - Date.now();
      if (diff <= 0) {
        setExpired(true);
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft({ hours, minutes, seconds });
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const format = (n: number) => String(n).padStart(2, '0');

  const blocks = [
    { value: expired ? '!!' : format(timeLeft.hours), label: 'HORAS' },
    { value: expired ? '!!' : format(timeLeft.minutes), label: 'MIN' },
    { value: expired ? '!!' : format(timeLeft.seconds), label: 'SEG' },
  ];

  return (
    <div className="flex items-center justify-center gap-3">
      {blocks.map((block, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="w-20 h-20 max-[768px]:w-14 max-[768px]:h-14 bg-[rgba(255,255,255,0.15)] backdrop-blur-sm rounded-2xl border border-[rgba(255,255,255,0.2)] flex flex-col items-center justify-center">
            <span className="text-4xl max-[768px]:text-2xl font-semibold text-white">
              {block.value}
            </span>
            <span className="text-xs text-white/70 mt-1">{block.label}</span>
          </div>
          {i < 2 && (
            <span className="text-4xl max-[768px]:text-2xl font-semibold text-white">:</span>
          )}
        </div>
      ))}
    </div>
  );
}
