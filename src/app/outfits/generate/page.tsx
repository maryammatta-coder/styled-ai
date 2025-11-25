'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { OCCASIONS } from '@/lib/utils/constants'
import { X, Sparkles } from 'lucide-react'

export default function GenerateOutfitPage() {
  const [selectedOccasion, setSelectedOccasion] = useState('')
  const [itemSource, setItemSource] = useState<'closet' | 'mix' | 'new'>('closet')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const generateOutfit = async () => {
    if (!selectedOccasion) return

    setLoading(true)
    try {
      const response = await fetch('/api/outfits/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          occasion: selectedOccasion,
          itemSource: itemSource,
        })
      })

      const data = await response.json()
      
      if (!response.ok) throw new Error(data.error || 'Failed to generate outfit')

      router.push('/dashboard')
    } catch (error: any) {
      console.error(error)
      alert(error.message || 'Failed to generate outfit')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 to-teal-50 p-4">
      <div className="max-w-2xl mx-auto pt-12">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-3xl font-bold text-gray-800 mb-2">Generate an Outfit</h2>
              <p className="text-gray-600">Customize your styling preferences</p>
            </div>
            <button onClick={() => router.push('/dashboard')}>
              <X className="w-6 h-6 text-gray-600 hover:text-gray-800" />
            </button>
          </div>

          {/* Item Source Selection */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Use items from:</h3>
            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={() => setItemSource('closet')}
                className={`p-4 rounded-lg border-2 transition text-left ${
                  itemSource === 'closet'
                    ? 'border-rose-500 bg-rose-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-semibold text-gray-800">My Closet Only</div>
                <div className="text-sm text-gray-600">Create outfits using only items you own</div>
              </button>

              <button
                onClick={() => setItemSource('mix')}
                className={`p-4 rounded-lg border-2 transition text-left ${
                  itemSource === 'mix'
                    ? 'border-rose-500 bg-rose-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-semibold text-gray-800">Mix & Match</div>
                <div className="text-sm text-gray-600">Combine your items with new suggestions</div>
              </button>

              <button
                onClick={() => setItemSource('new')}
                className={`p-4 rounded-lg border-2 transition text-left ${
                  itemSource === 'new'
                    ? 'border-rose-500 bg-rose-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-semibold text-gray-800">New Items Only</div>
                <div className="text-sm text-gray-600">Get fresh outfit ideas with new pieces to buy</div>
              </button>
            </div>
          </div>

          {/* Occasion Selection */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">What's the occasion?</h3>
            <div className="grid grid-cols-2 gap-3">
              {OCCASIONS.map((occasion) => (
                <button
                  key={occasion}
                  onClick={() => setSelectedOccasion(occasion)}
                  className={`p-4 rounded-lg border-2 transition ${
                    selectedOccasion === occasion
                      ? 'border-rose-500 bg-rose-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="font-medium text-gray-800">{occasion}</span>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={generateOutfit}
            disabled={!selectedOccasion || loading}
            className="w-full bg-gradient-to-r from-rose-500 to-teal-500 text-white py-4 rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                <span>Creating your perfect outfit...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>Generate Outfit</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}