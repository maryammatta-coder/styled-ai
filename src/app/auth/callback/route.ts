import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') || '/dashboard'

  if (code) {
    const supabase = await createClient()

    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)

      if (error) {
        console.error('Auth exchange error:', error)
        return NextResponse.redirect(new URL('/login?error=auth_exchange_failed', requestUrl.origin))
      }

      if (!data.session || !data.user) {
        console.error('No session or user after exchange')
        return NextResponse.redirect(new URL('/login?error=no_session', requestUrl.origin))
      }

      // Session is now set - check if user profile exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('id', data.user.id)
        .single()

      // If no profile exists, create one and redirect to onboarding
      if (!existingUser) {
        const { error: insertError } = await supabase.from('users').insert([
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

        if (insertError) {
          console.error('Error creating user profile:', insertError)
          return NextResponse.redirect(new URL('/login?error=profile_creation_failed', requestUrl.origin))
        }

        return NextResponse.redirect(new URL('/onboarding', requestUrl.origin))
      }

      // Existing user, go to dashboard or next URL
      return NextResponse.redirect(new URL(next, requestUrl.origin))
    } catch (err) {
      console.error('Unexpected error in auth callback:', err)
      return NextResponse.redirect(new URL('/login?error=unexpected_error', requestUrl.origin))
    }
  }

  // No code provided
  return NextResponse.redirect(new URL('/login?error=no_code', requestUrl.origin))
}