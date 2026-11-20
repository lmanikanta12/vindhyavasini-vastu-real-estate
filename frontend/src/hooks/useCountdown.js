import { useCallback, useEffect, useState } from 'react';

export default function useCountdown(start = 0) {
  const [left, setLeft] = useState(start);
  useEffect(() => {
    if (left <= 0) return undefined;
    const id = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [left]);
  const restart = useCallback((n = 60) => setLeft(n), []);
  return [left, restart];
}
