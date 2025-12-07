'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true)
    setError('')

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          scopes: 'openid email profile https://www.googleapis.com/auth/calendar.readonly',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })

      if (error) throw error
    } catch (err: any) {
      setError(err.message)
      setGoogleLoading(false)
    }
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        })
        if (error) throw error
        if (data.user) {
          // Create user profile
          const { error: profileError } = await supabase
            .from('users')
            .insert([
              {
                id: data.user.id,
                email: data.user.email,
                style_vibe: [],
                color_palette: [],
                avoid_colors: [],
                budget_level: '$$',
                use_auto_location: true,
                use_calendar_styling: true,
                plan_ahead_days: 2,
              },
            ])
          if (profileError) throw profileError
          router.push('/onboarding')
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        router.push('/dashboard')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4">
      <div className="bg-beige rounded-3xl shadow-sm border border-taupe/10 p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-light tracking-[0.2em] text-dark-taupe mb-2">
            STYLED.AI
          </h1>
          <p className="text-warm-grey text-sm tracking-wide">Your AI-powered personal stylist</p>
        </div>

        {/* Google Sign-In Button */}
        <button
          onClick={handleGoogleSignIn}
          disabled={googleLoading}
          className="w-full flex items-center justify-center gap-3 bg-white border border-taupe/30 text-dark-taupe py-3 px-4 rounded-full font-medium hover:bg-cream transition disabled:opacity-50 mb-6 shadow-sm"
        >
          {googleLoading ? (
            <Loader2 className="w-5 h-5 animate-spin text-warm-grey" />
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          )}
          <span className="tracking-wide text-sm">{googleLoading ? 'Signing in...' : 'Continue with Google'}</span>
        </button>

        {/* Divider */}
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-taupe/20"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-3 bg-beige text-warm-grey">or continue with email</span>
          </div>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 border border-taupe/30 bg-cream rounded-full focus:ring-2 focus:ring-blush focus:border-transparent text-dark-taupe placeholder-warm-grey transition"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-4 py-3 border border-taupe/30 bg-cream rounded-full focus:ring-2 focus:ring-blush focus:border-transparent text-dark-taupe placeholder-warm-grey transition"
          />

          {error && (
            <div className="bg-blush/30 text-dark-taupe p-3 rounded-2xl text-sm border border-taupe/20">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blush text-dark-taupe py-3 rounded-full font-medium hover:bg-blush/80 transition disabled:opacity-50 shadow-sm tracking-wide text-sm"
          >
            {loading ? 'Loading...' : (isSignUp ? 'Sign Up' : 'Log In')}
          </button>

          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="w-full text-warm-grey hover:text-dark-taupe transition text-sm"
          >
            {isSignUp ? 'Already have an account? Log in' : "Don't have an account? Sign up"}
          </button>
        </form>
      </div>
    </div>
  )
}