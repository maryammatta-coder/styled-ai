'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  User,
  Palette,
  MapPin,
  DollarSign,
  Save,
  Loader2,
  Check,
  X,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import WeatherDisplay from '@/components/WeatherDisplay';

// Style options (same as onboarding)
const STYLE_VIBES = [
  'Elevated Basics',
  'Resort',
  'Minimalist',
  'Chic',
  'Bohemian',
  'Classic',
  'Edgy',
  'Romantic',
  'Sporty',
  'Vintage',
];

const COLORS = [
  { name: 'Black', value: '#000000' },
  { name: 'White', value: '#FFFFFF' },
  { name: 'Navy', value: '#1e3a5f' },
  { name: 'Beige', value: '#d4c5b5' },
  { name: 'Brown', value: '#8B4513' },
  { name: 'Burgundy', value: '#722F37' },
  { name: 'Olive', value: '#556B2F' },
  { name: 'Blush', value: '#DE5D83' },
  { name: 'Camel', value: '#C19A6B' },
  { name: 'Gray', value: '#808080' },
  { name: 'Red', value: '#DC143C' },
  { name: 'Blue', value: '#4169E1' },
  { name: 'Green', value: '#228B22' },
  { name: 'Yellow', value: '#FFD700' },
  { name: 'Orange', value: '#FF8C00' },
  { name: 'Purple', value: '#9370DB' },
  { name: 'Pink', value: '#FF69B4' },
  { name: 'Teal', value: '#008080' },
];

const BUDGET_LEVELS = [
  { value: '$', label: 'Budget-Friendly', description: 'H&M, Zara, Target' },
  { value: '$$', label: 'Mid-Range', description: 'Madewell, COS, & Other Stories' },
  { value: '$$$', label: 'Premium', description: 'Sezane, Reformation, Theory' },
  { value: '$$$$', label: 'Luxury', description: 'The Row, Khaite, Designer' },
];

interface UserProfile {
  id: string;
  email: string;
  style_vibe: string[];
  color_palette: string[];
  avoid_colors: string[];
  budget_level: string;
  home_city: string;
  home_region: string;
  home_country: string;
  use_auto_location: boolean;
}

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Profile state
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [styleVibes, setStyleVibes] = useState<string[]>([]);
  const [colorPalette, setColorPalette] = useState<string[]>([]);
  const [avoidColors, setAvoidColors] = useState<string[]>([]);
  const [budgetLevel, setBudgetLevel] = useState('$$');
  const [homeCity, setHomeCity] = useState('');
  const [homeRegion, setHomeRegion] = useState('');
  const [homeCountry, setHomeCountry] = useState('');
  const [useAutoLocation, setUseAutoLocation] = useState(false);

  // Active section for mobile
  const [activeSection, setActiveSection] = useState<string>('style');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      if (profileData) {
        setProfile(profileData);
        setStyleVibes(profileData.style_vibe || []);
        setColorPalette(profileData.color_palette || []);
        setAvoidColors(profileData.avoid_colors || []);
        setBudgetLevel(profileData.budget_level || '$$');
        setHomeCity(profileData.home_city || '');
        setHomeRegion(profileData.home_region || '');
        setHomeCountry(profileData.home_country || '');
        setUseAutoLocation(profileData.use_auto_location || false);
      }
    } catch (err) {
      console.error('Error loading profile:', err);
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!profile) return;

    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const { error: updateError } = await supabase
        .from('users')
        .update({
          style_vibe: styleVibes,
          color_palette: colorPalette,
          avoid_colors: avoidColors,
          budget_level: budgetLevel,
          home_city: homeCity,
          home_region: homeRegion,
          home_country: homeCountry,
          use_auto_location: useAutoLocation,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id);

      if (updateError) throw updateError;

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Error saving profile:', err);
      setError('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const toggleStyleVibe = (vibe: string) => {
    setStyleVibes((prev) =>
      prev.includes(vibe) ? prev.filter((v) => v !== vibe) : [...prev, vibe]
    );
  };

  const toggleColor = (color: string, type: 'palette' | 'avoid') => {
    if (type === 'palette') {
      setColorPalette((prev) =>
        prev.includes(color) ? prev.filter((c) => c !== color) : [...prev, color]
      );
      // Remove from avoid if adding to palette
      if (!colorPalette.includes(color)) {
        setAvoidColors((prev) => prev.filter((c) => c !== color));
      }
    } else {
      setAvoidColors((prev) =>
        prev.includes(color) ? prev.filter((c) => c !== color) : [...prev, color]
      );
      // Remove from palette if adding to avoid
      if (!avoidColors.includes(color)) {
        setColorPalette((prev) => prev.filter((c) => c !== color));
      }
    }
  };

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        // In a real app, you'd use a reverse geocoding service here
        // For now, we'll just enable auto-location
        setUseAutoLocation(true);
      },
      (err) => {
        setError('Location access denied');
      }
    );
  };

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
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-semibold">Profile & Preferences</h1>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              saved
                ? 'bg-green-100 text-green-700'
                : 'bg-black text-white hover:bg-gray-800'
            }`}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : saved ? (
              <Check className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
          </button>
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="max-w-4xl mx-auto px-4 pt-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center justify-between">
            <span className="text-red-700 text-sm">{error}</span>
            <button onClick={() => setError(null)}>
              <X className="w-4 h-4 text-red-500" />
            </button>
          </div>
        </div>
      )}

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Account Info */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-gray-100 rounded-lg">
              <User className="w-5 h-5 text-gray-600" />
            </div>
            <h2 className="text-lg font-semibold">Account</h2>
          </div>
          <div className="text-gray-600">
            <p className="text-sm text-gray-500">Email</p>
            <p className="font-medium">{profile?.email}</p>
          </div>
        </section>

        {/* Location & Weather */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <MapPin className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-lg font-semibold">Location & Weather</h2>
          </div>

          {/* Current Weather Preview */}
          {(homeCity || useAutoLocation) && (
            <div className="mb-6">
              <p className="text-sm text-gray-500 mb-2">Current Weather</p>
              <WeatherDisplay
                city={homeCity}
                autoDetectLocation={useAutoLocation}
              />
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium">Auto-detect location</p>
                <p className="text-sm text-gray-500">
                  Use your current location for weather
                </p>
              </div>
              <button
                onClick={() => {
                  if (!useAutoLocation) {
                    detectLocation();
                  } else {
                    setUseAutoLocation(false);
                  }
                }}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  useAutoLocation ? 'bg-blue-500' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    useAutoLocation ? 'left-7' : 'left-1'
                  }`}
                />
              </button>
            </div>

            {!useAutoLocation && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-gray-500 mb-1">City</label>
                  <input
                    type="text"
                    value={homeCity}
                    onChange={(e) => setHomeCity(e.target.value)}
                    placeholder="Miami"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">
                    State/Region
                  </label>
                  <input
                    type="text"
                    value={homeRegion}
                    onChange={(e) => setHomeRegion(e.target.value)}
                    placeholder="Florida"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Country</label>
                  <input
                    type="text"
                    value={homeCountry}
                    onChange={(e) => setHomeCountry(e.target.value)}
                    placeholder="USA"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Style Preferences */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Palette className="w-5 h-5 text-purple-600" />
            </div>
            <h2 className="text-lg font-semibold">Style Preferences</h2>
          </div>

          {/* Style Vibes */}
          <div className="mb-6">
            <p className="text-sm text-gray-500 mb-3">Your Style Vibes</p>
            <div className="flex flex-wrap gap-2">
              {STYLE_VIBES.map((vibe) => (
                <button
                  key={vibe}
                  onClick={() => toggleStyleVibe(vibe)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    styleVibes.includes(vibe)
                      ? 'bg-purple-100 text-purple-700 border-2 border-purple-300'
                      : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
                  }`}
                >
                  {vibe}
                </button>
              ))}
            </div>
          </div>

          {/* Favorite Colors */}
          <div className="mb-6">
            <p className="text-sm text-gray-500 mb-3">Favorite Colors</p>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((color) => (
                <button
                  key={color.name}
                  onClick={() => toggleColor(color.name, 'palette')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all ${
                    colorPalette.includes(color.name)
                      ? 'bg-green-100 text-green-700 ring-2 ring-green-300'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <span
                    className="w-4 h-4 rounded-full border border-gray-300"
                    style={{ backgroundColor: color.value }}
                  />
                  {color.name}
                  {colorPalette.includes(color.name) && (
                    <Check className="w-3 h-3" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Colors to Avoid */}
          <div>
            <p className="text-sm text-gray-500 mb-3">Colors to Avoid</p>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((color) => (
                <button
                  key={color.name}
                  onClick={() => toggleColor(color.name, 'avoid')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all ${
                    avoidColors.includes(color.name)
                      ? 'bg-red-100 text-red-700 ring-2 ring-red-300'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <span
                    className="w-4 h-4 rounded-full border border-gray-300"
                    style={{ backgroundColor: color.value }}
                  />
                  {color.name}
                  {avoidColors.includes(color.name) && <X className="w-3 h-3" />}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Budget */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <h2 className="text-lg font-semibold">Budget Preferences</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {BUDGET_LEVELS.map((level) => (
              <button
                key={level.value}
                onClick={() => setBudgetLevel(level.value)}
                className={`p-4 rounded-xl text-left transition-all ${
                  budgetLevel === level.value
                    ? 'bg-green-50 border-2 border-green-300'
                    : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xl font-semibold">{level.value}</span>
                  {budgetLevel === level.value && (
                    <Check className="w-5 h-5 text-green-600" />
                  )}
                </div>
                <p className="font-medium text-gray-900">{level.label}</p>
                <p className="text-sm text-gray-500">{level.description}</p>
              </button>
            ))}
          </div>
        </section>

        {/* Danger Zone */}
        <section className="bg-white rounded-xl border border-red-200 p-6">
          <h2 className="text-lg font-semibold text-red-600 mb-4">Danger Zone</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Delete Account</p>
              <p className="text-sm text-gray-500">
                Permanently delete your account and all data
              </p>
            </div>
            <button className="px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors">
              Delete Account
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
