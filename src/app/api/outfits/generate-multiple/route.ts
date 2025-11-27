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
// FASHION KNOWLEDGE BASE
// ============================================================

const FASHION_RULES = {
  formality: {
    casual: {
      range: [0, 40],
      description: 'Relaxed, everyday wear',
      dressFrequency: 'optional',
      shoeTypes: ['sneakers', 'flats', 'flat sandals', 'loafers', 'canvas shoes', 'slides'],
      avoidShoes: ['stilettos', 'pumps', 'wedges', 'heeled sandals', 'slingbacks', 'strappy heels', 'platform heels'],
      examples: [
        'jeans + t-shirt + sneakers',
        'casual dress + flat sandals',
        'casual dress + sneakers',
        'white cami tank + beige linen shorts + sneakers',  // Your perfect outfit!
        'basic tee + jeans + white sneakers',
        't-shirt + denim shorts + sneakers',
        'shorts + tank + slides'
      ]
    },
    smartCasual: {
      range: [41, 60],
      description: 'Put-together but not formal',
      dressFrequency: 'optional',
      shoeTypes: ['loafers', 'ankle boots', 'block heels', 'nice flats', 'clean sneakers'],
      avoidShoes: ['athletic sneakers', 'flip flops', 'very high stilettos'],
      examples: [
        'dark jeans + blouse + ankle boots',
        'trousers + nice top + loafers',
        'midi skirt + tucked blouse + block heels'
      ]
    },
    dressy: {
      range: [61, 80],
      description: 'Date night, nice dinner, events',
      dressFrequency: 'preferred',
      shoeTypes: ['heels', 'heeled boots', 'dressy flats', 'strappy sandals'],
      avoidShoes: ['sneakers', 'athletic shoes', 'casual sandals'],
      examples: [
        'elegant dress + heels',
        'dressy pants + silk top + heels',
        'skirt + elegant blouse + heeled sandals'
      ]
    },
    formal: {
      range: [81, 100],
      description: 'Special events, galas, formal occasions',
      dressFrequency: 'expected',
      shoeTypes: ['heels', 'elegant pumps', 'strappy heels'],
      avoidShoes: ['flats', 'boots', 'sneakers', 'casual shoes'],
      examples: [
        'formal gown + elegant heels',
        'cocktail dress + strappy heels',
        'elegant midi dress + pumps'
      ]
    }
  },

  weather: {
    hot: {
      min: 75,
      allowed: ['tank tops', 'sleeveless', 'short sleeves', 'shorts', 'mini skirts', 'sundresses', 'sandals'],
      forbidden: ['sweaters', 'knits', 'long sleeves', 'turtlenecks', 'mock necks', 'ribbed', 'wool', 'heavy', 'puffer', 'coat', 'jacket', 'boots'],
      note: 'Lightweight, breathable items only. No layering.'
    },
    warm: {
      min: 70,
      max: 74,
      allowed: ['short sleeves', 'light fabrics', 'light pants', 'skirts', 'dresses'],
      forbidden: ['heavy sweaters', 'wool', 'puffer', 'heavy coat', 'turtleneck', 'thick knits', 'ribbed', 'long sleeve', 'long-sleeve'],
      note: 'Light fabrics only. No heavy layers.'
    },
    mild: {
      min: 60,
      max: 69,
      allowed: ['long sleeves', 'light sweaters', 'pants', 'jeans', 'light jackets'],
      forbidden: ['heavy winter coats', 'puffer jackets'],
      note: 'Light layers OK.'
    },
    cool: {
      min: 50,
      max: 59,
      allowed: ['sweaters', 'long sleeves', 'pants', 'jackets', 'boots'],
      forbidden: ['shorts', 'tank tops', 'sleeveless', 'sandals'],
      note: 'Warm layers needed.'
    },
    cold: {
      max: 49,
      allowed: ['warm sweaters', 'coats', 'jackets', 'boots', 'pants'],
      forbidden: ['shorts', 'mini skirts', 'tank tops', 'sleeveless', 'sandals', 'open-toe'],
      note: 'Warm coat mandatory.'
    }
  },

  occasions: {
    'Date Night': {
      casual: 'Nice jeans + pretty top + cute comfortable shoes.',
      dressy: 'Elegant dress OR dressy pants with nice top + heels',
      formal: 'Your best dress + elegant heels.'
    },
    'Brunch': {
      casual: 'Jeans + nice top + comfortable shoes. Sundress works.',
      dressy: 'Midi dress OR nice pants + blouse + cute heels',
      formal: 'Elegant day dress + heels'
    },
    'Casual Outing': {
      casual: 'Jeans/shorts + t-shirt/casual top + sneakers/sandals',
      dressy: 'Elevated casual - nice jeans + blouse + loafers',
      formal: 'N/A'
    },
    'Party': {
      casual: 'Fun dress OR jeans + statement top + fun shoes',
      dressy: 'Party dress + heels',
      formal: 'Cocktail dress or gown + elegant heels'
    }
  },
  
  // Color coordination rules
  colorRules: {
    // Colors that generally go with everything
    neutrals: ['black', 'white', 'gray', 'grey', 'beige', 'cream', 'tan', 'brown', 'navy', 'nude', 'camel'],
    
    // Colors that clash with each other
    clashes: [
      ['purple', 'blue'],      // Purple and blue clash
      ['red', 'pink'],         // Red and pink clash
      ['red', 'orange'],       // Red and orange clash
      ['green', 'blue'],       // Green and blue can clash
      ['orange', 'pink'],      // Orange and pink clash
      ['brown', 'black'],      // Brown and black - controversial
    ],
    
    // Colors that go well together
    harmonies: [
      ['blue', 'white'],
      ['black', 'white'],
      ['beige', 'white'],
      ['navy', 'white'],
      ['black', 'red'],
      ['cream', 'brown'],
      ['pink', 'white'],
      ['blue', 'beige'],
    ]
  }
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
      name.includes('mule')) return 'shoes'
  if (category.includes('bottom') || name.includes('pants') || name.includes('trouser') ||
      name.includes('jeans') || name.includes('skirt') || name.includes('shorts')) return 'bottom'
  if (category.includes('top') || name.includes('shirt') || name.includes('blouse') ||
      name.includes('top') || name.includes('tank') || name.includes('cami') ||
      name.includes('sweater') || name.includes('turtleneck') || name.includes('t-shirt') ||
      name.includes('bodysuit') || name.includes('mock neck')) return 'top'
  if (name.includes('bag') || name.includes('belt') || name.includes('scarf') ||
      name.includes('hat') || name.includes('jewelry')) return 'accessory'
  
  return 'other'
}

function isWeatherAppropriate(item: ClosetItem, temp: number): boolean {
  const name = (item.name || '').toLowerCase()
  
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
    if (name.includes('puffer') || name.includes('heavy coat')) return false
  }
  
  // MILD weather (60-69°F)
  if (temp >= 60 && temp < 70) {
    if (name.includes('puffer') || name.includes('heavy coat') || name.includes('wool coat')) return false
  }
  
  // COLD weather (below 50°F)
  if (temp < 50) {
    if (name.includes('tank') || name.includes('sleeveless') || name.includes('cami')) return false
    if (name.includes('shorts') || name.includes('mini skirt')) return false
    if (name.includes('sandal') || name.includes('open-toe') || name.includes('open toe')) return false
  }
  
  return true
}

function isShoeAppropriateForFormality(item: ClosetItem, formalityLevel: number): boolean {
  const name = (item.name || '').toLowerCase()
  const formality = getFormalityCategory(formalityLevel)
  
  // For casual, reject dressy shoes
  if (formality === 'casual') {
    if (name.includes('stiletto') || name.includes('pump')) return false
    if (name.includes('strappy') && name.includes('heel')) return false
    if (name.includes('wedge')) return false  // Wedges are dressy
    if (name.includes('slingback')) return false  // Slingbacks are dressy
    // Allow block heels and low heels for casual
    if (name.includes('heel') && !name.includes('block') && !name.includes('low') && !name.includes('kitten')) {
      return false
    }
  }
  
  // For formal, reject casual shoes
  if (formality === 'formal') {
    if (name.includes('sneaker')) return false
    if (name.includes('flat') && !name.includes('ballet')) return false
    if (name.includes('loafer')) return false
    if (name.includes('combat')) return false
    if (name.includes('boot') && !name.includes('heel')) return false  // Flat boots not formal
  }
  
  return true
}

function isItemAppropriateForFormality(item: ClosetItem, formalityLevel: number): boolean {
  const name = (item.name || '').toLowerCase()
  const category = categorizeItem(item)
  const formality = getFormalityCategory(formalityLevel)

  // Structured dresses are NOT casual
  if (formality === 'casual' && category === 'dress') {
    if (name.includes('button') || name.includes('structured') || name.includes('tailored') ||
        name.includes('blazer dress') || name.includes('shirt dress') || name.includes('wrap dress')) {
      return false // These are too polished for casual
    }
    if (name.includes('mini dress')) {
      return false // Mini dresses tend to be dressy unless explicitly casual
    }
  }
  
  // For CASUAL, reject dressy items
  if (formality === 'casual') {
    // Dressy tops
    if (name.includes('drape') || name.includes('draped')) return false
    if (name.includes('silk') && category === 'top') return false
    if (name.includes('satin')) return false
    if (name.includes('sequin') || name.includes('sparkle')) return false
    if (name.includes('cocktail') || name.includes('formal') || name.includes('evening')) return false
    if (name.includes('halter') && !name.includes('casual')) return false
    
    // Dressy sleeve styles
    if (name.includes('bell sleeve') || name.includes('puff sleeve') || name.includes('balloon sleeve')) return false
    
    // Dressy dresses - NOT casual
    if (category === 'dress') {
      // Tight/fitted dresses are not casual
      if (name.includes('bodycon') || name.includes('fitted') || name.includes('tight')) return false
      // Maxi dresses are typically dressy (unless explicitly casual)
      if (name.includes('maxi') && !name.includes('casual')) return false
      // Formal dress styles
      if (name.includes('cocktail') || name.includes('evening') || name.includes('formal')) return false
      // Floral print tight dresses are dressy
      if (name.includes('floral') && (name.includes('fitted') || name.includes('bodycon') || name.includes('print maxi'))) return false
    }
  }
  
  // For FORMAL, reject casual items
  if (formality === 'formal') {
    if (name.includes('t-shirt') || name.includes('tee ')) return false
    if (name.includes('casual')) return false
    if (name.includes('athletic') || name.includes('sports')) return false
    if (name.includes('hoodie') || name.includes('sweatshirt')) return false
    if (name.includes('denim') && category === 'bottom') return false
  }
  
  return true
}
function doColorsClash(color1: string, color2: string): boolean {
  const c1 = (color1 || '').toLowerCase()
  const c2 = (color2 || '').toLowerCase()
  
  // Neutrals go with everything
  const neutrals = ['black', 'white', 'gray', 'grey', 'beige', 'cream', 'tan', 'brown', 'navy', 'nude', 'camel']
  if (neutrals.some(n => c1.includes(n)) || neutrals.some(n => c2.includes(n))) {
    return false // No clash with neutrals
  }
  
  // Check for known clashing combinations
  const clashes = [
    ['purple', 'blue'],
    ['red', 'pink'],
    ['red', 'orange'],
    ['green', 'blue'],
    ['orange', 'pink'],
  ]
  
  for (const [clash1, clash2] of clashes) {
    if ((c1.includes(clash1) && c2.includes(clash2)) || 
        (c1.includes(clash2) && c2.includes(clash1))) {
      return true // Colors clash
    }
  }
  
  return false
}

function getItemVibe(item: ClosetItem): string[] {
  const name = (item.name || '').toLowerCase()
  const vibes: string[] = []
  
  // Streetwear / Athletic
  if (name.includes('yeezy') || name.includes('jordan') || name.includes('nike') || 
      name.includes('adidas') || name.includes('sneaker') || name.includes('hoodie') ||
      name.includes('sweatpant') || name.includes('jogger') || name.includes('athletic') ||
      name.includes('sports') || name.includes('high-top') || name.includes('boost')) {
    vibes.push('streetwear')
  }
  
  // Polished / Feminine
  if (name.includes('button-up') || name.includes('button up') || name.includes('structured') ||
      name.includes('tailored') || name.includes('blazer') || name.includes('blouse') ||
      name.includes('heel') || name.includes('pump') || name.includes('midi dress') ||
      name.includes('mini dress') || name.includes('slingback') || name.includes('elegant')) {
    vibes.push('polished')
  }
  
  // Bohemian / Relaxed
  if (name.includes('crochet') || name.includes('linen') || name.includes('flowy') ||
      name.includes('maxi') || name.includes('boho') || name.includes('peasant') ||
      name.includes('fringe') || name.includes('embroidered')) {
    vibes.push('bohemian')
  }
  
  // Edgy
  if (name.includes('leather') || name.includes('combat') || name.includes('moto') ||
      name.includes('studded') || name.includes('chain') || name.includes('black')) {
    vibes.push('edgy')
  }
  
  // Casual basics
  if (name.includes('t-shirt') || name.includes('tee') || name.includes('basic') ||
      name.includes('jeans') || name.includes('denim') || name.includes('casual') ||
      name.includes('cotton') || name.includes('simple')) {
    vibes.push('casual')
  }
  
  // If no specific vibe detected, mark as neutral
  if (vibes.length === 0) {
    vibes.push('neutral')
  }
  
  return vibes
}

function doVibesClash(item1: ClosetItem, item2: ClosetItem): boolean {
  const name1 = (item1.name || '').toLowerCase()
  const name2 = (item2.name || '').toLowerCase()
  const cat1 = categorizeItem(item1)
  const cat2 = categorizeItem(item2)
  
  // Special rule: High-top sneakers / Jordans don't go with dresses
  const isHighTopOrJordan = (name: string) => 
    name.includes('high-top') || name.includes('high top') || name.includes('jordan') || 
    name.includes('dunk') || name.includes('air force')
  
  if ((cat1 === 'dress' && isHighTopOrJordan(name2)) || (cat2 === 'dress' && isHighTopOrJordan(name1))) {
    return true  // High-tops don't go with dresses
  }
  
  // Fitted/dressy dresses don't go with any sneakers
  const isDressyDress = (name: string, cat: string) => 
    cat === 'dress' && (name.includes('maxi') || name.includes('fitted') || name.includes('bodycon') || 
                        name.includes('floral') || name.includes('elegant') || name.includes('midi'))
  
  const isSneaker = (name: string) => 
    name.includes('sneaker') || name.includes('yeezy') || name.includes('jordan') || 
    name.includes('nike') || name.includes('adidas') || name.includes('athletic')
  
  if ((isDressyDress(name1, cat1) && isSneaker(name2)) || (isDressyDress(name2, cat2) && isSneaker(name1))) {
    return true  // Dressy dresses don't go with sneakers
  }
  
  // Use existing vibe system
  const vibes1 = getItemVibe(item1)
  const vibes2 = getItemVibe(item2)
  
  // Neutral goes with everything
  if (vibes1.includes('neutral') || vibes2.includes('neutral')) return false
  
  // Clashing style combinations
  const clashingVibes = [
    ['streetwear', 'polished'],  // Yeezys don't go with structured dresses
    ['streetwear', 'bohemian'],  // Athletic shoes don't go with flowy boho
    ['edgy', 'bohemian'],        // Leather and boho don't mix well
  ]
  
  for (const [clash1, clash2] of clashingVibes) {
    if ((vibes1.includes(clash1) && vibes2.includes(clash2)) ||
        (vibes1.includes(clash2) && vibes2.includes(clash1))) {
      return true
    }
  }
  
  return false
}

function getOutfitColorCompatibility(items: ClosetItem[]): { compatible: boolean; clashingPair?: [string, string] } {
  // Check all pairs of items for color clashes
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const color1 = items[i].color || ''
      const color2 = items[j].color || ''
      
      if (doColorsClash(color1, color2)) {
        return { 
          compatible: false, 
          clashingPair: [items[i].name, items[j].name] 
        }
      }
    }
  }
  return { compatible: true }
}

// ============================================================
// MAIN API HANDLER
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, occasion, itemSource, formalityLevel, count = 3, weather } = body

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

    let closetItems: ClosetItem[] = []
    if (itemSource === 'closet' || itemSource === 'mix') {
      const { data: items } = await supabase
        .from('closet_items')
        .select('*')
        .eq('user_id', userId)
        .eq('is_archived', false)
      closetItems = items || []
    }

    const temperature = weather?.temperature || 72
    const weatherCat = getWeatherCategory(temperature)
    const formalityCat = getFormalityCategory(formalityLevel)
    const weatherRules = FASHION_RULES.weather[weatherCat]
    const formalityRules = FASHION_RULES.formality[formalityCat]

    // Categorize and filter closet items
    const categorized: Record<string, ClosetItem[]> = {
      top: [], bottom: [], dress: [], shoes: [], outerwear: [], accessory: [], other: []
    }

    const appropriate: Record<string, ClosetItem[]> = {
      top: [], bottom: [], dress: [], shoes: [], outerwear: []
    }

    closetItems.forEach((item: ClosetItem) => {
      const cat = categorizeItem(item)
      if (categorized[cat]) categorized[cat].push(item)
      
      // Filter for weather + formality appropriateness
      const weatherOK = isWeatherAppropriate(item, temperature)
      const shoesFormalityOK = cat !== 'shoes' || isShoeAppropriateForFormality(item, formalityLevel)
      const itemFormalityOK = isItemAppropriateForFormality(item, formalityLevel)
      
      if (weatherOK && shoesFormalityOK && itemFormalityOK && appropriate[cat]) {
        appropriate[cat].push(item)
      }
    })

    // Determine outfit structure based on formality
    let outfitStructure: string
    if (formalityCat === 'formal') {
      outfitStructure = 'FORMAL: All outfits should be DRESS + HEELS. Dresses are expected.'
    } else if (formalityCat === 'dressy') {
      outfitStructure = 'DRESSY: 2 outfits can be DRESS + HEELS, 1 should be TOP + BOTTOM + HEELS.'
    } else if (formalityCat === 'smartCasual') {
      outfitStructure = 'SMART CASUAL: Mix - some TOP + BOTTOM + SHOES, maybe 1 dress.'
    } else {
      outfitStructure = 'CASUAL: Prefer TOP + BOTTOM + COMFORTABLE SHOES (sneakers, flats, loafers). Dress optional but keep it casual.'
    }

    // Build item lists
    const formatItems = (items: ClosetItem[]) => 
      items.map((i: ClosetItem) => `ID:"${i.id}" → ${i.name}`).join('\n') || '(none available)'

    // Get occasion guidance
    const occasionKey = Object.keys(FASHION_RULES.occasions).find((k: string) => 
      occasion.toLowerCase().includes(k.toLowerCase())
    ) || 'Casual Outing'
    const occasionGuidance = FASHION_RULES.occasions[occasionKey as keyof typeof FASHION_RULES.occasions]
    const relevantGuidance = formalityCat === 'formal' || formalityCat === 'dressy' 
      ? occasionGuidance.dressy 
      : occasionGuidance.casual

    const prompt = `You are a professional fashion stylist creating ${count} outfits.

## CONTEXT
- Occasion: ${occasion}
- Formality: ${formalityCat.toUpperCase()} (${formalityRules.description})
- Weather: ${temperature}°F (${weatherCat.toUpperCase()})
- Client Style: ${user.style_vibe?.join(', ') || 'Classic'}

## OCCASION GUIDANCE
For ${occasion} at ${formalityCat} level: ${relevantGuidance}

## WEATHER RULES (${temperature}°F = ${weatherCat.toUpperCase()})
${weatherRules.note}
FORBIDDEN: ${weatherRules.forbidden.join(', ')}

## FORMALITY RULES
${outfitStructure}
Good shoe types: ${formalityRules.shoeTypes.join(', ')}
Avoid shoes: ${formalityRules.avoidShoes.join(', ')}
Examples: ${formalityRules.examples.join(' | ')}

## AVAILABLE ITEMS (already filtered for weather + formality)

TOPS:
${formatItems(appropriate.top)}

BOTTOMS:
${formatItems(appropriate.bottom)}

DRESSES:
${formatItems(appropriate.dress)}

SHOES:
${formatItems(appropriate.shoes)}

OUTERWEAR (only if temp < 60°F):
${temperature < 60 ? formatItems(appropriate.outerwear) : '(not needed for this weather)'}

## STRICT RULES
1. EVERY outfit MUST include SHOES
2. DRESS outfit = dress + shoes only (NO tops, NO pants)
3. TOP+BOTTOM outfit = 1 top + 1 bottom + 1 shoes
4. Only use IDs from the lists above
5. ${itemSource === 'closet' ? 'new_items must be []' : ''}
6. ${formalityCat === 'casual' ? 'NO heels/stilettos - use sneakers, flats, loafers!' : ''}
7. ${temperature >= 70 ? 'NO long sleeves, NO sweaters, NO ribbed - too warm!' : ''}
8. COLOR COORDINATION: Don't pair purple with blue, red with pink, or orange with green. Neutrals (black, white, beige, gray) go with everything.
9. STYLE COHESION: Don't mix streetwear (Yeezys, Jordans, athletic) with polished items (structured dresses, heels, blazers). Keep the aesthetic consistent!

## RESPONSE (JSON only)
{
  "outfits": [
    {
      "label": "Name",
      "closet_item_ids": ["id1", "id2", "id3"],
      "new_items": [],
      "weather_rationale": "Why these work for ${temperature}°F",
      "style_rationale": "Why this fits ${occasion}",
      "styling_tips": ["Tip 1", "Tip 2"]
    }
  ]
}

Create ${count} DIFFERENT outfits. Every outfit MUST have shoes!`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an expert fashion stylist. Critical rules:
1. ALWAYS include shoes
2. ${formalityCat === 'casual' ? 'CASUAL = sneakers, flats, loafers. NO heels!' : formalityCat === 'formal' ? 'FORMAL = elegant dresses + heels' : 'Match shoes to formality'}
3. ${temperature >= 70 ? 'WARM: No long sleeves, no sweaters, no ribbed, no heavy fabrics!' : temperature < 50 ? 'COLD: Warm layers needed' : ''}
4. Dress = complete outfit (no extra top/bottom)
5. Only use provided IDs`
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

    // Validate and fix outfits
    const validatedOutfits = (outfitData.outfits || []).map((outfit: any) => {
      if (itemSource === 'closet') outfit.new_items = []

      // Validate IDs exist
      let validIds = (outfit.closet_item_ids || []).filter((id: string) =>
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

      // Fix: If no shoes, add appropriate ones
      if (selected.shoes.length === 0 && appropriate.shoes.length > 0) {
        validIds.push(appropriate.shoes[0].id)
        selected.shoes.push(appropriate.shoes[0])
      }

      // Fix: If dress outfit, remove tops/bottoms
      if (selected.dresses.length > 0) {
        validIds = [
          selected.dresses[0].id,
          selected.shoes[0]?.id,
          ...(temperature < 60 && selected.outerwear.length > 0 ? [selected.outerwear[0].id] : [])
        ].filter(Boolean) as string[]
      } else {
        // Fix: Ensure 1 top, 1 bottom, 1 shoes
        const finalIds: string[] = []
        
        if (selected.tops.length > 0) {
          finalIds.push(selected.tops[0].id)
        } else if (appropriate.top.length > 0) {
          finalIds.push(appropriate.top[0].id)
        }
        
        if (selected.bottoms.length > 0) {
          finalIds.push(selected.bottoms[0].id)
        } else if (appropriate.bottom.length > 0) {
          finalIds.push(appropriate.bottom[0].id)
        }
        
        if (selected.shoes.length > 0) {
          finalIds.push(selected.shoes[0].id)
        }
        
        if (temperature < 60 && selected.outerwear.length > 0) {
          finalIds.push(selected.outerwear[0].id)
        }
        
        validIds = finalIds
      }

      // Remove any weather-inappropriate items that slipped through
      validIds = validIds.filter((id: string) => {
        const item = closetItems.find((i: ClosetItem) => i.id === id)
        if (!item) return false
        if (categorizeItem(item) === 'outerwear') return true // outerwear OK
        return isWeatherAppropriate(item, temperature)
      })

      outfit.closet_item_ids = validIds

      // Check color compatibility
      const finalItems = validIds
        .map((id: string) => closetItems.find((item: ClosetItem) => item.id === id))
        .filter((item: ClosetItem | undefined): item is ClosetItem => item !== undefined)

      const colorCheck = getOutfitColorCompatibility(finalItems)
      if (!colorCheck.compatible && finalItems.length > 1) {
        // Try to fix by swapping the clashing item with a neutral alternative
        // For now, just log it - the AI should learn to avoid this
        console.log('Color clash detected:', colorCheck.clashingPair)
      }

      // Check style/vibe compatibility
      for (let i = 0; i < finalItems.length; i++) {
        for (let j = i + 1; j < finalItems.length; j++) {
          if (doVibesClash(finalItems[i], finalItems[j])) {
            console.log('Style clash detected:', finalItems[i].name, 'vs', finalItems[j].name)
            // Remove the item that doesn't fit (usually the shoes)
            const shoeIndex = finalItems.findIndex((item: ClosetItem) => categorizeItem(item) === 'shoes')
            if (shoeIndex >= 0 && (i === shoeIndex || j === shoeIndex)) {
              // Find a better shoe
              const betterShoe = appropriate.shoes.find((shoe: ClosetItem) => {
                const otherItem = shoeIndex === i ? finalItems[j] : finalItems[i]
                return !doVibesClash(shoe, otherItem)
              })
              if (betterShoe) {
                outfit.closet_item_ids = validIds.map((id: string) => 
                  id === finalItems[shoeIndex].id ? betterShoe.id : id
                )
              }
            }
          }
        }
      }

      return outfit
    })

    // Enrich with full details
    const enrichedOutfits = validatedOutfits.map((outfit: any, index: number) => {
      const closetItemDetails = (outfit.closet_item_ids || [])
        .map((id: string) => closetItems.find((item: ClosetItem) => item.id === id))
        .filter((item: ClosetItem | undefined): item is ClosetItem => item !== undefined)

      return {
        id: `outfit-${index}-${Date.now()}`,
        label: outfit.label || `Outfit ${index + 1}`,
        outfit_data: {
          closet_items: closetItemDetails,
          closet_item_ids: outfit.closet_item_ids || [],
          new_items: outfit.new_items || [],
          weather_rationale: outfit.weather_rationale || '',
          style_rationale: outfit.style_rationale || '',
          styling_tips: outfit.styling_tips || [],
          formality_level: formalityLevel,
        },
      }
    })

    return NextResponse.json({ success: true, outfits: enrichedOutfits })
  } catch (error) {
    console.error('Outfit generation error:', error)
    return NextResponse.json({ success: false, error: 'Failed to generate outfits' }, { status: 500 })
  }
}