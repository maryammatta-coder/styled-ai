'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ClosetItem } from '@/types'
import { Plus, Home, X, Upload, RefreshCw, Pencil, Check, Loader2, Crop, Calendar, Clock, DollarSign } from 'lucide-react'
import ReactCrop, { type Crop as CropType, centerCrop, makeAspectCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'

const CATEGORIES = ['top', 'bottom', 'dress', 'outerwear', 'shoes', 'accessory', 'bag', 'jewelry']
const SEASONS = ['spring', 'summer', 'fall', 'winter']
const VIBES = ['casual', 'formal', 'business', 'sporty', 'elegant', 'bohemian', 'minimalist', 'edgy', 'romantic', 'classic']
const FITS = ['tight', 'fitted', 'regular', 'relaxed', 'oversized']

const TIME_SLOTS = [
  '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
  '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM'
]

export default function ClosetPage() {
  const [closetItems, setClosetItems] = useState<ClosetItem[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showPhotoServiceModal, setShowPhotoServiceModal] = useState(false)
  const [editingItem, setEditingItem] = useState<ClosetItem | null>(null)
  const [retryingId, setRetryingId] = useState<string | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)
  
  // User email from auth
  const [userEmail, setUserEmail] = useState('')
  
  // Photo service booking state
  const [bookingStep, setBookingStep] = useState<'info' | 'schedule' | 'confirm'>('info')
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedTime, setSelectedTime] = useState<string>('')
  const [extraHours, setExtraHours] = useState(0)
  const [bookingName, setBookingName] = useState('')
  const [bookingPhone, setBookingPhone] = useState('')
  // Split address fields
  const [addressLine1, setAddressLine1] = useState('')
  const [addressLine2, setAddressLine2] = useState('')
  const [addressCity, setAddressCity] = useState('')
  const [addressState, setAddressState] = useState('')
  const [addressZip, setAddressZip] = useState('')
  const [submittingBooking, setSubmittingBooking] = useState(false)
  
  // Crop state
  const [showCropMode, setShowCropMode] = useState(false)
  const [crop, setCrop] = useState<CropType>()
  const [savingCrop, setSavingCrop] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)
  
  const router = useRouter()
  const supabase = createClient()

  const [editForm, setEditForm] = useState({
    name: '',
    category: '',
    color: '',
    fit: '',
    season: [] as string[],
    vibe: [] as string[],
  })

  useEffect(() => {
    loadClosetItems()
  }, [])

  const loadClosetItems = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      
      // Store user email for booking
      setUserEmail(user.email || '')

      const { data, error } = await supabase
        .from('closet_items')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_archived', false)
        .order('created_at', { ascending: false })

      if (error) throw error
      setClosetItems(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No user')

      for (const file of Array.from(files)) {
        const fileExt = file.name.split('.').pop()
        const fileName = `${user.id}/${Date.now()}.${fileExt}`
        
        const { error: uploadError } = await supabase.storage
          .from('closet-images')
          .upload(fileName, file)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('closet-images')
          .getPublicUrl(fileName)

        const { data: newItem, error: insertError } = await supabase
          .from('closet_items')
          .insert([{
            user_id: user.id,
            image_url: publicUrl,
            name: 'Analyzing...',
            category: 'top',
            color: 'unknown',
            season: ['spring', 'summer', 'fall', 'winter'],
            vibe: ['casual'],
            source: 'manual_upload'
          }])
          .select()
          .single()

        if (insertError) throw insertError

        if (newItem) {
          fetch('/api/closet/classify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              imageUrl: publicUrl,
              itemId: newItem.id
            })
          }).then(() => {
            loadClosetItems()
          }).catch(err => console.error('Classification error:', err))
        }
      }

      await loadClosetItems()
      setShowUploadModal(false)
    } catch (err: any) {
      console.error(err)
      alert(err.message || 'Error uploading images')
    } finally {
      setUploading(false)
    }
  }

  const retryClassification = async (item: ClosetItem) => {
    setRetryingId(item.id)
    
    try {
      const response = await fetch('/api/closet/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: item.image_url,
          itemId: item.id
        })
      })

      const data = await response.json()
      
      if (data.success) {
        await loadClosetItems()
      } else {
        alert('Classification failed. Try editing manually.')
      }
    } catch (err) {
      console.error('Retry error:', err)
      alert('Failed to retry. Try editing manually.')
    } finally {
      setRetryingId(null)
    }
  }

  const openEditModal = (item: ClosetItem) => {
    setEditingItem(item)
    setShowCropMode(false)
    setCrop(undefined)
    setEditForm({
      name: item.name || '',
      category: item.category || '',
      color: item.color || '',
      fit: item.fit || '',
      season: item.season || [],
      vibe: item.vibe || [],
    })
  }

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget
    const cropInit = centerCrop(
      makeAspectCrop(
        { unit: '%', width: 90 },
        1,
        width,
        height
      ),
      width,
      height
    )
    setCrop(cropInit)
  }

  const getCroppedImg = async (): Promise<Blob | null> => {
    if (!imgRef.current || !crop) return null

    const image = imgRef.current
    const canvas = document.createElement('canvas')
    const scaleX = image.naturalWidth / image.width
    const scaleY = image.naturalHeight / image.height

    const pixelCrop = {
      x: (crop.x / 100) * image.width * scaleX,
      y: (crop.y / 100) * image.height * scaleY,
      width: (crop.width / 100) * image.width * scaleX,
      height: (crop.height / 100) * image.height * scaleY,
    }

    canvas.width = pixelCrop.width
    canvas.height = pixelCrop.height

    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    )

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob)
      }, 'image/jpeg', 0.95)
    })
  }

  const saveCroppedImage = async () => {
    if (!editingItem || !crop) return
    
    setSavingCrop(true)
    try {
      const croppedBlob = await getCroppedImg()
      if (!croppedBlob) throw new Error('Failed to crop image')

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No user')

      const fileName = `${user.id}/${Date.now()}_cropped.jpg`
      
      const { error: uploadError } = await supabase.storage
        .from('closet-images')
        .upload(fileName, croppedBlob)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('closet-images')
        .getPublicUrl(fileName)

      const { error: updateError } = await supabase
        .from('closet_items')
        .update({ 
          image_url: publicUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingItem.id)

      if (updateError) throw updateError

      setEditingItem({ ...editingItem, image_url: publicUrl })
      setShowCropMode(false)
      await loadClosetItems()
      
      alert('Image cropped successfully!')
    } catch (err: any) {
      console.error('Crop error:', err)
      alert('Failed to save cropped image: ' + (err.message || 'Unknown error'))
    } finally {
      setSavingCrop(false)
    }
  }

  const saveEdit = async () => {
    if (!editingItem) return
    
    setSavingEdit(true)
    try {
      const { error } = await supabase
        .from('closet_items')
        .update({
          name: editForm.name,
          category: editForm.category,
          color: editForm.color,
          fit: editForm.fit,
          season: editForm.season,
          vibe: editForm.vibe,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingItem.id)

      if (error) throw error

      await loadClosetItems()
      setEditingItem(null)
    } catch (err) {
      console.error('Save error:', err)
      alert('Failed to save changes')
    } finally {
      setSavingEdit(false)
    }
  }

  const toggleArrayItem = (array: string[], item: string): string[] => {
    if (array.includes(item)) {
      return array.filter(i => i !== item)
    }
    return [...array, item]
  }

  const deleteItem = async (itemId: string) => {
    if (!confirm('Delete this item?')) return

    try {
      const { error } = await supabase
        .from('closet_items')
        .update({ is_archived: true })
        .eq('id', itemId)

      if (error) throw error
      await loadClosetItems()
    } catch (err) {
      console.error(err)
    }
  }

  const isStuckItem = (item: ClosetItem) => {
    return item.name === 'Analyzing...' || item.color === 'unknown'
  }

  const calculateTotal = () => {
    return 199 + (extraHours * 70)
  }

  const getAvailableDates = () => {
    const dates = []
    const today = new Date()
    for (let i = 2; i <= 14; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() + i)
      if (date.getDay() !== 0) {
        dates.push(date.toISOString().split('T')[0])
      }
    }
    return dates
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  }

  const getFullAddress = () => {
    const parts = [addressLine1]
    if (addressLine2) parts.push(addressLine2)
    parts.push(`${addressCity}, ${addressState} ${addressZip}`)
    return parts.join(', ')
  }

  const resetBookingModal = () => {
    setBookingStep('info')
    setSelectedDate('')
    setSelectedTime('')
    setExtraHours(0)
    setBookingName('')
    setBookingPhone('')
    setAddressLine1('')
    setAddressLine2('')
    setAddressCity('')
    setAddressState('')
    setAddressZip('')
    setShowPhotoServiceModal(false)
  }

  const submitBooking = async () => {
    setSubmittingBooking(true)
    try {
      // Here you would send this to your backend/email service
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      alert(`Booking request submitted!\n\nWe'll contact you at ${userEmail} to confirm your appointment on ${formatDate(selectedDate)} at ${selectedTime}.\n\nTotal: $${calculateTotal()}`)
      resetBookingModal()
    } catch (err) {
      alert('Failed to submit booking. Please try again.')
    } finally {
      setSubmittingBooking(false)
    }
  }

  const isConfirmFormValid = () => {
    return bookingName && bookingPhone && addressLine1 && addressCity && addressState && addressZip
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
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <button 
            onClick={() => router.push('/dashboard')} 
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
          >
            <Home className="w-5 h-5" />
            <span>Back</span>
          </button>
          <h2 className="text-xl font-bold">My Closet</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPhotoServiceModal(true)}
              className="text-rose-500 text-sm font-medium hover:text-rose-600 hidden sm:block"
            >
              ✨ We'll do it for you
            </button>
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-2 bg-rose-500 text-white px-4 py-2 rounded-lg hover:bg-rose-600"
            >
              <Plus className="w-5 h-5" />
              <span>Add Items</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {closetItems.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl">
            <Upload className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 mb-6">Your closet is empty. Start adding items!</p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button
                onClick={() => setShowUploadModal(true)}
                className="bg-gradient-to-r from-rose-500 to-teal-500 text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition"
              >
                Upload Photos Myself
              </button>
              
              <span className="text-gray-400">or</span>
              
              <button
                onClick={() => setShowPhotoServiceModal(true)}
                className="bg-white border-2 border-rose-500 text-rose-500 px-6 py-3 rounded-lg font-semibold hover:bg-rose-50 transition"
              >
                ✨ Let Us Handle It - $199
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {closetItems.map((item) => (
              <div key={item.id} className="bg-white rounded-lg shadow overflow-hidden hover:shadow-lg transition group">
                <div className="relative">
                  <img 
                    src={item.image_url} 
                    alt={item.name} 
                    className="w-full aspect-square object-cover" 
                  />
                  
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button
                      onClick={() => openEditModal(item)}
                      className="bg-blue-500 text-white rounded-full p-1.5 hover:bg-blue-600 transition"
                      title="Edit item"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deleteItem(item.id)}
                      className="bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition"
                      title="Delete item"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {isStuckItem(item) && (
                    <div className="absolute bottom-2 left-2 right-2">
                      <button
                        onClick={() => retryClassification(item)}
                        disabled={retryingId === item.id}
                        className="w-full flex items-center justify-center gap-1.5 bg-amber-500 text-white text-xs font-medium py-1.5 px-2 rounded-lg hover:bg-amber-600 transition disabled:opacity-50"
                      >
                        {retryingId === item.id ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Retrying...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-3.5 h-3.5" />
                            Retry Analysis
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="p-3">
                  <p className={`font-medium text-sm ${isStuckItem(item) ? 'text-amber-600' : ''}`}>
                    {item.name}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">{item.category}</p>
                  {item.color && item.color !== 'unknown' && (
                    <p className="text-xs text-gray-400 capitalize">{item.color}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold">Add Items to Closet</h3>
              <button onClick={() => setShowUploadModal(false)}>
                <X className="w-6 h-6" />
              </button>
            </div>

            <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-12 cursor-pointer hover:border-rose-500 transition">
              <Upload className="w-16 h-16 text-gray-400 mb-4" />
              <span className="text-lg font-medium text-gray-700">Click to upload photos</span>
              <span className="text-sm text-gray-500 mt-2">or drag and drop</span>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>

            {uploading && (
              <div className="mt-4 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-rose-500 border-t-transparent"></div>
                <p className="mt-2 text-gray-600">Uploading...</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
              <h3 className="text-xl font-bold">
                {showCropMode ? 'Crop Image' : 'Edit Item'}
              </h3>
              <button 
                onClick={() => {
                  if (showCropMode) {
                    setShowCropMode(false)
                  } else {
                    setEditingItem(null)
                  }
                }}
                className="p-1 hover:bg-gray-100 rounded-full"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {showCropMode ? (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 text-center">
                    Drag to adjust the crop area, then click "Save Crop"
                  </p>
                  
                  <div className="flex justify-center bg-gray-100 rounded-lg p-4">
                    <ReactCrop
                      crop={crop}
                      onChange={(_, percentCrop) => setCrop(percentCrop)}
                      aspect={1}
                      className="max-h-[400px]"
                    >
                      <img
                        ref={imgRef}
                        src={editingItem.image_url}
                        alt={editingItem.name}
                        onLoad={onImageLoad}
                        crossOrigin="anonymous"
                        className="max-h-[400px]"
                      />
                    </ReactCrop>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowCropMode(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveCroppedImage}
                      disabled={savingCrop}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition disabled:opacity-50"
                    >
                      {savingCrop ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          Save Crop
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex flex-col items-center gap-3">
                    <img 
                      src={editingItem.image_url} 
                      alt={editingItem.name}
                      className="w-32 h-32 object-cover rounded-lg"
                    />
                    <button
                      onClick={() => setShowCropMode(true)}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                    >
                      <Crop className="w-4 h-4" />
                      Re-crop Image
                    </button>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                      placeholder="e.g., Blue Cotton T-Shirt"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <div className="flex flex-wrap gap-2">
                      {CATEGORIES.map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setEditForm({ ...editForm, category: cat })}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                            editForm.category === cat
                              ? 'bg-rose-500 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                    <input
                      type="text"
                      value={editForm.color}
                      onChange={(e) => setEditForm({ ...editForm, color: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                      placeholder="e.g., Navy Blue"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fit</label>
                    <div className="flex flex-wrap gap-2">
                      {FITS.map((fit) => (
                        <button
                          key={fit}
                          onClick={() => setEditForm({ ...editForm, fit: fit })}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                            editForm.fit === fit
                              ? 'bg-rose-500 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {fit}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Season (select multiple)</label>
                    <div className="flex flex-wrap gap-2">
                      {SEASONS.map((season) => (
                        <button
                          key={season}
                          onClick={() => setEditForm({ 
                            ...editForm, 
                            season: toggleArrayItem(editForm.season, season) 
                          })}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                            editForm.season.includes(season)
                              ? 'bg-teal-500 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {season}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Vibe (select multiple)</label>
                    <div className="flex flex-wrap gap-2">
                      {VIBES.map((vibe) => (
                        <button
                          key={vibe}
                          onClick={() => setEditForm({ 
                            ...editForm, 
                            vibe: toggleArrayItem(editForm.vibe, vibe) 
                          })}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                            editForm.vibe.includes(vibe)
                              ? 'bg-purple-500 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {vibe}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {!showCropMode && (
              <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex gap-3">
                <button
                  onClick={() => setEditingItem(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEdit}
                  disabled={savingEdit}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition disabled:opacity-50"
                >
                  {savingEdit ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Photo Service Modal */}
      {showPhotoServiceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
              <h3 className="text-xl font-bold">
                {bookingStep === 'info' && 'White Glove Service'}
                {bookingStep === 'schedule' && 'Schedule Appointment'}
                {bookingStep === 'confirm' && 'Confirm Booking'}
              </h3>
              <button onClick={resetBookingModal}>
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              {/* Step 1: Info */}
              {bookingStep === 'info' && (
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-rose-50 to-teal-50 p-4 rounded-xl">
                    <p className="text-3xl font-bold text-center bg-gradient-to-r from-rose-500 to-teal-500 bg-clip-text text-transparent">
                      Starting at $199
                    </p>
                    <p className="text-center text-gray-600 text-sm mt-1">2 hours included</p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <span className="text-green-500 mt-0.5">✓</span>
                      <p className="text-gray-700">Professional photographer comes to your home</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="text-green-500 mt-0.5">✓</span>
                      <p className="text-gray-700">2 hours included ($199 base price)</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="text-green-500 mt-0.5">✓</span>
                      <p className="text-gray-700">Additional hours available at $70/hour</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="text-green-500 mt-0.5">✓</span>
                      <p className="text-gray-700">High-quality photos of all your items</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="text-green-500 mt-0.5">✓</span>
                      <p className="text-gray-700">AI classification & organization included</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="text-green-500 mt-0.5">✓</span>
                      <p className="text-gray-700">Perfect for large closets or busy schedules</p>
                    </div>
                  </div>

                  <button
                    onClick={() => setBookingStep('schedule')}
                    className="w-full bg-gradient-to-r from-rose-500 to-teal-500 text-white py-3 rounded-lg font-semibold hover:opacity-90 transition"
                  >
                    Schedule Appointment
                  </button>
                </div>
              )}

              {/* Step 2: Schedule */}
              {bookingStep === 'schedule' && (
                <div className="space-y-5">
                  {/* Date Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      Select Date
                    </label>
                    <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                      {getAvailableDates().map((date) => (
                        <button
                          key={date}
                          onClick={() => setSelectedDate(date)}
                          className={`p-2 text-sm rounded-lg border transition ${
                            selectedDate === date
                              ? 'border-rose-500 bg-rose-50 text-rose-700'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          {formatDate(date)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Time Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Clock className="w-4 h-4 inline mr-1" />
                      Select Time
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {TIME_SLOTS.map((time) => (
                        <button
                          key={time}
                          onClick={() => setSelectedTime(time)}
                          className={`p-2 text-sm rounded-lg border transition ${
                            selectedTime === time
                              ? 'border-rose-500 bg-rose-50 text-rose-700'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          {time}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Extra Hours */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <DollarSign className="w-4 h-4 inline mr-1" />
                      Additional Hours (+$70/hour)
                    </label>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setExtraHours(Math.max(0, extraHours - 1))}
                        className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                      >
                        -
                      </button>
                      <span className="text-lg font-medium w-20 text-center">
                        {extraHours} hour{extraHours !== 1 ? 's' : ''}
                      </span>
                      <button
                        onClick={() => setExtraHours(extraHours + 1)}
                        className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                      >
                        +
                      </button>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Total session: {2 + extraHours} hours
                    </p>
                  </div>

                  {/* Total */}
                  <div className="bg-gray-50 p-4 rounded-xl">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Base price (2 hours)</span>
                      <span>$199</span>
                    </div>
                    {extraHours > 0 && (
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-gray-600">Extra hours ({extraHours} × $70)</span>
                        <span>${extraHours * 70}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-200">
                      <span className="font-semibold">Total</span>
                      <span className="text-xl font-bold text-rose-500">${calculateTotal()}</span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setBookingStep('info')}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                    >
                      Back
                    </button>
                    <button
                      onClick={() => setBookingStep('confirm')}
                      disabled={!selectedDate || !selectedTime}
                      className="flex-1 bg-gradient-to-r from-rose-500 to-teal-500 text-white py-2 rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50"
                    >
                      Continue
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Confirm */}
              {bookingStep === 'confirm' && (
                <div className="space-y-4">
                  {/* Booking Summary */}
                  <div className="bg-gray-50 p-4 rounded-xl space-y-2">
                    <h4 className="font-semibold">Appointment Details</h4>
                    <p className="text-sm text-gray-600">
                      📅 {formatDate(selectedDate)} at {selectedTime}
                    </p>
                    <p className="text-sm text-gray-600">
                      ⏱️ {2 + extraHours} hours session
                    </p>
                    <p className="text-sm text-gray-600">
                      📧 Confirmation will be sent to: <span className="font-medium">{userEmail}</span>
                    </p>
                    <p className="text-sm font-semibold text-rose-500">
                      💰 Total: ${calculateTotal()}
                    </p>
                  </div>

                  {/* Contact Form */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                      <input
                        type="text"
                        value={bookingName}
                        onChange={(e) => setBookingName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                        placeholder="Jane Smith"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      <input
                        type="tel"
                        value={bookingPhone}
                        onChange={(e) => setBookingPhone(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                        placeholder="(555) 123-4567"
                      />
                    </div>
                    
                    {/* Split Address Fields */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 1</label>
                      <input
                        type="text"
                        value={addressLine1}
                        onChange={(e) => setAddressLine1(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                        placeholder="123 Main Street"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 2 (optional)</label>
                      <input
                        type="text"
                        value={addressLine2}
                        onChange={(e) => setAddressLine2(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                        placeholder="Apt 4B"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                        <input
                          type="text"
                          value={addressCity}
                          onChange={(e) => setAddressCity(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                          placeholder="Miami"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                        <input
                          type="text"
                          value={addressState}
                          onChange={(e) => setAddressState(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                          placeholder="FL"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">ZIP Code</label>
                      <input
                        type="text"
                        value={addressZip}
                        onChange={(e) => setAddressZip(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                        placeholder="33101"
                      />
                    </div>
                  </div>

                  <p className="text-xs text-gray-500">
                    By submitting, you agree to be contacted to confirm your appointment. Payment will be collected at the time of service.
                  </p>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setBookingStep('schedule')}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                    >
                      Back
                    </button>
                    <button
                      onClick={submitBooking}
                      disabled={!isConfirmFormValid() || submittingBooking}
                      className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-rose-500 to-teal-500 text-white py-2 rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50"
                    >
                      {submittingBooking ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        'Submit Booking Request'
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
