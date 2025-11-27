'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { User } from '@/types'
import {
  ArrowLeft,
  Plane,
  Sun,
  Cloud,
  Snowflake,
  Umbrella,
  Loader2,
  Check,
  Plus,
  Trash2,
  Luggage,
  Shirt,
  Sparkles,
  Save,
  CloudRain,
  Search,
  MapPin
} from 'lucide-react'

interface PackingItem {
  id: string
  name: string
  category: string
  quantity: number
  packed: boolean
  isFromCloset: boolean
  closetItemId?: string
  imageUrl?: string
}

interface DayOutfit {
  day: number
  date: string
  outfit: {
    items: string[]
    description: string
  }
}

interface PackingList {
  id?: string
  destination: string
  destinationDisplay: string
  country: string
  startDate: string
  endDate: string
  tripType: string
  weather: {
    temp: number
    condition: string
    description: string
  }
  items: PackingItem[]
  outfits: DayOutfit[]
}

interface CitySuggestion {
  name: string
  state?: string
  country: string
  lat: number
  lon: number
}

const TRIP_TYPES = [
  { id: 'business', label: 'Business', icon: '💼' },
  { id: 'beach', label: 'Beach Vacation', icon: '🏖️' },
  { id: 'city', label: 'City Break', icon: '🏙️' },
  { id: 'adventure', label: 'Adventure', icon: '🥾' },
  { id: 'wedding', label: 'Wedding/Event', icon: '💒' },
  { id: 'casual', label: 'Casual Trip', icon: '✈️' },
]

// Essential travel items that aren't typically in a closet
const TRAVEL_ESSENTIALS = [
  { name: 'Passport', category: 'documents' },
  { name: 'ID / Driver\'s License', category: 'documents' },
  { name: 'Travel Insurance Documents', category: 'documents' },
  { name: 'Boarding Pass', category: 'documents' },
  { name: 'Phone Charger', category: 'electronics' },
  { name: 'Portable Charger', category: 'electronics' },
  { name: 'Headphones', category: 'electronics' },
  { name: 'Laptop & Charger', category: 'electronics' },
  { name: 'Toothbrush & Toothpaste', category: 'toiletries' },
  { name: 'Deodorant', category: 'toiletries' },
  { name: 'Shampoo & Conditioner', category: 'toiletries' },
  { name: 'Skincare Products', category: 'toiletries' },
  { name: 'Medications', category: 'toiletries' },
  { name: 'Sunscreen', category: 'toiletries' },
  { name: 'Gum / Mints', category: 'other' },
  { name: 'Sleep Mask', category: 'other' },
  { name: 'Neck Pillow', category: 'other' },
  { name: 'Silk Pillowcase', category: 'other' },
  { name: 'Reusable Water Bottle', category: 'other' },
  { name: 'Snacks', category: 'other' },
]

// Items to add for international travel
const INTERNATIONAL_EXTRAS = [
  { name: 'International Power Adapter', category: 'electronics' },
  { name: 'Foreign Currency / Cards', category: 'documents' },
  { name: 'Visa Documents', category: 'documents' },
]

export default function PackingPage() {
  const [user, setUser] = useState<User | null>(null)
  const [step, setStep] = useState<'setup' | 'generating' | 'list'>('setup')
  const [packingList, setPackingList] = useState<PackingList | null>(null)
  const [savedLists, setSavedLists] = useState<any[]>([])
  
  // Form state
  const [destinationQuery, setDestinationQuery] = useState('')
  const [selectedCity, setSelectedCity] = useState<CitySuggestion | null>(null)
  const [citySuggestions, setCitySuggestions] = useState<CitySuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [searchingCities, setSearchingCities] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [tripType, setTripType] = useState('')
  const [generating, setGenerating] = useState(false)
  const [fetchingWeather, setFetchingWeather] = useState(false)
  const [weatherData, setWeatherData] = useState<{ temp: number; condition: string; description: string } | null>(null)
  
  // Custom item state
  const [showAddItem, setShowAddItem] = useState(false)
  const [newItemName, setNewItemName] = useState('')
  const [newItemCategory, setNewItemCategory] = useState('clothing')
  
  // Saving state
  const [saving, setSaving] = useState(false)
  
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadUser()
    loadSavedLists()
  }, [])

  // City search with debounce
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (destinationQuery.length < 2) {
      setCitySuggestions([])
      setShowSuggestions(false)
      return
    }

    searchTimeoutRef.current = setTimeout(() => {
      searchCities(destinationQuery)
    }, 300)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [destinationQuery])

  // Fetch weather when city is selected and dates are set
  useEffect(() => {
    if (selectedCity && startDate) {
      fetchWeatherForCity(selectedCity)
    }
  }, [selectedCity, startDate])

  const loadUser = async () => {
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

    setUser(userData)
  }

  const loadSavedLists = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('packing_lists')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (data) {
      setSavedLists(data)
    }
  }

  const searchCities = async (query: string) => {
    setSearchingCities(true)
    try {
      // Using OpenWeatherMap Geocoding API
      const apiKey = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY || 'demo'
      const response = await fetch(
        `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=5&appid=${apiKey}`
      )
      
      if (response.ok) {
        const data = await response.json()
        const suggestions: CitySuggestion[] = data.map((city: any) => ({
          name: city.name,
          state: city.state,
          country: city.country,
          lat: city.lat,
          lon: city.lon,
        }))
        setCitySuggestions(suggestions)
        setShowSuggestions(suggestions.length > 0)
      }
    } catch (err) {
      console.error('City search error:', err)
      // Fallback: just use the typed query
      setCitySuggestions([])
    } finally {
      setSearchingCities(false)
    }
  }

  const fetchWeatherForCity = async (city: CitySuggestion) => {
    setFetchingWeather(true)
    try {
      const response = await fetch(`/api/weather?lat=${city.lat}&lon=${city.lon}`)
      const data = await response.json()
      
      if (data.success && data.weather) {
        setWeatherData({
          temp: data.weather.temperature,
          condition: data.weather.condition,
          description: data.weather.description,
        })
      }
    } catch (err) {
      console.error('Weather fetch error:', err)
    } finally {
      setFetchingWeather(false)
    }
  }

  const selectCity = (city: CitySuggestion) => {
    setSelectedCity(city)
    setDestinationQuery(`${city.name}${city.state ? `, ${city.state}` : ''}, ${city.country}`)
    setShowSuggestions(false)
  }

  const calculateTripDays = () => {
    if (!startDate || !endDate) return 0
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    return diff + 1
  }

  const isInternational = () => {
    if (!selectedCity) return false
    return selectedCity.country !== 'US'
  }

  const getWeatherIcon = (condition: string) => {
    const c = condition.toLowerCase()
    if (c.includes('rain') || c.includes('drizzle')) return <CloudRain className="w-5 h-5 text-blue-500" />
    if (c.includes('cloud')) return <Cloud className="w-5 h-5 text-gray-500" />
    if (c.includes('snow')) return <Snowflake className="w-5 h-5 text-blue-300" />
    if (c.includes('clear') || c.includes('sun')) return <Sun className="w-5 h-5 text-yellow-500" />
    return <Cloud className="w-5 h-5 text-gray-400" />
  }

  const generatePackingList = async () => {
    if (!selectedCity || !startDate || !endDate || !tripType) {
      alert('Please fill in all fields')
      return
    }

    setGenerating(true)
    setStep('generating')

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) throw new Error('Not authenticated')

      const response = await fetch('/api/packing/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: authUser.id,
          destination: selectedCity.name,
          country: selectedCity.country,
          startDate,
          endDate,
          tripType,
          weather: weatherData,
          days: calculateTripDays(),
          isInternational: isInternational(),
        }),
      })

      const data = await response.json()

      if (data.success) {
        // Combine AI items with travel essentials
        const essentialItems: PackingItem[] = TRAVEL_ESSENTIALS.map((item, idx) => ({
          id: `essential-${idx}`,
          name: item.name,
          category: item.category,
          quantity: 1,
          packed: false,
          isFromCloset: false,
        }))

        // Add international items if needed
        if (isInternational()) {
          INTERNATIONAL_EXTRAS.forEach((item, idx) => {
            essentialItems.push({
              id: `intl-${idx}`,
              name: item.name,
              category: item.category,
              quantity: 1,
              packed: false,
              isFromCloset: false,
            })
          })
        }

        // Parse AI-generated items
        const aiItems: PackingItem[] = (data.items || []).map((item: any, index: number) => ({
          id: `item-${index}`,
          name: item.name,
          category: item.category,
          quantity: item.quantity || 1,
          packed: false,
          isFromCloset: item.isFromCloset || false,
          closetItemId: item.closetItemId,
          imageUrl: item.imageUrl,
        }))

        // Combine and dedupe
        const allItems = [...aiItems]
        essentialItems.forEach(essential => {
          if (!allItems.some(item => item.name.toLowerCase() === essential.name.toLowerCase())) {
            allItems.push(essential)
          }
        })

        setPackingList({
          destination: selectedCity.name,
          destinationDisplay: destinationQuery,
          country: selectedCity.country,
          startDate,
          endDate,
          tripType,
          weather: weatherData || { temp: 70, condition: 'Clear', description: 'clear sky' },
          items: allItems,
          outfits: data.outfits || [],
        })
        setStep('list')
      } else {
        throw new Error(data.error || 'Failed to generate packing list')
      }
    } catch (err: any) {
      console.error('Error generating packing list:', err)
      alert('Failed to generate packing list: ' + err.message)
      setStep('setup')
    } finally {
      setGenerating(false)
    }
  }

  const togglePacked = (itemId: string) => {
    if (!packingList) return
    setPackingList({
      ...packingList,
      items: packingList.items.map(item =>
        item.id === itemId ? { ...item, packed: !item.packed } : item
      ),
    })
  }

  const removeItem = (itemId: string) => {
    if (!packingList) return
    setPackingList({
      ...packingList,
      items: packingList.items.filter(item => item.id !== itemId),
    })
  }

  const addCustomItem = () => {
    if (!packingList || !newItemName.trim()) return
    
    const newItem: PackingItem = {
      id: `custom-${Date.now()}`,
      name: newItemName.trim(),
      category: newItemCategory,
      quantity: 1,
      packed: false,
      isFromCloset: false,
    }
    
    setPackingList({
      ...packingList,
      items: [...packingList.items, newItem],
    })
    
    setNewItemName('')
    setShowAddItem(false)
  }

  const updateQuantity = (itemId: string, delta: number) => {
    if (!packingList) return
    setPackingList({
      ...packingList,
      items: packingList.items.map(item =>
        item.id === itemId 
          ? { ...item, quantity: Math.max(1, item.quantity + delta) } 
          : item
      ),
    })
  }

  const savePackingList = async () => {
    if (!packingList) return
    
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('packing_lists')
        .insert({
          user_id: user.id,
          destination: packingList.destinationDisplay,
          start_date: packingList.startDate,
          end_date: packingList.endDate,
          trip_type: packingList.tripType,
          list_data: {
            items: packingList.items,
            outfits: packingList.outfits,
            weather: packingList.weather,
          },
        })
        .select()
        .single()

      if (error) throw error

      setPackingList({ ...packingList, id: data.id })
      alert('Packing list saved!')
      loadSavedLists()
    } catch (err: any) {
      console.error('Save error:', err)
      alert('Failed to save: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const loadPackingList = (list: any) => {
    setPackingList({
      id: list.id,
      destination: list.destination,
      destinationDisplay: list.destination,
      country: '',
      startDate: list.start_date,
      endDate: list.end_date,
      tripType: list.trip_type,
      weather: list.list_data.weather,
      items: list.list_data.items,
      outfits: list.list_data.outfits || [],
    })
    setStep('list')
  }

  const getPackedCount = () => {
    if (!packingList) return { packed: 0, total: 0 }
    const packed = packingList.items.filter(i => i.packed).length
    return { packed, total: packingList.items.length }
  }

  const groupItemsByCategory = () => {
    if (!packingList) return {}
    // Note: 'outerwear' is merged into 'clothing'
    const order = ['clothing', 'shoes', 'accessories', 'toiletries', 'electronics', 'documents', 'other']
    
    const groups = packingList.items.reduce((acc: Record<string, PackingItem[]>, item) => {
      let cat = item.category || 'other'
      
      // Merge outerwear into clothing
      if (cat.toLowerCase() === 'outerwear' || cat.toLowerCase() === 'jacket' || cat.toLowerCase() === 'coat') {
        cat = 'clothing'
      }
      
      if (!acc[cat]) acc[cat] = []
      acc[cat].push(item)
      return acc
    }, {})
    
    // Sort by predefined order
    const sorted: Record<string, PackingItem[]> = {}
    order.forEach(cat => {
      if (groups[cat]) sorted[cat] = groups[cat]
    })
    // Add any remaining categories
    Object.keys(groups).forEach(cat => {
      if (!sorted[cat]) sorted[cat] = groups[cat]
    })
    return sorted
  }

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'clothing': return <Shirt className="w-4 h-4" />
      case 'shoes': return <span>👟</span>
      case 'accessories': return <span>👜</span>
      case 'toiletries': return <span>🧴</span>
      case 'electronics': return <span>📱</span>
      case 'documents': return <span>📄</span>
      default: return <Luggage className="w-4 h-4" />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <Luggage className="w-6 h-6 text-rose-500" />
              <h1 className="text-xl font-semibold">Packing List</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Setup Step */}
        {step === 'setup' && (
          <div className="space-y-6">
            {/* Saved Lists */}
            {savedLists.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h3 className="font-semibold mb-3">Your Saved Lists</h3>
                <div className="space-y-2">
                  {savedLists.slice(0, 3).map((list) => (
                    <button
                      key={list.id}
                      onClick={() => loadPackingList(list)}
                      className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-rose-300 hover:bg-rose-50 transition"
                    >
                      <p className="font-medium">{list.destination}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(list.start_date).toLocaleDateString()} - {new Date(list.end_date).toLocaleDateString()}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Plane className="w-5 h-5 text-rose-500" />
                Trip Details
              </h2>

              <div className="space-y-4">
                {/* Destination with Autocomplete */}
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Where are you going?
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={destinationQuery}
                      onChange={(e) => {
                        setDestinationQuery(e.target.value)
                        setSelectedCity(null)
                        setWeatherData(null)
                      }}
                      onFocus={() => citySuggestions.length > 0 && setShowSuggestions(true)}
                      placeholder="Start typing a city..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                    />
                    {searchingCities && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
                    )}
                  </div>
                  
                  {/* Suggestions Dropdown */}
                  {showSuggestions && citySuggestions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {citySuggestions.map((city, idx) => (
                        <button
                          key={idx}
                          onClick={() => selectCity(city)}
                          className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-2 border-b border-gray-100 last:border-0"
                        >
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <div>
                            <p className="font-medium">{city.name}</p>
                            <p className="text-sm text-gray-500">
                              {city.state ? `${city.state}, ` : ''}{city.country}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Weather Display */}
                {selectedCity && (
                  <div className="bg-blue-50 rounded-lg p-3">
                    {fetchingWeather ? (
                      <div className="flex items-center gap-2 text-blue-600">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">Fetching weather...</span>
                      </div>
                    ) : weatherData ? (
                      <div className="flex items-center gap-3">
                        {getWeatherIcon(weatherData.condition)}
                        <div>
                          <p className="font-medium text-blue-900">
                            {weatherData.temp}°F - {weatherData.condition}
                          </p>
                          <p className="text-sm text-blue-700 capitalize">{weatherData.description}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-blue-600">Select dates to see weather forecast</p>
                    )}
                  </div>
                )}

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      min={startDate || new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {calculateTripDays() > 0 && (
                  <p className="text-sm text-gray-500">
                    📅 {calculateTripDays()} day{calculateTripDays() !== 1 ? 's' : ''} trip
                    {isInternational() && ' • 🌍 International travel'}
                  </p>
                )}

                {/* Trip Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type of Trip
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {TRIP_TYPES.map((type) => (
                      <button
                        key={type.id}
                        onClick={() => setTripType(type.id)}
                        className={`p-3 rounded-lg border text-left transition ${
                          tripType === type.id
                            ? 'border-rose-500 bg-rose-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <span className="text-xl">{type.icon}</span>
                        <p className="text-sm font-medium mt-1">{type.label}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={generatePackingList}
              disabled={!selectedCity || !startDate || !endDate || !tripType}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-rose-500 to-teal-500 text-white py-4 rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50"
            >
              <Sparkles className="w-5 h-5" />
              Generate Packing List
            </button>
          </div>
        )}

        {/* Generating Step */}
        {step === 'generating' && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-12 h-12 animate-spin text-rose-500 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Creating Your Packing List
            </h2>
            <p className="text-gray-500 text-center">
              Analyzing weather, trip type, and your closet...
            </p>
          </div>
        )}

        {/* Packing List Step */}
        {step === 'list' && packingList && (
          <div className="space-y-4">
            {/* Trip Summary */}
            <div className="bg-gradient-to-r from-rose-500 to-teal-500 text-white rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">{packingList.destinationDisplay}</h2>
                  <p className="text-white/80 text-sm">
                    {new Date(packingList.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} 
                    {' - '}
                    {new Date(packingList.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    {' • '}
                    {calculateTripDays()} days
                  </p>
                  <p className="text-white/80 text-sm mt-1">
                    {packingList.weather.temp}°F, {packingList.weather.condition}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">
                    {getPackedCount().packed}/{getPackedCount().total}
                  </p>
                  <p className="text-white/80 text-sm">packed</p>
                </div>
              </div>
              
              {/* Progress bar */}
              <div className="mt-3 bg-white/20 rounded-full h-2">
                <div 
                  className="bg-white rounded-full h-2 transition-all"
                  style={{ width: `${getPackedCount().total > 0 ? (getPackedCount().packed / getPackedCount().total) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Daily Outfits */}
            {packingList.outfits && packingList.outfits.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="bg-purple-50 px-4 py-3 border-b border-purple-100 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  <h3 className="font-semibold text-purple-900">Daily Outfit Suggestions</h3>
                </div>
                <div className="divide-y divide-gray-100">
                  {packingList.outfits.map((dayOutfit, idx) => {
                    // Find matching items from packing list to get images
                    const outfitItemsWithImages = dayOutfit.outfit.items.map(itemName => {
                      const matchingItem = packingList.items.find(
                        i => i.name.toLowerCase() === itemName.toLowerCase() ||
                            i.name.toLowerCase().includes(itemName.toLowerCase()) ||
                            itemName.toLowerCase().includes(i.name.toLowerCase())
                      )
                      return {
                        name: itemName,
                        imageUrl: matchingItem?.imageUrl || null,
                        isFromCloset: matchingItem?.isFromCloset || false
                      }
                    })
                    
                    return (
                      <div key={idx} className="p-4">
                        <p className="font-medium text-gray-900 mb-2">
                          Day {dayOutfit.day}: {new Date(dayOutfit.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                        </p>
                        <p className="text-sm text-gray-600 mb-3">{dayOutfit.outfit.description}</p>
                        
                        {/* Outfit items with images */}
                        <div className="flex flex-wrap gap-2 mb-2">
                          {outfitItemsWithImages.map((item, i) => (
                            <div 
                              key={i} 
                              className="flex items-center gap-2 bg-purple-50 rounded-lg px-2 py-1"
                            >
                              {item.imageUrl && (
                                <img 
                                  src={item.imageUrl} 
                                  alt={item.name}
                                  className="w-8 h-8 rounded object-cover"
                                />
                              )}
                              <span className="text-xs text-purple-700">{item.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Items by Category */}
            {Object.entries(groupItemsByCategory()).map(([category, items]) => (
              <div key={category} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center gap-2">
                  {getCategoryIcon(category)}
                  <h3 className="font-semibold capitalize">{category}</h3>
                  <span className="text-sm text-gray-500">
                    ({items.filter(i => i.packed).length}/{items.length})
                  </span>
                </div>
                
                <div className="divide-y divide-gray-100">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className={`px-4 py-3 flex items-center gap-3 ${
                        item.packed ? 'bg-green-50' : ''
                      }`}
                    >
                      <button
                        onClick={() => togglePacked(item.id)}
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition ${
                          item.packed
                            ? 'bg-green-500 border-green-500 text-white'
                            : 'border-gray-300 hover:border-rose-500'
                        }`}
                      >
                        {item.packed && <Check className="w-4 h-4" />}
                      </button>

                      {item.imageUrl && (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                      )}

                      <div className="flex-1">
                        <p className={`font-medium ${item.packed ? 'line-through text-gray-400' : ''}`}>
                          {item.name}
                        </p>
                        {item.isFromCloset && (
                          <p className="text-xs text-teal-600">From your closet</p>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => updateQuantity(item.id, -1)}
                          className="w-6 h-6 rounded border border-gray-300 text-gray-500 hover:bg-gray-100 text-sm"
                        >
                          -
                        </button>
                        <span className="w-6 text-center text-sm">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, 1)}
                          className="w-6 h-6 rounded border border-gray-300 text-gray-500 hover:bg-gray-100 text-sm"
                        >
                          +
                        </button>
                      </div>

                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-1 text-gray-400 hover:text-red-500 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Add Custom Item */}
            {showAddItem ? (
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h3 className="font-semibold mb-3">Add Custom Item</h3>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    placeholder="Item name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                  />
                  <select
                    value={newItemCategory}
                    onChange={(e) => setNewItemCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                  >
                    <option value="clothing">Clothing</option>
                    <option value="shoes">Shoes</option>
                    <option value="accessories">Accessories</option>
                    <option value="toiletries">Toiletries</option>
                    <option value="electronics">Electronics</option>
                    <option value="documents">Documents</option>
                    <option value="other">Other</option>
                  </select>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowAddItem(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={addCustomItem}
                      disabled={!newItemName.trim()}
                      className="flex-1 px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 disabled:opacity-50"
                    >
                      Add Item
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAddItem(true)}
                className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-rose-500 hover:text-rose-500 transition"
              >
                <Plus className="w-5 h-5" />
                Add Custom Item
              </button>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setStep('setup')
                  setPackingList(null)
                  setSelectedCity(null)
                  setDestinationQuery('')
                  setWeatherData(null)
                }}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition"
              >
                Start New List
              </button>
              <button
                onClick={savePackingList}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-rose-500 to-teal-500 text-white rounded-xl hover:opacity-90 transition disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save List
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
