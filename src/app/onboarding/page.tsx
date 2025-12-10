'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { STYLE_VIBES, COLOR_OPTIONS } from '@/lib/utils/constants'
import { Camera, MapPin, Mic, Sparkles, Check } from 'lucide-react'

export default function OnboardingPage() {
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const [answers, setAnswers] = useState({
    style_vibe: [] as string[],
    color_palette: [] as string[],
    avoid_colors: [] as string[],
    budget_level: ''
  })

  // Permission screens (0-4) + Style preference screens (5-8)
  const totalSteps = 9
  const isPermissionScreen = step < 5
  const styleQuestionIndex = step - 5

  const styleQuestions = [
    {
      title: "What's your style vibe?",
      subtitle: "Select all that apply",
      type: "multi",
      key: "style_vibe",
      options: STYLE_VIBES
    },
    {
      title: "What colors do you love?",
      subtitle: "Pick your favorites",
      type: "multi",
      key: "color_palette",
      options: COLOR_OPTIONS
    },
    {
      title: "Any colors to avoid?",
      subtitle: "Optional",
      type: "multi",
      key: "avoid_colors",
      options: COLOR_OPTIONS
    },
    {
      title: "What's your budget comfort level?",
      subtitle: "For new pieces",
      type: "single",
      key: "budget_level",
      options: ['$ (Budget-friendly)', '$$ (Mid-range)', '$$$ (Designer)', '$$$$ (Luxury)']
    }
  ]

  const currentQ = !isPermissionScreen ? styleQuestions[styleQuestionIndex] : null

  const toggleOption = (option: string) => {
    if (!currentQ) return
    setAnswers(prev => {
      if (currentQ.type === 'single') {
        return { ...prev, [currentQ.key]: option }
      } else {
        const key = currentQ.key as 'style_vibe' | 'color_palette' | 'avoid_colors'
        const current = prev[key] || []
        if (current.includes(option)) {
          return { ...prev, [key]: current.filter(o => o !== option) }
        } else {
          return { ...prev, [key]: [...current, option] }
        }
      }
    })
  }

  const completeOnboarding = async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        console.error('No session found')
        router.push('/login')
        return
      }

      const { error } = await supabase
        .from('users')
        .update({
          style_vibe: answers.style_vibe,
          color_palette: answers.color_palette,
          avoid_colors: answers.avoid_colors,
          budget_level: answers.budget_level.split(' ')[0]
        })
        .eq('id', session.user.id)

      if (error) throw error

      // Set flag in localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('onboarding_completed', 'true')
      }

      router.push('/dashboard')
    } catch (err) {
      console.error(err)
      alert('Error saving preferences. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const nextStep = () => {
    if (step < totalSteps - 1) {
      setStep(step + 1)
    } else {
      completeOnboarding()
    }
  }

  const skipStep = () => {
    nextStep()
  }

  // Request camera/photo permissions
  const requestCameraPermission = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        await navigator.mediaDevices.getUserMedia({ video: true })
      }
    } catch (error) {
      console.log('Camera permission denied or not available')
    }
    nextStep()
  }

  // Request location permissions
  const requestLocationPermission = async () => {
    try {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          () => {
            console.log('Location permission granted')
            nextStep()
          },
          () => {
            console.log('Location permission denied')
            nextStep()
          }
        )
      } else {
        nextStep()
      }
    } catch (error) {
      console.log('Location permission error')
      nextStep()
    }
  }

  // Request microphone permissions
  const requestMicPermission = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        await navigator.mediaDevices.getUserMedia({ audio: true })
      }
    } catch (error) {
      console.log('Mic permission denied or not available')
    }
    nextStep()
  }

  // PERMISSION SCREENS (0-4)
  if (isPermissionScreen) {
    return (
      <div className="min-h-screen bg-cream flex flex-col">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 pt-8 pb-4">
          {[0, 1, 2, 3, 4].map((num) => (
            <div
              key={num}
              className={`w-2 h-2 rounded-full transition-all ${
                num === step
                  ? 'bg-blush w-6'
                  : num < step
                  ? 'bg-taupe'
                  : 'bg-taupe/30'
              }`}
            />
          ))}
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6 pb-20">
          {/* Step 0: Welcome */}
          {step === 0 && (
            <div className="max-w-md w-full text-center animate-fadeIn">
              <div className="mb-8">
                <Sparkles className="w-20 h-20 text-blush mx-auto mb-6" />
              </div>
              <h1 className="text-4xl font-light tracking-[0.2em] text-dark-taupe mb-4">
                WELCOME TO
              </h1>
              <h2 className="text-5xl font-light tracking-[0.2em] text-dark-taupe mb-8">
                STYLED.AI
              </h2>
              <p className="text-lg text-warm-grey mb-12 leading-relaxed">
                Your AI-powered personal stylist
              </p>
              <button
                onClick={nextStep}
                className="bg-blush text-dark-taupe px-12 py-4 rounded-full font-medium hover:bg-blush/80 transition-all shadow-sm tracking-wide text-lg"
              >
                NEXT
              </button>
            </div>
          )}

          {/* Step 1: Camera/Photos */}
          {step === 1 && (
            <div className="max-w-md w-full text-center animate-fadeIn">
              <div className="mb-8">
                <div className="w-24 h-24 bg-blush rounded-full flex items-center justify-center mx-auto mb-6">
                  <Camera className="w-12 h-12 text-dark-taupe" />
                </div>
              </div>
              <h2 className="text-3xl font-light tracking-wide text-dark-taupe mb-6">
                Add Your Clothes
              </h2>
              <p className="text-warm-grey text-lg leading-relaxed mb-12 max-w-sm mx-auto">
                We need access to your camera and photos so you can upload items to your closet.{' '}
                <span className="font-medium text-dark-taupe">
                  Your photos stay private and are never shared.
                </span>
              </p>
              <button
                onClick={requestCameraPermission}
                className="bg-blush text-dark-taupe px-12 py-4 rounded-full font-medium hover:bg-blush/80 transition-all shadow-sm tracking-wide text-lg"
              >
                CONTINUE
              </button>
            </div>
          )}

          {/* Step 2: Location */}
          {step === 2 && (
            <div className="max-w-md w-full text-center animate-fadeIn">
              <div className="mb-8">
                <div className="w-24 h-24 bg-blush rounded-full flex items-center justify-center mx-auto mb-6">
                  <MapPin className="w-12 h-12 text-dark-taupe" />
                </div>
              </div>
              <h2 className="text-3xl font-light tracking-wide text-dark-taupe mb-6">
                Weather-Ready Outfits
              </h2>
              <p className="text-warm-grey text-lg leading-relaxed mb-12 max-w-sm mx-auto">
                We use your location to check the weather and suggest appropriate outfits.{' '}
                <span className="font-medium text-dark-taupe">
                  We never store or track your precise location.
                </span>
              </p>
              <button
                onClick={requestLocationPermission}
                className="bg-blush text-dark-taupe px-12 py-4 rounded-full font-medium hover:bg-blush/80 transition-all shadow-sm tracking-wide text-lg"
              >
                ENABLE LOCATION
              </button>
            </div>
          )}

          {/* Step 3: Voice (Optional) */}
          {step === 3 && (
            <div className="max-w-md w-full text-center animate-fadeIn">
              <div className="mb-8">
                <div className="w-24 h-24 bg-blush rounded-full flex items-center justify-center mx-auto mb-6">
                  <Mic className="w-12 h-12 text-dark-taupe" />
                </div>
              </div>
              <h2 className="text-3xl font-light tracking-wide text-dark-taupe mb-6">
                Just Say What You Want
              </h2>
              <p className="text-warm-grey text-lg leading-relaxed mb-12 max-w-sm mx-auto">
                Use your voice to describe the outfit you're looking for.{' '}
                <span className="font-medium text-dark-taupe">
                  Voice is processed on your device and never recorded.
                </span>
              </p>
              <div className="flex flex-col gap-4">
                <button
                  onClick={requestMicPermission}
                  className="bg-blush text-dark-taupe px-12 py-4 rounded-full font-medium hover:bg-blush/80 transition-all shadow-sm tracking-wide text-lg"
                >
                  ENABLE MIC
                </button>
                <button
                  onClick={skipStep}
                  className="text-warm-grey hover:text-dark-taupe transition-colors font-medium tracking-wide"
                >
                  SKIP
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Ready (transition to style questions) */}
          {step === 4 && (
            <div className="max-w-md w-full text-center animate-fadeIn">
              <div className="mb-8">
                <div className="w-24 h-24 bg-blush rounded-full flex items-center justify-center mx-auto mb-6">
                  <Check className="w-12 h-12 text-dark-taupe" />
                </div>
              </div>
              <h2 className="text-4xl font-light tracking-wide text-dark-taupe mb-6">
                Almost There!
              </h2>
              <p className="text-warm-grey text-lg leading-relaxed mb-12 max-w-sm mx-auto">
                Now let's personalize your style
              </p>
              <button
                onClick={nextStep}
                className="bg-blush text-dark-taupe px-12 py-4 rounded-full font-medium hover:bg-blush/80 transition-all shadow-sm tracking-wide text-lg"
              >
                CONTINUE
              </button>
            </div>
          )}
        </div>

        {/* Skip button at bottom (except on welcome and transition screen) */}
        {step > 0 && step < 4 && (
          <div className="pb-8 text-center">
            <button
              onClick={skipStep}
              className="text-warm-grey hover:text-dark-taupe transition-colors text-sm tracking-wide"
            >
              Skip for now
            </button>
          </div>
        )}
      </div>
    )
  }

  // STYLE PREFERENCE SCREENS (5-8)
  return (
    <div className="min-h-screen bg-cream p-4">
      <div className="max-w-2xl mx-auto pt-12">
        <div className="bg-beige rounded-3xl shadow-sm border border-taupe/10 p-8">
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm text-warm-grey tracking-wide">
                Step {styleQuestionIndex + 1} of {styleQuestions.length}
              </span>
              <div className="flex gap-1">
                {styleQuestions.map((_, i) => (
                  <div
                    key={i}
                    className={`h-2 w-12 rounded-full ${
                      i <= styleQuestionIndex ? 'bg-blush' : 'bg-taupe/30'
                    }`}
                  />
                ))}
              </div>
            </div>
            <h2 className="text-3xl font-light text-dark-taupe mb-2 tracking-wide">
              {currentQ?.title}
            </h2>
            <p className="text-warm-grey text-sm">{currentQ?.subtitle}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-8">
            {currentQ?.options.map((option) => {
              const isSelected =
                currentQ.type === 'single'
                  ? answers[currentQ.key as keyof typeof answers] === option
                  : (answers[currentQ.key as 'style_vibe' | 'color_palette' | 'avoid_colors'] || []).includes(
                      option
                    )

              return (
                <button
                  key={option}
                  onClick={() => toggleOption(option)}
                  className={`p-4 rounded-2xl border transition ${
                    isSelected
                      ? 'border-blush bg-blush/30 shadow-sm'
                      : 'border-taupe/30 hover:border-taupe/50 bg-cream'
                  }`}
                >
                  <span className="font-medium text-dark-taupe text-sm">{option}</span>
                </button>
              )
            })}
          </div>

          <button
            onClick={nextStep}
            disabled={loading}
            className="w-full bg-blush text-dark-taupe py-3 rounded-full font-medium hover:bg-blush/80 transition disabled:opacity-50 shadow-sm tracking-wide"
          >
            {loading ? 'Saving...' : step === totalSteps - 1 ? 'Complete Setup' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )
}
