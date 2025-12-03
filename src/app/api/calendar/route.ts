import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // Get the current user's session - this will automatically refresh if needed
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (sessionError || !session) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Get the provider token (Google access token)
    const providerToken = session.provider_token
    const providerRefreshToken = session.provider_refresh_token

    if (!providerToken) {
      return NextResponse.json(
        { success: false, error: 'No Google access token. Please sign in with Google again to grant calendar access.' },
        { status: 401 }
      )
    }

    // Fetch calendar events from Google Calendar API
    const now = new Date().toISOString()
    const oneWeekLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    const calendarResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${now}&timeMax=${oneWeekLater}&singleEvents=true&orderBy=startTime&maxResults=20`,
      {
        headers: {
          Authorization: `Bearer ${providerToken}`,
        },
      }
    )

    if (!calendarResponse.ok) {
      const errorData = await calendarResponse.json()
      console.error('Google Calendar API error:', errorData)

      // If the error is due to invalid/expired token, ask user to sign in again
      if (calendarResponse.status === 401 || errorData.error?.message?.includes('Invalid Credentials')) {
        return NextResponse.json(
          { success: false, error: 'Your Google Calendar access has expired. Please sign in with Google again.' },
          { status: 401 }
        )
      }

      return NextResponse.json(
        { success: false, error: 'Failed to fetch calendar events' },
        { status: calendarResponse.status }
      )
    }

    const calendarData = await calendarResponse.json()

    // Transform the events to a simpler format
    const events = (calendarData.items || []).map((event: any) => ({
      id: event.id,
      title: event.summary || 'Untitled Event',
      description: event.description || '',
      location: event.location || '',
      start: event.start?.dateTime || event.start?.date,
      end: event.end?.dateTime || event.end?.date,
      isAllDay: !event.start?.dateTime,
    }))

    return NextResponse.json({
      success: true,
      events,
    })
  } catch (error) {
    console.error('Calendar API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch calendar' },
      { status: 500 }
    )
  }
}