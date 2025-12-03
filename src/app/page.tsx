'use client'

import { useRouter } from 'next/navigation'
import { Sparkles, Calendar, Camera, Shirt } from 'lucide-react'

export default function Home() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream via-beige to-blush">
      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-6 py-16 md:py-24">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-6xl md:text-8xl font-light tracking-[0.3em] text-dark-taupe mb-6">
            STYLED.AI
          </h1>
          <p className="text-xl md:text-2xl text-warm-grey font-light tracking-wide max-w-2xl mx-auto">
            Your AI-powered personal stylist
          </p>
        </div>

        {/* CTA Button */}
        <div className="text-center mb-24">
          <button
            onClick={() => router.push('/login')}
            className="bg-blush text-dark-taupe px-12 py-5 rounded-full text-lg font-medium hover:bg-blush/80 transition-all shadow-lg tracking-wide inline-flex items-center gap-3"
          >
            <Sparkles className="w-6 h-6" />
            GET STARTED
          </button>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-24">
          {/* Feature 1 */}
          <div className="bg-beige/60 backdrop-blur-sm rounded-3xl p-8 border border-taupe/10 hover:shadow-xl transition-all">
            <div className="w-14 h-14 bg-blush rounded-2xl flex items-center justify-center mb-6">
              <Camera className="w-7 h-7 text-dark-taupe" />
            </div>
            <h3 className="text-xl font-medium text-dark-taupe mb-3 tracking-wide">
              DIGITAL CLOSET
            </h3>
            <p className="text-warm-grey leading-relaxed">
              Upload your wardrobe and let AI organize, categorize, and style your clothes
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-beige/60 backdrop-blur-sm rounded-3xl p-8 border border-taupe/10 hover:shadow-xl transition-all">
            <div className="w-14 h-14 bg-blush rounded-2xl flex items-center justify-center mb-6">
              <Shirt className="w-7 h-7 text-dark-taupe" />
            </div>
            <h3 className="text-xl font-medium text-dark-taupe mb-3 tracking-wide">
              SMART OUTFITS
            </h3>
            <p className="text-warm-grey leading-relaxed">
              Get personalized outfit suggestions based on weather, occasion, and your style
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-beige/60 backdrop-blur-sm rounded-3xl p-8 border border-taupe/10 hover:shadow-xl transition-all">
            <div className="w-14 h-14 bg-blush rounded-2xl flex items-center justify-center mb-6">
              <Calendar className="w-7 h-7 text-dark-taupe" />
            </div>
            <h3 className="text-xl font-medium text-dark-taupe mb-3 tracking-wide">
              CALENDAR SYNC
            </h3>
            <p className="text-warm-grey leading-relaxed">
              Connect your Google Calendar for outfits styled for your events
            </p>
          </div>
        </div>

        {/* How It Works */}
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-light tracking-wide text-dark-taupe mb-12">
            HOW IT WORKS
          </h2>
          <div className="space-y-8">
            <div className="flex items-start gap-6">
              <div className="flex-shrink-0 w-12 h-12 bg-blush rounded-full flex items-center justify-center text-dark-taupe font-medium text-lg">
                1
              </div>
              <div className="text-left">
                <h4 className="text-lg font-medium text-dark-taupe mb-2">Upload Your Closet</h4>
                <p className="text-warm-grey">Take photos of your clothes and our AI will automatically categorize them</p>
              </div>
            </div>

            <div className="flex items-start gap-6">
              <div className="flex-shrink-0 w-12 h-12 bg-blush rounded-full flex items-center justify-center text-dark-taupe font-medium text-lg">
                2
              </div>
              <div className="text-left">
                <h4 className="text-lg font-medium text-dark-taupe mb-2">Set Your Style Preferences</h4>
                <p className="text-warm-grey">Tell us your style vibe, colors you love, and occasions you dress for</p>
              </div>
            </div>

            <div className="flex items-start gap-6">
              <div className="flex-shrink-0 w-12 h-12 bg-blush rounded-full flex items-center justify-center text-dark-taupe font-medium text-lg">
                3
              </div>
              <div className="text-left">
                <h4 className="text-lg font-medium text-dark-taupe mb-2">Get Daily Outfit Suggestions</h4>
                <p className="text-warm-grey">Receive AI-styled outfits perfect for the weather and your schedule</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-24">
          <button
            onClick={() => router.push('/login')}
            className="bg-dark-taupe text-cream px-12 py-5 rounded-full text-lg font-medium hover:bg-dark-taupe/90 transition-all shadow-lg tracking-wide"
          >
            START STYLING NOW
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-taupe/20 py-8">
        <div className="max-w-6xl mx-auto px-6 text-center text-warm-grey text-sm">
          <p>© 2024 styled.ai • Your AI Personal Stylist</p>
        </div>
      </footer>
    </div>
  )
}
