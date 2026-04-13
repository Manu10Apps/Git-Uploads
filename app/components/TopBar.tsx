'use client';

import React, { useEffect, useState } from 'react';
import { MapPin } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { getTranslation } from '@/lib/translations';
import { getLiveYouTubeVideoUrl } from '@/lib/utils';

// Custom live indicator animations
const LIVE_ANIMATIONS = `
  @keyframes liveGlow {
    0%, 100% {
      box-shadow: 0 0 5px rgba(220, 38, 38, 0.5), 0 0 10px rgba(239, 68, 68, 0.3);
    }
    50% {
      box-shadow: 0 0 10px rgba(220, 38, 38, 0.8), 0 0 20px rgba(239, 68, 68, 0.6), 0 0 30px rgba(220, 38, 38, 0.4);
    }
  }
  
  @keyframes livePulse {
    0%, 100% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.7;
      transform: scale(1.2);
    }
  }
  
  @keyframes liveRing {
    0% {
      transform: scale(0.8);
      opacity: 1;
    }
    100% {
      transform: scale(1.6);
      opacity: 0;
    }
  }
  
  @keyframes livePulseText {
    0%, 100% {
      text-shadow: 0 0 5px rgba(220, 38, 38, 0.5);
    }
    50% {
      text-shadow: 0 0 10px rgba(220, 38, 38, 0.9), 0 0 15px rgba(239, 68, 68, 0.6);
    }
  }
  
  .live-indicator {
    animation: liveGlow 1.5s ease-in-out infinite;
  }
  
  .live-dot {
    animation: livePulse 1.5s ease-in-out infinite;
  }
  
  .live-ring {
    animation: liveRing 1.5s ease-in-out infinite;
  }
  
  .live-text {
    animation: livePulseText 1.5s ease-in-out infinite;
  }
`;

// Hoisted outside the component — created once, not on every fetchWeatherData call.
const WEATHER_CONDITIONS: Record<number, { condition: string; conditionKy: string; conditionSw: string; icon: string }> = {
  0: { condition: 'Clear', conditionKy: 'Hari ikirere gikeye', conditionSw: 'Angavu', icon: '☀️' },
  1: { condition: 'Mostly Clear', conditionKy: 'Hari ikirere gikeye gake', conditionSw: 'Angavu zaidi', icon: '🌤️' },
  2: { condition: 'Partly Cloudy', conditionKy: 'Hari ibicu bike', conditionSw: 'Mawingu kidogo', icon: '⛅' },
  3: { condition: 'Overcast', conditionKy: 'Hari ibicu byinshi', conditionSw: 'Mawingu mengi', icon: '☁️' },
  45: { condition: 'Foggy', conditionKy: 'Hari igihu', conditionSw: 'Ukungu', icon: '🌫️' },
  48: { condition: 'Foggy', conditionKy: 'Hari igihu', conditionSw: 'Ukungu', icon: '🌫️' },
  51: { condition: 'Light Drizzle', conditionKy: 'Hari ubuhehere buke', conditionSw: 'Manyunyu kidogo', icon: '🌧️' },
  53: { condition: 'Drizzle', conditionKy: 'Hari ubuhehere', conditionSw: 'Manyunyu', icon: '🌧️' },
  55: { condition: 'Heavy Drizzle', conditionKy: "Hari akavura k'urushyana", conditionSw: 'Manyunyu makubwa', icon: '🌧️' },
  61: { condition: 'Light Rain', conditionKy: 'Hari udutonyanga duke', conditionSw: 'Mvua kidogo', icon: '🌧️' },
  63: { condition: 'Rain', conditionKy: 'Hari akavura', conditionSw: 'Mvua', icon: '🌧️' },
  65: { condition: 'Heavy Rain', conditionKy: 'Hari imvura', conditionSw: 'Mvua kubwa', icon: '⛈️' },
  71: { condition: 'Light Snow', conditionKy: 'Urubura ruke', conditionSw: 'Theluji kidogo', icon: '❄️' },
  73: { condition: 'Snow', conditionKy: 'Urubura', conditionSw: 'Theluji', icon: '❄️' },
  75: { condition: 'Heavy Snow', conditionKy: 'Urubura rwinshi', conditionSw: 'Theluji kubwa', icon: '❄️' },
  80: { condition: 'Light Showers', conditionKy: 'Hari akavura gake cyane', conditionSw: 'Manyunyu kidogo', icon: '🌧️' },
  81: { condition: 'Showers', conditionKy: 'Hari akavura', conditionSw: 'Mvua', icon: '⛈️' },
  82: { condition: 'Heavy Showers', conditionKy: 'Hari imvura', conditionSw: 'Mvua kubwa', icon: '⛈️' },
  85: { condition: 'Snow Showers', conditionKy: "Hari akavura k'urubura", conditionSw: 'Mvua ya theluji', icon: '❄️' },
  86: { condition: 'Heavy Snow Showers', conditionKy: "Hari imvura y'urubura", conditionSw: 'Mvua kubwa ya theluji', icon: '❄️' },
  95: { condition: 'Thunderstorm', conditionKy: "Hari imvura ivanze n'inkuba", conditionSw: 'Dhoruba ya radi', icon: '⛈️' },
  96: { condition: 'Thunderstorm with Hail', conditionKy: "Hari imvura ivanze n'inkuba n'imirabyo", conditionSw: 'Dhoruba ya radi na mvua ya mawe', icon: '⛈️' },
};

interface TopBarData {
  dateTime: string;
  simplifiedDate?: string;
  weather: {
    temp: number;
    condition: string;
    conditionKy: string;
    conditionSw: string;
    icon: string;
  };
  location: {
    city: string;
    country: string;
  };
  exchanges: Array<{
    code: string;
    rate: number;
    change: number;
  }>;
}

const DEFAULT_LOCATION = {
  lat: -1.9536,
  lon: 29.8739,
  city: 'Kigali',
  timezone: 'Africa/Kigali',
};

const FALLBACK_TOPBAR_DATA: TopBarData = {
  dateTime: '',
  simplifiedDate: '',
  weather: {
    temp: 24,
    condition: 'Partly Cloudy',
    conditionKy: 'Hari ikibunda gike',
    conditionSw: 'Mawingu kidogo',
    icon: '🌤️',
  },
  location: {
    city: 'Kigali',
    country: 'Rwanda',
  },
  exchanges: [
    { code: 'USD', rate: 1287, change: 0.15 },
    { code: 'EUR', rate: 1395, change: -0.08 },
    { code: 'GBP', rate: 1621, change: 0.22 },
  ],
};

function getDateStrings(timezone: string, lang: string = 'ky') {
  const now = new Date();
  const daysKy = ['Ku Cyumweru', 'Kuwa Mbere', 'Kuwa Kabiri', 'Kuwa Gatatu', 'Kuwa Kane', 'Kuwa Gatanu', 'Kuwa Gatandatu'];
  const monthsKy = ['Mutarama', 'Gashyantare', 'Werurwe', 'Mata', 'Gicurasi', 'Kamena', 'Nyakanga', 'Kanama', 'Nzeri', 'Ukwakira', 'Ugushyingo', 'Ukuboza'];
  const daysEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const monthsEn = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const daysSw = ['Jumapili', 'Jumatatu', 'Jumanne', 'Jumatano', 'Alhamisi', 'Ijumaa', 'Jumamosi'];
  const monthsSw = ['Januari', 'Februari', 'Machi', 'Aprili', 'Mei', 'Juni', 'Julai', 'Agosti', 'Septemba', 'Oktoba', 'Novemba', 'Desemba'];

  const days = lang === 'en' ? daysEn : lang === 'sw' ? daysSw : daysKy;
  const months = lang === 'en' ? monthsEn : lang === 'sw' ? monthsSw : monthsKy;
  const datePrefix = lang === 'en' ? '' : lang === 'sw' ? 'Tarehe' : 'Tariki ya';

  const localizedNow = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
  const dayName = days[localizedNow.getDay()];
  const day = String(localizedNow.getDate()).padStart(2, '0');
  const monthName = months[localizedNow.getMonth()];
  const year = localizedNow.getFullYear();
  const hours = String(localizedNow.getHours()).padStart(2, '0');
  const minutes = String(localizedNow.getMinutes()).padStart(2, '0');

  const datePart = datePrefix ? `${datePrefix} ${day} ${monthName}` : `${monthName} ${day}`;

  return {
    dateTime: `${dayName}, ${datePart}, ${year} | ${hours}:${minutes}`,
    simplifiedDate: `${day}/${String(localizedNow.getMonth() + 1).padStart(2, '0')}/${year.toString().slice(-2)}`,
  };
}

export function TopBar() {
  const { language } = useAppStore();
  const [data, setData] = useState<TopBarData>(() => ({
    ...FALLBACK_TOPBAR_DATA,
    ...getDateStrings(DEFAULT_LOCATION.timezone, language),
  }));
  const [previousRates, setPreviousRates] = useState<{ [key: string]: number }>({});
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number; city: string; country: string; timezone: string }>({ ...DEFAULT_LOCATION, country: 'Rwanda' });
  const [liveVideoUrl, setLiveVideoUrl] = useState<string | null>(null);

  // Detect user's location
  const detectLocation = async () => {
    try {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;

            // Get city name and timezone from coordinates using reverse geocoding
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
              { signal: AbortSignal.timeout(5000) }
            );
            const geoData = await response.json();
            const city = geoData.address?.city || geoData.address?.town || geoData.address?.county || 'Unknown';
            const country = geoData.address?.country || 'Rwanda';

            // Get timezone using lat/lon (optional - uses env var if available)
            let timezone = getTimezoneFromCoords(latitude, longitude);

            const timezoneDbKey = process.env.NEXT_PUBLIC_TIMEZONEDB_KEY;
            if (timezoneDbKey && timezoneDbKey !== 'YOUR_TIMEZONE_KEY') {
              const tzResponse = await fetch(
                `https://api.timezonedb.com/v2.1/get-time-zone?key=${timezoneDbKey}&format=json&by=position&lat=${latitude}&lng=${longitude}`,
                { signal: AbortSignal.timeout(5000) }
              ).catch(() => null);

              const tzData = await tzResponse?.json().catch(() => null);
              if (tzData?.zoneName) {
                timezone = tzData.zoneName;
              }
            }

            setUserLocation({ lat: latitude, lon: longitude, city, country, timezone });
          },
          async () => {
            // Geolocation denied — fall back to IP-based geolocation
            await detectLocationByIP();
          }
        );
      } else {
        await detectLocationByIP();
      }
    } catch (error) {
      console.error('Location detection error:', error);
      await detectLocationByIP();
    }
  };

  // IP-based geolocation fallback (no permission required)
  const detectLocationByIP = async () => {
    try {
      const response = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(5000) });
      const data = await response.json();
      if (data && data.latitude && data.longitude) {
        setUserLocation({
          lat: data.latitude,
          lon: data.longitude,
          city: data.city || 'Unknown',
          country: data.country_name || 'Unknown',
          timezone: data.timezone || getTimezoneFromCoords(data.latitude, data.longitude),
        });
        return;
      }
    } catch {
      // IP geo unavailable — use hardcoded default
    }
    setUserLocation({ ...DEFAULT_LOCATION, country: 'Rwanda' });
  };

  // Fallback timezone mapping based on coordinates
  const getTimezoneFromCoords = (lat: number, lon: number): string => {
    if (lat > -2 && lat < 0 && lon > 29 && lon < 31) return 'Africa/Kigali';
    if (lat > 33 && lat < 35 && lon > -8 && lon < -5) return 'Africa/Casablanca';
    if (lat > -4 && lat < -2 && lon > 37 && lon < 42) return 'Africa/Nairobi';
    if (lat > -18 && lat < -11 && lon > 21 && lon < 30) return 'Africa/Lusaka';
    // Default to UTC
    return 'UTC';
  };

  const fetchWeatherData = async (lat?: number, lon?: number) => {
    try {
      // Use detected location or default to Kigali
      const latitude = lat ?? DEFAULT_LOCATION.lat;
      const longitude = lon ?? DEFAULT_LOCATION.lon;
      
      // Using Open-Meteo API (free, no API key required)
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&timezone=auto`,
        { signal: AbortSignal.timeout(5000) }
      );
      const weatherData = await response.json();
      const current = weatherData.current;
      

      const weatherInfo = WEATHER_CONDITIONS[current.weather_code] || { condition: 'Unknown', conditionKy: 'Ifuzo ritamenyekana', conditionSw: 'Haijulikani', icon: '🌤️' };

      return {
        temp: Math.round(current.temperature_2m),
        condition: weatherInfo.condition,
        conditionKy: weatherInfo.conditionKy,
        conditionSw: weatherInfo.conditionSw,
        icon: weatherInfo.icon,
      };
    } catch (error) {
      // Silently handle - external API may be unavailable
      // Fallback
      return {
        temp: 24,
        condition: 'Partly Cloudy',
        conditionKy: 'Hari ibicu bike',
        conditionSw: 'Mawingu kidogo',
        icon: '🌤️',
      };
    }
  };

  const fetchExchangeRates = async () => {
    try {
      // Using exchangerate-api.com (free tier - 1500 requests/month)
      // Converts USD, EUR, GBP to RWF
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/RWF', {
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      const data = await response.json();
      
      const rates = data.rates;
      const exchangeData = [
        { 
          code: 'USD', 
          rate: Math.round((1 / rates.USD) * 100) / 100,
          change: calculateChange('USD', 1 / rates.USD)
        },
        { 
          code: 'EUR', 
          rate: Math.round((1 / rates.EUR) * 100) / 100,
          change: calculateChange('EUR', 1 / rates.EUR)
        },
        { 
          code: 'GBP', 
          rate: Math.round((1 / rates.GBP) * 100) / 100,
          change: calculateChange('GBP', 1 / rates.GBP)
        },
      ];

      setPreviousRates({
        USD: 1 / rates.USD,
        EUR: 1 / rates.EUR,
        GBP: 1 / rates.GBP,
      });

      return exchangeData;
    } catch (error) {
      // Silently handle - external API may be unavailable or blocked
      // Fallback to mock data
      return [
        { code: 'USD', rate: 1287, change: 0.15 },
        { code: 'EUR', rate: 1395, change: -0.08 },
        { code: 'GBP', rate: 1621, change: 0.22 },
      ];
    }
  };

  const calculateChange = (code: string, currentRate: number): number => {
    if (!previousRates[code]) return 0;
    const change = ((currentRate - previousRates[code]) / previousRates[code]) * 100;
    return Math.round(change * 100) / 100;
  };

  useEffect(() => {
    const deferredDetectLocation = () => {
      window.setTimeout(() => {
        void detectLocation();
      }, 1500);
    };

    if ('requestIdleCallback' in window) {
      const idleId = window.requestIdleCallback(deferredDetectLocation, { timeout: 2000 });
      return () => window.cancelIdleCallback(idleId);
    }

    deferredDetectLocation();
  }, []);

  // Check for live video status
  useEffect(() => {
    const checkLiveVideo = async () => {
      console.log('[TopBar] Checking for live videos...');
      const url = await getLiveYouTubeVideoUrl();
      console.log('[TopBar] Live video URL:', url);
      setLiveVideoUrl(url);
    };

    // Check immediately on mount
    void checkLiveVideo();

    // Check every 30 seconds for live video status changes
    const intervalId = setInterval(() => {
      void checkLiveVideo();
    }, 30000);

    return () => clearInterval(intervalId);
  }, []);

  const handleLiveClick = () => {
    if (liveVideoUrl) {
      window.open(liveVideoUrl, '_blank');
    }
  };

  // Update data whenever location changes.
  // Defer the very first call so it doesn't fire during initial hydration
  // and add to TBT — the fallback data is already displayed.
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>;

    const startUpdates = () => {
      void updateData();
      intervalId = setInterval(() => {
        void updateData();
      }, 60000);
    };

    let idleId: number | undefined;

    if ('requestIdleCallback' in window) {
      idleId = window.requestIdleCallback(startUpdates, { timeout: 3000 });
    } else {
      const tid = setTimeout(startUpdates, 1500);
      return () => {
        clearTimeout(tid);
        clearInterval(intervalId);
      };
    }

    return () => {
      if (idleId !== undefined) window.cancelIdleCallback(idleId);
      clearInterval(intervalId);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLocation]);

  const updateData = async () => {
    const { dateTime, simplifiedDate } = getDateStrings(userLocation.timezone, language);

    const [weatherData, exchangeData] = await Promise.all([
      fetchWeatherData(userLocation.lat, userLocation.lon),
      fetchExchangeRates(),
    ]);

    setData({
      dateTime,
      simplifiedDate,
      weather: weatherData,
      location: { city: userLocation.city, country: userLocation.country },
      exchanges: exchangeData,
    });
  };

  // Re-format date when language changes
  useEffect(() => {
    const { dateTime, simplifiedDate } = getDateStrings(userLocation.timezone, language);
    setData((prev) => ({ ...prev, dateTime, simplifiedDate }));
  }, [language]);

  const weatherConditionText = language === 'en'
    ? data.weather.condition
    : language === 'sw'
      ? data.weather.conditionSw
      : data.weather.conditionKy;

  return (
    <>
      <style>{LIVE_ANIMATIONS}</style>
      <div className="min-h-[40px] bg-gradient-to-r from-neutral-900 to-neutral-800 dark:from-neutral-950 dark:to-neutral-900 border-b border-neutral-700 dark:border-neutral-800 text-white/90 text-xs">
        <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-2">
          {/* Mobile layout - Simplified */}
          <div className="lg:hidden grid grid-cols-[auto_1fr_auto_auto] items-center gap-2 min-w-0">
          {/* Simplified Date */}
          <div className="flex items-center gap-1 flex-shrink-0 max-[380px]:hidden">
            <span className="text-neutral-400">📅</span>
            <span className="text-white/80 text-xs">{data.simplifiedDate}</span>
          </div>

          {/* Simplified Weather - temp only on very small screens */}
          <div className="flex items-center gap-1 sm:gap-2 min-w-0 border-l border-neutral-600 pl-2 max-[380px]:border-l-0 max-[380px]:pl-0">
            <span className="flex-shrink-0">{data.weather.icon}</span>
            <span className="text-white/80 text-xs flex-shrink-0">{data.weather.temp}°C</span>
            <span className="text-neutral-400 text-xs truncate hidden sm:inline">{weatherConditionText}</span>
          </div>

          {/* Live indicator - Visible on mobile/tablet */}
          {liveVideoUrl && (
            <button
              onClick={handleLiveClick}
              className="flex items-center gap-1 flex-shrink-0 border-l border-neutral-600 pl-2 cursor-pointer hover:opacity-90 transition-opacity active:opacity-70 rounded px-1.5 py-0.5"
              title="Click to watch live"
              aria-label="Watch live video"
            >
              <div className="flex items-center gap-1 live-indicator rounded px-1">
                <div className="relative w-2 h-2">
                  {/* Outer pulsing ring */}
                  <div className="absolute inset-0 bg-red-600 rounded-full live-ring" />
                  {/* Main pulsing dot */}
                  <div className="absolute inset-0 bg-red-600 rounded-full live-dot" style={{ boxShadow: '0 0 6px rgba(220, 38, 38, 0.9), inset 0 0 3px rgba(255, 255, 255, 0.4)' }} />
                  {/* Inner glow */}
                  <div className="absolute inset-1 bg-red-400 rounded-full opacity-50 blur-sm" />
                </div>
                <span className="text-red-600 font-bold text-xs live-text">LIVE</span>
              </div>
            </button>
          )}

          {/* USD Only */}
          <div className="flex items-center gap-1 flex-shrink-0 border-l border-neutral-600 pl-2">
            <span className="text-red-600 font-semibold text-xs">{data.exchanges[0]?.code}:</span>
            <span className="text-white/80 text-xs tabular-nums">{data.exchanges[0]?.rate}</span>
          </div>
        </div>

        {/* Desktop layout - Full details */}
        <div className="hidden lg:flex items-center justify-between gap-4 overflow-x-auto">
          {/* Date & Time */}
          <div className="flex items-center gap-2 whitespace-nowrap">
            <span className="text-neutral-400">📅</span>
            <span className="text-white/80">{data.dateTime}</span>
          </div>

          {/* Weather */}
          <div className="flex items-center gap-2 whitespace-nowrap border-l border-neutral-600 pl-4">
            <span>{data.weather.icon}</span>
            <div className="flex items-center gap-1">
              <span className="text-white/80">{data.weather.temp}°C</span>
              <span className="text-neutral-400">{weatherConditionText}</span>
            </div>
          </div>

          {/* Location */}
          <div className="flex items-center gap-2 whitespace-nowrap border-l border-neutral-600 pl-4">
            <MapPin className="w-4 h-4 text-red-600" />
            <span className="text-white/80">
              {data.location.city}, {data.location.country}
            </span>
          </div>

          {/* Live indicator - Desktop */}
          {liveVideoUrl && (
            <button
              onClick={handleLiveClick}
              className="flex items-center gap-2.5 whitespace-nowrap border-l border-neutral-600 pl-4 cursor-pointer hover:opacity-90 transition-opacity active:opacity-70 rounded px-2 py-1"
              title="Click to watch live"
              aria-label="Watch live video"
            >
              <div className="relative w-3 h-3 live-indicator rounded-full">
                {/* Outer pulsing ring */}
                <div className="absolute inset-0 bg-red-600 rounded-full live-ring" />
                {/* Main pulsing dot */}
                <div className="absolute inset-0 bg-red-600 rounded-full live-dot" style={{ boxShadow: '0 0 10px rgba(220, 38, 38, 1), inset 0 0 4px rgba(255, 255, 255, 0.5)' }} />
                {/* Inner bright glow */}
                <div className="absolute inset-1 bg-red-400 rounded-full opacity-60 blur-sm" />
              </div>
              <span className="text-red-600 font-bold text-sm live-text">LIVE</span>
            </button>
          )}

          {/* Currency Exchanges */}
          <div className="flex items-center gap-3 border-l border-neutral-600 pl-4 ml-auto">
            {data.exchanges.map((exchange) => (
              <div key={exchange.code} className="flex items-center gap-1 whitespace-nowrap">
                <span className="text-red-600 font-semibold">{exchange.code}:</span>
                <span className="text-white/80">{exchange.rate}</span>
                <span className={exchange.change >= 0 ? 'text-green-400' : 'text-red-400'}>
                  {exchange.change >= 0 ? '↑' : '↓'}{Math.abs(exchange.change)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
    </>
  );
}

