// Weather types and utility functions

export interface WeatherData {
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

export interface WeatherResponse {
  success: boolean;
  weather?: WeatherData;
  isFallback?: boolean;
  error?: string;
}

// Fetch weather by city name
export async function getWeatherByCity(city: string): Promise<WeatherResponse> {
  try {
    const response = await fetch(`/api/weather?city=${encodeURIComponent(city)}`);
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch weather:', error);
    return { success: false, error: 'Failed to fetch weather' };
  }
}

// Fetch weather by coordinates
export async function getWeatherByCoords(lat: number, lon: number): Promise<WeatherResponse> {
  try {
    const response = await fetch(`/api/weather?lat=${lat}&lon=${lon}`);
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch weather:', error);
    return { success: false, error: 'Failed to fetch weather' };
  }
}

// Get user's current location weather
export async function getWeatherByLocation(): Promise<WeatherResponse> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ success: false, error: 'Geolocation not supported' });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const result = await getWeatherByCoords(latitude, longitude);
        resolve(result);
      },
      (error) => {
        console.error('Geolocation error:', error);
        resolve({ success: false, error: 'Location access denied' });
      },
      { timeout: 10000 }
    );
  });
}

// Get weather-appropriate clothing suggestions
export function getWeatherClothingSuggestions(weather: WeatherData): {
  layers: string;
  fabricSuggestions: string[];
  avoidItems: string[];
  accessories: string[];
} {
  const temp = weather.temperature;
  const condition = weather.condition.toLowerCase();

  // Temperature-based suggestions
  if (temp >= 85) {
    return {
      layers: 'Single light layer',
      fabricSuggestions: ['linen', 'cotton', 'lightweight breathable fabrics'],
      avoidItems: ['jackets', 'sweaters', 'heavy fabrics', 'dark colors'],
      accessories: ['sunglasses', 'hat', 'light scarf for sun protection'],
    };
  } else if (temp >= 70) {
    return {
      layers: 'Light layers, optional light jacket for evening',
      fabricSuggestions: ['cotton', 'light blends', 'chambray'],
      avoidItems: ['heavy coats', 'wool', 'thick sweaters'],
      accessories: ['sunglasses', 'light cardigan'],
    };
  } else if (temp >= 55) {
    return {
      layers: 'Medium layers, bring a jacket',
      fabricSuggestions: ['cotton', 'light wool', 'denim', 'knits'],
      avoidItems: ['tank tops alone', 'shorts', 'sandals'],
      accessories: ['light jacket', 'scarf'],
    };
  } else if (temp >= 40) {
    return {
      layers: 'Multiple warm layers',
      fabricSuggestions: ['wool', 'cashmere', 'fleece', 'heavy cotton'],
      avoidItems: ['light summer fabrics', 'open-toe shoes'],
      accessories: ['warm coat', 'scarf', 'gloves optional'],
    };
  } else {
    return {
      layers: 'Heavy insulated layers',
      fabricSuggestions: ['wool', 'down', 'thermal fabrics', 'fleece'],
      avoidItems: ['thin fabrics', 'exposed skin'],
      accessories: ['heavy coat', 'scarf', 'gloves', 'hat', 'warm boots'],
    };
  }
}

// Generate weather rationale for outfit
export function generateWeatherRationale(weather: WeatherData): string {
  const suggestions = getWeatherClothingSuggestions(weather);
  const condition = weather.condition.toLowerCase();

  let rationale = `Current weather in ${weather.city}: ${weather.temperature}°F and ${weather.description}. `;

  // Add feels like if significantly different
  if (Math.abs(weather.feelsLike - weather.temperature) >= 5) {
    rationale += `Feels like ${weather.feelsLike}°F. `;
  }

  rationale += `Recommended: ${suggestions.layers}. `;

  // Weather condition specific advice
  if (condition.includes('rain') || condition.includes('drizzle')) {
    rationale += 'Consider water-resistant outerwear and closed-toe shoes. ';
  } else if (condition.includes('snow')) {
    rationale += 'Waterproof boots and warm layers essential. ';
  } else if (condition.includes('wind')) {
    rationale += 'A wind-resistant outer layer recommended. ';
  } else if (condition.includes('clear') || condition.includes('sun')) {
    rationale += 'Great day for your favorite pieces! ';
  }

  return rationale.trim();
}

// Weather icon mapping for UI
export function getWeatherEmoji(condition: string): string {
  const conditionLower = condition.toLowerCase();
  
  if (conditionLower.includes('clear') || conditionLower.includes('sun')) return '☀️';
  if (conditionLower.includes('cloud')) return '☁️';
  if (conditionLower.includes('rain') || conditionLower.includes('drizzle')) return '🌧️';
  if (conditionLower.includes('thunder') || conditionLower.includes('storm')) return '⛈️';
  if (conditionLower.includes('snow')) return '❄️';
  if (conditionLower.includes('mist') || conditionLower.includes('fog')) return '🌫️';
  if (conditionLower.includes('wind')) return '💨';
  
  return '🌤️';
}
