'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Home, Plus, X, Upload, Trash2, Crop, Check, Loader2 } from 'lucide-react'
import ReactCrop, { type Crop as CropType, centerCrop, makeAspectCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'

interface InspoImage {
  id: string
  user_id: string
  image_url: string
  notes?: string
  created_at: string
}

export default function InspoPage() {
  const [inspoImages, setInspoImages] = useState<InspoImage[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [selectedImage, setSelectedImage] = useState<InspoImage | null>(null)

  // Crop state
  const [showCropModal, setShowCropModal] = useState(false)
  const [currentFile, setCurrentFile] = useState<File | null>(null)
  const [currentFileUrl, setCurrentFileUrl] = useState<string>('')
  const [crop, setCrop] = useState<CropType>()
  const [savingCrop, setSavingCrop] = useState(false)
  const [editingImageId, setEditingImageId] = useState<string | null>(null)
  const imgRef = useRef<HTMLImageElement>(null)

  // Select mode state
  const [selectMode, setSelectMode] = useState(false)
  const [selectedItems, setSelectedItems] = useState<string[]>([])

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadInspoImages()
  }, [])

  const loadInspoImages = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data, error } = await supabase
        .from('inspo_images')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setInspoImages(data || [])
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
        const fileName = `inspo/${user.id}/${Date.now()}.${fileExt}`

        const { error: uploadError } = await supabase.storage
          .from('closet-images')
          .upload(fileName, file)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('closet-images')
          .getPublicUrl(fileName)

        const { error: insertError } = await supabase
          .from('inspo_images')
          .insert([{
            user_id: user.id,
            image_url: publicUrl,
          }])

        if (insertError) throw insertError
      }

      await loadInspoImages()
      setShowUploadModal(false)
    } catch (err: any) {
      console.error(err)
      alert(err.message || 'Error uploading images')
    } finally {
      setUploading(false)
    }
  }

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget
    // Free aspect ratio - let user choose any size
    const cropInit = centerCrop(
      {
        unit: '%',
        width: 90,
        height: 90,
      },
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
    if ((!currentFile && !editingImageId) || !crop) return

    setSavingCrop(true)
    try {
      const croppedBlob = await getCroppedImg()
      if (!croppedBlob) throw new Error('Failed to crop image')

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No user')

      const fileExt = currentFile ? currentFile.name.split('.').pop() : 'jpg'
      const fileName = `inspo/${user.id}/${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('closet-images')
        .upload(fileName, croppedBlob)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('closet-images')
        .getPublicUrl(fileName)

      if (editingImageId) {
        // Update existing image
        const { error: updateError } = await supabase
          .from('inspo_images')
          .update({ image_url: publicUrl })
          .eq('id', editingImageId)

        if (updateError) throw updateError
      } else {
        // Insert new image
        const { error: insertError } = await supabase
          .from('inspo_images')
          .insert([{
            user_id: user.id,
            image_url: publicUrl,
          }])

        if (insertError) throw insertError
      }

      await loadInspoImages()
      setShowCropModal(false)
      setCurrentFile(null)
      setCurrentFileUrl('')
      setEditingImageId(null)
      if (currentFileUrl) {
        URL.revokeObjectURL(currentFileUrl)
      }
    } catch (err: any) {
      console.error(err)
      alert('Failed to save image: ' + (err.message || 'Unknown error'))
    } finally {
      setSavingCrop(false)
    }
  }

  const cancelCrop = () => {
    setShowCropModal(false)
    setCurrentFile(null)
    setEditingImageId(null)
    if (currentFileUrl) {
      URL.revokeObjectURL(currentFileUrl)
    }
    setCurrentFileUrl('')
  }

  const recropImage = (image: InspoImage) => {
    setEditingImageId(image.id)
    setCurrentFileUrl(image.image_url)
    setShowCropModal(true)
    setSelectedImage(null)
  }

  const deleteImage = async (imageId: string) => {
    if (!confirm('Delete this inspiration photo?')) return

    try {
      const { error } = await supabase
        .from('inspo_images')
        .delete()
        .eq('id', imageId)

      if (error) throw error
      await loadInspoImages()
      setSelectedImage(null)
    } catch (err) {
      console.error(err)
      alert('Failed to delete image')
    }
  }

  const toggleSelectMode = () => {
    setSelectMode(!selectMode)
    setSelectedItems([])
  }

  const toggleItemSelection = (itemId: string) => {
    if (selectedItems.includes(itemId)) {
      setSelectedItems(selectedItems.filter(id => id !== itemId))
    } else {
      setSelectedItems([...selectedItems, itemId])
    }
  }

  const selectAllItems = () => {
    if (selectedItems.length === inspoImages.length) {
      setSelectedItems([])
    } else {
      setSelectedItems(inspoImages.map(img => img.id))
    }
  }

  const deleteSelectedItems = async () => {
    if (selectedItems.length === 0) return
    if (!confirm(`Delete ${selectedItems.length} photo(s)?`)) return

    try {
      const { error } = await supabase
        .from('inspo_images')
        .delete()
        .in('id', selectedItems)

      if (error) throw error

      setSelectedItems([])
      setSelectMode(false)
      await loadInspoImages()
    } catch (err) {
      console.error(err)
      alert('Failed to delete photos')
    }
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
        <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
          {selectMode ? (
            <button
              onClick={selectAllItems}
              className="text-dark-taupe font-medium hover:text-warm-grey transition-colors"
            >
              {selectedItems.length === inspoImages.length ? 'Deselect All' : 'Select All'}
            </button>
          ) : (
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-2 text-warm-grey hover:text-dark-taupe transition-colors"
            >
              <Home className="w-5 h-5" />
              <span className="text-sm tracking-wide">BACK</span>
            </button>
          )}
          <h2 className="text-2xl font-light tracking-wide text-dark-taupe">INSPO</h2>
          {selectMode ? (
            <button
              onClick={toggleSelectMode}
              className="flex items-center gap-2 text-warm-grey hover:text-dark-taupe transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          ) : (
            <div className="flex items-center gap-3">
              {inspoImages.length > 0 && (
                <button
                  onClick={toggleSelectMode}
                  className="text-dark-taupe text-sm font-medium hover:text-warm-grey tracking-wide transition-colors"
                >
                  SELECT
                </button>
              )}
              <button
                onClick={() => setShowUploadModal(true)}
                className="flex items-center gap-2 bg-blush text-dark-taupe px-5 py-2.5 rounded-full hover:bg-blush/80 transition-all shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm tracking-wide">ADD</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-10">
        {inspoImages.length === 0 ? (
          <div className="text-center py-20 bg-beige rounded-3xl border border-taupe/20">
            <Upload className="w-16 h-16 text-taupe mx-auto mb-6" />
            <p className="text-warm-grey mb-8 text-lg">No inspiration photos yet. Start building your mood board!</p>
            <button
              onClick={() => setShowUploadModal(true)}
              className="bg-blush text-dark-taupe px-8 py-4 rounded-full font-medium hover:bg-blush/80 transition-all shadow-sm tracking-wide"
            >
              ADD INSPIRATION PHOTOS
            </button>
          </div>
        ) : (
          <div className="columns-2 md:columns-3 lg:columns-4 gap-6 space-y-6">
            {inspoImages.map((image) => (
              <div
                key={image.id}
                className="break-inside-avoid bg-beige rounded-2xl overflow-hidden hover:shadow-lg transition-all cursor-pointer group border border-taupe/10 mb-6"
                onClick={() => selectMode ? toggleItemSelection(image.id) : setSelectedImage(image)}
              >
                <div className="relative">
                  <img
                    src={image.image_url}
                    alt="Inspiration"
                    className="w-full h-auto object-cover"
                  />

                  {selectMode ? (
                    <div className="absolute top-3 right-3">
                      <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${
                        selectedItems.includes(image.id)
                          ? 'bg-blush border-blush'
                          : 'bg-cream/80 border-taupe/40 backdrop-blur-sm'
                      }`}>
                        {selectedItems.includes(image.id) && (
                          <Check className="w-4 h-4 text-dark-taupe" />
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="absolute top-3 right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          recropImage(image)
                        }}
                        className="bg-blush/90 backdrop-blur-sm text-dark-taupe rounded-full p-2 hover:bg-blush transition-all shadow-sm"
                        title="Re-crop"
                      >
                        <Crop className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteImage(image.id)
                        }}
                        className="bg-dark-taupe/90 backdrop-blur-sm text-cream rounded-full p-2 hover:bg-dark-taupe transition-all shadow-sm"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Floating Action Button (visible in select mode when items are selected) */}
        {selectMode && selectedItems.length > 0 && (
          <div className="fixed bottom-10 right-10 z-20">
            <button
              onClick={deleteSelectedItems}
              className="bg-dark-taupe text-cream rounded-full p-5 shadow-xl hover:bg-dark-taupe/90 transition-all border border-taupe/20"
              title={`Delete ${selectedItems.length} photo(s)`}
            >
              <Trash2 className="w-6 h-6" />
            </button>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-beige rounded-2xl p-8 max-w-md w-full border border-taupe/20">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-light tracking-wide text-dark-taupe">ADD INSPIRATION</h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-1 hover:bg-taupe/20 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-warm-grey" />
              </button>
            </div>

            <label className="flex flex-col items-center justify-center border-2 border-dashed border-taupe/30 rounded-2xl p-12 cursor-pointer hover:border-blush transition-colors bg-cream/50">
              <Upload className="w-16 h-16 text-taupe mb-4" />
              <span className="text-base font-medium text-dark-taupe">Click to upload photos</span>
              <span className="text-sm text-warm-grey mt-2">or drag and drop</span>
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
              <div className="mt-6 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-blush border-t-transparent"></div>
                <p className="mt-3 text-warm-grey">Uploading...</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Crop Modal */}
      {showCropModal && currentFileUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-beige rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-taupe/20">
            <div className="sticky top-0 bg-beige border-b border-taupe/20 px-6 py-4 flex items-center justify-between z-10">
              <h3 className="text-xl font-light tracking-wide text-dark-taupe">CROP IMAGE</h3>
              <button
                onClick={cancelCrop}
                className="p-1 hover:bg-taupe/20 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-warm-grey" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-warm-grey text-center">
                {editingImageId ? 'Adjust the crop area, then click "Save"' : 'Drag to crop your image (any size), then click "Save"'}
              </p>

              <div className="flex justify-center bg-cream rounded-2xl p-4">
                <ReactCrop
                  crop={crop}
                  onChange={(_, percentCrop) => setCrop(percentCrop)}
                  className="max-h-[500px]"
                >
                  <img
                    ref={imgRef}
                    src={currentFileUrl}
                    alt="Crop preview"
                    onLoad={onImageLoad}
                    crossOrigin="anonymous"
                    className="max-h-[500px]"
                  />
                </ReactCrop>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={cancelCrop}
                  className="flex-1 px-4 py-3 border-2 border-taupe/30 text-dark-taupe rounded-full hover:bg-taupe/10 transition-colors font-medium tracking-wide"
                >
                  CANCEL
                </button>
                <button
                  onClick={saveCroppedImage}
                  disabled={savingCrop}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blush text-dark-taupe rounded-full hover:bg-blush/80 transition-all disabled:opacity-50 font-medium tracking-wide shadow-sm"
                >
                  {savingCrop ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>SAVING...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-5 h-5" />
                      <span>SAVE</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Detail Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="max-w-4xl max-h-[90vh] relative" onClick={(e) => e.stopPropagation()}>
            <div className="absolute -top-12 right-0 flex gap-3">
              <button
                onClick={() => recropImage(selectedImage)}
                className="flex items-center gap-2 bg-blush text-dark-taupe px-4 py-2 rounded-full hover:bg-blush/80 transition-all shadow-sm"
              >
                <Crop className="w-4 h-4" />
                <span className="text-sm tracking-wide">RE-CROP</span>
              </button>
              <button
                onClick={() => setSelectedImage(null)}
                className="text-cream hover:text-blush transition-colors"
              >
                <X className="w-8 h-8" />
              </button>
            </div>
            <img
              src={selectedImage.image_url}
              alt="Inspiration"
              className="max-w-full max-h-[90vh] object-contain rounded-2xl"
            />
          </div>
        </div>
      )}
    </div>
  )
}
