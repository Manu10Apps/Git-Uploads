/**
 * Hook for managing sports image rotation on the client side
 * Updates every 16 hours with real-time refresh capability
 */

'use client';

import { useEffect, useState } from 'react';
import { getCurrentSportsImage, getMillisecondsUntilNextRotation } from '@/lib/sports-images';

export function useSportsImageRotation() {
  const [currentImage, setCurrentImage] = useState<string>('');
  const [nextUpdateIn, setNextUpdateIn] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Set initial image
    setCurrentImage(getCurrentSportsImage());
    setNextUpdateIn(getMillisecondsUntilNextRotation());
    setIsLoading(false);

    // Set up interval to check for image changes every minute
    // (More efficient than checking every second)
    const checkInterval = setInterval(() => {
      const newImage = getCurrentSportsImage();
      setCurrentImage(newImage);
      setNextUpdateIn(getMillisecondsUntilNextRotation());
    }, 60 * 1000); // Check every minute

    return () => clearInterval(checkInterval);
  }, []);

  // Format the time until next update
  const formatTimeUntilUpdate = (): string => {
    if (!nextUpdateIn) return '';
    
    const hours = Math.floor(nextUpdateIn / (1000 * 60 * 60));
    const minutes = Math.floor((nextUpdateIn % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return {
    currentImage,
    nextUpdateIn,
    isLoading,
    timeUntilUpdate: formatTimeUntilUpdate(),
  };
}
