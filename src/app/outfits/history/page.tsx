'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Heart,
  Trash2,
  Calendar,
  Cloud,
  Sparkles,
  Filter,
  Search,
  Loader2,
  ChevronDown,
  MoreVertical,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'

interface OutfitData {
  closet_items?: ClosetItem[]
  closet_item_ids: string[]
  new_items: NewItem[]
  weather_rationale: string
  style_rationale: string
  styling_tips?: string[]
  weather?: {
    temperature: number
    condition: string
    city: string
  }
}

interface ClosetItem {
  id: string
  name: string
  category: string
  color: string
  image_url: string
}

interface NewItem {
  description: string
  category: string
  color: string
  reasoning: string
  estimated_price?: string
}

interface Outfit {
  id: string
  label: string
  context_type: string
  date: string
  created_at: string
  outfit_data: OutfitData
  is_favorite?: boolean
}

type FilterType = 'all' | 'favorites' | 'date-night' | 'work' | 'casual' | 'brunch'

export default function OutfitHistoryPage() {
  const router = useRouter()
  const supabase = createClient()

  const [outfits, setOutfits] = useState<Outfit[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilterMenu, setShowFilterMenu] = useState(false)
  const [selectedOutfit, setSelectedOutfit] = useState<Outfit | null>(null)
  const [closetItemsMap, setClosetItemsMap] = useState<Record<string, ClosetItem>>({})

  useEffect(() => {
    loadOutfits()
  }, [])

  const loadOutfits = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      const { data: outfitsData, error: outfitsError } = await supabase
        .from('outfits')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (outfitsError) throw outfitsError

      const { data: closetItems, error: closetError } = await supabase
        .from('closet_items')
        .select('*')
        .eq('user_id', user.id)

      if (!closetError && closetItems) {
        const itemsMap: Record<string, ClosetItem> = {}
        closetItems.forEach((item) => {
          itemsMap[item.id] = item
        })
        setClosetItemsMap(itemsMap)
      }

      setOutfits(outfitsData || [])
    } catch (error) {
      console.error('Error loading outfits:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleFavorite = async (outfitId: string) => {
    const outfit = outfits.find((o) => o.id === outfitId)
    if (!outfit) return

    const newFavoriteStatus = !outfit.is_favorite

    setOutfits((prev) =>
      prev.map((o) =>
        o.id === outfitId ? { ...o, is_favorite: newFavoriteStatus } : o
      )
    )

    try {
      const { error } = await supabase
        .from('outfits')
        .update({ is_favorite: newFavoriteStatus })
        .eq('id', outfitId)

      if (error) throw error
    } catch (error) {
      console.error('Error updating favorite:', error)
      setOutfits((prev) =>
        prev.map((o) =>
          o.id === outfitId ? { ...o, is_favorite: !newFavoriteStatus } : o
        )
      )
    }
  }

  const deleteOutfit = async (outfitId: string) => {
    if (!confirm('Are you sure you want to delete this outfit?')) return

    setOutfits((prev) => prev.filter((o) => o.id !== outfitId))

    try {
      const { error } = await supabase
        .from('outfits')
        .delete()
        .eq('id', outfitId)

      if (error) throw error
    } catch (error) {
      console.error('Error deleting outfit:', error)
      loadOutfits()
    }
  }

  const filteredOutfits = outfits.filter((outfit) => {
    if (filter === 'favorites' && !outfit.is_favorite) return false
    if (filter !== 'all' && filter !== 'favorites') {
      const contextLower = outfit.context_type?.toLowerCase() || ''
      if (!contextLower.includes(filter.replace('-', ' '))) return false
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        outfit.label?.toLowerCase().includes(query) ||
        outfit.context_type?.toLowerCase().includes(query)
      )
    }

    return true
  })

  const filterOptions: { value: FilterType; label: string }[] = [
    { value: 'all', label: 'All Outfits' },
    { value: 'favorites', label: '❤️ Favorites' },
    { value: 'date-night', label: '🌙 Date Night' },
    { value: 'work', label: '💼 Work' },
    { value: 'casual', label: '👕 Casual' },
    { value: 'brunch', label: '🥂 Brunch' },
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blush" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-beige border-b border-taupe/20 sticky top-0 z-10 backdrop-blur-sm bg-beige/90">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="p-2 hover:bg-taupe/20 rounded-full transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-warm-grey" />
              </button>
              <div>
                <h1 className="text-2xl font-light tracking-wide text-dark-taupe">OUTFIT HISTORY</h1>
                <span className="text-xs text-warm-grey tracking-wide">
                  {filteredOutfits.length} OUTFITS
                </span>
              </div>
            </div>

            <button
              onClick={() => router.push('/outfits/generate')}
              className="flex items-center gap-2 px-6 py-3 bg-blush text-dark-taupe rounded-full hover:bg-blush/80 transition-all shadow-sm"
            >
              <Sparkles className="w-4 h-4" />
              <span className="text-sm tracking-wide">NEW OUTFIT</span>
            </button>
          </div>

          <div className="flex items-center gap-4 mt-6">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-grey" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search outfits..."
                className="w-full pl-11 pr-4 py-3 bg-cream border border-taupe/30 rounded-full text-dark-taupe placeholder-warm-grey focus:outline-none focus:border-blush transition-colors text-sm"
              />
            </div>

            <div className="relative">
              <button
                onClick={() => setShowFilterMenu(!showFilterMenu)}
                className="flex items-center gap-2 px-5 py-3 border border-taupe/30 bg-cream rounded-full hover:border-blush transition-colors"
              >
                <Filter className="w-4 h-4 text-dark-taupe" />
                <span className="text-sm text-dark-taupe">
                  {filterOptions.find((f) => f.value === filter)?.label}
                </span>
                <ChevronDown className="w-4 h-4 text-warm-grey" />
              </button>

              {showFilterMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-beige border border-taupe/20 rounded-2xl shadow-lg z-20 overflow-hidden">
                  {filterOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setFilter(option.value)
                        setShowFilterMenu(false)
                      }}
                      className={`w-full px-5 py-3 text-left hover:bg-taupe/20 transition-colors text-sm ${
                        filter === option.value ? 'bg-blush/30 font-medium text-dark-taupe' : 'text-warm-grey'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        {filteredOutfits.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-blush/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <Sparkles className="w-8 h-8 text-dark-taupe" />
            </div>
            <h3 className="text-xl font-light tracking-wide text-dark-taupe mb-3">
              {filter === 'favorites'
                ? 'NO FAVORITES YET'
                : 'NO OUTFITS FOUND'}
            </h3>
            <p className="text-warm-grey mb-8">
              {filter === 'favorites'
                ? 'Heart your favorite outfits to save them here'
                : 'Generate your first outfit to get started'}
            </p>
            <button
              onClick={() => router.push('/outfits/generate')}
              className="px-8 py-4 bg-blush text-dark-taupe rounded-full hover:bg-blush/80 transition-all shadow-sm tracking-wide"
            >
              GENERATE OUTFIT
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredOutfits.map((outfit) => (
              <OutfitCard
                key={outfit.id}
                outfit={outfit}
                closetItemsMap={closetItemsMap}
                onToggleFavorite={() => toggleFavorite(outfit.id)}
                onDelete={() => deleteOutfit(outfit.id)}
                onClick={() => setSelectedOutfit(outfit)}
              />
            ))}
          </div>
        )}
      </main>

      {selectedOutfit && (
        <OutfitDetailModal
          outfit={selectedOutfit}
          closetItemsMap={closetItemsMap}
          onClose={() => setSelectedOutfit(null)}
          onToggleFavorite={() => toggleFavorite(selectedOutfit.id)}
          onDelete={() => {
            deleteOutfit(selectedOutfit.id)
            setSelectedOutfit(null)
          }}
        />
      )}
    </div>
  )
}

interface OutfitCardProps {
  outfit: Outfit
  closetItemsMap: Record<string, ClosetItem>
  onToggleFavorite: () => void
  onDelete: () => void
  onClick: () => void
}

function OutfitCard({
  outfit,
  closetItemsMap,
  onToggleFavorite,
  onDelete,
  onClick,
}: OutfitCardProps) {
  const [showMenu, setShowMenu] = useState(false)

  const closetItemIds = outfit.outfit_data?.closet_item_ids || []
  const previewItems = closetItemIds
    .slice(0, 4)
    .map((id) => closetItemsMap[id])
    .filter(Boolean)

  const date = new Date(outfit.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })

  return (
    <div className="bg-beige rounded-3xl border border-taupe/10 overflow-hidden hover:shadow-lg transition-all group">
      <div
        onClick={onClick}
        className="aspect-[4/5] bg-cream relative cursor-pointer"
      >
        {previewItems.length > 0 ? (
          <div className="grid grid-cols-2 h-full gap-0.5">
            {previewItems.map((item, idx) => (
              <div key={idx} className="relative bg-cream">
                <Image
                  src={item.image_url}
                  alt={item.name || ''}
                  fill
                  className="object-cover"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-dark-taupe/80 to-transparent p-3">
                  <p className="text-cream text-xs font-medium truncate">
                    {item.name || 'Item'}
                  </p>
                  <p className="text-cream/70 text-xs capitalize">
                    {item.category || ''}
                  </p>
                </div>
              </div>
            ))}
            {previewItems.length < 4 &&
              Array.from({ length: 4 - previewItems.length }).map((_, idx) => (
                <div key={`empty-${idx}`} className="bg-gradient-to-br from-cream to-beige flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-taupe" />
                </div>
              ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <Sparkles className="w-12 h-12 text-taupe" />
          </div>
        )}

        {outfit.outfit_data?.new_items?.length > 0 && (
          <div className="absolute top-3 left-3 px-3 py-1.5 bg-blush/90 backdrop-blur-sm text-dark-taupe text-xs font-medium rounded-full">
            +{outfit.outfit_data.new_items.length} NEW
          </div>
        )}
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-dark-taupe truncate">{outfit.label}</h3>
            <div className="flex items-center gap-2 text-xs text-warm-grey mt-1">
              <span>{outfit.context_type}</span>
              <span>•</span>
              <span>{date}</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onToggleFavorite()
              }}
              className="p-2 hover:bg-taupe/20 rounded-full transition-colors"
            >
              <Heart
                className={`w-5 h-5 ${
                  outfit.is_favorite
                    ? 'fill-blush text-blush'
                    : 'text-taupe'
                }`}
              />
            </button>

            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowMenu(!showMenu)
                }}
                className="p-2 hover:bg-taupe/20 rounded-full transition-colors"
              >
                <MoreVertical className="w-5 h-5 text-warm-grey" />
              </button>

              {showMenu && (
                <div className="absolute right-0 mt-1 w-36 bg-beige border border-taupe/20 rounded-2xl shadow-lg z-10 overflow-hidden">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onDelete()
                      setShowMenu(false)
                    }}
                    className="w-full px-4 py-3 text-left text-dark-taupe hover:bg-taupe/20 flex items-center gap-2 text-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {outfit.outfit_data?.weather && (
          <div className="flex items-center gap-2 text-xs text-warm-grey">
            <Cloud className="w-4 h-4" />
            <span>
              {outfit.outfit_data.weather.temperature}°F, {outfit.outfit_data.weather.city}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

interface OutfitDetailModalProps {
  outfit: Outfit
  closetItemsMap: Record<string, ClosetItem>
  onClose: () => void
  onToggleFavorite: () => void
  onDelete: () => void
}

function OutfitDetailModal({
  outfit,
  closetItemsMap,
  onClose,
  onToggleFavorite,
  onDelete,
}: OutfitDetailModalProps) {
  const closetItems = (outfit.outfit_data?.closet_item_ids || [])
    .map((id) => closetItemsMap[id])
    .filter(Boolean)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">{outfit.label}</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleFavorite}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Heart
                className={`w-5 h-5 ${
                  outfit.is_favorite
                    ? 'fill-red-500 text-red-500'
                    : 'text-gray-400'
                }`}
              />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-xl"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex flex-wrap gap-3">
            <span className="px-3 py-1 bg-gray-100 rounded-full text-sm">
              {outfit.context_type}
            </span>
            {outfit.outfit_data?.weather && (
              <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm flex items-center gap-1">
                <Cloud className="w-4 h-4" />
                {outfit.outfit_data.weather.temperature}°F in {outfit.outfit_data.weather.city}
              </span>
            )}
            <span className="px-3 py-1 bg-gray-100 rounded-full text-sm flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {new Date(outfit.created_at).toLocaleDateString()}
            </span>
          </div>

          {closetItems.length > 0 && (
            <div>
              <h3 className="font-medium text-gray-900 mb-3">From Your Closet</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {closetItems.map((item) => (
                  <div key={item.id} className="bg-gray-50 rounded-lg overflow-hidden">
                    <div className="aspect-[4/5] relative">
                      <Image
                        src={item.image_url}
                        alt={item.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="p-2">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      <p className="text-xs text-gray-500 capitalize">{item.category}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {outfit.outfit_data?.new_items?.length > 0 && (
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Suggested New Items</h3>
              <div className="space-y-3">
                {outfit.outfit_data.new_items.map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-purple-50 border border-purple-100 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{item.description}</p>
                        <p className="text-sm text-gray-600 capitalize">
                          {item.category} • {item.color}
                        </p>
                      </div>
                      {item.estimated_price && (
                        <span className="text-sm font-medium text-purple-700">
                          {item.estimated_price}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-2">{item.reasoning}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {outfit.outfit_data?.weather_rationale && (
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-1 flex items-center gap-2">
                <Cloud className="w-4 h-4" />
                Weather Consideration
              </h4>
              <p className="text-sm text-blue-800">{outfit.outfit_data.weather_rationale}</p>
            </div>
          )}

          {outfit.outfit_data?.style_rationale && (
            <div className="bg-purple-50 border border-purple-100 rounded-lg p-4">
              <h4 className="font-medium text-purple-900 mb-1 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Style Notes
              </h4>
              <p className="text-sm text-purple-800">{outfit.outfit_data.style_rationale}</p>
            </div>
          )}

          {outfit.outfit_data?.styling_tips && outfit.outfit_data.styling_tips.length > 0 && (
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Styling Tips</h3>
              <ul className="space-y-2">
                {outfit.outfit_data.styling_tips.map((tip, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <span className="text-purple-500">•</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={onDelete}
              className="flex-1 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete Outfit
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
