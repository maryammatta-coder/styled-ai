import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { generateWeatherRationale, getWeatherClothingSuggestions, WeatherData } from '@/lib/weather';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ClosetItem {
  id: string;
  name: string;
  category: string;
  color: string;
  season: string[];
  vibe: string[];
  fit: string;
  image_url: string;
}

interface NewItemSuggestion {
  description: string;
  category: string;
  color: string;
  reasoning: string;
  estimated_price?: string;
  search_terms?: string;
}

interface OutfitResponse {
  closet_item_ids: string[];
  new_items: NewItemSuggestion[];
  weather_rationale: string;
  style_rationale: string;
  outfit_name: string;
  styling_tips: string[];
}

// Fetch weather data
async function fetchWeather(city?: string, useAutoLocation?: boolean): Promise<WeatherData | null> {
  try {
    let url = `${process.env.NEXT_PUBLIC_APP_URL}/api/weather`;
    
    if (city) {
      url += `?city=${encodeURIComponent(city)}`;
    }
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.success && data.weather) {
      return data.weather;
    }
    return null;
  } catch (error) {
    console.error('Failed to fetch weather:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { occasion, itemSource, userId } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID required' },
        { status: 400 }
      );
    }

    // Fetch user profile
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Fetch real weather data
    let weather: WeatherData | null = null;
    
    if (user.use_auto_location) {
      // For auto-location, we'd need client-side coords
      // Fall back to home_city if available
      if (user.home_city) {
        weather = await fetchWeather(user.home_city);
      }
    } else if (user.home_city) {
      weather = await fetchWeather(user.home_city);
    }

    // Fallback weather if none available
    if (!weather) {
      weather = {
        temperature: 72,
        feelsLike: 72,
        condition: 'Clear',
        description: 'clear sky',
        humidity: 50,
        windSpeed: 5,
        icon: '01d',
        city: user.home_city || 'Unknown',
        country: user.home_country || 'US',
      };
    }

    // Generate weather-based clothing suggestions
    const weatherSuggestions = getWeatherClothingSuggestions(weather);
    const weatherRationale = generateWeatherRationale(weather);

    // Fetch closet items if needed
    let closetItems: ClosetItem[] = [];
    
    if (itemSource === 'closet' || itemSource === 'mix') {
      const { data: items, error: itemsError } = await supabase
        .from('closet_items')
        .select('*')
        .eq('user_id', userId)
        .eq('is_archived', false);

      if (itemsError) {
        console.error('Error fetching closet items:', itemsError);
      } else {
        closetItems = items || [];
      }
    }

    // Build the AI prompt
    const prompt = buildOutfitPrompt({
      occasion,
      itemSource,
      weather,
      weatherSuggestions,
      closetItems,
      userPreferences: {
        styleVibes: user.style_vibe || [],
        colorPalette: user.color_palette || [],
        avoidColors: user.avoid_colors || [],
        budgetLevel: user.budget_level || '$$',
      },
    });

    // Generate outfit using AI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a professional fashion stylist. Generate outfit recommendations in JSON format only. Be specific about items and include practical styling advice. Always respond with valid JSON matching the requested schema.`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const responseText = completion.choices[0]?.message?.content || '{}';
    let outfitData: OutfitResponse;

    try {
      outfitData = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      return NextResponse.json(
        { success: false, error: 'Failed to generate outfit' },
        { status: 500 }
      );
    }

    // Add weather rationale if not provided by AI
    if (!outfitData.weather_rationale) {
      outfitData.weather_rationale = weatherRationale;
    }

    // Save outfit to database
    const { data: savedOutfit, error: saveError } = await supabase
      .from('outfits')
      .insert({
        user_id: userId,
        label: outfitData.outfit_name || `${occasion} Outfit`,
        context_type: occasion,
        date: new Date().toISOString().split('T')[0],
        outfit_data: {
          closet_item_ids: outfitData.closet_item_ids || [],
          new_items: outfitData.new_items || [],
          weather_rationale: outfitData.weather_rationale,
          style_rationale: outfitData.style_rationale,
          styling_tips: outfitData.styling_tips || [],
          weather: {
            temperature: weather.temperature,
            condition: weather.condition,
            city: weather.city,
          },
        },
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving outfit:', saveError);
    }

    // Fetch full closet item details for response
    let outfitClosetItems: ClosetItem[] = [];
    if (outfitData.closet_item_ids && outfitData.closet_item_ids.length > 0) {
      const { data: fetchedItems } = await supabase
        .from('closet_items')
        .select('*')
        .in('id', outfitData.closet_item_ids);
      
      outfitClosetItems = fetchedItems || [];
    }

    return NextResponse.json({
      success: true,
      outfit: {
        id: savedOutfit?.id,
        label: outfitData.outfit_name || `${occasion} Outfit`,
        outfit_data: {
          closet_items: outfitClosetItems,
          closet_item_ids: outfitData.closet_item_ids || [],
          new_items: outfitData.new_items || [],
          weather_rationale: outfitData.weather_rationale,
          style_rationale: outfitData.style_rationale,
          styling_tips: outfitData.styling_tips || [],
        },
        weather: {
          temperature: weather.temperature,
          condition: weather.condition,
          city: weather.city,
        },
      },
    });
  } catch (error) {
    console.error('Outfit generation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate outfit' },
      { status: 500 }
    );
  }
}

interface PromptParams {
  occasion: string;
  itemSource: 'closet' | 'mix' | 'new';
  weather: WeatherData;
  weatherSuggestions: ReturnType<typeof getWeatherClothingSuggestions>;
  closetItems: ClosetItem[];
  userPreferences: {
    styleVibes: string[];
    colorPalette: string[];
    avoidColors: string[];
    budgetLevel: string;
  };
}

function buildOutfitPrompt(params: PromptParams): string {
  const { occasion, itemSource, weather, weatherSuggestions, closetItems, userPreferences } = params;

  let closetContext = '';
  if (closetItems.length > 0) {
    closetContext = `
AVAILABLE CLOSET ITEMS:
${closetItems.map((item, idx) => `${idx + 1}. ID: "${item.id}" - ${item.name} (${item.category}, ${item.color}, fits: ${item.fit}, vibes: ${item.vibe?.join(', ')})`).join('\n')}
`;
  }

  const sourceInstructions = {
    closet: 'Use ONLY items from the user\'s closet. Select 3-5 items that work together.',
    mix: 'Combine closet items with 1-2 new item suggestions. Use at least 2 closet items.',
    new: 'Suggest a complete outfit with all new items to purchase. Include 3-5 items.',
  };

  return `
Create an outfit for: ${occasion}

WEATHER CONDITIONS:
- Location: ${weather.city}
- Temperature: ${weather.temperature}°F (feels like ${weather.feelsLike}°F)
- Conditions: ${weather.condition} - ${weather.description}
- Humidity: ${weather.humidity}%
- Wind: ${weather.windSpeed} mph

WEATHER-BASED CLOTHING GUIDANCE:
- Recommended layers: ${weatherSuggestions.layers}
- Suggested fabrics: ${weatherSuggestions.fabricSuggestions.join(', ')}
- Items to avoid: ${weatherSuggestions.avoidItems.join(', ')}
- Accessories to consider: ${weatherSuggestions.accessories.join(', ')}

USER STYLE PREFERENCES:
- Style vibes: ${userPreferences.styleVibes.join(', ') || 'Not specified'}
- Favorite colors: ${userPreferences.colorPalette.join(', ') || 'Not specified'}
- Colors to avoid: ${userPreferences.avoidColors.join(', ') || 'None'}
- Budget level: ${userPreferences.budgetLevel}

${closetContext}

TASK: ${sourceInstructions[itemSource]}

Respond with a JSON object in this exact format:
{
  "outfit_name": "Creative name for this outfit",
  "closet_item_ids": ["id1", "id2"],
  "new_items": [
    {
      "description": "Detailed item description",
      "category": "top/bottom/shoes/accessory/outerwear",
      "color": "color name",
      "reasoning": "Why this item works for the outfit",
      "estimated_price": "$XX-$XX based on budget level",
      "search_terms": "keywords for shopping"
    }
  ],
  "weather_rationale": "Explanation of how outfit suits the weather",
  "style_rationale": "How outfit matches user's style preferences",
  "styling_tips": ["Tip 1", "Tip 2", "Tip 3"]
}

${itemSource === 'closet' ? 'IMPORTANT: closet_item_ids must contain valid IDs from the closet items list. new_items should be an empty array.' : ''}
${itemSource === 'new' ? 'IMPORTANT: closet_item_ids should be an empty array. Suggest 3-5 new items.' : ''}
`;
}