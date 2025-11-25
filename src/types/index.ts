export interface User {
  id: string
  email: string
  created_at: string
  updated_at: string
  
  // Profile
  height?: string
  body_shape?: string
  style_vibe: string[]
  color_palette: string[]
  avoid_colors: string[]
  budget_level: string
  preferred_brands?: string[]
  
  // Location
  home_city?: string
  home_region?: string
  home_country?: string
  timezone?: string
  use_auto_location: boolean
  
  // Features
  use_calendar_styling: boolean
  plan_ahead_days: number
}

export interface ClosetItem {
  id: string
  user_id: string
  image_url: string
  name: string
  category: string
  color: string
  season: string[]
  vibe: string[]
  fit?: string
  brand?: string
  source: string
  created_at: string
  updated_at: string
  is_archived: boolean
}

export interface Outfit {
  id: string
  user_id: string
  label: string
  context_type: string
  context_id?: string
  date?: string
  created_at: string
  is_favorite?: boolean
  outfit_data: {
    closet_item_ids: string[]
    new_items?: Array<{
      description: string
      category: string
      color?: string
      reasoning: string
      estimated_price?: string
      search_terms?: string
    }>
    weather_rationale: string
    style_rationale: string
    styling_tips?: string[]
    weather?: {
      temperature: number
      condition: string
      city: string
    }
    variations?: string[]
  }
}