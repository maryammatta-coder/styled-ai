'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { OCCASIONS } from '@/lib/utils/constants'
import { X, Sparkles, ChevronLeft, ChevronRight, Heart, Loader2 } from 'lucide-react'

interface OutfitOption {
  id: string
  label: string
  outfit_data: {
    closet_items: any[]
    closet_item_ids: string[]
    new_items: any[]
    weather_rationale: string
    style_rationale: string
    styling_tips?: string[]
    formality_level: number
  }
}

export default function GenerateOutfitPage() {
  const [selectedOccasion, setSelectedOccasion] = useState('')
  const [itemSource, setItemSource] = useState<'closet' | 'mix' | 'new'>('closet')
  const [formalityLevel, setFormalityLevel] = useState(50)
  const [loading, setLoading] = useState(false)
  const [outfitOptions, setOutfitOptions] = useState<OutfitOption[]>([])
  const [currentOutfitIndex, setCurrentOutfitIndex] = useState(0)
  const [savingOutfit, setSavingOutfit] = useState(false)
  const [step, setStep] = useState<'setup' | 'results'>('setup')
  
  const router = useRouter()
  const supabase = createClient()

  const getFormalityLabel = (value: number) => {
    if (value <= 20) return 'Very Casual'
    if (value <= 40) return 'Casual'
    if (value <= 60) return 'Smart Casual'
    if (value <= 80) return 'Dressy'
    return 'Formal'
  }

  const generateOutfits = async () => {
    if (!selectedOccasion) return

    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Fetch user data to get location
      const { data: userData } = await supabase
        .from('users')
        .select('home_city')
        .eq('id', user.id)
        .single()

      // Fetch current weather
      let weatherData = null
      try {
        // Try to get weather by geolocation first
        const getWeatherByLocation = async () => {
          return new Promise((resolve) => {
            if (!navigator.geolocation) {
              resolve(null)
              return
            }
            navigator.geolocation.getCurrentPosition(
              async (position) => {
                try {
                  const response = await fetch(
                    `/api/weather?lat=${position.coords.latitude}&lon=${position.coords.longitude}`
                  )
                  const data = await response.json()
                  resolve(data.success ? data.weather : null)
                } catch {
                  resolve(null)
                }
              },
              () => resolve(null),
              { timeout: 5000 }
            )
          })
        }

        weatherData = await getWeatherByLocation()

        // Fall back to home_city if geolocation fails
        if (!weatherData && userData?.home_city) {
          const response = await fetch(`/api/weather?city=${encodeURIComponent(userData.home_city)}`)
          const data = await response.json()
          if (data.success) {
            weatherData = data.weather
          }
        }
      } catch (err) {
        console.error('Weather fetch error:', err)
      }

      const response = await fetch('/api/outfits/generate-multiple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          occasion: selectedOccasion,
          itemSource: itemSource,
          formalityLevel: formalityLevel,
          count: 3,
          weather: weatherData,
        })
      })

      const data = await response.json()
      
      if (!response.ok) throw new Error(data.error || 'Failed to generate outfits')

      if (data.success && data.outfits && data.outfits.length > 0) {
        setOutfitOptions(data.outfits)
        setCurrentOutfitIndex(0)
        setStep('results')
      } else {
        throw new Error('No outfits generated')
      }
    } catch (error: any) {
      console.error(error)
      alert(error.message || 'Failed to generate outfits')
    } finally {
      setLoading(false)
    }
  }

  const saveSelectedOutfit = async () => {
    if (outfitOptions.length === 0) return
    
    setSavingOutfit(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const selectedOutfit = outfitOptions[currentOutfitIndex]

      const { error } = await supabase
        .from('outfits')
        .insert({
          user_id: user.id,
          label: selectedOutfit.label,
          context_type: selectedOccasion,
          date: new Date().toISOString().split('T')[0],
          outfit_data: selectedOutfit.outfit_data,
        })

      if (error) throw error

      router.push('/outfits/history')
    } catch (error: any) {
      console.error(error)
      alert('Failed to save outfit: ' + error.message)
    } finally {
      setSavingOutfit(false)
    }
  }

  const nextOutfit = () => {
    setCurrentOutfitIndex((prev) => (prev + 1) % outfitOptions.length)
  }

  const prevOutfit = () => {
    setCurrentOutfitIndex((prev) => (prev - 1 + outfitOptions.length) % outfitOptions.length)
  }

  const currentOutfit = outfitOptions[currentOutfitIndex]

  return (
    <div className="min-h-screen bg-cream p-6">
      <div className="max-w-2xl mx-auto pt-10">
        {/* Setup Step */}
        {step === 'setup' && (
          <div className="bg-beige rounded-3xl shadow-lg p-10 border border-taupe/10">
            <div className="flex justify-between items-center mb-10">
              <div>
                <h2 className="text-3xl font-light tracking-wide text-dark-taupe mb-2">GENERATE OUTFITS</h2>
                <p className="text-warm-grey">We'll create 3 options for you to choose from</p>
              </div>
              <button onClick={() => router.push('/dashboard')} className="p-2 hover:bg-taupe/20 rounded-full transition-colors">
                <X className="w-6 h-6 text-warm-grey" />
              </button>
            </div>

            {/* Item Source Selection */}
            <div className="mb-10">
              <h3 className="text-sm font-medium text-warm-grey tracking-widest uppercase mb-4">Use items from</h3>
              <div className="grid grid-cols-1 gap-4">
                <button
                  onClick={() => setItemSource('closet')}
                  className={`p-5 rounded-2xl border-2 transition-all text-left ${
                    itemSource === 'closet'
                      ? 'border-blush bg-blush/30'
                      : 'border-taupe/30 hover:border-taupe bg-cream/50'
                  }`}
                >
                  <div className="font-medium text-dark-taupe">My Closet Only</div>
                  <div className="text-sm text-warm-grey mt-1">Create outfits using only items you own</div>
                </button>

                <button
                  onClick={() => setItemSource('mix')}
                  className={`p-5 rounded-2xl border-2 transition-all text-left ${
                    itemSource === 'mix'
                      ? 'border-blush bg-blush/30'
                      : 'border-taupe/30 hover:border-taupe bg-cream/50'
                  }`}
                >
                  <div className="font-medium text-dark-taupe">Mix & Match</div>
                  <div className="text-sm text-warm-grey mt-1">Combine your items with new suggestions</div>
                </button>

                <button
                  onClick={() => setItemSource('new')}
                  className={`p-5 rounded-2xl border-2 transition-all text-left ${
                    itemSource === 'new'
                      ? 'border-blush bg-blush/30'
                      : 'border-taupe/30 hover:border-taupe bg-cream/50'
                  }`}
                >
                  <div className="font-medium text-dark-taupe">New Items Only</div>
                  <div className="text-sm text-warm-grey mt-1">Get fresh outfit ideas with new pieces to buy</div>
                </button>
              </div>
            </div>

            {/* Occasion Selection */}
            <div className="mb-10">
              <h3 className="text-sm font-medium text-warm-grey tracking-widest uppercase mb-4">What's the occasion?</h3>
              <div className="grid grid-cols-2 gap-3">
                {OCCASIONS.map((occasion) => (
                  <button
                    key={occasion}
                    onClick={() => setSelectedOccasion(occasion)}
                    className={`p-4 rounded-2xl border-2 transition-all ${
                      selectedOccasion === occasion
                        ? 'border-dark-taupe bg-dark-taupe text-cream'
                        : 'border-taupe/30 hover:border-taupe text-dark-taupe bg-cream/50'
                    }`}
                  >
                    <span className="font-medium text-sm">{occasion}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Formality Slider */}
            <div className="mb-10">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-medium text-warm-grey tracking-widest uppercase">Style Level</h3>
                <span className="text-sm font-medium text-dark-taupe bg-blush/40 px-4 py-1.5 rounded-full">
                  {getFormalityLabel(formalityLevel)}
                </span>
              </div>

              <div className="relative">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={formalityLevel}
                  onChange={(e) => setFormalityLevel(Number(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #F5DAD1 0%, #E2D8CF 50%, #C8B9AE 100%)`
                  }}
                />
                <div className="flex justify-between text-xs text-warm-grey mt-3">
                  <span>Casual</span>
                  <span>Smart Casual</span>
                  <span>Formal</span>
                </div>
              </div>
            </div>

            <button
              onClick={generateOutfits}
              disabled={!selectedOccasion || loading}
              className="w-full bg-blush text-dark-taupe py-5 rounded-full font-medium hover:bg-blush/80 transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-sm tracking-wide"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>CREATING OPTIONS...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>GENERATE 3 OUTFITS</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Results Step */}
        {step === 'results' && currentOutfit && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => {
                  setStep('setup')
                  setOutfitOptions([])
                }}
                className="flex items-center gap-2 text-warm-grey hover:text-dark-taupe transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
                <span className="text-sm tracking-wide">BACK</span>
              </button>
              <h2 className="text-xl font-light tracking-wide text-dark-taupe">CHOOSE YOUR OUTFIT</h2>
              <div className="w-24"></div>
            </div>

            {/* Outfit Carousel */}
            <div className="bg-beige rounded-3xl shadow-lg overflow-hidden border border-taupe/10">
              {/* Navigation Dots */}
              <div className="flex justify-center gap-3 pt-6">
                {outfitOptions.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentOutfitIndex(index)}
                    className={`w-2.5 h-2.5 rounded-full transition-all ${
                      index === currentOutfitIndex
                        ? 'bg-dark-taupe w-8'
                        : 'bg-taupe hover:bg-warm-grey'
                    }`}
                  />
                ))}
              </div>

              {/* Outfit Card */}
              <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <button
                    onClick={prevOutfit}
                    className="p-3 hover:bg-taupe/20 rounded-full transition-colors"
                  >
                    <ChevronLeft className="w-6 h-6 text-dark-taupe" />
                  </button>
                  
                  <div className="text-center">
                    <h3 className="text-xl font-bold text-gray-800">{currentOutfit.label}</h3>
                    <p className="text-sm text-gray-500">
                      Option {currentOutfitIndex + 1} of {outfitOptions.length}
                    </p>
                  </div>

                  <button
                    onClick={nextOutfit}
                    className="p-2 hover:bg-gray-100 rounded-full transition"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </div>

                {/* Formality Badge */}
                <div className="flex justify-center mb-4">
                  <span className="text-sm font-medium text-purple-600 bg-purple-50 px-3 py-1 rounded-full">
                    {getFormalityLabel(currentOutfit.outfit_data.formality_level || formalityLevel)}
                  </span>
                </div>

                {/* Closet Items */}
                {currentOutfit.outfit_data.closet_items && currentOutfit.outfit_data.closet_items.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-semibold text-gray-600 mb-2">From Your Closet:</p>
                    <div className="grid grid-cols-3 gap-2">
                      {currentOutfit.outfit_data.closet_items.map((item: any) => (
                        <div key={item.id} className="relative">
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="w-full aspect-[4/5] object-cover rounded-lg"
                          />
                          <p className="text-xs text-center mt-1 truncate">{item.name}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* New Items */}
                {currentOutfit.outfit_data.new_items && currentOutfit.outfit_data.new_items.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-semibold text-teal-600 mb-2">✨ Suggested New Items:</p>
                    <div className="space-y-2">
                      {currentOutfit.outfit_data.new_items.map((item: any, i: number) => (
                        <div key={i} className="bg-teal-50 p-3 rounded-lg border border-teal-100">
                          <p className="font-medium text-sm text-gray-800">{item.description}</p>
                          <div className="flex justify-between items-center mt-1">
                            <p className="text-xs text-gray-500 capitalize">{item.category} • {item.color}</p>
                            {item.estimated_price && (
                              <p className="text-xs font-medium text-teal-600">{item.estimated_price}</p>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">{item.reasoning}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Weather Rationale */}
                {currentOutfit.outfit_data.weather_rationale && (
                  <div className="bg-blue-50 p-3 rounded-lg mb-3">
                    <p className="text-sm text-blue-800">
                      🌤️ {currentOutfit.outfit_data.weather_rationale}
                    </p>
                  </div>
                )}

                {/* Style Rationale */}
                {currentOutfit.outfit_data.style_rationale && (
                  <div className="bg-purple-50 p-3 rounded-lg mb-3">
                    <p className="text-sm text-purple-800">
                      ✨ {currentOutfit.outfit_data.style_rationale}
                    </p>
                  </div>
                )}

                {/* Styling Tips */}
                {currentOutfit.outfit_data.styling_tips && currentOutfit.outfit_data.styling_tips.length > 0 && (
                  <div className="border-t border-gray-100 pt-3 mt-3">
                    <p className="text-sm font-semibold text-gray-600 mb-2">Styling Tips:</p>
                    <ul className="space-y-1">
                      {currentOutfit.outfit_data.styling_tips.map((tip: string, i: number) => (
                        <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                          <span className="text-rose-500">•</span>
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="border-t border-gray-100 p-4 flex gap-3">
                <button
                  onClick={() => {
                    setStep('setup')
                    setOutfitOptions([])
                  }}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium"
                >
                  Generate New Options
                </button>
                <button
                  onClick={saveSelectedOutfit}
                  disabled={savingOutfit}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-rose-500 to-teal-500 text-white rounded-lg hover:opacity-90 transition font-medium disabled:opacity-50"
                >
                  {savingOutfit ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Heart className="w-5 h-5" />
                      Save This Outfit
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Swipe Hint */}
            <p className="text-center text-sm text-gray-500">
              ← Swipe or use arrows to see other options →
            </p>
          </div>
        )}
      </div>
    </div>
  )
}