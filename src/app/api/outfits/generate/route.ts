import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { occasion, itemSource } = await request.json()

    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get closet items
    const { data: items } = await supabase
      .from('closet_items')
      .select('*')
      .eq('is_archived', false)
      .limit(50)

    // Get user profile
    const { data: users } = await supabase
      .from('users')
      .select('*')
      .limit(1)

    const userProfile = users?.[0]

    let prompt = ''
    let closetDescription = ''

    if (itemSource === 'closet') {
      // Closet only mode
      if (!items || items.length === 0) {
        return NextResponse.json(
          { error: 'No items in closet. Please add some clothes first!' },
          { status: 400 }
        )
      }

      closetDescription = items.map(item => 
        `- ${item.name} (${item.category}, ${item.color}, vibes: ${item.vibe.join(', ')})`
      ).join('\n')

      prompt = `You are a professional stylist. Create an outfit for: ${occasion}

User's Style: ${userProfile?.style_vibe?.join(', ') || 'casual, elevated basics'}
Favorite Colors: ${userProfile?.color_palette?.join(', ') || 'neutral tones'}

Available Closet Items:
${closetDescription}

Create a complete outfit using ONLY items from the closet above. Return ONLY valid JSON:
{
  "label": "Creative outfit name",
  "items": ["item name 1", "item name 2", "item name 3"],
  "weather_rationale": "Why this works for the weather (78°F, Sunny)",
  "style_rationale": "Why this matches the user's style and occasion"
}`

    } else if (itemSource === 'mix') {
      // Mix mode - use some closet items and suggest new ones
      closetDescription = items && items.length > 0 
        ? items.map(item => `- ${item.name} (${item.category}, ${item.color})`).join('\n')
        : 'No items in closet yet'

      prompt = `You are a professional stylist. Create an outfit for: ${occasion}

User's Style: ${userProfile?.style_vibe?.join(', ') || 'casual, elevated basics'}
Budget: ${userProfile?.budget_level || '$$'}

${items && items.length > 0 ? `Closet Items Available:\n${closetDescription}` : 'User has an empty closet.'}

Create an outfit that ${items && items.length > 0 ? 'MIXES items from their closet with NEW item suggestions' : 'suggests ALL NEW items'}. Return ONLY valid JSON:
{
  "label": "Creative outfit name",
  "closet_items": ["closet item names to use"],
  "new_items": [
    {"description": "White sneakers", "category": "shoes", "reasoning": "why this completes the look"},
    {"description": "Gold hoop earrings", "category": "accessory", "reasoning": "adds polish"}
  ],
  "weather_rationale": "Why this works for 78°F, Sunny",
  "style_rationale": "Why this matches the user's style"
}`

    } else {
      // New items only mode
      prompt = `You are a professional stylist. Create a complete outfit for: ${occasion}

User's Style: ${userProfile?.style_vibe?.join(', ') || 'casual, elevated basics'}
Favorite Colors: ${userProfile?.color_palette?.join(', ') || 'neutral tones'}
Budget: ${userProfile?.budget_level || '$$'}

Create a COMPLETE outfit with ALL NEW items to purchase. Return ONLY valid JSON:
{
  "label": "Creative outfit name",
  "new_items": [
    {"description": "Black wide-leg trousers", "category": "bottom", "reasoning": "elegant base piece"},
    {"description": "Silk blouse in cream", "category": "top", "reasoning": "sophisticated and timeless"},
    {"description": "Leather loafers", "category": "shoes", "reasoning": "comfortable and chic"}
  ],
  "weather_rationale": "Why this works for 78°F, Sunny",
  "style_rationale": "Why this matches the user's style and budget"
}`
    }

    console.log('Generating outfit - Mode:', itemSource, 'Occasion:', occasion)

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a professional fashion stylist. Always respond with valid JSON only, no markdown."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.8,
      max_tokens: 600
    })

    const content = response.choices[0].message.content
    if (!content) throw new Error('No response from AI')

    console.log('AI Response:', content)

    const outfitData = JSON.parse(content.trim())

    // Build outfit data based on mode
    let selectedItemIds: string[] = []
    let newItems = []

    if (itemSource === 'closet') {
      selectedItemIds = items
        ?.filter(item => 
          outfitData.items?.some((name: string) => 
            item.name.toLowerCase().includes(name.toLowerCase()) ||
            name.toLowerCase().includes(item.name.toLowerCase())
          )
        )
        .map(item => item.id) || []
    } else if (itemSource === 'mix') {
      selectedItemIds = items
        ?.filter(item => 
          outfitData.closet_items?.some((name: string) => 
            item.name.toLowerCase().includes(name.toLowerCase()) ||
            name.toLowerCase().includes(item.name.toLowerCase())
          )
        )
        .map(item => item.id) || []
      newItems = outfitData.new_items || []
    } else {
      newItems = outfitData.new_items || []
    }

    console.log('Selected item IDs:', selectedItemIds)
    console.log('New items:', newItems)

    // Save outfit
    const userId = items?.[0]?.user_id || users?.[0]?.id
    
    const { data: outfit, error: outfitError } = await supabase
      .from('outfits')
      .insert([{
        user_id: userId,
        label: outfitData.label,
        context_type: 'manual_request',
        date: new Date().toISOString().split('T')[0],
        outfit_data: {
          closet_item_ids: selectedItemIds,
          new_items: newItems,
          weather_rationale: outfitData.weather_rationale,
          style_rationale: outfitData.style_rationale
        }
      }])
      .select()
      .single()

    if (outfitError) throw outfitError

    console.log('Outfit saved successfully')

    return NextResponse.json({ success: true, outfit })
  } catch (error: any) {
    console.error('Outfit generation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate outfit' },
      { status: 500 }
    )
  }
}