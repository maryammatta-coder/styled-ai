'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { User, ClosetItem, Outfit } from '@/types'
import { Shirt, Calendar, LogOut, User as UserIcon, Heart, Luggage, Image as ImageIcon, Sparkles } from 'lucide-react'
import WeatherDisplay from '@/components/WeatherDisplay'
import NextImage from 'next/image'

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [closetItems, setClosetItems] = useState<ClosetItem[]>([])
  const [outfits, setOutfits] = useState<Outfit[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadUserData()
  }, [])

  const loadUserData = async () => {
    try {
      // First try to get the session to ensure it's loaded
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        // No session found, redirect to login
        router.push('/login')
        return
      }

      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        router.push('/login')
        return
      }

      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single()

      const { data: closetData } = await supabase
        .from('closet_items')
        .select('*')
        .eq('user_id', authUser.id)
        .eq('is_archived', false)

      const { data: outfitData } = await supabase
        .from('outfits')
        .select('*')
        .eq('user_id', authUser.id)
        .order('created_at', { ascending: false })

      setUser(userData)
      setClosetItems(closetData || [])
      setOutfits(outfitData || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-blush border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <div className="bg-beige border-b border-taupe/20 sticky top-0 z-10 backdrop-blur-sm bg-beige/90">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-light tracking-[0.2em] text-dark-taupe">
              STYLED.AI
            </h1>
            <div className="flex items-center gap-3">
              {/* Weather Display */}
              <WeatherDisplay
                city={user?.home_city}
                compact={true}
                showRefresh={true}
                autoDetectLocation={true}
              />

              {/* Profile Button */}
              <button
                onClick={() => router.push('/profile')}
                className="p-2 hover:bg-taupe/20 rounded-full transition-colors"
                title="Profile & Settings"
              >
                <UserIcon className="w-5 h-5 text-warm-grey" />
              </button>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="p-2 hover:bg-taupe/20 rounded-full transition-colors"
                title="Logout"
              >
                <LogOut className="w-5 h-5 text-warm-grey" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Icon Navigation Row */}
        <div className="flex justify-center gap-12 mb-10 pb-8 border-b border-taupe/10">
          {/* Closet */}
          <button
            onClick={() => router.push('/closet')}
            className="flex flex-col items-center gap-2 group"
          >
            <div className="p-4 rounded-full bg-beige border border-taupe/10 group-hover:bg-taupe/20 transition-colors">
              <svg className="w-6 h-6 text-dark-taupe" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 4v2M4 15l8-6 8 6M4 15v1a1 1 0 001 1h14a1 1 0 001-1v-1" />
              </svg>
            </div>
            <span className="text-sm font-medium text-dark-taupe tracking-wide">Closet</span>
          </button>

          {/* Inspo */}
          <button
            onClick={() => router.push('/inspo')}
            className="flex flex-col items-center gap-2 group"
          >
            <div className="p-4 rounded-full bg-beige border border-taupe/10 group-hover:bg-taupe/20 transition-colors">
              <ImageIcon className="w-6 h-6 text-dark-taupe" />
            </div>
            <span className="text-sm font-medium text-dark-taupe tracking-wide">Inspo</span>
          </button>

          {/* Calendar */}
          <button
            onClick={() => router.push('/calendar')}
            className="flex flex-col items-center gap-2 group"
          >
            <div className="p-4 rounded-full bg-beige border border-taupe/10 group-hover:bg-taupe/20 transition-colors">
              <Calendar className="w-6 h-6 text-dark-taupe" />
            </div>
            <span className="text-sm font-medium text-dark-taupe tracking-wide">Calendar</span>
          </button>

          {/* Packing */}
          <button
            onClick={() => router.push('/packing')}
            className="flex flex-col items-center gap-2 group"
          >
            <div className="p-4 rounded-full bg-beige border border-taupe/10 group-hover:bg-taupe/20 transition-colors">
              <Luggage className="w-6 h-6 text-dark-taupe" />
            </div>
            <span className="text-sm font-medium text-dark-taupe tracking-wide">Packing</span>
          </button>
        </div>

        {/* Get Outfit CTA */}
        <div className="mb-12 text-center">
          <button
            onClick={() => router.push('/outfits/generate')}
            className="bg-blush text-dark-taupe px-12 py-4 rounded-full font-medium hover:bg-blush/80 transition-all shadow-sm tracking-wide inline-flex items-center gap-3"
          >
            <Shirt className="w-5 h-5" />
            GET OUTFIT
          </button>
        </div>

        {/* Recent Outfits Section */}
        <div>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-light tracking-wide text-dark-taupe">RECENT OUTFITS</h2>
            {outfits.length > 0 && (
              <button
                onClick={() => router.push('/outfits/history')}
                className="text-sm text-dark-taupe hover:text-warm-grey font-medium tracking-wide transition-colors"
              >
                VIEW ALL →
              </button>
            )}
          </div>

          {outfits.length === 0 ? (
            <div className="text-center py-20 bg-beige rounded-3xl border border-taupe/20">
              <Shirt className="w-16 h-16 text-taupe mx-auto mb-6" />
              <p className="text-warm-grey mb-8 text-lg">No outfits yet. Create your first one!</p>
              <button
                onClick={() => router.push('/outfits/generate')}
                className="bg-blush text-dark-taupe px-8 py-4 rounded-full font-medium hover:bg-blush/80 transition-all shadow-sm tracking-wide"
              >
                GENERATE OUTFIT
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {outfits.slice(0, 6).map((outfit) => {
                const closetItemIds = outfit.outfit_data?.closet_item_ids || []
                const previewItems = closetItemIds
                  .slice(0, 4)
                  .map((id) => closetItems.find((item) => item.id === id))
                  .filter(Boolean) as ClosetItem[]

                const date = new Date(outfit.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })

                return (
                  <div
                    key={outfit.id}
                    className="bg-beige rounded-3xl border border-taupe/10 overflow-hidden hover:shadow-lg transition-all cursor-pointer"
                    onClick={() => router.push('/outfits/history')}
                  >
                    <div className="aspect-[4/5] bg-cream relative">
                      {previewItems.length > 0 ? (
                        <div className="grid grid-cols-2 h-full gap-0.5">
                          {previewItems.map((item, idx) => (
                            <div key={idx} className="relative bg-cream">
                              <NextImage
                                src={item.image_url}
                                alt={item.name || ''}
                                fill
                                className="object-cover"
                              />
                            </div>
                          ))}
                          {previewItems.length < 4 &&
                            Array.from({ length: 4 - previewItems.length }).map((_, idx) => (
                              <div
                                key={`empty-${idx}`}
                                className="bg-gradient-to-br from-cream to-beige flex items-center justify-center"
                              >
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

                      {outfit.is_favorite && (
                        <div className="absolute top-3 right-3">
                          <Heart className="w-5 h-5 fill-blush text-blush" />
                        </div>
                      )}
                    </div>

                    <div className="p-5">
                      <div className="mb-2">
                        <h3 className="font-medium text-dark-taupe truncate">{outfit.label}</h3>
                        <div className="flex items-center gap-2 text-xs text-warm-grey mt-1">
                          <span>{outfit.context_type}</span>
                          <span>•</span>
                          <span>{date}</span>
                        </div>
                      </div>

                      {outfit.outfit_data?.rationale && (
                        <p className="text-sm text-warm-grey leading-relaxed line-clamp-2">
                          {outfit.outfit_data.rationale}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}