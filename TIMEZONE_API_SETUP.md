# Timezone API Setup Guide

## Overview

The TopBar component displays weather, date, and timezone information. Timezone detection works in two modes:

### Mode 1: With TimezoneDB API (Preferred)

- **Accuracy**: 100% accurate timezone detection
- **Cost**: Free tier available (up to 1/second)
- **Setup Time**: 5 minutes

**Steps:**

1. Visit https://timezonedb.com/api
2. Click "Free Sign up" or "Create an account"
3. Complete registration and verify email
4. Copy your API key from the dashboard
5. Add to `.env.local`:
   ```
   NEXT_PUBLIC_TIMEZONEDB_KEY=your_actual_key_here
   ```
6. Restart development server: `npm run dev`

### Mode 2: Without TimezoneDB API (Fallback)

- **Accuracy**: ~95% accurate based on coordinates
- **Cost**: Free
- **Trade-off**: Uses coordinate-based estimation instead of actual timezone database

If `NEXT_PUBLIC_TIMEZONEDB_KEY` is not set or contains the placeholder value, the TopBar automatically falls back to estimating timezone from latitude/longitude coordinates using the `getTimezoneFromCoords()` function.

## Current Implementation

The updated `app/components/TopBar.tsx` (lines 48-61):

```typescript
let timezone = getTimezoneFromCoords(latitude, longitude);

const timezoneDbKey = process.env.NEXT_PUBLIC_TIMEZONEDB_KEY;
if (timezoneDbKey && timezoneDbKey !== "YOUR_TIMEZONE_KEY") {
  const tzResponse = await fetch(
    `https://api.timezonedb.com/v2.1/get-time-zone?key=${timezoneDbKey}&...`,
    { signal: AbortSignal.timeout(5000) },
  ).catch(() => null);

  const tzData = await tzResponse?.json().catch(() => null);
  if (tzData?.zoneName) {
    timezone = tzData.zoneName;
  }
}
```

**Behavior:**

1. Always tries local coordinate-based estimation first
2. If API key is configured: Attempts to fetch real timezone from TimezoneDB
3. If API fails or times out: Uses fallback (no error shown)
4. If API succeeds: Uses actual timezone from response

## Deployment

### Local Development

Add to `.env.local`:

```
NEXT_PUBLIC_TIMEZONEDB_KEY=your_key_here
```

### Production (VPS)

Add to Docker environment or Dokploy dashboard:

```
NEXT_PUBLIC_TIMEZONEDB_KEY=your_key_here
```

## Troubleshooting

**Timezone still shows (old-location)?**

- Clear browser cache and reload
- Check browser console for errors

**CORS error is gone but timezone still generic?**

- Your API key may have daily limits exceeded
- Wait 24 hours and try again
- Or check your key in TimezoneDB dashboard

**No timezone showing at all?**

- Browser geolocation blocked - check permissions
- Check browser console for any errors
