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
    <div className="min-h-screen bg-gradient-to-br from-rose-50 to-teal-50 p-4">
      <div className="max-w-2xl mx-auto pt-12">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm text-gray-500">Step {step + 1} of {questions.length}</span>
              <div className="flex gap-1">
                {questions.map((_, i) => (
                  <div key={i} className={`h-2 w-12 rounded ${i <= step ? 'bg-rose-500' : 'bg-gray-200'}`} />
                ))}
              </div>
            </div>
            <h2 className="text-3xl font-bold text-gray-800 mb-2">{currentQ.title}</h2>
            <p className="text-gray-600">{currentQ.subtitle}</p>
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
                  className={`p-4 rounded-lg border-2 transition ${
                    isSelected
                      ? 'border-rose-500 bg-rose-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="font-medium text-gray-800">{option}</span>
                </button>
              )
            })}
          </div>

          <button
            onClick={handleNext}
            disabled={loading}
            className="w-full bg-gradient-to-r from-rose-500 to-teal-500 text-white py-3 rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50"
          >
            {loading ? 'Saving...' : (step === questions.length - 1 ? 'Complete Setup' : 'Next')}
          </button>
        </div>
      </div>
    </div>
  )
}