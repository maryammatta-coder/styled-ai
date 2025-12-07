'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { STYLE_VIBES, COLOR_OPTIONS } from '@/lib/utils/constants'

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

  const questions = [
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

  const currentQ = questions[step]

  const toggleOption = (option: string) => {
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

  const handleNext = async () => {
  if (step < questions.length - 1) {
    setStep(step + 1)
  } else {
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
      router.push('/dashboard')
    } catch (err) {
      console.error(err)
      alert('Error saving preferences. Please try again.')
    } finally {
      setLoading(false)
    }
  }
}

  return (
    <div className="min-h-screen bg-cream p-4">
      <div className="max-w-2xl mx-auto pt-12">
        <div className="bg-beige rounded-3xl shadow-sm border border-taupe/10 p-8">
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm text-warm-grey tracking-wide">Step {step + 1} of {questions.length}</span>
              <div className="flex gap-1">
                {questions.map((_, i) => (
                  <div key={i} className={`h-2 w-12 rounded-full ${i <= step ? 'bg-blush' : 'bg-taupe/30'}`} />
                ))}
              </div>
            </div>
            <h2 className="text-3xl font-light text-dark-taupe mb-2 tracking-wide">{currentQ.title}</h2>
            <p className="text-warm-grey text-sm">{currentQ.subtitle}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-8">
            {currentQ.options.map((option) => {
              const isSelected = currentQ.type === 'single'
                ? answers[currentQ.key as keyof typeof answers] === option
                : (answers[currentQ.key as 'style_vibe' | 'color_palette' | 'avoid_colors'] || []).includes(option)

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
            onClick={handleNext}
            disabled={loading}
            className="w-full bg-blush text-dark-taupe py-3 rounded-full font-medium hover:bg-blush/80 transition disabled:opacity-50 shadow-sm tracking-wide"
          >
            {loading ? 'Saving...' : (step === questions.length - 1 ? 'Complete Setup' : 'Next')}
          </button>
        </div>
      </div>
    </div>
  )
}