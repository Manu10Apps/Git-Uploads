/**
 * Sports Images Rotation System
 * Rotates sports pictures every 16 hours (57600 seconds)
 */

const SPORTS_IMAGES = [
  'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&q=80', // Football
  'https://images.unsplash.com/photo-1546519638-68711109e39d?w=800&q=80', // Basketball
  'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&q=80', // Soccer
  'https://images.unsplash.com/photo-1519046904884-53103b34b206?w=800&q=80', // Tennis
  'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&q=80', // Baseball
  'https://images.unsplash.com/photo-1552103313-1fa7e2f9e0ab?w=800&q=80', // Swimming
  'https://images.unsplash.com/photo-1538476905914-17a9e62f5839?w=800&q=80', // Marathon
  'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&q=80', // Cricket
];

const ROTATION_INTERVAL = 16 * 60 * 60 * 1000; // 16 hours in milliseconds

/**
 * Get the current sports image based on time
 * Rotates through SPORTS_IMAGES array every 16 hours
 */
export function getCurrentSportsImage(): string {
  const now = Date.now();
  const imageIndex = Math.floor((now / ROTATION_INTERVAL) % SPORTS_IMAGES.length);
  return SPORTS_IMAGES[imageIndex];
}

/**
 * Get all available sports images
 */
export function getAllSportsImages(): string[] {
  return SPORTS_IMAGES;
}

/**
 * Get the index of current image in rotation
 */
export function getCurrentImageIndex(): number {
  const now = Date.now();
  return Math.floor((now / ROTATION_INTERVAL) % SPORTS_IMAGES.length);
}

/**
 * Get the next image in rotation
 */
export function getNextSportsImage(): string {
  const now = Date.now();
  const nextIndex = (Math.floor((now / ROTATION_INTERVAL) % SPORTS_IMAGES.length) + 1) % SPORTS_IMAGES.length;
  return SPORTS_IMAGES[nextIndex];
}

/**
 * Calculate milliseconds until next image rotation (next 16-hour interval)
 */
export function getMillisecondsUntilNextRotation(): number {
  const now = Date.now();
  const nextRotationTime = Math.ceil((now + 1) / ROTATION_INTERVAL) * ROTATION_INTERVAL;
  return nextRotationTime - now;
}

/**
 * Get the time of the next image rotation
 */
export function getNextRotationTime(): Date {
  const msUntilNext = getMillisecondsUntilNextRotation();
  return new Date(Date.now() + msUntilNext);
}

/**
 * Format for display: "Updates every 16 hours | Next update: [time]"
 */
export function getRotationInfo(): { interval: string; nextUpdate: string } {
  const nextTime = getNextRotationTime();
  const timeString = nextTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  
  return {
    interval: 'Every 16 hours',
    nextUpdate: `Next: ${timeString}`,
  };
}
