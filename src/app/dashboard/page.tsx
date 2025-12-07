'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { User, ClosetItem, Outfit } from '@/types'
import { Shirt, Camera, Calendar, LogOut, User as UserIcon, Heart, Luggage, Image } from 'lucide-react'
import WeatherDisplay from '@/components/WeatherDisplay'

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
        {/* Get Outfit CTA */}
        <div className="mb-10 text-center">
          <button
            onClick={() => router.push('/outfits/generate')}
            className="bg-blush text-dark-taupe px-12 py-4 rounded-full font-medium hover:bg-blush/80 transition-all shadow-sm tracking-wide inline-flex items-center gap-3"
          >
            <Shirt className="w-5 h-5" />
            GET OUTFIT
          </button>
        </div>

        {/* Icon Navigation Row */}
        <div className="flex justify-center gap-12 mb-12 pb-8 border-b border-taupe/10">
          {/* Closet */}
          <button
            onClick={() => router.push('/closet')}
            className="flex flex-col items-center gap-2 group"
          >
            <div className="p-4 rounded-full bg-beige border border-taupe/10 group-hover:bg-taupe/20 transition-colors">
              <Shirt className="w-6 h-6 text-dark-taupe" />
            </div>
            <span className="text-sm font-medium text-dark-taupe tracking-wide">Closet</span>
          </button>

          {/* Inspo */}
          <button
            onClick={() => router.push('/inspo')}
            className="flex flex-col items-center gap-2 group"
          >
            <div className="p-4 rounded-full bg-beige border border-taupe/10 group-hover:bg-taupe/20 transition-colors">
              <Image className="w-6 h-6 text-dark-taupe" />
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
            <div className="grid md:grid-cols-2 gap-6">
              {outfits.slice(0, 6).map((outfit) => {
                const outfitItems = closetItems.filter(item =>
                  outfit.outfit_data.closet_item_ids?.includes(item.id)
                )
                const newItems = outfit.outfit_data.new_items || []

                return (
                  <div key={outfit.id} className="bg-beige rounded-3xl overflow-hidden border border-taupe/10 hover:shadow-lg transition-all">
                    {/* Favorite Badge */}
                    {outfit.is_favorite && (
                      <div className="absolute top-4 right-4 z-10">
                        <Heart className="w-5 h-5 fill-blush text-blush" />
                      </div>
                    )}

                    <div className="p-6 bg-cream/50 relative">
                      {outfitItems.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-warm-grey tracking-wide uppercase mb-3">From Your Closet</p>
                          <div className="grid grid-cols-3 gap-3 mb-4">
                            {outfitItems.map((item) => (
                              <img
                                key={item.id}
                                src={item.image_url}
                                alt={item.name}
                                className="w-full aspect-[4/5] object-cover rounded-2xl"
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {newItems.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-dark-taupe tracking-wide uppercase mb-3">New Items to Consider</p>
                          <div className="space-y-3">
                            {newItems.map((item: any, i: number) => (
                              <div key={i} className="bg-beige p-4 rounded-2xl border border-taupe/10">
                                <p className="font-normal text-sm text-dark-taupe leading-relaxed">{item.description}</p>
                                <p className="text-xs text-warm-grey mt-2">{item.reasoning}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {outfitItems.length === 0 && newItems.length === 0 && (
                        <div className="text-center text-warm-grey text-sm py-12">
                          No items
                        </div>
                      )}
                    </div>
                    <div className="p-6">
                      <h3 className="font-medium text-base mb-3 text-dark-taupe">{outfit.label}</h3>
                      <p className="text-sm text-warm-grey mb-2 leading-relaxed">{outfit.outfit_data.weather_rationale}</p>
                      <p className="text-sm text-taupe leading-relaxed">{outfit.outfit_data.style_rationale}</p>
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