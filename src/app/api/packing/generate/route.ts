import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, destination, country, startDate, endDate, tripType, weather, days, isInternational } = body

    if (!userId || !destination || !tripType || !days) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Fetch user's closet items
    const { data: closetItems, error: closetError } = await supabase
      .from('closet_items')
      .select('*')
      .eq('user_id', userId)
      .eq('is_archived', false)

    if (closetError) {
      console.error('Error fetching closet:', closetError)
    }

    // Fetch user preferences
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('style_vibe, color_palette, budget_level')
      .eq('id', userId)
      .single()

    // Build closet context for AI
    const closetContext = closetItems && closetItems.length > 0
      ? closetItems.map(item => ({
          id: item.id,
          name: item.name,
          category: item.category,
          color: item.color,
          season: item.season,
          vibe: item.vibe,
          imageUrl: item.image_url,
        }))
      : []

    // Generate dates for daily outfits
    const tripDates: string[] = []
    const start = new Date(startDate)
    for (let i = 0; i < days; i++) {
      const date = new Date(start)
      date.setDate(start.getDate() + i)
      tripDates.push(date.toISOString().split('T')[0])
    }

    // Weather description
    const weatherDesc = weather 
      ? `${weather.temp}°F, ${weather.condition} (${weather.description})`
      : 'moderate weather'

    // Generate packing list with AI
    const prompt = `You are a professional travel packing expert and fashion stylist. Create a comprehensive packing list AND daily outfit suggestions for this trip:

TRIP DETAILS:
- Destination: ${destination}, ${country || 'USA'}
- Duration: ${days} days (${startDate} to ${endDate})
- Trip Type: ${tripType}
- Weather: ${weatherDesc}
- International Travel: ${isInternational ? 'Yes' : 'No'}

USER'S CLOSET ITEMS (reference these when suggesting from closet):
${closetContext.length > 0 
  ? JSON.stringify(closetContext.slice(0, 30), null, 2)
  : 'User has limited items in closet - suggest items they should pack/buy'}

USER STYLE PREFERENCES:
- Style: ${user?.style_vibe?.join(', ') || 'Not specified'}
- Favorite Colors: ${user?.color_palette?.join(', ') || 'Not specified'}

IMPORTANT INSTRUCTIONS:
1. Generate CLOTHING items appropriate for the weather and trip type
2. Include items the user should bring EVEN IF NOT in their closet (like snow boots for a cold destination, rain jacket for rainy weather, etc.)
3. For items from the user's closet, set isFromCloset: true and include their closetItemId and imageUrl
4. For suggested new items, set isFromCloset: false
5. Include underwear, socks, pajamas, and basics
6. Generate a daily outfit suggestion for each day of the trip
7. Be specific about quantities based on trip length

Respond with a JSON object in this exact format:
{
  "items": [
    {
      "name": "Item name (be specific, e.g., 'Warm Winter Coat' not just 'Coat')",
      "category": "clothing|shoes|accessories",
      "quantity": 1,
      "isFromCloset": true or false,
      "closetItemId": "id if from closet or null",
      "imageUrl": "url if from closet or null"
    }
  ],
  "outfits": [
    {
      "day": 1,
      "date": "${tripDates[0]}",
      "outfit": {
        "items": ["Item 1", "Item 2", "Item 3"],
        "description": "Brief description of the outfit and why it works for this day"
      }
    }
  ]
}

Generate:
- 15-30 clothing/shoe/accessory items depending on trip length
- One outfit per day (${days} outfits total)
- Weather-appropriate suggestions (e.g., snow boots, rain jacket, sun hat)
- Trip-type appropriate items (e.g., business attire for business trip, swimsuit for beach)`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful travel packing assistant and fashion stylist. Always respond with valid JSON only. Be specific with item names and include weather-appropriate clothing.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    })

    const responseText = completion.choices[0]?.message?.content || '{}'
    let packingData

    try {
      packingData = JSON.parse(responseText)
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError)
      return NextResponse.json(
        { success: false, error: 'Failed to generate packing list' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      items: packingData.items || [],
      outfits: packingData.outfits || [],
    })
  } catch (error) {
    console.error('Packing list generation error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate packing list' },
      { status: 500 }
    )
  }
}
