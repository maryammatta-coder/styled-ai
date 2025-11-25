import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { imageUrl, itemId } = await request.json()

    console.log('Classifying item:', itemId, imageUrl)

    // Classify the item using AI
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this clothing item and return ONLY a valid JSON object with this exact structure (no markdown, no extra text):
{
  "name": "brief description (e.g., 'White Cotton T-Shirt')",
  "category": "one of: top, bottom, dress, outerwear, shoes, bag, accessory",
  "color": "primary color",
  "season": ["array of: spring, summer, fall, winter"],
  "vibe": ["array of style vibes like: casual, elevated basics, professional, edgy, resort, etc"],
  "fit": "fit description (e.g., oversized, fitted, relaxed, cropped)"
}`
            },
            {
              type: "image_url",
              image_url: { url: imageUrl }
            }
          ]
        }
      ],
      max_tokens: 300
    })

    const content = response.choices[0].message.content
    if (!content) throw new Error('No response from AI')
    
    console.log('AI Response:', content)

    // Parse the JSON response
    const classification = JSON.parse(content.trim())

    // Update in database - need to use server-side Supabase client
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { error } = await supabase
      .from('closet_items')
      .update({
        name: classification.name,
        category: classification.category,
        color: classification.color,
        season: classification.season,
        vibe: classification.vibe,
        fit: classification.fit
      })
      .eq('id', itemId)

    if (error) throw error

    console.log('Item updated successfully')

    return NextResponse.json({ success: true, classification })
  } catch (error: any) {
    console.error('Classification error:', error)
    return NextResponse.json(
      { error: error.message || 'Classification failed' },
      { status: 500 }
    )
  }
}