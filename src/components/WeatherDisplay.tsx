'use client';

import { useState, useEffect } from 'react';
import { Cloud, Sun, CloudRain, Snowflake, Wind, MapPin, RefreshCw } from 'lucide-react';
import { WeatherData, getWeatherByCity, getWeatherByLocation, getWeatherEmoji } from '@/lib/weather';

interface WeatherDisplayProps {
  city?: string;
  onWeatherUpdate?: (weather: WeatherData) => void;
  compact?: boolean;
  showRefresh?: boolean;
  autoDetectLocation?: boolean;
}

export default function WeatherDisplay({
  city,
  onWeatherUpdate,
  compact = false,
  showRefresh = true,
  autoDetectLocation = false,
}: WeatherDisplayProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWeather = async () => {
    setLoading(true);
    setError(null);

    try {
      let result;

      if (autoDetectLocation) {
        result = await getWeatherByLocation();
        if (!result.success && city) {
          // Fall back to city if location fails
          result = await getWeatherByCity(city);
        }
      } else if (city) {
        result = await getWeatherByCity(city);
      } else {
        setError('No location specified');
        setLoading(false);
        return;
      }

      if (result.success && result.weather) {
        setWeather(result.weather);
        onWeatherUpdate?.(result.weather);
      } else {
        setError(result.error || 'Failed to fetch weather');
      }
    } catch (err) {
      setError('Failed to fetch weather');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather();
  }, [city, autoDetectLocation]);

  const getWeatherIcon = (condition: string) => {
    const conditionLower = condition.toLowerCase();
    const iconClass = compact ? 'w-5 h-5' : 'w-8 h-8';

    if (conditionLower.includes('clear') || conditionLower.includes('sun')) {
      return <Sun className={`${iconClass} text-yellow-500`} />;
    }
    if (conditionLower.includes('rain') || conditionLower.includes('drizzle')) {
      return <CloudRain className={`${iconClass} text-blue-500`} />;
    }
    if (conditionLower.includes('snow')) {
      return <Snowflake className={`${iconClass} text-blue-300`} />;
    }
    if (conditionLower.includes('wind')) {
      return <Wind className={`${iconClass} text-gray-500`} />;
    }
    return <Cloud className={`${iconClass} text-gray-400`} />;
  };

  if (loading) {
    return (
      <div className={`flex items-center gap-2 ${compact ? 'text-sm' : ''}`}>
        <RefreshCw className="w-4 h-4 animate-spin text-warm-grey" />
        <span className="text-warm-grey">Loading weather...</span>
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div className={`flex items-center gap-2 ${compact ? 'text-sm' : ''}`}>
        <Cloud className="w-4 h-4 text-warm-grey" />
        <span className="text-warm-grey">{error || 'Weather unavailable'}</span>
        {showRefresh && (
          <button onClick={fetchWeather} className="text-warm-grey hover:text-dark-taupe">
            <RefreshCw className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-sm">
        {getWeatherIcon(weather.condition)}
        <span className="font-medium text-dark-taupe">{weather.temperature}°F</span>
        <span className="text-warm-grey">{weather.city}</span>
        {showRefresh && (
          <button
            onClick={fetchWeather}
            className="text-warm-grey hover:text-dark-taupe ml-1"
            title="Refresh weather"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {getWeatherIcon(weather.condition)}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-semibold text-gray-900">
                {weather.temperature}°F
              </span>
              {weather.feelsLike !== weather.temperature && (
                <span className="text-sm text-gray-500">
                  Feels like {weather.feelsLike}°
                </span>
              )}
            </div>
            <p className="text-gray-600 capitalize">{weather.description}</p>
          </div>
        </div>
        {showRefresh && (
          <button
            onClick={fetchWeather}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded-lg transition-colors"
            title="Refresh weather"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-1 mt-3 text-sm text-gray-600">
        <MapPin className="w-4 h-4" />
        <span>{weather.city}, {weather.country}</span>
      </div>

      <div className="flex gap-4 mt-3 pt-3 border-t border-blue-100 text-sm text-gray-600">
        <div className="flex items-center gap-1">
          <span>💧</span>
          <span>{weather.humidity}% humidity</span>
        </div>
        <div className="flex items-center gap-1">
          <span>💨</span>
          <span>{weather.windSpeed} mph wind</span>
        </div>
      </div>
    </div>
  );
}
