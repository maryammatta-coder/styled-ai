'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ClosetItem } from '@/types'
import { Plus, Home, X, Upload } from 'lucide-react'

export default function ClosetPage() {
  const [closetItems, setClosetItems] = useState<ClosetItem[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const router = useRouter()
  const supabase = createClient()

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
      // Upload image to Supabase Storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}/${Date.now()}.${fileExt}`
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('closet-images')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('closet-images')
        .getPublicUrl(fileName)

      // Create closet item with placeholder data
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

      // Call AI classification API in the background
      if (newItem) {
        fetch('/api/closet/classify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageUrl: publicUrl,
            itemId: newItem.id
          })
        }).then(() => {
          // Reload items after classification
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
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 bg-rose-500 text-white px-4 py-2 rounded-lg hover:bg-rose-600"
          >
            <Plus className="w-5 h-5" />
            <span>Add Items</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {closetItems.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl">
            <Upload className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">Your closet is empty. Start adding items!</p>
            <button
              onClick={() => setShowUploadModal(true)}
              className="bg-gradient-to-r from-rose-500 to-teal-500 text-white px-6 py-2 rounded-lg font-semibold hover:opacity-90 transition"
            >
              Add Your First Item
            </button>
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
                  <button
                    onClick={() => deleteItem(item.id)}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-3">
                  <p className="font-medium text-sm">{item.name}</p>
                  <p className="text-xs text-gray-500">{item.category}</p>
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
    </div>
  )
}