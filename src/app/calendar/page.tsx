'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Clock,
  Sparkles,
  Loader2,
  RefreshCw,
  AlertCircle,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'

interface CalendarEvent {
  id: string
  title: string
  description: string
  location: string
  start: string
  end: string
  isAllDay: boolean
}

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [generatingOutfit, setGeneratingOutfit] = useState<string | null>(null)
  const [showOutfitOptions, setShowOutfitOptions] = useState<CalendarEvent | null>(null)
  const [selectedItemSource, setSelectedItemSource] = useState<'closet' | 'mix' | 'new'>('mix')
  const [formalityLevel, setFormalityLevel] = useState(50)
  const [generatedOutfits, setGeneratedOutfits] = useState<any[]>([])
  const [currentOutfitIndex, setCurrentOutfitIndex] = useState(0)
  const [showResultsModal, setShowResultsModal] = useState(false)
  const [savingOutfit, setSavingOutfit] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchEvents()
  }, [])

  const getFormalityLabel = (value: number) => {
    if (value <= 20) return 'Very Casual'
    if (value <= 40) return 'Casual'
    if (value <= 60) return 'Smart Casual'
    if (value <= 80) return 'Dressy'
    return 'Formal'
  }

  const fetchEvents = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/calendar')
      const data = await response.json()

      if (data.success) {
        setEvents(data.events)
      } else {
        setError(data.error || 'Failed to load events')
      }
    } catch (err) {
      setError('Failed to connect to calendar')
    } finally {
      setLoading(false)
    }
  }

  // Detect occasion type from event details
  const detectOccasion = (event: CalendarEvent): string => {
    const text = `${event.title} ${event.description} ${event.location}`.toLowerCase()

    // Business/Work
    if (text.includes('interview') || text.includes('meeting') || text.includes('presentation') ||
        text.includes('conference') || text.includes('work') || text.includes('business')) {
      return 'Business'
    }

    // Brunch
    if (text.includes('brunch') || text.includes('breakfast')) {
      return 'Brunch'
    }

    // Dinner (check before Date Night to properly categorize family dinners, thanksgiving, etc)
    if (text.includes('dinner') || text.includes('thanksgiving') || text.includes('supper')) {
      return 'Dinner'
    }

    // Date Night
    if (text.includes('date') || text.includes('romantic') || text.includes('anniversary')) {
      return 'Date Night'
    }

    // Girls Night Out
    if (text.includes('girls') || text.includes('ladies night') || text.includes('girls night')) {
      return 'Girls Night Out'
    }

    // Sports Event
    if (text.includes('game') || text.includes('match') || text.includes('sports') ||
        text.includes('football') || text.includes('basketball') || text.includes('baseball') ||
        text.includes('soccer') || text.includes('hockey') || text.includes('stadium')) {
      return 'Sports Event'
    }

    // Concert
    if (text.includes('concert') || text.includes('show') || text.includes('music') ||
        text.includes('festival') || text.includes('performance')) {
      return 'Concert'
    }

    // Errands
    if (text.includes('errand') || text.includes('grocery') || text.includes('shopping') ||
        text.includes('appointment') || text.includes('pickup') || text.includes('dentist') ||
        text.includes('doctor') || text.includes('bank')) {
      return 'Errands'
    }

    // Travel Day
    if (text.includes('travel') || text.includes('flight') || text.includes('airport') ||
        text.includes('trip') || text.includes('vacation')) {
      return 'Travel Day'
    }

    // Beach Day
    if (text.includes('beach') || text.includes('pool') || text.includes('swim')) {
      return 'Beach Day'
    }

    // Casual Day Out
    if (text.includes('casual') || text.includes('hangout') || text.includes('coffee') ||
        text.includes('lunch') || text.includes('walk') || text.includes('park')) {
      return 'Casual Day Out'
    }

    return 'Casual Day Out'
  }

// Detect destination city from event details
const detectDestination = (event: CalendarEvent): string | null => {
  const text = `${event.title || ''} ${event.description || ''} ${event.location || ''}`.toUpperCase()
  
  // Common airport codes to city names
  const airportCodes: Record<string, string> = {
    'DTW': 'Detroit',
    'JFK': 'New York',
    'LAX': 'Los Angeles',
    'ORD': 'Chicago',
    'DFW': 'Dallas',
    'DEN': 'Denver',
    'SFO': 'San Francisco',
    'SEA': 'Seattle',
    'ATL': 'Atlanta',
    'BOS': 'Boston',
    'MIA': 'Miami',
    'LAS': 'Las Vegas',
    'MCO': 'Orlando',
    'PHX': 'Phoenix',
    'IAH': 'Houston',
    'MSP': 'Minneapolis',
    'CLT': 'Charlotte',
    'EWR': 'Newark',
    'LGA': 'New York',
    'SAN': 'San Diego',
    'TPA': 'Tampa',
    'PDX': 'Portland',
    'SLC': 'Salt Lake City',
    'BWI': 'Baltimore',
    'DCA': 'Washington DC',
    'IAD': 'Washington DC',
    'AUS': 'Austin',
    'BNA': 'Nashville',
    'RDU': 'Raleigh',
    'SJC': 'San Jose',
    'OAK': 'Oakland',
    'SMF': 'Sacramento',
    'DAL': 'Dallas',
    'HOU': 'Houston',
    'MDW': 'Chicago',
    'FLL': 'Fort Lauderdale',
    'RSW': 'Fort Myers',
    'PBI': 'Palm Beach',
  }
  
  // Check for airport codes first (for flights)
  const flightPattern = /([A-Z]{3})\s*(?:TO|→|-|–)\s*([A-Z]{3})/i
  const match = text.match(flightPattern)
  if (match && airportCodes[match[2].toUpperCase()]) {
    return airportCodes[match[2].toUpperCase()]
  }
  
  // Try to extract city from location field
  if (event.location) {
    const loc = event.location
    
    // List of US state abbreviations
    const states = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY']
    
    // Try to find city before state abbreviation
    for (const state of states) {
      // Pattern: "City Name STATE" or "City Name, STATE"
      const pattern = new RegExp(`([A-Za-z\\s]+?)\\s*,?\\s+${state}\\b`, 'i')
      const cityMatch = loc.match(pattern)
      
      if (cityMatch && cityMatch[1]) {
        let city = cityMatch[1].trim()
        
        // Remove common suffixes
        city = city.replace(/\s*(Township|Twp|County|Dr|Drive|St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|\d+).*$/i, '').trim()
        
        // If we still have something meaningful
        if (city.length > 2 && !/^\d+$/.test(city)) {
          // For "Clinton Township MI", this extracts "Clinton"
          // But we want the full city name for weather lookup
          // Let's get the last word(s) before the state
          const words = cityMatch[1].trim().split(/\s+/)
          
          // Find the actual city (skip street names/numbers)
          // Go backwards and find city-like words
          let cityName = ''
          for (let i = words.length - 1; i >= 0; i--) {
            const word = words[i]
            // Skip numbers and common street suffixes
            if (/^\d+$/.test(word)) continue
            if (/^(Dr|Drive|St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Ln|Lane|Ct|Court|Way|Pl|Place)$/i.test(word)) continue
            
            // This is likely part of the city name
            cityName = word + (cityName ? ' ' + cityName : '')
            
            // Stop if we have a reasonable city name (1-3 words)
            if (cityName.split(' ').length >= 2) break
          }
          
          if (cityName.length > 2) {
            return cityName
          }
        }
      }
    }
    
    // Fallback: if location looks like just a city name
    if (loc.length < 30 && !loc.includes(',') && !/\d{5}/.test(loc)) {
      return loc.trim()
    }
  }
  
  return null
}

  const saveSelectedOutfit = async () => {
    if (generatedOutfits.length === 0) return

    setSavingOutfit(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const selectedOutfit = generatedOutfits[currentOutfitIndex]

      const { error } = await supabase
        .from('outfits')
        .insert({
          user_id: user.id,
          label: selectedOutfit.label,
          context_type: selectedOutfit.context_type || 'Event',
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

  const generateOutfitForEvent = async (event: CalendarEvent, itemSource: 'closet' | 'mix' | 'new', formality: number) => {
    setGeneratingOutfit(event.id)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const occasion = detectOccasion(event)
      const destination = detectDestination(event)
      console.log('Detected destination:', destination)
      console.log('Event details:', event.title, event.description, event.location)

      // Fetch weather for destination if detected
      let weatherData = null
      if (destination) {
        try {
          const weatherResponse = await fetch(`/api/weather?city=${encodeURIComponent(destination)}`)
          const weather = await weatherResponse.json()
          if (weather.success) {
            weatherData = {
              temperature: weather.weather.temperature,
              condition: weather.weather.condition,
              city: destination,
            }
          }
        } catch (err) {
          console.error('Weather fetch error:', err)
        }
      }

      const response = await fetch('/api/outfits/generate-multiple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          occasion: occasion,
          itemSource: itemSource,
          formalityLevel: formality,
          count: 3,
          eventContext: {
            title: event.title,
            location: event.location || destination,
            time: event.start,
          },
          weather: weatherData,
          destination: destination,
        }),
      })

      const data = await response.json()

      if (data.success && data.outfits && data.outfits.length > 0) {
        // Show results in modal
        setGeneratedOutfits(data.outfits)
        setCurrentOutfitIndex(0)
        setShowResultsModal(true)
        setShowOutfitOptions(null) // Close the options modal
      } else {
        alert('Failed to generate outfits: ' + (data.error || 'Unknown error'))
      }
    } catch (err) {
      alert('Failed to generate outfits')
    } finally {
      setGeneratingOutfit(null)
    }
  }


  const formatEventTime = (start: string, end: string, isAllDay: boolean) => {
    if (isAllDay) {
      return 'All Day'
    }

    const startDate = new Date(start)
    const endDate = new Date(end)

    const timeOptions: Intl.DateTimeFormatOptions = {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }

    return `${startDate.toLocaleTimeString('en-US', timeOptions)} - ${endDate.toLocaleTimeString('en-US', timeOptions)}`
  }

  const formatEventDate = (start: string) => {
    const date = new Date(start)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (date.toDateString() === today.toDateString()) {
      return 'Today'
    }
    if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow'
    }

    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    })
  }

  const groupedEvents = events.reduce((groups: Record<string, CalendarEvent[]>, event) => {
    const date = formatEventDate(event.start)
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(event)
    return groups
  }, {})

  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-beige border-b border-taupe/20 sticky top-0 z-10 backdrop-blur-sm bg-beige/90">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/dashboard')}
                className="p-2 hover:bg-taupe/20 rounded-full transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-warm-grey" />
              </button>
              <div>
                <h1 className="text-xl font-light tracking-wide text-dark-taupe">CALENDAR</h1>
                <p className="text-sm text-warm-grey">Next 7 days</p>
              </div>
            </div>

            <button
              onClick={fetchEvents}
              disabled={loading}
              className="p-2 hover:bg-taupe/20 rounded-full transition-colors"
              title="Refresh events"
            >
              <RefreshCw className={`w-5 h-5 text-warm-grey ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {loading && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-warm-grey mb-4" />
            <p className="text-warm-grey">Loading your calendar...</p>
          </div>
        )}

        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-red-800 mb-2">
              {error.includes('Google') ? 'Google Calendar Not Connected' : 'Failed to Load Calendar'}
            </h3>
            <p className="text-red-600 mb-4">{error}</p>
            {error.includes('Google') && (
              <button
                onClick={() => router.push('/login')}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Sign in with Google
              </button>
            )}
          </div>
        )}

        {!loading && !error && events.length === 0 && (
          <div className="text-center py-12 bg-beige rounded-3xl border border-taupe/10">
            <Calendar className="w-16 h-16 text-taupe mx-auto mb-4" />
            <h3 className="text-lg font-medium text-dark-taupe mb-2">No Upcoming Events</h3>
            <p className="text-warm-grey">Your calendar is clear for the next 7 days!</p>
          </div>
        )}

        {!loading && !error && events.length > 0 && (
          <div className="space-y-6">
            {Object.entries(groupedEvents).map(([date, dateEvents]) => (
              <div key={date}>
                <h2 className="text-sm font-medium text-warm-grey uppercase tracking-widest mb-3">
                  {date}
                </h2>
                <div className="space-y-3">
                  {dateEvents.map((event) => (
                    <div
                      key={event.id}
                      className="bg-beige rounded-3xl border border-taupe/10 p-4 hover:shadow-lg transition-shadow"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-dark-taupe truncate">
                            {event.title}
                          </h3>

                          <div className="flex flex-wrap gap-3 mt-2 text-sm text-warm-grey">
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              <span>{formatEventTime(event.start, event.end, event.isAllDay)}</span>
                            </div>
                            {event.location && (
                              <div className="flex items-center gap-1">
                                <MapPin className="w-4 h-4" />
                                <span className="truncate max-w-[200px]">{event.location}</span>
                              </div>
                            )}
                          </div>

                          {event.description && (
                            <p className="text-sm text-warm-grey mt-2 line-clamp-2">
                              {event.description}
                            </p>
                          )}

                          <div className="mt-2 flex flex-wrap gap-2">
                            <span className="inline-block px-2 py-1 bg-blush/30 text-dark-taupe text-xs font-medium rounded-full">
                              {detectOccasion(event)}
                            </span>
                            {detectDestination(event) && (
                              <span className="inline-block px-2 py-1 bg-taupe/30 text-dark-taupe text-xs font-medium rounded-full">
                                📍 {detectDestination(event)}
                              </span>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => setShowOutfitOptions(event)}
                          disabled={generatingOutfit === event.id}
                          className="flex items-center gap-2 px-4 py-2 bg-blush text-dark-taupe rounded-full hover:bg-blush/80 transition disabled:opacity-50 whitespace-nowrap shadow-sm"
                        >
                          {generatingOutfit === event.id ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4" />
                              Get Outfit
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        {/* Outfit Options Modal */}
        {showOutfitOptions && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-beige rounded-3xl max-w-md w-full p-6 border border-taupe/10">
              <h2 className="text-xl font-light tracking-wide text-dark-taupe mb-2">Generate Outfit</h2>
              <p className="text-warm-grey mb-4 text-sm">
                For: <span className="font-medium">{showOutfitOptions.title}</span>
              </p>

              {detectDestination(showOutfitOptions) && (
                <p className="text-sm text-dark-taupe mb-4 bg-taupe/20 px-3 py-2 rounded-full inline-block">
                  📍 {detectDestination(showOutfitOptions)}
                </p>
              )}

              <div className="space-y-3 mb-6">
                <button
                  onClick={() => setSelectedItemSource('closet')}
                  className={`w-full p-4 rounded-2xl border-2 text-left transition ${
                    selectedItemSource === 'closet'
                      ? 'border-blush bg-blush/30 shadow-sm'
                      : 'border-taupe/30 hover:border-taupe/50 bg-cream'
                  }`}
                >
                  <p className="font-medium text-dark-taupe">👗 My Closet Only</p>
                  <p className="text-sm text-warm-grey">Use only items I already own</p>
                </button>

                <button
                  onClick={() => setSelectedItemSource('mix')}
                  className={`w-full p-4 rounded-2xl border-2 text-left transition ${
                    selectedItemSource === 'mix'
                      ? 'border-blush bg-blush/30 shadow-sm'
                      : 'border-taupe/30 hover:border-taupe/50 bg-cream'
                  }`}
                >
                  <p className="font-medium text-dark-taupe">✨ Mix & Match</p>
                  <p className="text-sm text-warm-grey">Combine my closet with new suggestions</p>
                </button>

                <button
                  onClick={() => setSelectedItemSource('new')}
                  className={`w-full p-4 rounded-2xl border-2 text-left transition ${
                    selectedItemSource === 'new'
                      ? 'border-blush bg-blush/30 shadow-sm'
                      : 'border-taupe/30 hover:border-taupe/50 bg-cream'
                  }`}
                >
                  <p className="font-medium text-dark-taupe">🛍️ All New Items</p>
                  <p className="text-sm text-warm-grey">Suggest a complete new outfit to buy</p>
                </button>
              </div>

              {/* Formality Slider */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-medium text-dark-taupe">Dress Code</h3>
                  <span className="text-sm font-medium text-dark-taupe bg-blush/30 px-3 py-1 rounded-full">
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
                    className="w-full h-3 rounded-full appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #F5DAD1 0%, #E2D8CF 50%, #C8B9AE 100%)`
                    }}
                  />
                  <div className="flex justify-between text-xs text-warm-grey mt-2">
                    <span>Casual</span>
                    <span>Smart Casual</span>
                    <span>Formal</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowOutfitOptions(null)}
                  className="flex-1 px-4 py-3 border border-taupe/30 bg-cream rounded-full hover:bg-taupe/20 transition text-dark-taupe"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const event = showOutfitOptions
                    setShowOutfitOptions(null)
                    generateOutfitForEvent(event, selectedItemSource, formalityLevel)
                  }}
                  disabled={generatingOutfit !== null}
                  className="flex-1 px-4 py-3 bg-blush text-dark-taupe rounded-full hover:bg-blush/80 transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
                >
                  {generatingOutfit ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Generate
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Results Modal with 3 Outfit Options */}
        {showResultsModal && generatedOutfits.length > 0 && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-beige rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-taupe/10">
              {/* Header */}
              <div className="sticky top-0 bg-beige border-b border-taupe/20 px-6 py-4 flex items-center justify-between z-10 rounded-t-3xl">
                <div>
                  <h2 className="text-xl font-light tracking-wide text-dark-taupe">Your Outfit Options</h2>
                  <p className="text-sm text-warm-grey">Pick your favorite ({currentOutfitIndex + 1} of {generatedOutfits.length})</p>
                </div>
                <button
                  onClick={() => setShowResultsModal(false)}
                  className="p-2 hover:bg-taupe/20 rounded-full"
                >
                  <X className="w-5 h-5 text-warm-grey" />
                </button>
              </div>

              <div className="p-6">
                {/* Navigation */}
                {generatedOutfits.length > 1 && (
                  <div className="flex items-center justify-center gap-4 mb-6">
                    <button
                      onClick={() => setCurrentOutfitIndex(Math.max(0, currentOutfitIndex - 1))}
                      disabled={currentOutfitIndex === 0}
                      className="p-2 rounded-full hover:bg-taupe/20 disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                      <ChevronLeft className="w-6 h-6 text-dark-taupe" />
                    </button>
                    <span className="text-sm font-medium px-4 py-2 bg-cream rounded-full text-dark-taupe">
                      Option {currentOutfitIndex + 1}
                    </span>
                    <button
                      onClick={() => setCurrentOutfitIndex(Math.min(generatedOutfits.length - 1, currentOutfitIndex + 1))}
                      disabled={currentOutfitIndex === generatedOutfits.length - 1}
                      className="p-2 rounded-full hover:bg-taupe/20 disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                      <ChevronRight className="w-6 h-6 text-dark-taupe" />
                    </button>
                  </div>
                )}

                {/* Current Outfit */}
                {(() => {
                  const outfit = generatedOutfits[currentOutfitIndex]
                  if (!outfit) return null

                  return (
                    <>
                      {/* Closet Items */}
                      {outfit.outfit_data?.closet_items?.length > 0 && (
                        <div className="mb-6">
                          <h3 className="font-medium text-dark-taupe mb-3">From Your Closet:</h3>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            {outfit.outfit_data.closet_items.map((item: any) => (
                              <div key={item.id} className="text-center">
                                <div className="aspect-[4/5] bg-cream rounded-2xl overflow-hidden mb-2 border border-taupe/10">
                                  <img
                                    src={item.image_url}
                                    alt={item.name}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <p className="text-sm font-medium truncate text-dark-taupe">{item.name}</p>
                                <p className="text-xs text-warm-grey capitalize">{item.category}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* New Items */}
                      {outfit.outfit_data?.new_items?.length > 0 && (
                        <div className="mb-6">
                          <h3 className="font-medium text-dark-taupe mb-3">✨ Suggested New Items:</h3>
                          <div className="space-y-3">
                            {outfit.outfit_data.new_items.map((item: any, idx: number) => (
                              <div key={idx} className="p-4 bg-blush/30 rounded-2xl border border-taupe/10">
                                <p className="font-medium text-dark-taupe">{item.description}</p>
                                <p className="text-sm text-warm-grey">{item.category} • {item.color}</p>
                                {item.estimated_price && (
                                  <p className="text-sm text-dark-taupe mt-1">{item.estimated_price}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Rationale */}
                      {outfit.outfit_data?.weather_rationale && (
                        <div className="p-4 bg-taupe/20 rounded-2xl mb-4">
                          <p className="text-sm text-dark-taupe">
                            🌤️ {outfit.outfit_data.weather_rationale}
                          </p>
                        </div>
                      )}

                      {outfit.outfit_data?.style_rationale && (
                        <div className="p-4 bg-blush/30 rounded-2xl mb-4">
                          <p className="text-sm text-dark-taupe">
                            ✨ {outfit.outfit_data.style_rationale}
                          </p>
                        </div>
                      )}

                      {/* Styling Tips */}
                      {outfit.outfit_data?.styling_tips?.length > 0 && (
                        <div className="mb-6">
                          <h3 className="font-medium mb-2 text-dark-taupe">Styling Tips:</h3>
                          <ul className="text-sm text-warm-grey space-y-1">
                            {outfit.outfit_data.styling_tips.map((tip: string, idx: number) => (
                              <li key={idx}>• {tip}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  )
                })()}

                {/* Actions */}
                <div className="space-y-3 mt-6">
                  <button
                    onClick={saveSelectedOutfit}
                    disabled={savingOutfit}
                    className="w-full px-4 py-3 bg-blush text-dark-taupe rounded-full hover:bg-blush/80 transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
                  >
                    {savingOutfit ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        Save This Outfit
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setShowResultsModal(false)}
                    className="w-full px-4 py-3 bg-cream rounded-full hover:bg-taupe/20 transition text-dark-taupe"
                  >
                    Keep Looking
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}