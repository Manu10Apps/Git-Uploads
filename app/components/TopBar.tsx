'use client';

import React, { useEffect, useState } from 'react';
import { Cloud, MapPin, TrendingUp } from 'lucide-react';

interface TopBarData {
  dateTime: string;
  simplifiedDate?: string;
  weather: {
    temp: number;
    condition: string;
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

export function TopBar() {
  const [data, setData] = useState<TopBarData | null>(null);
  const [mounted, setMounted] = useState(false);
  const [previousRates, setPreviousRates] = useState<{ [key: string]: number }>({});

  const fetchWeatherData = async () => {
    try {
      // Using Open-Meteo API (free, no API key required)
      // Fetch weather for Kigali, Rwanda (coordinates: -1.9536, 29.8739)
      const response = await fetch(
        'https://api.open-meteo.com/v1/forecast?latitude=-1.9536&longitude=29.8739&current=temperature_2m,weather_code&timezone=Africa/Kigali',
        { signal: AbortSignal.timeout(5000) } // 5 second timeout
      );
      const data = await response.json();
      const current = data.current;
      
      // Map WMO weather codes to conditions
      const weatherConditions: { [key: number]: { condition: string; icon: string } } = {
        0: { condition: 'Clear', icon: '☀️' },
        1: { condition: 'Mostly Clear', icon: '🌤️' },
        2: { condition: 'Partly Cloudy', icon: '⛅' },
        3: { condition: 'Overcast', icon: '☁️' },
        45: { condition: 'Foggy', icon: '🌫️' },
        48: { condition: 'Foggy', icon: '🌫️' },
        51: { condition: 'Light Drizzle', icon: '🌧️' },
        53: { condition: 'Drizzle', icon: '🌧️' },
        55: { condition: 'Heavy Drizzle', icon: '🌧️' },
        61: { condition: 'Light Rain', icon: '🌧️' },
        63: { condition: 'Rain', icon: '🌧️' },
        65: { condition: 'Heavy Rain', icon: '⛈️' },
        71: { condition: 'Light Snow', icon: '❄️' },
        73: { condition: 'Snow', icon: '❄️' },
        75: { condition: 'Heavy Snow', icon: '❄️' },
        80: { condition: 'Light Showers', icon: '🌧️' },
        81: { condition: 'Showers', icon: '⛈️' },
        82: { condition: 'Heavy Showers', icon: '⛈️' },
        85: { condition: 'Snow Showers', icon: '❄️' },
        86: { condition: 'Heavy Snow Showers', icon: '❄️' },
        95: { condition: 'Thunderstorm', icon: '⛈️' },
        96: { condition: 'Thunderstorm with Hail', icon: '⛈️' },
      };

      const weatherInfo = weatherConditions[current.weather_code] || { condition: 'Unknown', icon: '🌤️' };

      return {
        temp: Math.round(current.temperature_2m),
        condition: weatherInfo.condition,
        icon: weatherInfo.icon,
      };
    } catch (error) {
      // Silently handle - external API may be unavailable
      // Fallback
      return {
        temp: 24,
        condition: 'Partly Cloudy',
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
    setMounted(true);
    updateData();
    const interval = setInterval(updateData, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  const updateData = async () => {
    // Current date and time
    const now = new Date();
    
    // Kinyarwanda day names
    const daysKy = ['Ku Cyumweru', 'Kuwa Mbere', 'Kuwa Kabiri', 'Kuwa Gatatu', 'Kuwa Kane', 'Kuwa Gatanu', 'Kuwa Gatandatu'];
    // Kinyarwanda month names
    const monthsKy = ['Mutarama', 'Gashyantare', 'Werurwe', 'Mata', 'Gicurasi', 'Kamena', 'Nyakanga', 'Kanama', 'Nzeri', 'Ukwakira', 'Ugushyingo', 'Ukuboza'];
    
    const dayName = daysKy[now.getDay()];
    const day = String(now.getDate()).padStart(2, '0');
    const monthName = monthsKy[now.getMonth()];
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    
    const dateTime = `${dayName}, Tariki ya ${day} ${monthName}, ${year} | ${hours}:${minutes}`;
    const simplifiedDate = `${day}/${String(now.getMonth() + 1).padStart(2, '0')}/${year.toString().slice(-2)}`;

    // Fetch real weather data from API
    const weatherData = await fetchWeatherData();

    // Fetch real exchange rates from API
    const exchangeData = await fetchExchangeRates();

    setData({
      dateTime,
      simplifiedDate,
      weather: weatherData,
      location: { city: 'Kigali', country: 'Rwanda' },
      exchanges: exchangeData,
    });
  };

  if (!mounted || !data) return null;

  return (
    <div className="bg-gradient-to-r from-neutral-900 to-neutral-800 dark:from-neutral-950 dark:to-neutral-900 border-b border-neutral-700 dark:border-neutral-800 text-white/90 text-xs">
      <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-2">
        {/* Mobile layout - Simplified */}
        <div className="md:hidden flex items-center justify-between gap-2 overflow-x-auto">
          {/* Simplified Date */}
          <div className="flex items-center gap-1 whitespace-nowrap flex-shrink-0">
            <span className="text-neutral-400">📅</span>
            <span className="text-white/80 text-xs">{data.simplifiedDate}</span>
          </div>

          {/* Simplified Weather - temp only */}
          <div className="flex items-center gap-1 whitespace-nowrap flex-shrink-0 border-l border-neutral-600 pl-2">
            <span>{data.weather.icon}</span>
            <span className="text-white/80 text-xs">{data.weather.temp}°C</span>
          </div>

          {/* USD Only */}
          <div className="flex items-center gap-1 whitespace-nowrap flex-shrink-0 border-l border-neutral-600 pl-2 ml-auto">
            <span className="text-red-600 font-semibold text-xs">{data.exchanges[0]?.code}:</span>
            <span className="text-white/80 text-xs">{data.exchanges[0]?.rate}</span>
          </div>
        </div>

        {/* Desktop layout - Full details */}
        <div className="hidden md:flex items-center justify-between gap-4 overflow-x-auto">
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
              <span className="text-neutral-400">{data.weather.condition}</span>
            </div>
          </div>

          {/* Location */}
          <div className="flex items-center gap-2 whitespace-nowrap border-l border-neutral-600 pl-4">
            <MapPin className="w-4 h-4 text-red-600" />
            <span className="text-white/80">
              {data.location.city}, {data.location.country}
            </span>
          </div>

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
  );
}

