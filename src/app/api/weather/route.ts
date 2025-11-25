import { NextRequest, NextResponse } from 'next/server';

// OpenWeatherMap API integration
// Sign up at https://openweathermap.org/api to get a free API key

interface WeatherData {
  temperature: number;
  feelsLike: number;
  condition: string;
  description: string;
  humidity: number;
  windSpeed: number;
  icon: string;
  city: string;
  country: string;
}

interface OpenWeatherResponse {
  main: {
    temp: number;
    feels_like: number;
    humidity: number;
  };
  weather: Array<{
    main: string;
    description: string;
    icon: string;
  }>;
  wind: {
    speed: number;
  };
  name: string;
  sys: {
    country: string;
  };
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const city = searchParams.get('city');
    const lat = searchParams.get('lat');
    const lon = searchParams.get('lon');

    const apiKey = process.env.OPENWEATHER_API_KEY;

    if (!apiKey) {
      // Return fallback weather if no API key configured
      return NextResponse.json({
        success: true,
        weather: getFallbackWeather(city || 'Unknown'),
        isFallback: true,
      });
    }

    let url: string;

    if (lat && lon) {
      // Use coordinates if available (more accurate)
      url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=imperial`;
    } else if (city) {
      // Fall back to city name
      url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=imperial`;
    } else {
      return NextResponse.json(
        { success: false, error: 'City or coordinates required' },
        { status: 400 }
      );
    }

    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { success: false, error: 'City not found' },
          { status: 404 }
        );
      }
      throw new Error(`Weather API error: ${response.status}`);
    }

    const data: OpenWeatherResponse = await response.json();

    const weather: WeatherData = {
      temperature: Math.round(data.main.temp),
      feelsLike: Math.round(data.main.feels_like),
      condition: data.weather[0].main,
      description: data.weather[0].description,
      humidity: data.main.humidity,
      windSpeed: Math.round(data.wind.speed),
      icon: data.weather[0].icon,
      city: data.name,
      country: data.sys.country,
    };

    return NextResponse.json({
      success: true,
      weather,
      isFallback: false,
    });
  } catch (error) {
    console.error('Weather API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch weather' },
      { status: 500 }
    );
  }
}

// Fallback weather for when API is not configured
function getFallbackWeather(city: string): WeatherData {
  return {
    temperature: 72,
    feelsLike: 74,
    condition: 'Clear',
    description: 'clear sky',
    humidity: 50,
    windSpeed: 5,
    icon: '01d',
    city: city,
    country: 'US',
  };
}
