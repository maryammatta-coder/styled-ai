import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

interface ReverseImageSearchResult {
  found: boolean
  productName?: string
  productDescription?: string
  fullPageContent?: string
  color?: string
  material?: string
  rise?: string
  brand?: string
  source?: string
  price?: string
  productUrl?: string
}

async function tryReverseImageSearch(imageUrl: string): Promise<ReverseImageSearchResult> {
  // Check if reverse search is enabled via environment variable
  const enableReverseSearch = process.env.ENABLE_REVERSE_SEARCH === 'true'
  const serpApiKey = process.env.SERPAPI_KEY

  if (!enableReverseSearch) {
    console.log('ℹ️  Reverse image search disabled (set ENABLE_REVERSE_SEARCH=true to enable)')
    return { found: false }
  }

  if (!serpApiKey) {
    console.log('❌ SerpAPI key not found, skipping reverse image search')
    return { found: false }
  }

  try {
    console.log('🔍 Starting reverse image search for:', imageUrl)

    const searchUrl = `https://serpapi.com/search.json?engine=google_lens&url=${encodeURIComponent(imageUrl)}&api_key=${serpApiKey}`

    const response = await fetch(searchUrl)
    const data = await response.json()

    console.log('📊 SerpAPI full response:', JSON.stringify(data, null, 2))

    // Check for errors
    if (data.error) {
      console.error('❌ SerpAPI error:', data.error)
      return { found: false }
    }

    // Try visual matches first
    if (data.visual_matches && data.visual_matches.length > 0) {
      console.log(`✅ Found ${data.visual_matches.length} visual matches!`)

      // Get top 5 matches to analyze
      const topMatches = data.visual_matches.slice(0, 5)

      for (const match of topMatches) {
        console.log('🎯 Match:', {
          title: match.title,
          source: match.source,
          link: match.link,
          price: match.price,
          snippet: match.snippet || match.description
        })
      }

      const topMatch = topMatches[0]
      const productName = topMatch.title || topMatch.source
      const productDescription = topMatch.snippet || topMatch.description || ''

      // Extract color from TOP MATCH TITLE FIRST
      let extractedColor = ''

      // COMPREHENSIVE color keywords including all variations
      const colorKeywords = [
        'natural', 'beige', 'tan', 'camel', 'sand', 'khaki', 'cream', 'ivory', 'ecru', 'flax', 'nude', 'taupe', 'stone',
        'white', 'off-white', 'black', 'charcoal', 'gray', 'grey',
        'navy', 'blue', 'denim', 'light blue', 'dark blue',
        'red', 'pink', 'blush', 'coral', 'burgundy', 'maroon', 'wine',
        'green', 'olive', 'sage', 'emerald', 'forest green',
        'yellow', 'mustard', 'gold',
        'orange', 'rust', 'terracotta', 'burnt orange',
        'brown', 'chocolate', 'coffee',
        'purple', 'lavender', 'plum', 'lilac'
      ]

      // PRIORITY 1: Extract color from TOP match title (the most relevant match)
      const topMatchTitle = (topMatch.title || '').toLowerCase()
      console.log(`🔍 Checking TOP match title for color: "${topMatch.title}"`)

      for (const color of colorKeywords) {
        // Look for "in [color]" or just "[color]" in title
        const inColorRegex = new RegExp(`\\bin\\s+${color}\\b`, 'i')
        const colorRegex = new RegExp(`\\b${color}\\b`, 'i')

        if (inColorRegex.test(topMatchTitle) || colorRegex.test(topMatchTitle)) {
          extractedColor = color
          console.log(`🎨 FOUND color in TOP match title: "${color}"`)
          break
        }
      }

      if (!extractedColor) {
        console.log(`⚠️ NO COLOR in top match title - reverse search found wrong variant. Will rely ONLY on image analysis.`)
      }

      console.log('✨ Using top match:', productName)
      if (productDescription) {
        console.log('📝 Product description:', productDescription)
      }

      // Fetch the actual product page to get full details
      let fullPageContent = ''
      let scrapedColor = extractedColor // Start with title color if found
      let scrapedRise = ''
      let scrapedMaterial = ''
      const skipColorScraping = !extractedColor // If no color in title, don't trust page scraping

      if (topMatch.link) {
        try {
          console.log('🌐 Fetching product page:', topMatch.link)
          const pageResponse = await fetch(topMatch.link, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
          })
          const pageHtml = await pageResponse.text()

          // Extract text content (remove HTML tags)
          const textContent = pageHtml.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .toLowerCase()

          fullPageContent = textContent.substring(0, 2000) // Keep first 2000 chars
          console.log('✅ Scraped product page content')
          console.log('📄 First 500 chars:', textContent.substring(0, 500))

          // Look for rise mentions
          if (/low[\s-]?rise/i.test(textContent)) {
            scrapedRise = 'low-rise'
            console.log('📏 Found rise in page: low-rise')
          } else if (/high[\s-]?rise/i.test(textContent)) {
            scrapedRise = 'high-rise'
            console.log('📏 Found rise in page: high-rise')
          } else if (/mid[\s-]?rise/i.test(textContent)) {
            scrapedRise = 'mid-rise'
            console.log('📏 Found rise in page: mid-rise')
          }

          // AGGRESSIVE color extraction - look EVERYWHERE in first 1000 chars
          const pageColorKeywords = [
            'natural', 'tan', 'beige', 'sand', 'khaki', 'camel', 'cream', 'ivory', 'ecru', 'flax', 'nude', 'taupe', 'stone',
            'white', 'off-white', 'black', 'charcoal', 'gray', 'grey',
            'navy', 'blue', 'denim', 'light blue', 'dark blue',
            'red', 'pink', 'blush', 'coral', 'burgundy', 'maroon', 'wine',
            'green', 'olive', 'sage', 'emerald', 'forest green',
            'yellow', 'mustard', 'gold',
            'orange', 'rust', 'terracotta', 'burnt orange',
            'brown', 'chocolate', 'coffee',
            'purple', 'lavender', 'plum', 'lilac'
          ]

          // Only scrape for color if the title had a color (otherwise it's wrong variant)
          if (!skipColorScraping && !scrapedColor) {
            const searchArea = textContent.substring(0, 1000)
            console.log('🔍 Searching for colors in page content...')

            for (const color of pageColorKeywords) {
              if (new RegExp(`\\b${color}\\b`, 'i').test(searchArea)) {
                scrapedColor = color
                console.log(`🎨 FOUND COLOR in page: "${color}"`)
                break
              }
            }

            if (!scrapedColor) {
              console.log('⚠️ NO COLOR FOUND in page content!')
            }
          } else if (skipColorScraping) {
            console.log('⚠️ SKIPPING color scraping - no color in title means wrong variant. Will use IMAGE ONLY.')
          }

          // Look for material mentions
          const materials = ['denim', 'linen', 'cotton', 'silk', 'satin', 'leather', 'suede', 'wool', 'polyester']
          for (const material of materials) {
            if (new RegExp(`\\b${material}\\b`, 'i').test(textContent.substring(0, 1000))) {
              scrapedMaterial = material
              console.log(`🧵 Found material in page: ${material}`)
              break
            }
          }

        } catch (fetchError) {
          console.error('⚠️ Failed to fetch product page:', fetchError)
        }
      }

      return {
        found: true,
        productName: productName,
        productDescription: productDescription,
        fullPageContent: fullPageContent,
        color: scrapedColor || extractedColor,
        rise: scrapedRise,
        material: scrapedMaterial,
        source: topMatch.source,
        brand: topMatch.source,
        price: topMatch.price?.value || topMatch.price,
        productUrl: topMatch.link
      }
    }

    console.log('❌ No visual matches found')
    return { found: false }
  } catch (error) {
    console.error('❌ Reverse image search error:', error)
    return { found: false }
  }
}

export async function POST(request: NextRequest) {
  try {
    const { imageUrl, itemId } = await request.json()

    console.log('🏷️  Classifying item:', itemId, imageUrl)

    // Step 1: Try reverse image search
    const reverseSearchResult = await tryReverseImageSearch(imageUrl)

    if (reverseSearchResult.found && reverseSearchResult.productName) {
      console.log('✅ PRODUCT FOUND via reverse search:', reverseSearchResult.productName)
      console.log('   Source:', reverseSearchResult.source)
    } else {
      console.log('⚠️  No product found via reverse search, using AI only')
    }

    // Step 2: Use AI for detailed classification
    let promptPrefix = ''

    if (reverseSearchResult.found && reverseSearchResult.productName) {
      // Use reverse search data to INFORM classification
      let productInfo = `🎯 PRODUCT IDENTIFIED: "${reverseSearchResult.productName}" from ${reverseSearchResult.source || 'retailer'}`

      if (reverseSearchResult.productDescription) {
        productInfo += `\n📝 Product Description: "${reverseSearchResult.productDescription}"`
      }

      if (reverseSearchResult.price) {
        productInfo += `\n💰 Price: ${reverseSearchResult.price}`
      }

      if (reverseSearchResult.color) {
        productInfo += `\n🎨 Scraped Color: ${reverseSearchResult.color}`
      }

      if (reverseSearchResult.rise) {
        productInfo += `\n📏 Scraped Rise: ${reverseSearchResult.rise}`
      }

      if (reverseSearchResult.material) {
        productInfo += `\n🧵 Scraped Material: ${reverseSearchResult.material}`
      }

      promptPrefix = `${productInfo}

🎯 CRITICAL: Product page was scraped to extract ACCURATE metadata. Use this information:

1. RISE (for bottoms): ${reverseSearchResult.rise ? `The product page says "${reverseSearchResult.rise}" - YOU MUST USE THIS EXACT RISE. This is the actual product specification.` : 'If the product name mentions "low-rise", "mid-rise", or "high-rise", USE THAT EXACT RISE.'}

2. COLOR: ${reverseSearchResult.color ? `Product found color: "${reverseSearchResult.color}". Look at the image and use this color if it matches. If it says "natural", translate to beige/tan/cream. If the image looks different, use the image color.` : 'No color found in product match - reverse search found a different variant. CRITICAL: Analyze ONLY the image to determine color. Look VERY carefully for subtle tints (pale blue, beige, blush) - do not default to white unless truly pure white.'}

3. MATERIAL: ${reverseSearchResult.material ? `The product page says "${reverseSearchResult.material}" - use this material.` : 'Look for fabric mentions in the description (denim, silk, satin, cotton, etc.).'}

4. BRAND: Extract brand from source (${reverseSearchResult.source || 'product name'}) if relevant.

IMPORTANT FOR NAME: Create a DESCRIPTIVE NAME based on what you see in the image AND the scraped product details. Don't just use "${reverseSearchResult.productName}" - make it descriptive like "Tan Low-Rise Linen-Blend Shorts" or "Black Satin Midi Slip Dress".

`
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // Using gpt-4o for better accuracy
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `${promptPrefix}Analyze this clothing item and return ONLY a valid JSON object with this exact structure (no markdown, no extra text):

🚨 CRITICAL FOR BOTTOMS (jeans/pants/shorts) - READ THIS FIRST 🚨

IF THIS IS A BOTTOM, you MUST determine the RISE before anything else:

FOR PHOTOS WITH A MODEL (person wearing it):
- LOW-RISE: waistband sits on hips, BELOW belly button
- MID-RISE: waistband at belly button level
- HIGH-RISE: waistband ABOVE belly button toward ribcage

FOR FLAT LAY PHOTOS (no model):

Look at where the crotch seam is positioned relative to the waistband:

LOW-RISE characteristics:
- Crotch seam is VERY CLOSE to the waistband (compact, short distance)
- Zipper is visibly SHORT and compact
- The front rise area looks tight/small with minimal fabric between waistband and crotch
- Hip-hugger aesthetic, Y2K style

MID-RISE characteristics:
- Crotch seam is at a MODERATE distance from waistband
- Zipper is medium length (not particularly short or long)
- Front rise area has standard amount of fabric
- Standard modern jean proportions

HIGH-RISE characteristics:
- Crotch seam is VERY FAR from the waistband (lots of vertical space)
- Zipper is visibly LONG
- The front rise area looks spacious with significant fabric between waistband and crotch
- Vintage 90s mom jean or "paper bag waist" aesthetic

🎨 COLOR CLASSIFICATION - BE SPECIFIC AND ACCURATE:
Look at the ACTUAL color in the image. Use ONLY these specific color names (DO NOT use "natural"):

⚠️ COMMON MISTAKES - Look VERY CAREFULLY at subtle color tints:
- Pale blue vs white: If there's ANY hint of blue tint, it's baby blue/light blue/powder blue - NOT white
- Beige vs white: If there's ANY warmth/tan tint, it's beige/cream/ivory - NOT white or off-white
- Pink vs white: If there's ANY pink tint, it's blush/pale pink - NOT white
- TRUE white has NO color tint at all (pure bright white with zero warmth or coolness)
- When uncertain, choose the color WITH the tint, not white

NEUTRALS: beige, tan, cream, ivory, white, off-white, camel, taupe, sand, khaki, brown, chocolate, black, charcoal, gray, light gray, silver, stone, nude
BLUES: navy, royal blue, cobalt, sky blue, baby blue, teal, turquoise, denim blue, light blue, powder blue
GREENS: sage, olive, forest green, emerald, mint, lime, hunter green, dark green
REDS/PINKS: red, burgundy, maroon, wine, blush, pink, hot pink, coral, salmon, rose
PURPLES: purple, lavender, lilac, plum, violet, mauve
YELLOWS/ORANGES: yellow, mustard, gold, orange, burnt orange, rust, terracotta, peach
MULTI: if multiple colors are equally prominent, specify (e.g., "black and white striped", "blue floral")

🧵 MATERIAL CLASSIFICATION - LOOK CLOSELY:
Identify the fabric texture and sheen:
- DENIM: thick cotton twill, visible texture, for jeans (light denim, dark denim, black denim, white denim)
- COTTON: matte, soft appearance, t-shirts, casual wear
- SILK/SATIN: shiny, smooth, drapes fluidly
- LEATHER/FAUX LEATHER: shiny or matte, structured, stiff
- SUEDE: soft nap texture, matte
- LINEN: textured, slightly wrinkled, breathable
- WOOL/KNIT: visible knit texture, sweaters, cozy
- POLYESTER/SYNTHETIC: smooth, often shiny
- LACE: delicate, see-through patterns
- SEQUIN/BEADED: sparkly embellishments
- If truly unclear, use "null"

INSTRUCTIONS FOR CREATING THE NAME:
Create a DETAILED, SPECIFIC description that captures ALL visible features and details. Include:

1. COLOR (always first - be specific!)
2. STYLE/FIT (bodycon, oversized, fitted, relaxed, etc.)
3. MAIN TYPE (dress, top, jeans, etc.)
4. SPECIFIC FEATURES - Include ALL that apply:

For DRESSES:
- Length: mini/midi/maxi
- Neckline/straps: spaghetti straps/strapless/halter/v-neck/square neck/off-shoulder
- Sleeve details: sleeveless/short-sleeve/long-sleeve/puff-sleeve/bell-sleeve
- Closure/details: front buttons/back zip/side slit/ruching/cutouts/tie-waist
- Pattern/texture: floral/striped/polka dot/ribbed/pleated/lace/sequin

For TOPS:
- Neckline: crew/v-neck/scoop/square/halter/strapless/off-shoulder/turtleneck
- Sleeves: sleeveless/tank/cami/short-sleeve/3/4-sleeve/long-sleeve/puff-sleeve/bell-sleeve
- Style: crop/cropped/fitted/oversized/babydoll/peplum/wrap
- Details: buttons/ties/ruching/cutouts/lace trim/ribbed

For BOTTOMS:
- Type: jeans/pants/shorts/skirt/leggings
- Cut/style: wide-leg/flare/straight-leg/skinny/bootcut/cargo/mini/midi/maxi
- Details: distressed/ripped/belt loops/pockets/pleated/slit

For SHOES:
- Type: stilettos/pumps/wedges/block heels/kitten heels/strappy heels/ankle strap/flats/loafers/sneakers/boots/sandals/slides
- Heel height: if applicable (low/medium/high)
- Details: pointed toe/round toe/open toe/ankle strap/lace-up/platform
- Brand: if visible (Nike/Adidas/Yeezy/Jordan/Axel Arigato/etc.)

For OUTERWEAR:
- Type: blazer/jacket/coat/puffer/bomber/trench/cardigan
- Weight: lightweight/medium/heavy
- Details: quilted/ribbed/belted/hooded/zip-up/button-up/oversized/cropped

EMBELLISHMENTS (always include if present):
- sparkly/glittery/sequin/rhinestone/beaded/embroidered/lace/ruched/pleated/ribbed/drape/cutout

Examples of GOOD detailed names:
- "Beige Bodycon Mini Dress with Spaghetti Straps and Front Button Detail"
- "Light Denim Low-Rise Flare Jeans" ← short zipper, low rise area
- "Black Low-Rise Straight-Leg Jeans" ← hip-hugger style
- "Dark Denim Mid-Rise Skinny Jeans" ← medium zipper, normal proportions
- "White High-Rise Wide-Leg Jeans" ← long zipper, tall rise area
- "Navy Satin Midi Slip Dress with Cowl Neck"
- "Burgundy Leather Moto Jacket with Silver Zippers"
- "Sage Green Linen Wide-Leg Pants"
- "Cream Ribbed Knit Turtleneck Sweater"

Return JSON:
{
  "name": "your detailed description here (include specific color + ALL visible features)",
  "category": "one of: top, bottom, dress, outerwear, shoes, bag, accessory",
  "color": "use SPECIFIC color name from the color palette above",
  "season": ["array of: spring, summer, fall, winter"],
  "vibe": ["array of style vibes like: casual, elevated basics, professional, edgy, resort, etc"],
  "fit": "FOR BOTTOMS: MUST include 'low-rise', 'mid-rise', or 'high-rise' (see instructions at top). For tops/dresses: oversized, fitted, relaxed, cropped, bodycon, etc",
  "material": "BE SPECIFIC - look at texture and sheen. For jeans use 'denim' or 'light denim'/'dark denim'. For shiny fabrics use 'satin' or 'silk'. Only use 'null' if truly unclear"
}`
            },
            {
              type: "image_url",
              image_url: { url: imageUrl }
            }
          ]
        }
      ],
      max_tokens: 500
    })

    const content = response.choices[0].message.content
    if (!content) {
      console.error('❌ OpenAI returned empty response')
      throw new Error('No response from AI')
    }

    console.log('✅ Raw AI Response (length:', content.length, '):', content)

    // Strip markdown formatting if present (common issue)
    let cleanedContent = content.trim()
    if (cleanedContent.startsWith('```json')) {
      cleanedContent = cleanedContent.replace(/^```json\s*/, '').replace(/\s*```$/, '')
      console.log('🧹 Stripped markdown formatting')
    } else if (cleanedContent.startsWith('```')) {
      cleanedContent = cleanedContent.replace(/^```\s*/, '').replace(/\s*```$/, '')
      console.log('🧹 Stripped markdown formatting')
    }

    // Parse the JSON response
    let classification
    try {
      classification = JSON.parse(cleanedContent.trim())
      console.log('✅ Parsed classification:', classification)
    } catch (parseError) {
      console.error('❌ JSON Parse Error:', parseError)
      console.error('❌ Content after cleaning:', cleanedContent)
      console.error('❌ First 200 chars:', cleanedContent.substring(0, 200))
      console.error('❌ Last 200 chars:', cleanedContent.substring(Math.max(0, cleanedContent.length - 200)))
      throw new Error('Failed to parse AI response as JSON')
    }

    // Update in database - need to use server-side Supabase client
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Prepare update data
    const updateData: any = {
      name: classification.name,
      category: classification.category,
      color: classification.color,
      season: classification.season,
      vibe: classification.vibe,
      fit: classification.fit,
    }

    // Only add material if it exists and isn't the string "null"
    if (classification.material && classification.material !== 'null') {
      updateData.material = classification.material
    }

    const { error } = await supabase
      .from('closet_items')
      .update(updateData)
      .eq('id', itemId)

    if (error) {
      console.error('❌ Database update error:', error)
      throw new Error(`Database error: ${error.message}`)
    }

    console.log('✅ Item updated successfully:', itemId)

    return NextResponse.json({ success: true, classification })
  } catch (error: any) {
    console.error('❌ CLASSIFICATION FAILED:', error.message)
    console.error('❌ Full error:', error)
    return NextResponse.json(
      { error: error.message || 'Classification failed' },
      { status: 500 }
    )
  }
}