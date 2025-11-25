import { openai } from './client'

export async function classifyClosetItem(imageUrl: string) {
  try {
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
    
    // Parse the JSON response
    const classified = JSON.parse(content.trim())
    return classified
  } catch (error) {
    console.error('Error classifying item:', error)
    throw error
  }
}