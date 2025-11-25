'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Heart,
  Trash2,
  Calendar,
  Cloud,
  Sparkles,
  Filter,
  Search,
  Loader2,
  ChevronDown,
  MoreVertical,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';

interface OutfitData {
  closet_items?: ClosetItem[];
  closet_item_ids: string[];
  new_items: NewItem[];
  weather_rationale: string;
  style_rationale: string;
  styling_tips?: string[];
  weather?: {
    temperature: number;
    condition: string;
    city: string;
  };
}

interface ClosetItem {
  id: string;
  name: string;
  category: string;
  color: string;
  image_url: string;
}

interface NewItem {
  description: string;
  category: string;
  color: string;
  reasoning: string;
  estimated_price?: string;
}

interface Outfit {
  id: string;
  label: string;
  context_type: string;
  date: string;
  created_at: string;
  outfit_data: OutfitData;
  is_favorite?: boolean;
}

type FilterType = 'all' | 'favorites' | 'date-night' | 'work' | 'casual' | 'brunch';

export default function OutfitHistoryPage() {
  const router = useRouter();
  const supabase = createClient();

  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [selectedOutfit, setSelectedOutfit] = useState<Outfit | null>(null);
  const [closetItemsMap, setClosetItemsMap] = useState<Record<string, ClosetItem>>({});

  useEffect(() => {
    loadOutfits();
  }, []);

  const loadOutfits = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      // Fetch outfits
      const { data: outfitsData, error: outfitsError } = await supabase
        .from('outfits')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (outfitsError) throw outfitsError;

      // Fetch all closet items for reference
      const { data: closetItems, error: closetError } = await supabase
        .from('closet_items')
        .select('*')
        .eq('user_id', user.id);

      if (!closetError && closetItems) {
        const itemsMap: Record<string, ClosetItem> = {};
        closetItems.forEach((item) => {
          itemsMap[item.id] = item;
        });
        setClosetItemsMap(itemsMap);
      }

      setOutfits(outfitsData || []);
    } catch (error) {
      console.error('Error loading outfits:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async (outfitId: string) => {
    const outfit = outfits.find((o) => o.id === outfitId);
    if (!outfit) return;

    const newFavoriteStatus = !outfit.is_favorite;

    // Optimistic update
    setOutfits((prev) =>
      prev.map((o) =>
        o.id === outfitId ? { ...o, is_favorite: newFavoriteStatus } : o
      )
    );

    try {
      const { error } = await supabase
        .from('outfits')
        .update({ is_favorite: newFavoriteStatus })
        .eq('id', outfitId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating favorite:', error);
      // Revert on error
      setOutfits((prev) =>
        prev.map((o) =>
          o.id === outfitId ? { ...o, is_favorite: !newFavoriteStatus } : o
        )
      );
    }
  };

  const deleteOutfit = async (outfitId: string) => {
    if (!confirm('Are you sure you want to delete this outfit?')) return;

    // Optimistic update
    setOutfits((prev) => prev.filter((o) => o.id !== outfitId));

    try {
      const { error } = await supabase
        .from('outfits')
        .delete()
        .eq('id', outfitId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting outfit:', error);
      loadOutfits(); // Reload on error
    }
  };

  // Filter outfits
  const filteredOutfits = outfits.filter((outfit) => {
    // Apply type filter
    if (filter === 'favorites' && !outfit.is_favorite) return false;
    if (filter !== 'all' && filter !== 'favorites') {
      const contextLower = outfit.context_type?.toLowerCase() || '';
      if (!contextLower.includes(filter.replace('-', ' '))) return false;
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        outfit.label?.toLowerCase().includes(query) ||
        outfit.context_type?.toLowerCase().includes(query)
      );
    }

    return true;
  });

  const filterOptions: { value: FilterType; label: string }[] = [
    { value: 'all', label: 'All Outfits' },
    { value: 'favorites', label: '❤️ Favorites' },
    { value: 'date-night', label: '🌙 Date Night' },
    { value: 'work', label: '💼 Work' },
    { value: 'casual', label: '👕 Casual' },
    { value: 'brunch', label: '🥂 Brunch' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/dashboard')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-xl font-semibold">Outfit History</h1>
              <span className="text-sm text-gray-500">
                {filteredOutfits.length} outfits
              </span>
            </div>

            <button
              onClick={() => router.push('/outfits/generate')}
              className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              New Outfit
            </button>
          </div>

          {/* Search and Filter */}
          <div className="flex items-center gap-3 mt-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search outfits..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            <div className="relative">
              <button
                onClick={() => setShowFilterMenu(!showFilterMenu)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Filter className="w-4 h-4" />
                {filterOptions.find((f) => f.value === filter)?.label}
                <ChevronDown className="w-4 h-4" />
              </button>

              {showFilterMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                  {filterOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setFilter(option.value);
                        setShowFilterMenu(false);
                      }}
                      className={`w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors ${
                        filter === option.value ? 'bg-gray-100 font-medium' : ''
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {filteredOutfits.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {filter === 'favorites'
                ? 'No favorite outfits yet'
                : 'No outfits found'}
            </h3>
            <p className="text-gray-500 mb-4">
              {filter === 'favorites'
                ? 'Heart your favorite outfits to save them here'
                : 'Generate your first outfit to get started'}
            </p>
            <button
              onClick={() => router.push('/outfits/generate')}
              className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              Generate Outfit
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredOutfits.map((outfit) => (
              <OutfitCard
                key={outfit.id}
                outfit={outfit}
                closetItemsMap={closetItemsMap}
                onToggleFavorite={() => toggleFavorite(outfit.id)}
                onDelete={() => deleteOutfit(outfit.id)}
                onClick={() => setSelectedOutfit(outfit)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Outfit Detail Modal */}
      {selectedOutfit && (
        <OutfitDetailModal
          outfit={selectedOutfit}
          closetItemsMap={closetItemsMap}
          onClose={() => setSelectedOutfit(null)}
          onToggleFavorite={() => toggleFavorite(selectedOutfit.id)}
          onDelete={() => {
            deleteOutfit(selectedOutfit.id);
            setSelectedOutfit(null);
          }}
        />
      )}
    </div>
  );
}

// Outfit Card Component
interface OutfitCardProps {
  outfit: Outfit;
  closetItemsMap: Record<string, ClosetItem>;
  onToggleFavorite: () => void;
  onDelete: () => void;
  onClick: () => void;
}

function OutfitCard({
  outfit,
  closetItemsMap,
  onToggleFavorite,
  onDelete,
  onClick,
}: OutfitCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  // Get preview images from closet items
  const previewImages = (outfit.outfit_data?.closet_item_ids || [])
    .slice(0, 4)
    .map((id) => closetItemsMap[id]?.image_url)
    .filter(Boolean);

  const date = new Date(outfit.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      {/* Image Preview Grid */}
      <div
        onClick={onClick}
        className="aspect-square bg-gray-100 relative cursor-pointer"
      >
        {previewImages.length > 0 ? (
          <div className="grid grid-cols-2 h-full">
            {previewImages.map((url, idx) => (
              <div key={idx} className="relative">
                <Image
                  src={url}
                  alt=""
                  fill
                  className="object-cover"
                />
              </div>
            ))}
            {previewImages.length < 4 &&
              Array.from({ length: 4 - previewImages.length }).map((_, idx) => (
                <div key={`empty-${idx}`} className="bg-gray-200" />
              ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <Sparkles className="w-12 h-12 text-gray-300" />
          </div>
        )}

        {/* New Items Badge */}
        {outfit.outfit_data?.new_items?.length > 0 && (
          <div className="absolute top-2 left-2 px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
            +{outfit.outfit_data.new_items.length} new items
          </div>
        )}
      </div>

      {/* Card Content */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-gray-900 truncate">{outfit.label}</h3>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>{outfit.context_type}</span>
              <span>•</span>
              <span>{date}</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite();
              }}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Heart
                className={`w-5 h-5 ${
                  outfit.is_favorite
                    ? 'fill-red-500 text-red-500'
                    : 'text-gray-400'
                }`}
              />
            </button>

            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <MoreVertical className="w-5 h-5 text-gray-400" />
              </button>

              {showMenu && (
                <div className="absolute right-0 mt-1 w-32 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete();
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-red-600 hover:bg-red-50 flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Weather Info */}
        {outfit.outfit_data?.weather && (
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <Cloud className="w-4 h-4" />
            <span>
              {outfit.outfit_data.weather.temperature}°F,{' '}
              {outfit.outfit_data.weather.city}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// Outfit Detail Modal
interface OutfitDetailModalProps {
  outfit: Outfit;
  closetItemsMap: Record<string, ClosetItem>;
  onClose: () => void;
  onToggleFavorite: () => void;
  onDelete: () => void;
}

function OutfitDetailModal({
  outfit,
  closetItemsMap,
  onClose,
  onToggleFavorite,
  onDelete,
}: OutfitDetailModalProps) {
  const closetItems = (outfit.outfit_data?.closet_item_ids || [])
    .map((id) => closetItemsMap[id])
    .filter(Boolean);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">{outfit.label}</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleFavorite}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Heart
                className={`w-5 h-5 ${
                  outfit.is_favorite
                    ? 'fill-red-500 text-red-500'
                    : 'text-gray-400'
                }`}
              />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Context & Weather */}
          <div className="flex flex-wrap gap-3">
            <span className="px-3 py-1 bg-gray-100 rounded-full text-sm">
              {outfit.context_type}
            </span>
            {outfit.outfit_data?.weather && (
              <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm flex items-center gap-1">
                <Cloud className="w-4 h-4" />
                {outfit.outfit_data.weather.temperature}°F in{' '}
                {outfit.outfit_data.weather.city}
              </span>
            )}
            <span className="px-3 py-1 bg-gray-100 rounded-full text-sm flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {new Date(outfit.created_at).toLocaleDateString()}
            </span>
          </div>

          {/* Closet Items */}
          {closetItems.length > 0 && (
            <div>
              <h3 className="font-medium text-gray-900 mb-3">From Your Closet</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {closetItems.map((item) => (
                  <div
                    key={item.id}
                    className="bg-gray-50 rounded-lg overflow-hidden"
                  >
                    <div className="aspect-square relative">
                      <Image
                        src={item.image_url}
                        alt={item.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="p-2">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      <p className="text-xs text-gray-500 capitalize">
                        {item.category}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* New Item Suggestions */}
          {outfit.outfit_data?.new_items?.length > 0 && (
            <div>
              <h3 className="font-medium text-gray-900 mb-3">
                Suggested New Items
              </h3>
              <div className="space-y-3">
                {outfit.outfit_data.new_items.map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-purple-50 border border-purple-100 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-gray-900">
                          {item.description}
                        </p>
                        <p className="text-sm text-gray-600 capitalize">
                          {item.category} • {item.color}
                        </p>
                      </div>
                      {item.estimated_price && (
                        <span className="text-sm font-medium text-purple-700">
                          {item.estimated_price}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-2">{item.reasoning}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Weather Rationale */}
          {outfit.outfit_data?.weather_rationale && (
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-1 flex items-center gap-2">
                <Cloud className="w-4 h-4" />
                Weather Consideration
              </h4>
              <p className="text-sm text-blue-800">
                {outfit.outfit_data.weather_rationale}
              </p>
            </div>
          )}

          {/* Style Rationale */}
          {outfit.outfit_data?.style_rationale && (
            <div className="bg-purple-50 border border-purple-100 rounded-lg p-4">
              <h4 className="font-medium text-purple-900 mb-1 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Style Notes
              </h4>
              <p className="text-sm text-purple-800">
                {outfit.outfit_data.style_rationale}
              </p>
            </div>
          )}

          {/* Styling Tips */}
          {outfit.outfit_data?.styling_tips?.length > 0 && (
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Styling Tips</h3>
              <ul className="space-y-2">
                {outfit.outfit_data.styling_tips.map((tip, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <span className="text-purple-500">•</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={onDelete}
              className="flex-1 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete Outfit
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
