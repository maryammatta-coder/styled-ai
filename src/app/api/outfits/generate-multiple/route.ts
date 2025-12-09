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
    'Business': {
      casual: 'Smart jeans + blouse + loafers',
      dressy: 'Tailored pants + button-up + heels or blazer + trousers',
      formal: 'Suit or formal dress + elegant heels'
    },
    'Brunch': {
      casual: 'Jeans + nice top + comfortable shoes. Sundress works.',
      dressy: 'Midi dress OR nice pants + blouse + cute heels',
      formal: 'Elegant day dress + heels'
    },
    'Girls Night Out': {
      casual: 'Fun top + jeans + cute shoes',
      dressy: 'Trendy dress OR dressy top + pants + heels',
      formal: 'Cocktail dress + heels'
    },
    'Casual Day Out': {
      casual: 'Jeans/shorts + t-shirt/casual top + sneakers/sandals',
      dressy: 'Elevated casual - nice jeans + blouse + loafers',
      formal: 'N/A'
    },
    'Dinner': {
      casual: 'Nice jeans + elevated top + comfortable shoes',
      dressy: 'Dress OR dressy pants + nice top + heels/nice flats',
      formal: 'Elegant dress + heels'
    },
    'Sports Event': {
      casual: 'Jeans + team shirt/casual top + sneakers',
      dressy: 'Nice jeans + casual top + clean sneakers',
      formal: 'N/A'
    },
    'Concert': {
      casual: 'Jeans + band tee/fun top + comfortable shoes',
      dressy: 'Trendy outfit - jeans + statement top + boots/heels',
      formal: 'Dress + heels (for formal venues)'
    },
    'Errands': {
      casual: 'Comfortable outfit - jeans/leggings + t-shirt + sneakers',
      dressy: 'Athleisure or elevated basics - nice top + pants + clean sneakers',
      formal: 'N/A'
    },
    'Travel Day': {
      casual: 'Comfortable layers - jeans + t-shirt + sneakers + jacket',
      dressy: 'Elevated comfortable - nice pants + top + stylish sneakers',
      formal: 'N/A'
    },
    'Beach Day': {
      casual: 'Swimsuit + cover-up + sandals',
      dressy: 'Cute swimsuit + flowy cover-up + sandals',
      formal: 'N/A'
    },
    'Formal Event': {
      casual: 'N/A',
      dressy: 'Elegant dress + heels OR tailored suit',
      formal: 'Formal gown/cocktail dress + elegant heels. Think gala, wedding, black tie.'
    },
    'Party': {
      casual: 'Fun casual outfit - jeans + statement top + cute shoes',
      dressy: 'Trendy dress OR dressy top + skirt/pants + heels',
      formal: 'Cocktail dress + heels'
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

  // Note: We DON'T block dresses in cold weather - occasion comes first!
  // If it's a formal event in winter, you wear a dress with a warm coat.
  
  return true
}

function isShoeAppropriateForFormality(item: ClosetItem, formalityLevel: number): boolean {
  const name = (item.name || '').toLowerCase()
  const formality = getFormalityCategory(formalityLevel)

  // For casual (includes very casual 0-40), reject ALL heels - absolutely no exceptions
  if (formality === 'casual') {
    // ANY mention of heel = not casual
    if (name.includes('heel')) return false
    if (name.includes('stiletto')) return false
    if (name.includes('pump')) return false
    if (name.includes('wedge')) return false
    if (name.includes('slingback') && name.includes('heel')) return false
    if (name.includes('strappy') && name.includes('heel')) return false
    if (name.includes('platform') && name.includes('heel')) return false
    if (name.includes('kitten heel')) return false
    if (name.includes('block heel')) return false
    // Only allow: sneakers, flats, loafers, slides, sandals (flat), boots (flat)
  }

  // Smart casual, dressy, formal: NO SNEAKERS
  if (formality === 'smartCasual' || formality === 'dressy' || formality === 'formal') {
    if (name.includes('sneaker')) return false
    if (name.includes('athletic')) return false
    if (name.includes('running shoe')) return false
    if (name.includes('tennis shoe')) return false
    if (name.includes('trainer')) return false
    // Exception: "clean white sneakers" or "minimal sneakers" are OK ONLY for smart casual
    if (formality === 'smartCasual') {
      if ((name.includes('clean') || name.includes('minimal') || name.includes('leather')) &&
          name.includes('sneaker')) {
        // Allow clean/minimal sneakers for smart casual only
      } else if (name.includes('sneaker')) {
        return false  // Regular sneakers not allowed
      }
    }
  }

  // Smart casual: filter out nighttime/party heels but allow daytime dressy shoes
  if (formality === 'smartCasual') {
    // Filter out sparkly/glittery/nighttime heels
    if (name.includes('sparkle') || name.includes('sparkly')) return false
    if (name.includes('glitter') || name.includes('glittery')) return false
    if (name.includes('rhinestone') || name.includes('crystal')) return false
    if (name.includes('strappy') && name.includes('heel')) return false  // Strappy heels are too nighttime
    if (name.includes('stiletto')) return false  // Stilettos are too formal/nighttime
    if (name.includes('combat')) return false  // Combat boots are too casual
    // Allow: wedges, kitten heels, block heels, mules, slingbacks, loafers, ankle boots, flats
  }

  // For formal, reject casual shoes
  if (formality === 'formal') {
    if (name.includes('flat') && !name.includes('ballet')) return false
    if (name.includes('loafer')) return false
    if (name.includes('combat')) return false
    if (name.includes('boot') && !name.includes('heel')) return false  // Flat boots not formal
  }

  return true
}

function isBagAppropriateForFormality(item: ClosetItem, formalityLevel: number): boolean {
  const name = (item.name || '').toLowerCase()
  const formality = getFormalityCategory(formalityLevel)

  // For CASUAL (0-40): Reject only very dressy bags, but allow casual leather bags
  if (formality === 'casual') {
    // REJECT very dressy/formal details
    if (name.includes('sequin') || name.includes('sparkle') || name.includes('glitter')) return false
    if (name.includes('satin') || name.includes('velvet')) return false
    if (name.includes('clutch') || name.includes('evening')) return false
    if (name.includes('structured') && name.includes('formal')) return false

    // Mini bags with chain details are usually too dressy for casual
    if (name.includes('mini') && name.includes('chain')) return false
  }

  // For SMART CASUAL (41-60): Allow most bags except very casual or very formal
  if (formality === 'smartCasual') {
    // Reject too casual
    if (name.includes('backpack') && !name.includes('leather')) return false
    if (name.includes('canvas') && name.includes('tote')) return false

    // Reject too formal
    if (name.includes('evening') || name.includes('clutch')) return false
    if (name.includes('sequin') || name.includes('sparkle')) return false
  }

  // For DRESSY/FORMAL (61+): Allow fancy bags, reject casual ones
  if (formality === 'dressy' || formality === 'formal') {
    // Reject casual materials
    if (name.includes('canvas')) return false
    if (name.includes('denim')) return false
    if (name.includes('backpack')) return false
    if (name.includes('tote') && !name.includes('leather')) return false
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

  // For CASUAL, reject dressy items AND club/party items
  if (formality === 'casual') {
    // Reject dressy/party tops
    if (name.includes('bodysuit') || name.includes('body suit')) return false // Bodysuits are too put-together for casual
    if (name.includes('drape') || name.includes('draped')) return false
    if (name.includes('silk') && category === 'top') return false
    if (name.includes('satin')) return false
    if (name.includes('lace')) return false // Lace is too dressy for casual
    if (name.includes('sequin') || name.includes('sparkle')) return false
    if (name.includes('cocktail') || name.includes('formal') || name.includes('evening')) return false
    if (name.includes('halter') && !name.includes('casual')) return false
    if (name.includes('strapless')) return false // Strapless tops are too dressy/clubby for casual
    if (name.includes('tube top')) return false
    if (name.includes('corset')) return false
    if (name.includes('bustier')) return false

    // Dressy sleeve styles
    if (name.includes('bell sleeve') || name.includes('puff sleeve') || name.includes('balloon sleeve')) return false

    // Reject mini skirts for casual - they're too dressy/club
    if (category === 'bottom' && name.includes('mini') && name.includes('skirt')) return false

    // Dressy dresses - NOT casual
    if (category === 'dress') {
      if (name.includes('lace')) return false // Lace dresses are too dressy
      if (name.includes('midi') && !name.includes('casual')) return false // Midi dresses tend to be dressy
      if (name.includes('bodycon') || name.includes('fitted') || name.includes('tight')) return false
      if (name.includes('maxi') && !name.includes('casual')) return false
      if (name.includes('cocktail') || name.includes('evening') || name.includes('formal')) return false
      if (name.includes('strapless') || name.includes('tube')) return false
      if (name.includes('floral') && (name.includes('fitted') || name.includes('bodycon') || name.includes('print maxi'))) return false
    }
  }

  // For SMART CASUAL, reject items that are TOO formal OR too casual
  if (formality === 'smartCasual') {
    // Block TOO CASUAL items
    if (name.includes('denim shorts') || (name.includes('denim') && name.includes('short'))) return false // Denim shorts are too casual for smart casual
    if (name.includes('jean shorts')) return false
    if (name.includes('tube top')) return false // Tube tops are too casual/clubby
    if (name.includes('strapless') && category === 'top') return false // Strapless tops too casual
    if (name.includes('athletic')) return false
    if (name.includes('sweatpant') || name.includes('jogger')) return false

    // Block TOO FORMAL items
    if (name.includes('maxi')) return false // Maxi dresses/skirts too formal

    // Reject fancy formal dresses
    if (category === 'dress') {
      if (name.includes('gown')) return false
      if (name.includes('cocktail')) return false
      if (name.includes('evening')) return false
      if (name.includes('sequin') || name.includes('sparkle')) return false
      if (name.includes('satin') && !name.includes('midi') && !name.includes('mini')) return false
    }
    // Reject formal tops and items
    if (name.includes('sequin') || name.includes('sparkle')) return false
    if (name.includes('formal') || name.includes('evening')) return false
    if (name.includes('cocktail')) return false
  }

  // For DRESSY, reject items that are too casual
  if (formality === 'dressy') {
    if (name.includes('denim shorts') || (name.includes('denim') && name.includes('short'))) return false
    if (name.includes('jean shorts')) return false
    if (name.includes('t-shirt') || name.includes('tee ')) return false
    if (name.includes('athletic')) return false
    if (name.includes('sweatpant') || name.includes('jogger')) return false
  }

  // For FORMAL, reject casual items
  if (formality === 'formal') {
    if (name.includes('shorts')) return false // NO shorts for formal
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
  const isC1Neutral = neutrals.some(n => c1.includes(n))
  const isC2Neutral = neutrals.some(n => c2.includes(n))

  if (isC1Neutral || isC2Neutral) {
    return false // No clash with neutrals
  }

  // Check for known clashing combinations
  const clashes = [
    ['purple', 'blue'],
    ['red', 'pink'],
    ['red', 'orange'],
    ['green', 'blue'],
    ['orange', 'pink'],
    ['burgundy', 'beige'],  // Burgundy doesn't work well with beige
    ['burgundy', 'denim'],  // Burgundy and denim clash
  ]

  for (const [clash1, clash2] of clashes) {
    if ((c1.includes(clash1) && c2.includes(clash2)) ||
        (c1.includes(clash2) && c2.includes(clash1))) {
      return true // Colors clash
    }
  }

  return false
}

function getColorHarmonyScore(items: ClosetItem[]): number {
  // Score outfit based on color harmony (higher = better)
  // Prefer neutral + accent color over multiple bright colors
  let score = 100

  const colors = items.map(i => (i.color || '').toLowerCase())
  const neutrals = ['black', 'white', 'gray', 'grey', 'beige', 'cream', 'tan', 'brown', 'navy', 'nude', 'camel']

  const neutralCount = colors.filter(c => neutrals.some(n => c.includes(n))).length
  const brightCount = colors.length - neutralCount

  // Ideal: mostly neutrals with 0-1 accent colors
  if (brightCount === 0) score += 20 // All neutral = very safe
  if (brightCount === 1) score += 30 // Neutral + 1 accent = perfect
  if (brightCount === 2) score -= 20 // 2 bright colors = risky
  if (brightCount >= 3) score -= 50 // 3+ bright colors = usually bad

  // Check for clashes
  for (let i = 0; i < colors.length; i++) {
    for (let j = i + 1; j < colors.length; j++) {
      if (doColorsClash(colors[i], colors[j])) {
        score -= 40 // Heavy penalty for clashing colors
      }
    }
  }

  return score
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
      top: [], bottom: [], dress: [], shoes: [], outerwear: [], bags: []
    }

    closetItems.forEach((item: ClosetItem) => {
      const cat = categorizeItem(item)
      if (categorized[cat]) categorized[cat].push(item)

      // Check if this is a bag
      const name = (item.name || '').toLowerCase()
      const isBag = name.includes('bag') || name.includes('purse') || name.includes('handbag') ||
                    name.includes('clutch') || name.includes('tote') || name.includes('satchel') ||
                    name.includes('crossbody') || name.includes('shoulder bag')

      // Filter for weather + formality appropriateness
      const weatherOK = isWeatherAppropriate(item, temperature)
      const shoesFormalityOK = cat !== 'shoes' || isShoeAppropriateForFormality(item, formalityLevel)
      const bagFormalityOK = !isBag || isBagAppropriateForFormality(item, formalityLevel)
      const itemFormalityOK = isItemAppropriateForFormality(item, formalityLevel)

      if (weatherOK && shoesFormalityOK && bagFormalityOK && itemFormalityOK) {
        if (isBag) {
          appropriate.bags.push(item)
        } else if (appropriate[cat]) {
          appropriate[cat].push(item)
        }
      }
    })

    // Determine outfit structure based on formality
    let outfitStructure: string
    if (formalityCat === 'formal') {
      outfitStructure = 'FORMAL: All outfits should be DRESS + HEELS. Dresses are expected.'
    } else if (formalityCat === 'dressy') {
      outfitStructure = 'DRESSY: 2 outfits can be DRESS + HEELS, 1 should be TOP + BOTTOM + HEELS.'
    } else if (formalityCat === 'smartCasual') {
      outfitStructure = 'SMART CASUAL: MUST MIX casual and elevated pieces. Examples: casual top + dressy pants + heels, OR dressy top + jeans + heels, OR mini dress + sneakers. NEVER all casual (tank+shorts+sneakers) or all dressy (dress+heels).'
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

🎯 PRIMARY GOAL: CREATE COHESIVE, WEARABLE OUTFITS
- Prioritize outfit cohesion over variety
- Match colors carefully - prefer neutrals with 0-1 accent color
- Choose items that work together stylistically
- When in doubt, pick black/neutral shoes and bags for better coordination
- DO NOT force variety - it's OK to use the same shoes or bag in multiple outfits if they're the best choice
- Quality over variety - if white sneakers work best, use them for all 3 outfits

## CONTEXT
- Occasion: ${occasion}
- Formality: ${formalityCat.toUpperCase()} (${formalityRules.description})
- Weather: ${temperature}°F (${weatherCat.toUpperCase()})
- Client Style: ${user.style_vibe?.join(', ') || 'Classic'}
${user.avoid_colors && user.avoid_colors.length > 0 ? `- 🚫 AVOID THESE COLORS (RED FLAGS): ${user.avoid_colors.join(', ')} - Do NOT use items in these colors!` : ''}
${user.color_palette && user.color_palette.length > 0 ? `- Color preferences (optional, don't force): ${user.color_palette.join(', ')}` : ''}

## OCCASION GUIDANCE
For ${occasion} at ${formalityCat} level: ${relevantGuidance}

## WEATHER RULES (${temperature}°F = ${weatherCat.toUpperCase()})
${weatherRules.note}
FORBIDDEN: ${weatherRules.forbidden.join(', ')}

## FORMALITY RULES
${outfitStructure}

SHOE RULES (CRITICAL - NEVER VIOLATE):
${formalityCat === 'casual' ? '🚨 CASUAL/VERY CASUAL = ABSOLUTELY NO HEELS. Period. Use: sneakers, flats, loafers, slides, sandals (flat only)' : ''}
${formalityCat === 'smartCasual' || formalityCat === 'dressy' || formalityCat === 'formal' ? '🚨 SMART CASUAL/DRESSY/FORMAL = ABSOLUTELY NO SNEAKERS (exception: clean/minimal sneakers OK for smart casual only)' : ''}
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

OUTERWEAR ${temperature < 50 ? '(REQUIRED for cold weather!)' : '(only if temp < 60°F)'}:
${temperature < 60 ? formatItems(appropriate.outerwear) : '(not needed for this weather)'}
${temperature < 50 ? '\n⚠️ IMPORTANT: If using a dress in this cold weather, you MUST include outerwear!' : ''}

BAGS/PURSES (ALWAYS REQUIRED - MANDATORY FOR EVERY OUTFIT):
${appropriate.bags.length > 0 ? formatItems(appropriate.bags) : '⚠️ NO BAGS IN CLOSET - You MUST suggest a new bag in new_items for EVERY outfit!'}

## STRICT RULES - PRIORITIZE COHESION OVER VARIETY

1. 🎯 COHESION IS PARAMOUNT: Create outfits that actually work together. Don't force variety at the expense of good style. When in doubt, choose neutral/black accessories.

2. 🚨 COLOR RULES:
   - IDEAL: Mostly neutral colors (black, white, beige, navy, brown, gray) + 0-1 accent color
   - AVOID: Multiple bright colors in one outfit (burgundy + denim, red + blue, etc.)
   - NEVER: burgundy with beige, burgundy with denim, purple with blue, red with pink
   - BLACK BAGS: Great with DARK/BOLD outfits, BUT TOO HARSH with light/pastel outfits
   - Light outfits (white, cream, light blue, denim, pastels) → choose tan/brown/denim/nude bags (NOT black)
   - Example: light blue tank + denim shorts + white sneakers = light outfit, needs tan/denim bag
   - If dress is beige/cream/tan → choose black, brown, or tan accessories (NOT burgundy, NOT bright colors)
   - If dress is bright color → choose neutral accessories

3. 🚨 BAGS ARE MANDATORY: EVERY outfit MUST include a bag/purse. ${appropriate.bags.length === 0 ? 'Since there are NO bags in the closet, you MUST suggest a new bag in new_items for EVERY outfit (even for closet-only outfits).' : 'Use a bag from the BAGS list above. Prefer neutral bags for better coordination.'}

4. 🚨 SHOE RULES - ABSOLUTELY CRITICAL:
   ${formalityCat === 'casual' ? '- CASUAL/VERY CASUAL = NO HEELS WHATSOEVER. Only sneakers, flats, loafers, slides, or flat sandals allowed!' : ''}
   ${formalityCat === 'smartCasual' || formalityCat === 'dressy' || formalityCat === 'formal' ? '- SMART CASUAL/DRESSY/FORMAL = NO SNEAKERS (exception: only clean/minimal sneakers OK for smart casual). NO DENIM SHORTS - they are too casual!' : ''}

5. DRESS outfit = dress + shoes + BAG ${temperature < 50 ? '+ OUTERWEAR (required for cold!)' : '(NO tops, NO pants)'}

6. TOP+BOTTOM outfit = 1 top + 1 bottom + 1 shoes + BAG ${temperature < 50 ? '+ outerwear if needed' : ''}

7. Only use IDs from the lists above

8. ${itemSource === 'closet' ? 'new_items must be [] UNLESS suggesting a bag (bags are mandatory even for closet-only)' : itemSource === 'mix' ? '🎨 MIX & MATCH MODE - CRITICAL RULES:\n   - Use 2-3 closet items MAX (NOT all closet items!)\n   - Suggest 1-2 NEW ESSENTIAL items to COMPLETE the outfit (e.g. if closet has dress, suggest shoes. If closet has top, suggest bottom + shoes)\n   - ONLY suggest items the user NEEDS, not accessories they already have\n   - DO NOT suggest bags if closet already has a bag in the outfit\n   - DO NOT suggest cardigans/sweaters in hot weather\n   - DO NOT suggest hats/accessories unless specifically needed\n   - Each new item: description, category, color, reasoning, estimated_price\n   - Example: Closet has "white tank" → suggest "Tan linen shorts" + "Tan sandals" to complete' : itemSource === 'new' ? '🛍️ NEW ITEMS ONLY MODE: closet_item_ids should be [] (empty). ALL items must be suggested in new_items array. Create COMPLETE outfits with 3-5 new items (top, bottom OR dress, shoes, bag, accessories). Each new item MUST have: description, category, color, reasoning, estimated_price.' : ''}

9. ${temperature >= 70 ? 'NO long sleeves, NO sweaters, NO ribbed - too warm!' : temperature < 50 ? 'COLD WEATHER: MUST add outerwear if wearing a dress! For casual occasions, prefer pants over dresses in cold weather.' : ''}

10. ${user.avoid_colors && user.avoid_colors.length > 0 ? `🚫 CRITICAL: NEVER use items in these colors: ${user.avoid_colors.join(', ')}. These are RED FLAGS - completely avoid them!` : ''}

11. STYLE COHESION: Keep the vibe consistent. Athletic/running shoes go with athletic wear ONLY, NEVER with bodysuits/skirts/dresses. Linen shorts with heels OK for daytime, denim shorts NEVER for smart casual or dressy.

12. SNEAKER COLOR MATCHING: Match sneaker colors to outfit. Tan/beige shorts → tan/beige sneakers. Navy cami + tan shorts → beige sneakers match better than white. Denim shorts → white sneakers work great. Think about color coordination!

13. DO NOT FORCE VARIETY: If white sneakers work best for all 3 outfits, use them for all 3. Don't use different shoes just for variety. Same for bags.

14. 🚨🚨🚨 BLACK BAG RULE (CRITICAL - READ CAREFULLY):
   - If outfit has light blue + denim + white → DO NOT pick black bag, pick tan/denim/brown
   - If outfit is all white/cream/light colors → DO NOT pick black bag, pick tan/brown/nude
   - Black bags ONLY work with darker clothing (black, navy, dark colors)
   - Example: light blue tank + denim shorts + white sneakers = TOO LIGHT for black bag → use denim/tan bag instead

## RESPONSE (JSON only)
{
  "outfits": [
    {
      "label": "Name",
      "closet_item_ids": ${itemSource === 'new' ? '[]' : '["id1", "id2", "id3"]'},
      "new_items": ${itemSource === 'new' ? `[
        {"description": "White linen button-down shirt", "category": "top", "color": "white", "reasoning": "Lightweight and breathable for warm weather", "estimated_price": "$40-60"},
        {"description": "High-waisted wide-leg trousers", "category": "bottom", "color": "beige", "reasoning": "Elegant silhouette perfect for the occasion", "estimated_price": "$50-70"},
        {"description": "Tan leather loafers", "category": "shoes", "color": "tan", "reasoning": "Comfortable yet polished", "estimated_price": "$60-80"},
        {"description": "Structured tan tote bag", "category": "bag", "color": "tan", "reasoning": "Practical and matches the neutral palette", "estimated_price": "$70-90"}
      ]` : itemSource === 'mix' ? `[
        {"description": "Tan linen midi shorts", "category": "bottom", "color": "tan", "reasoning": "Completes the tank top from closet, perfect for warm weather", "estimated_price": "$40-50"},
        {"description": "White platform sneakers", "category": "shoes", "color": "white", "reasoning": "Comfortable and matches the casual neutral palette", "estimated_price": "$60-80"}
      ]` : '[]'},
      "weather_rationale": "Why these work for ${temperature}°F",
      "style_rationale": "Why this fits ${occasion}",
      "styling_tips": ["Tip 1", "Tip 2"]
    }
  ]
}

Create ${count} DIFFERENT outfits. Every outfit MUST have shoes AND a bag!`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an expert fashion stylist. Your PRIMARY GOAL is creating COHESIVE, WEARABLE outfits.

CRITICAL RULES:
1. COHESION OVER VARIETY: Don't force variety if it sacrifices good style. Choose items that work together. It's OK to reuse the same shoes/bag in multiple outfits if they work best. DO NOT force different shoes for each outfit.

2. RUNNING SHOES: Athletic/running shoes ONLY go with athletic wear. NEVER pair running shoes with bodysuits, skirts, dresses, or dressy items.

3. COLOR COORDINATION:
   - IDEAL: Neutral colors + 0-1 accent color
   - BLACK bags work with DARK outfits, BUT TOO HARSH with light/pastel outfits
   - Light outfits (white, light blue, denim, pastels) → tan/brown/denim bags (NOT black)
   - Example: light blue tank + denim shorts + white sneakers = light outfit, NO black bag
   - NEVER: burgundy with beige, burgundy with denim, bright colors that clash
   - Beige/cream dress → black, brown, or tan accessories (NOT burgundy!)

3. SHOE RULES (NEVER BREAK):
   - CASUAL = NO HEELS. Only: sneakers, flats, loafers, slides
   - SMART CASUAL/DRESSY/FORMAL = NO SNEAKERS (exception: clean minimal sneakers for smart casual)
   - SMART CASUAL/DRESSY = NO DENIM SHORTS
   - Running/athletic shoes = ONLY for athletic wear, NEVER with bodysuits/skirts/dresses
   - MATCH SNEAKER COLORS: If outfit has tan/beige shorts, use tan/beige sneakers (NOT white). If outfit has denim, white sneakers work well.

4. 🚨 BLACK BAG RULE: If you're picking light colored items (light blue, denim, white, cream), DO NOT pick black bags. Use tan/brown/denim bags instead. Black bags ONLY work with dark outfits.

5. DO NOT FORCE VARIETY: Reuse shoes/bags if they work best. Don't pick different shoes for each outfit just for variety.

6. ${formalityCat === 'casual' ? 'CASUAL = t-shirt/tank/casual top + jeans/pants + FLAT SHOES. OR casual dress + sneakers. NO HEELS! NO bodysuits! NO mini skirts! Keep simple and relaxed.' : formalityCat === 'smartCasual' ? 'SMART CASUAL = NO DENIM SHORTS. NO TUBE TOPS. Mix elevated + casual: tank+jeans+heels OR dressy top+linen shorts+heels. NOT denim shorts!' : formalityCat === 'formal' ? 'FORMAL = elegant dress + heels (NO SNEAKERS, NO SHORTS)' : 'Match shoes to formality'}

7. ${temperature >= 70 ? 'WARM: No long sleeves, no sweaters, no ribbed!' : temperature < 50 ? 'COLD: Add outerwear! Prefer pants for casual.' : ''}

8. ${itemSource === 'new' ? '🛍️ NEW ITEMS ONLY: Do NOT use closet_item_ids. ALL outfit pieces must be in new_items array (top/dress, bottom if needed, shoes, bag). Describe each item clearly with specific details (fabric, style, color). Include estimated_price for each.' : itemSource === 'mix' ? '🎨 MIX & MATCH: Pick 2-3 closet items MAX. Suggest ESSENTIAL missing pieces ONLY (if have top, suggest bottom+shoes. If have dress, suggest shoes). NO random accessories. NO bags if already using closet bag. NO cardigans in hot weather.' : 'Only use provided item IDs. Dress = complete outfit (no extra top/bottom).'}`
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
      // For closet-only mode, only keep bag suggestions in new_items
      if (itemSource === 'closet') {
        outfit.new_items = (outfit.new_items || []).filter((item: any) => {
          const cat = (item.category || '').toLowerCase()
          const desc = (item.description || '').toLowerCase()
          return cat.includes('bag') || desc.includes('bag') || desc.includes('purse')
        })
      }

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
        outerwear: selectedItems.filter((i: ClosetItem) => categorizeItem(i) === 'outerwear'),
        bags: selectedItems.filter((i: ClosetItem) => {
          const name = (i.name || '').toLowerCase()
          return name.includes('bag') || name.includes('purse') || name.includes('handbag') ||
                 name.includes('clutch') || name.includes('tote') || name.includes('satchel') ||
                 name.includes('crossbody') || name.includes('shoulder bag')
        })
      }

      // Fix: If no shoes, add appropriate ones - prefer shoes that match outfit colors
      if (selected.shoes.length === 0 && appropriate.shoes.length > 0) {
        const outfitColors = selectedItems.map((i: ClosetItem) => (i.color || '').toLowerCase())

        // Try to find shoes that match outfit colors
        const matchingShoe = appropriate.shoes.find((shoe: ClosetItem) => {
          const shoeColor = (shoe.color || '').toLowerCase()
          const shoeName = (shoe.name || '').toLowerCase()

          // If outfit has tan/beige, prefer tan/beige sneakers
          if (outfitColors.some((c: string) => c.includes('tan') || c.includes('beige'))) {
            if (shoeColor.includes('tan') || shoeColor.includes('beige') ||
                shoeName.includes('tan') || shoeName.includes('beige')) {
              return true
            }
          }

          // If outfit has denim, white sneakers work well
          if (outfitColors.some((c: string) => c.includes('denim'))) {
            if (shoeColor.includes('white') || shoeName.includes('white')) {
              return true
            }
          }

          return false
        })

        const shoeToUse = matchingShoe || appropriate.shoes[0]
        validIds.push(shoeToUse.id)
        selected.shoes.push(shoeToUse)
      }

      // Fix: If no bag, add one or suggest new
      if (selected.bags.length === 0) {
        if (appropriate.bags.length > 0) {
          // Add bag from closet - smart color matching based on outfit
          let bestBag = appropriate.bags[0]

          // Get colors in the current outfit
          const outfitColors = selectedItems.map((i: ClosetItem) => (i.color || '').toLowerCase())

          // Check if outfit is all light/pastel colors (includes white, light blue, denim, pastels)
          const lightColors = ['white', 'cream', 'beige', 'ivory', 'off-white', 'light', 'pale', 'pastel', 'soft']
          const lightBlueDenim = ['light blue', 'light denim', 'denim', 'blue denim', 'baby blue', 'sky blue', 'powder blue']

          const isLightOutfit = outfitColors.every((c: string) => {
            // Check if color is a light color
            if (lightColors.some(light => c.includes(light))) return true
            // Check if color is light blue or denim
            if (lightBlueDenim.some(blue => c.includes(blue))) return true
            // Tan and nude are also light
            if (c.includes('tan') || c.includes('nude') || c.includes('sand')) return true
            return false
          })

          // Try to find a bag that matches the outfit colors or materials
          const matchingBag = appropriate.bags.find((bag: ClosetItem) => {
            const bagColor = (bag.color || '').toLowerCase()
            const bagName = (bag.name || '').toLowerCase()

            // Check if bag color matches any outfit color (e.g., denim bag with denim shorts)
            if (outfitColors.some((c: string) => bagColor.includes(c) || c.includes(bagColor))) {
              return true
            }

            // Check for matching materials (e.g., denim bag with denim shorts)
            if (bagName.includes('denim') && outfitColors.some((c: string) => c.includes('denim'))) {
              return true
            }

            return false
          })

          // If we found a matching bag, use it
          if (matchingBag) {
            bestBag = matchingBag
          } else if (isLightOutfit) {
            // For all-white/light outfits: AVOID black bags, prefer tan/cream/denim
            const lightBag = appropriate.bags.find((bag: ClosetItem) => {
              const bagColor = (bag.color || '').toLowerCase()
              const bagName = (bag.name || '').toLowerCase()
              // Prefer light-colored bags
              if (bagColor.includes('tan') || bagColor.includes('cream') ||
                  bagColor.includes('beige') || bagColor.includes('nude') ||
                  bagColor.includes('brown') || bagName.includes('denim')) {
                return true
              }
              return false
            })
            if (lightBag) {
              bestBag = lightBag
            } else {
              // If no light bags, use first non-black bag
              const nonBlackBag = appropriate.bags.find((bag: ClosetItem) => {
                const bagColor = (bag.color || '').toLowerCase()
                return !bagColor.includes('black')
              })
              if (nonBlackBag) bestBag = nonBlackBag
            }
          } else {
            // For non-light outfits: Black and neutral bags are fine
            const neutralBag = appropriate.bags.find((bag: ClosetItem) => {
              const bagColor = (bag.color || '').toLowerCase()
              return bagColor.includes('black') || bagColor.includes('tan') ||
                     bagColor.includes('brown') || bagColor.includes('beige') ||
                     bagColor.includes('neutral')
            })
            if (neutralBag) bestBag = neutralBag
          }

          validIds.push(bestBag.id)
          selected.bags.push(bestBag)
        } else {
          // No bags in closet - ensure new_items includes a bag suggestion
          const hasBagSuggestion = (outfit.new_items || []).some((item: any) => {
            const desc = (item.description || '').toLowerCase()
            const cat = (item.category || '').toLowerCase()
            return desc.includes('bag') || desc.includes('purse') || cat.includes('bag')
          })

          if (!hasBagSuggestion) {
            // Add a basic bag suggestion
            if (!outfit.new_items) outfit.new_items = []
            outfit.new_items.push({
              description: `${formalityLevel <= 40 ? 'Casual crossbody bag or tote' : formalityLevel <= 60 ? 'Structured handbag or shoulder bag' : 'Elegant clutch or small handbag'}`,
              category: 'bag',
              color: 'neutral (black, tan, or brown)',
              reasoning: 'A bag is essential to complete any outfit'
            })
          }
        }
      }

      // Fix: If dress outfit, remove tops/bottoms
      if (selected.dresses.length > 0) {
        validIds = [
          selected.dresses[0].id,
          selected.shoes[0]?.id,
          selected.bags[0]?.id,
          ...(temperature < 60 && selected.outerwear.length > 0 ? [selected.outerwear[0].id] : [])
        ].filter(Boolean) as string[]
      } else {
        // Fix: Ensure 1 top, 1 bottom, 1 shoes, 1 bag
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

        if (selected.bags.length > 0) {
          finalIds.push(selected.bags[0].id)
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

      // Track if items were swapped for description regeneration
      let itemsWereSwapped = false

      // CRITICAL: Check if light outfit has black bag - swap if so
      const outfitColors = finalItems.map((i: ClosetItem) => (i.color || '').toLowerCase())
      console.log('OUTFIT COLORS:', outfitColors)

      const lightColors = ['white', 'cream', 'beige', 'ivory', 'off-white', 'light', 'pale', 'pastel', 'soft']
      const lightBlueDenim = ['light blue', 'light denim', 'denim', 'blue denim', 'baby blue', 'sky blue', 'powder blue']

      const isLightOutfit = outfitColors.every((c: string) => {
        if (lightColors.some(light => c.includes(light))) return true
        if (lightBlueDenim.some(blue => c.includes(blue))) return true
        if (c.includes('tan') || c.includes('nude') || c.includes('sand')) return true
        return false
      })

      console.log('IS LIGHT OUTFIT:', isLightOutfit)

      if (isLightOutfit) {
        // Find if there's a black bag in the outfit
        const bagIndex = finalItems.findIndex((item: ClosetItem) => {
          const name = (item.name || '').toLowerCase()
          const color = (item.color || '').toLowerCase()
          const isBag = name.includes('bag') || name.includes('purse') || name.includes('clutch')
          const isBlack = color.includes('black')
          console.log('Checking item:', name, 'color:', color, 'isBag:', isBag, 'isBlack:', isBlack)
          return isBag && isBlack
        })

        console.log('BAG INDEX:', bagIndex)

        if (bagIndex >= 0) {
          // We have a light outfit with a black bag - SWAP IT
          console.log('🚨 LIGHT OUTFIT WITH BLACK BAG DETECTED - FORCING SWAP')
          console.log('Current bag:', finalItems[bagIndex].name)

          // Search ALL closet bags, not just formality-filtered ones
          // This ensures we can find denim/tan bags even if formality filter was too strict
          const allBags = closetItems.filter((item: ClosetItem) => {
            const name = (item.name || '').toLowerCase()
            return name.includes('bag') || name.includes('purse') || name.includes('handbag') ||
                   name.includes('clutch') || name.includes('tote') || name.includes('satchel') ||
                   name.includes('crossbody') || name.includes('shoulder bag')
          })

          // Find a lighter bag from ALL bags
          const lightBag = allBags.find((bag: ClosetItem) => {
            const bagColor = (bag.color || '').toLowerCase()
            const bagName = (bag.name || '').toLowerCase()

            // Avoid black bags
            if (bagColor.includes('black')) return false

            // Prefer light colors and casual materials
            if (bagColor.includes('tan') || bagColor.includes('cream') ||
                bagColor.includes('beige') || bagColor.includes('nude') ||
                bagColor.includes('brown') || bagName.includes('denim') ||
                bagColor.includes('light') || bagColor.includes('sand')) {
              return true
            }
            return false
          })

          console.log('All bags found:', allBags.length)
          console.log('Light bag found:', lightBag ? lightBag.name : 'NONE')

          if (lightBag) {
            // Swap the black bag for the light bag
            console.log('✅ SWAPPING BLACK BAG FOR:', lightBag.name)
            validIds = validIds.map((id: string) =>
              id === finalItems[bagIndex].id ? lightBag.id : id
            )
            outfit.closet_item_ids = validIds

            // Update finalItems array
            finalItems[bagIndex] = lightBag
            itemsWereSwapped = true
          } else {
            // No light bag available, use ANY non-black bag from all bags
            const nonBlackBag = allBags.find((bag: ClosetItem) => {
              const bagColor = (bag.color || '').toLowerCase()
              return !bagColor.includes('black')
            })

            console.log('Non-black bag found:', nonBlackBag ? nonBlackBag.name : 'NONE')

            if (nonBlackBag) {
              console.log('✅ SWAPPING BLACK BAG FOR:', nonBlackBag.name)
              validIds = validIds.map((id: string) =>
                id === finalItems[bagIndex].id ? nonBlackBag.id : id
              )
              outfit.closet_item_ids = validIds
              finalItems[bagIndex] = nonBlackBag
              itemsWereSwapped = true
            } else {
              console.log('❌ NO REPLACEMENT BAG FOUND - KEEPING BLACK BAG')
            }
          }
        }
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
                itemsWereSwapped = true

                // Clear descriptions - they're now incorrect after the swap
                outfit.weather_rationale = ''
                outfit.style_rationale = ''
              }
            }
          }
        }
      }

      // Mark if items were swapped so we can regenerate descriptions later
      outfit._itemsWereSwapped = itemsWereSwapped

      return outfit
    })

    // ALWAYS regenerate descriptions based on actual selected items to ensure accuracy
    // This prevents mismatches between photos and descriptions
    for (const outfit of validatedOutfits) {
      const itemDetails = (outfit.closet_item_ids || [])
        .map((id: string) => closetItems.find((item: ClosetItem) => item.id === id))
        .filter((item: ClosetItem | undefined): item is ClosetItem => item !== undefined)

      const itemList = itemDetails.map((i: ClosetItem) => `${i.name} (${i.category}, ${i.color})`).join(', ')

      const regenPrompt = `Write ONE SHORT, concise description for this outfit (2-3 sentences max, under 80 words total).

EXACT ITEMS IN THIS OUTFIT: ${itemList}

Occasion: ${occasion}
Weather: ${temperature}°F
Formality: ${formalityCat}

IMPORTANT:
- Write ONE combined description covering both weather and style
- Be concise and conversational, not a list of items
- Only mention the items I listed above if needed for context
- Keep it brief - 2-3 sentences total

Respond with JSON:
{
  "rationale": "Brief explanation of why this outfit works for ${occasion} in ${temperature}°F weather"
}`

      try {
        const regenCompletion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are a fashion stylist. Write ONE BRIEF description (2-3 sentences max, under 80 words). Cover both weather and style. Be conversational, not a list.' },
            { role: 'user', content: regenPrompt }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.5,  // Lower temperature for more accurate descriptions
        })

        const regenData = JSON.parse(regenCompletion.choices[0]?.message?.content || '{}')
        outfit.rationale = regenData.rationale || `Perfect for ${occasion} in ${temperature}°F weather`
        // Keep legacy fields for backward compatibility
        outfit.weather_rationale = ''
        outfit.style_rationale = outfit.rationale
      } catch (error) {
        console.error('Failed to regenerate descriptions:', error)
        // Use fallback description
        outfit.rationale = `Perfect for ${occasion} in ${temperature}°F weather`
        outfit.weather_rationale = ''
        outfit.style_rationale = outfit.rationale
      }
    }

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
          rationale: outfit.rationale || outfit.style_rationale || '',
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