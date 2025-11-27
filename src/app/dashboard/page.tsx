'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { User, ClosetItem, Outfit } from '@/types'
import { Shirt, Camera, Calendar, LogOut, User as UserIcon, History, Heart, Luggage } from 'lucide-react'
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-rose-500 border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-rose-500 to-teal-500 bg-clip-text text-transparent">
              styled.ai
            </h1>
            <div className="flex items-center gap-4">
              {/* Weather Display */}
              <WeatherDisplay 
                city={user?.home_city || 'Miami'}
                compact={true}
                showRefresh={true}
              />
              
              {/* Profile Button */}
              <button 
                onClick={() => router.push('/profile')}
                className="p-2 hover:bg-gray-100 rounded-full"
                title="Profile & Settings"
              >
                <UserIcon className="w-5 h-5" />
              </button>
              
              {/* Logout Button */}
              <button 
                onClick={handleLogout} 
                className="p-2 hover:bg-gray-100 rounded-full"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Quick Action Cards */}
        <div className="grid md:grid-cols-5 gap-4 mb-8">
          {/* Generate Outfit */}
          <button
            onClick={() => router.push('/outfits/generate')}
            className="bg-gradient-to-r from-rose-500 to-teal-500 text-white p-6 rounded-xl shadow-lg hover:opacity-90 transition text-left"
          >
            <Shirt className="w-8 h-8 mb-2" />
            <h3 className="font-semibold text-lg">Get an Outfit</h3>
            <p className="text-sm opacity-90">AI-styled for any occasion</p>
          </button>
          
          {/* My Closet */}
          <button
            onClick={() => router.push('/closet')}
            className="bg-white p-6 rounded-xl shadow hover:shadow-md transition text-left"
          >
            <Camera className="w-8 h-8 mb-2 text-gray-700" />
            <h3 className="font-semibold text-lg text-gray-800">My Closet</h3>
            <p className="text-sm text-gray-600">{closetItems.length} items</p>
          </button>

          {/* Outfit History - NEW */}
          <button
            onClick={() => router.push('/outfits/history')}
            className="bg-white p-6 rounded-xl shadow hover:shadow-md transition text-left"
          >
            <History className="w-8 h-8 mb-2 text-gray-700" />
            <h3 className="font-semibold text-lg text-gray-800">Outfit History</h3>
            <p className="text-sm text-gray-600">
              {outfits.length} outfits • {outfits.filter(o => o.is_favorite).length} favorites
            </p>
          </button>

          {/* Calendar */}
          <button
            onClick={() => router.push('/calendar')}
            className="bg-white p-6 rounded-xl shadow hover:shadow-md transition text-left"
          >
            <Calendar className="w-8 h-8 mb-2 text-gray-700" />
            <h3 className="font-semibold text-lg text-gray-800">Calendar Styling</h3>
            <p className="text-sm text-gray-600">Outfits for events</p>
          </button>

          {/* Packing List */}
          <button
            onClick={() => router.push('/packing')}
            className="bg-white p-6 rounded-xl shadow hover:shadow-md transition text-left"
          >
            <Luggage className="w-8 h-8 mb-2 text-gray-700" />
            <h3 className="font-semibold text-lg text-gray-800">Packing List</h3>
            <p className="text-sm text-gray-600">Plan for your trip</p>
          </button>
        </div>

        {/* Recent Outfits Section */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Recent Outfits</h2>
            {outfits.length > 0 && (
              <button
                onClick={() => router.push('/outfits/history')}
                className="text-sm text-rose-500 hover:text-rose-600 font-medium"
              >
                View All →
              </button>
            )}
          </div>

          {outfits.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl">
              <Shirt className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">No outfits yet. Create your first one!</p>
              <button
                onClick={() => router.push('/outfits/generate')}
                className="mt-4 bg-gradient-to-r from-rose-500 to-teal-500 text-white px-6 py-2 rounded-lg font-semibold hover:opacity-90 transition"
              >
                Generate Outfit
              </button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {outfits.slice(0, 6).map((outfit) => {
                const outfitItems = closetItems.filter(item => 
                  outfit.outfit_data.closet_item_ids?.includes(item.id)
                )
                const newItems = outfit.outfit_data.new_items || []

                return (
                  <div key={outfit.id} className="bg-white rounded-xl shadow-lg overflow-hidden">
                    {/* Favorite Badge */}
                    {outfit.is_favorite && (
                      <div className="absolute top-2 right-2 z-10">
                        <Heart className="w-5 h-5 fill-red-500 text-red-500" />
                      </div>
                    )}
                    
                    <div className="p-4 bg-gray-50 relative">
                      {outfitItems.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-gray-600 mb-2">From Your Closet:</p>
                          <div className="grid grid-cols-3 gap-2 mb-3">
                            {outfitItems.map((item) => (
                              <img
                                key={item.id}
                                src={item.image_url}
                                alt={item.name}
                                className="w-full aspect-square object-cover rounded-lg"
                              />
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {newItems.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-teal-600 mb-2">✨ New Items to Consider:</p>
                          <div className="space-y-2">
                            {newItems.map((item: any, i: number) => (
                              <div key={i} className="bg-white p-3 rounded-lg border border-teal-100">
                                <p className="font-medium text-sm text-gray-800">{item.description}</p>
                                <p className="text-xs text-gray-500 mt-1">{item.reasoning}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {outfitItems.length === 0 && newItems.length === 0 && (
                        <div className="text-center text-gray-500 text-sm py-8">
                          No items
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-lg mb-2">{outfit.label}</h3>
                      <p className="text-sm text-gray-600 mb-1">{outfit.outfit_data.weather_rationale}</p>
                      <p className="text-sm text-gray-500">{outfit.outfit_data.style_rationale}</p>
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