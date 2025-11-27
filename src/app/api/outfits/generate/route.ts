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

interface ClosetItem {
  id: string
  name: string
  category: string
  color: string
  season: string[]
  vibe: string[]
  fit: string
  image_url: string
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function getWeatherCategory(temp: number): 'hot' | 'warm' | 'mild' | 'cool' | 'cold' {
  if (temp >= 75) return 'hot'
  if (temp >= 70) return 'warm'
  if (temp >= 60) return 'mild'
  if (temp >= 50) return 'cool'
  return 'cold'
}

function getFormalityFromOccasion(occasion: string): number {
  const lower = occasion.toLowerCase()
  
  // Formal occasions
  if (lower.includes('wedding') || lower.includes('gala') || lower.includes('formal') ||
      lower.includes('black tie') || lower.includes('cocktail')) {
    return 85
  }
  
  // Dressy occasions
  if (lower.includes('date night') || lower.includes('dinner') || lower.includes('party') ||
      lower.includes('anniversary') || lower.includes('birthday')) {
    return 70
  }
  
  // Smart casual
  if (lower.includes('brunch') || lower.includes('lunch') || lower.includes('meeting') ||
      lower.includes('interview') || lower.includes('work')) {
    return 55
  }
  
  // Casual
  return 35
}

function getFormalityCategory(level: number): 'casual' | 'smartCasual' | 'dressy' | 'formal' {
  if (level <= 40) return 'casual'
  if (level <= 60) return 'smartCasual'
  if (level <= 80) return 'dressy'
  return 'formal'
}

function categorizeItem(item: ClosetItem): string {
  const name = (item.name || '').toLowerCase()
  const category = (item.category || '').toLowerCase()
  
  if (category.includes('dress') || name.includes('dress')) return 'dress'
  if (category.includes('outerwear') || name.includes('jacket') || name.includes('coat') || 
      name.includes('blazer') || name.includes('cardigan') || name.includes('puffer')) return 'outerwear'
  if (category.includes('shoe') || name.includes('heel') || name.includes('boot') || 
      name.includes('sneaker') || name.includes('sandal') || name.includes('loafer') ||
      name.includes('flat') || name.includes('pump') || name.includes('slingback') ||
      name.includes('mule') || name.includes('yeezy') || name.includes('jordan')) return 'shoes'
  if (category.includes('bottom') || name.includes('pants') || name.includes('trouser') ||
      name.includes('jeans') || name.includes('skirt') || name.includes('shorts')) return 'bottom'
  if (category.includes('top') || name.includes('shirt') || name.includes('blouse') ||
      name.includes('top') || name.includes('tank') || name.includes('cami') ||
      name.includes('sweater') || name.includes('turtleneck') || name.includes('t-shirt') ||
      name.includes('bodysuit') || name.includes('mock neck') || name.includes('halter')) return 'top'
  
  return 'other'
}

function isWeatherAppropriate(item: ClosetItem, temp: number): boolean {
  const name = (item.name || '').toLowerCase()
  const cat = categorizeItem(item)
  
  // Outerwear follows different rules
  if (cat === 'outerwear') {
    // Only include outerwear if cold
    return temp < 60
  }
  
  // HOT weather (75°F+)
  if (temp >= 75) {
    if (name.includes('long sleeve') || name.includes('long-sleeve')) return false
    if (name.includes('sweater') || name.includes('knit') || name.includes('wool')) return false
    if (name.includes('turtleneck') || name.includes('mock neck') || name.includes('mock-neck')) return false
    if (name.includes('ribbed')) return false
    if (name.includes('jacket') || name.includes('coat') || name.includes('puffer') || name.includes('blazer')) return false
    if (name.includes('boot') && !name.includes('ankle')) return false
  }
  
  // WARM weather (70-74°F)
  if (temp >= 70 && temp < 75) {
    if (name.includes('long sleeve') || name.includes('long-sleeve')) return false
    if (name.includes('sweater') || name.includes('wool') || name.includes('heavy')) return false
    if (name.includes('turtleneck') || name.includes('mock neck')) return false
    if (name.includes('ribbed')) return false
    if (name.includes('puffer')) return false
  }
  
  // COLD weather (below 50°F) - reject skimpy items
  if (temp < 50) {
    if (name.includes('tank') || name.includes('sleeveless') || name.includes('cami')) return false
    if (name.includes('halter')) return false
    if (name.includes('shorts') || name.includes('mini skirt')) return false
    if (name.includes('sandal') || name.includes('open-toe') || name.includes('open toe')) return false
    if (name.includes('draped') || name.includes('drape')) return false // Usually revealing
  }
  
  return true
}

function isShoeAppropriateForFormality(item: ClosetItem, formalityLevel: number): boolean {
  const name = (item.name || '').toLowerCase()
  const formality = getFormalityCategory(formalityLevel)
  
  if (formality === 'casual') {
    if (name.includes('stiletto') || name.includes('pump')) return false
    if (name.includes('strappy') && name.includes('heel')) return false
    if (name.includes('wedge')) return false
    if (name.includes('slingback')) return false
    if (name.includes('heel') && !name.includes('block') && !name.includes('low') && !name.includes('kitten')) {
      return false
    }
  }
  
  if (formality === 'formal') {
    if (name.includes('sneaker')) return false
    if (name.includes('flat') && !name.includes('ballet')) return false
    if (name.includes('loafer')) return false
    if (name.includes('combat')) return false
  }
  
  return true
}

function isItemAppropriateForFormality(item: ClosetItem, formalityLevel: number): boolean {
  const name = (item.name || '').toLowerCase()
  const category = categorizeItem(item)
  const formality = getFormalityCategory(formalityLevel)
  
  // For CASUAL, reject very dressy items
  if (formality === 'casual') {
    if (name.includes('drape') || name.includes('draped')) return false
    if (name.includes('silk') && category === 'top') return false
    if (name.includes('satin')) return false
    if (name.includes('sequin') || name.includes('sparkle')) return false
    if (name.includes('cocktail') || name.includes('formal') || name.includes('evening')) return false
    if (name.includes('halter') && !name.includes('casual')) return false
  }
  
  // For FORMAL, reject very casual items
  if (formality === 'formal') {
    if (name.includes('t-shirt') || name.includes('tee ')) return false
    if (name.includes('casual')) return false
    if (name.includes('athletic') || name.includes('sports')) return false
    if (name.includes('hoodie') || name.includes('sweatshirt')) return false
    if (name.includes('denim') && category === 'bottom') return false
  }
  
  return true
}

function doVibesClash(item1: ClosetItem, item2: ClosetItem): boolean {
  const getVibes = (item: ClosetItem): string[] => {
    const name = (item.name || '').toLowerCase()
    const vibes: string[] = []
    
    if (name.includes('yeezy') || name.includes('jordan') || name.includes('nike') || 
        name.includes('adidas') || name.includes('sneaker') || name.includes('hoodie') ||
        name.includes('athletic') || name.includes('high-top') || name.includes('boost')) {
      vibes.push('streetwear')
    }
    
    if (name.includes('button-up') || name.includes('structured') || name.includes('blazer') ||
        name.includes('heel') || name.includes('pump') || name.includes('slingback') ||
        name.includes('elegant') || name.includes('draped') || name.includes('silk')) {
      vibes.push('polished')
    }
    
    if (name.includes('crochet') || name.includes('boho') || name.includes('flowy') ||
        name.includes('peasant') || name.includes('fringe')) {
      vibes.push('bohemian')
    }
    
    if (vibes.length === 0) vibes.push('neutral')
    return vibes
  }
  
  const vibes1 = getVibes(item1)
  const vibes2 = getVibes(item2)
  
  if (vibes1.includes('neutral') || vibes2.includes('neutral')) return false
  
  if ((vibes1.includes('streetwear') && vibes2.includes('polished')) ||
      (vibes1.includes('polished') && vibes2.includes('streetwear'))) {
    return true
  }
  
  return false
}

// ============================================================
// MAIN API HANDLER
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, occasion, itemSource = 'closet', weather, destination, eventContext } = body

    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID required' }, { status: 400 })
    }

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
    }

    // Get weather
    let temperature = 72
    let weatherCity = destination || user.home_city || 'Unknown'
    
    if (weather?.temperature) {
      temperature = weather.temperature
      weatherCity = weather.city || weatherCity
    }

    // Get closet items
    let closetItems: ClosetItem[] = []
    if (itemSource === 'closet' || itemSource === 'mix') {
      const { data: items } = await supabase
        .from('closet_items')
        .select('*')
        .eq('user_id', userId)
        .eq('is_archived', false)
      closetItems = items || []
    }

    const weatherCat = getWeatherCategory(temperature)
    const formalityLevel = getFormalityFromOccasion(occasion)
    const formalityCat = getFormalityCategory(formalityLevel)

    // Filter items for weather and formality
    const appropriate: Record<string, ClosetItem[]> = {
      top: [], bottom: [], dress: [], shoes: [], outerwear: []
    }

    closetItems.forEach((item: ClosetItem) => {
      const cat = categorizeItem(item)
      
      const weatherOK = isWeatherAppropriate(item, temperature)
      const shoesFormalityOK = cat !== 'shoes' || isShoeAppropriateForFormality(item, formalityLevel)
      const itemFormalityOK = isItemAppropriateForFormality(item, formalityLevel)
      
      if (weatherOK && shoesFormalityOK && itemFormalityOK && appropriate[cat]) {
        appropriate[cat].push(item)
      }
      
      // Always include outerwear for cold weather
      if (cat === 'outerwear' && temperature < 60) {
        if (!appropriate.outerwear.some(o => o.id === item.id)) {
          appropriate.outerwear.push(item)
        }
      }
    })

    // Build item lists
    const formatItems = (items: ClosetItem[]) => 
      items.map((i: ClosetItem) => `ID:"${i.id}" → ${i.name} (${i.color})`).join('\n') || '(none)'

    // Determine outfit structure
    let outfitGuidance: string
    if (formalityCat === 'formal') {
      outfitGuidance = 'For formal: Pick an elegant DRESS + HEELS'
    } else if (formalityCat === 'dressy') {
      outfitGuidance = 'For dressy: Pick a nice DRESS + HEELS, or TOP + DRESSY PANTS + HEELS'
    } else {
      outfitGuidance = 'Pick a TOP + BOTTOM + COMFORTABLE SHOES'
    }

    const prompt = `You are a fashion stylist creating ONE perfect outfit.

## OCCASION
Event: ${occasion}
${eventContext?.title ? `Calendar Event: ${eventContext.title}` : ''}
Formality: ${formalityCat.toUpperCase()}
Weather: ${temperature}°F in ${weatherCity} (${weatherCat.toUpperCase()})

## USER STYLE
Aesthetic: ${user.style_vibe?.join(', ') || 'Classic'}
Favorite colors: ${user.color_palette?.join(', ') || 'Neutrals'}
Avoid: ${user.avoid_colors?.join(', ') || 'None'}

## AVAILABLE ITEMS (pre-filtered for weather + formality)

TOPS:
${formatItems(appropriate.top)}

BOTTOMS:
${formatItems(appropriate.bottom)}

DRESSES:
${formatItems(appropriate.dress)}

SHOES:
${formatItems(appropriate.shoes)}

${temperature < 60 ? `OUTERWEAR (required for ${temperature}°F):
${formatItems(appropriate.outerwear)}` : ''}

## OUTFIT RULES
${outfitGuidance}

STRICT RULES:
1. Pick EXACTLY: 1 top + 1 bottom + 1 shoes  OR  1 dress + 1 shoes
2. NEVER pick 2 tops - that makes no sense!
3. ${temperature < 60 ? 'ADD 1 outerwear for warmth' : 'NO outerwear needed'}
4. If using a dress, do NOT add any top or bottom
5. Only use IDs from the lists above
6. Make sure colors coordinate (no purple+blue, no red+pink)
7. Make sure styles match (no Yeezys with elegant dresses)

## RESPONSE (JSON only)
{
  "outfit_name": "Creative name for this look",
  "closet_item_ids": ["id1", "id2", "id3"],
  "new_items": [],
  "weather_rationale": "Why these specific items work for ${temperature}°F - reference the actual items you picked",
  "style_rationale": "Why this works for ${occasion}",
  "styling_tips": ["Tip 1", "Tip 2"]
}

IMPORTANT: In weather_rationale and style_rationale, describe the ACTUAL items you selected (by name), not different items!`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an expert fashion stylist. Rules:
1. Pick exactly 1 top + 1 bottom + 1 shoes, OR 1 dress + 1 shoes
2. NEVER pick 2 tops
3. ${temperature < 50 ? 'COLD WEATHER: Add warm outerwear, no sleeveless/tanks' : temperature >= 70 ? 'WARM: No long sleeves, no sweaters' : ''}
4. Your rationale must describe the items you actually picked, not different ones
5. Only use IDs provided in the lists`
        },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    })

    let outfitData
    try {
      outfitData = JSON.parse(completion.choices[0]?.message?.content || '{}')
    } catch {
      return NextResponse.json({ success: false, error: 'Failed to parse response' }, { status: 500 })
    }

    // Validate and fix the outfit
    let validIds = (outfitData.closet_item_ids || []).filter((id: string) =>
      closetItems.some((item: ClosetItem) => item.id === id)
    )

    const selectedItems = validIds.map((id: string) => 
      closetItems.find((item: ClosetItem) => item.id === id)!
    ).filter(Boolean)

    const selected = {
      tops: selectedItems.filter((i: ClosetItem) => categorizeItem(i) === 'top'),
      bottoms: selectedItems.filter((i: ClosetItem) => categorizeItem(i) === 'bottom'),
      dresses: selectedItems.filter((i: ClosetItem) => categorizeItem(i) === 'dress'),
      shoes: selectedItems.filter((i: ClosetItem) => categorizeItem(i) === 'shoes'),
      outerwear: selectedItems.filter((i: ClosetItem) => categorizeItem(i) === 'outerwear')
    }

    // FIX: If no shoes, add one
    if (selected.shoes.length === 0 && appropriate.shoes.length > 0) {
      validIds.push(appropriate.shoes[0].id)
      selected.shoes.push(appropriate.shoes[0])
    }

    // FIX: If dress outfit, remove extra tops/bottoms
    if (selected.dresses.length > 0) {
      validIds = [
        selected.dresses[0].id,
        selected.shoes[0]?.id,
        ...(temperature < 60 && selected.outerwear.length > 0 ? [selected.outerwear[0].id] : [])
      ].filter(Boolean) as string[]
    } else {
      // FIX: Ensure exactly 1 top, 1 bottom, 1 shoes
      const finalIds: string[] = []
      
      // Keep only 1 top
      if (selected.tops.length > 0) {
        finalIds.push(selected.tops[0].id)
      } else if (appropriate.top.length > 0) {
        finalIds.push(appropriate.top[0].id)
      }
      
      // Keep only 1 bottom
      if (selected.bottoms.length > 0) {
        finalIds.push(selected.bottoms[0].id)
      } else if (appropriate.bottom.length > 0) {
        finalIds.push(appropriate.bottom[0].id)
      }
      
      // Keep only 1 shoes
      if (selected.shoes.length > 0) {
        finalIds.push(selected.shoes[0].id)
      }
      
      // Add outerwear if cold
      if (temperature < 60 && selected.outerwear.length > 0) {
        finalIds.push(selected.outerwear[0].id)
      } else if (temperature < 60 && appropriate.outerwear.length > 0) {
        finalIds.push(appropriate.outerwear[0].id)
      }
      
      validIds = finalIds
    }

    // Remove weather-inappropriate items
    validIds = validIds.filter((id: string) => {
      const item = closetItems.find((i: ClosetItem) => i.id === id)
      if (!item) return false
      if (categorizeItem(item) === 'outerwear') return temperature < 60
      return isWeatherAppropriate(item, temperature)
    })

    // Get final items
    const finalItems = validIds
      .map((id: string) => closetItems.find((item: ClosetItem) => item.id === id))
      .filter((item: ClosetItem | undefined): item is ClosetItem => item !== undefined)

    // Check for style clashes and fix
    for (let i = 0; i < finalItems.length; i++) {
      for (let j = i + 1; j < finalItems.length; j++) {
        if (doVibesClash(finalItems[i], finalItems[j])) {
          // If shoes clash, try to swap them
          if (categorizeItem(finalItems[i]) === 'shoes' || categorizeItem(finalItems[j]) === 'shoes') {
            const shoeIdx = categorizeItem(finalItems[i]) === 'shoes' ? i : j
            const otherIdx = shoeIdx === i ? j : i
            
            const betterShoe = appropriate.shoes.find((shoe: ClosetItem) => 
              !doVibesClash(shoe, finalItems[otherIdx]) && shoe.id !== finalItems[shoeIdx].id
            )
            
            if (betterShoe) {
              validIds = validIds.map((id: string) => 
                id === finalItems[shoeIdx].id ? betterShoe.id : id
              )
            }
          }
        }
      }
    }

    // Get enriched final items
    const closetItemDetails = validIds
      .map((id: string) => closetItems.find((item: ClosetItem) => item.id === id))
      .filter((item: ClosetItem | undefined): item is ClosetItem => item !== undefined)

    // Regenerate rationale based on ACTUAL items picked
    const actualItemNames = closetItemDetails.map((i: ClosetItem) => i.name).join(', ')

    // Save to database
    const { data: savedOutfit, error: saveError } = await supabase
      .from('outfits')
      .insert({
        user_id: userId,
        outfit_name: outfitData.outfit_name || 'Generated Outfit',
        occasion: occasion,
        outfit_data: {
          closet_items: closetItemDetails,
          closet_item_ids: validIds,
          new_items: itemSource === 'closet' ? [] : (outfitData.new_items || []),
          weather_rationale: outfitData.weather_rationale || '',
          style_rationale: outfitData.style_rationale || '',
          styling_tips: outfitData.styling_tips || [],
        },
        weather: {
          temperature: temperature,
          city: weatherCity,
          condition: weather?.condition || 'Unknown'
        },
        is_favorite: false,
      })
      .select()
      .single()

    if (saveError) {
      console.error('Failed to save outfit:', saveError)
    }

    return NextResponse.json({
      success: true,
      outfit: {
        id: savedOutfit?.id || `temp-${Date.now()}`,
        outfit_name: outfitData.outfit_name || 'Generated Outfit',
        occasion: occasion,
        outfit_data: {
          closet_items: closetItemDetails,
          closet_item_ids: validIds,
          new_items: itemSource === 'closet' ? [] : (outfitData.new_items || []),
          weather_rationale: outfitData.weather_rationale || '',
          style_rationale: outfitData.style_rationale || '',
          styling_tips: outfitData.styling_tips || [],
        },
        weather: {
          temperature: temperature,
          city: weatherCity,
          condition: weather?.condition || 'Unknown'
        },
      }
    })
  } catch (error) {
    console.error('Outfit generation error:', error)
    return NextResponse.json({ success: false, error: 'Failed to generate outfit' }, { status: 500 })
  }
}