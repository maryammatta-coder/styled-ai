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
    const { userId, voicePrompt, weather, userPreferences } = await request.json()

    if (!userId || !voicePrompt) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Fetch user's closet items
    const { data: closetItems } = await supabase
      .from('closet_items')
      .select('*')
      .eq('user_id', userId)
      .eq('is_archived', false)

    // Build context for AI
    const weatherContext = weather
      ? `Current weather: ${weather.temperature}°F, ${weather.condition} in ${weather.city}`
      : 'Weather data not available'

    const styleContext = userPreferences?.style_vibe?.length
      ? `User's style preferences: ${userPreferences.style_vibe.join(', ')}`
      : ''

    const colorContext = userPreferences?.color_palette?.length
      ? `Preferred colors: ${userPreferences.color_palette.join(', ')}`
      : ''

    const avoidContext = userPreferences?.avoid_colors?.length
      ? `Colors to avoid: ${userPreferences.avoid_colors.join(', ')}`
      : ''

    const closetSummary = closetItems && closetItems.length > 0
      ? `User has ${closetItems.length} items in closet including: ${closetItems
          .slice(0, 10)
          .map((i: any) => `${i.name} (${i.category}, ${i.color})`)
          .join(', ')}`
      : 'User has no items in closet yet'

    // Generate outfits based on voice prompt
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an expert AI fashion stylist. The user will describe what they need in natural language.
Your job is to understand their request and generate 3 outfit suggestions.

CONTEXT:
${weatherContext}
${styleContext}
${colorContext}
${avoidContext}
${closetSummary}

RESPONSE FORMAT (JSON):
{
  "outfits": [
    {
      "label": "Outfit name",
      "itemSource": "closet" | "mix" | "new",
      "occasion": "Casual Day Out" | "Date Night" | "Work" | etc,
      "formalityLevel": 0-100,
      "closet_item_ids": ["id1", "id2"] or [],
      "new_items": [
        {"description": "Item description", "category": "top/bottom/dress/shoes/bag", "color": "color", "reasoning": "why", "estimated_price": "$X"}
      ],
      "weather_rationale": "Why this works for the weather",
      "style_rationale": "Why this fits their style and request",
      "styling_tips": ["Tip 1", "Tip 2"]
    }
  ]
}

RULES:
1. Parse their natural language request to determine:
   - Occasion (casual, work, date, brunch, etc)
   - Formality level
   - If they want closet items, mix & match, or new items only
2. If they have closet items and didn't specify "new only", try to use them
3. Keep it cohesive and weather-appropriate
4. Match their described vibe/mood
5. Return exactly 3 outfit options`,
        },
        {
          role: 'user',
          content: `User said: "${voicePrompt}"

Please generate 3 outfit suggestions based on this request.`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.8,
    })

    const result = JSON.parse(completion.choices[0]?.message?.content || '{}')

    if (!result.outfits || result.outfits.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No outfits generated' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      outfits: result.outfits,
    })
  } catch (error: any) {
    console.error('Voice outfit generation error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate outfits' },
      { status: 500 }
    )
  }
}
