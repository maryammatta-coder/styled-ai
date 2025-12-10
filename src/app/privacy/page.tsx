'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

export default function PrivacyPolicyPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <div className="bg-beige border-b border-taupe/20 sticky top-0 z-10 backdrop-blur-sm bg-beige/90">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-dark-taupe hover:text-warm-grey transition-colors mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm tracking-wide">Back</span>
          </button>
          <h1 className="text-3xl font-light tracking-[0.2em] text-dark-taupe">
            PRIVACY POLICY
          </h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-beige rounded-3xl shadow-sm border border-taupe/10 p-8 md:p-12">
          <p className="text-warm-grey text-sm mb-8">
            Last Updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>

          <div className="space-y-8 text-dark-taupe">
            {/* Introduction */}
            <section>
              <h2 className="text-2xl font-light tracking-wide mb-4">Introduction</h2>
              <p className="text-warm-grey leading-relaxed">
                Welcome to Styled.AI. We respect your privacy and are committed to protecting your personal data.
                This privacy policy explains how we collect, use, and safeguard your information when you use our
                AI-powered personal styling service.
              </p>
            </section>

            {/* Information We Collect */}
            <section>
              <h2 className="text-2xl font-light tracking-wide mb-4">Information We Collect</h2>
              <div className="space-y-4 text-warm-grey leading-relaxed">
                <div>
                  <h3 className="font-medium text-dark-taupe mb-2">Account Information</h3>
                  <p>When you create an account, we collect your email address and authentication credentials via Google OAuth.</p>
                </div>

                <div>
                  <h3 className="font-medium text-dark-taupe mb-2">Closet Photos</h3>
                  <p>
                    You can upload photos of your clothing items to build your digital closet. These photos are stored
                    securely and are only used to generate outfit suggestions for you. We use AI to analyze the items
                    (color, category, style) but your photos are never shared with third parties or used for any other purpose.
                  </p>
                </div>

                <div>
                  <h3 className="font-medium text-dark-taupe mb-2">Location Data</h3>
                  <p>
                    We request your location to fetch current weather conditions and provide weather-appropriate outfit
                    suggestions. We do NOT store or track your precise location. Location data is only used in real-time
                    to fetch weather information and is not retained in our database.
                  </p>
                </div>

                <div>
                  <h3 className="font-medium text-dark-taupe mb-2">Style Preferences</h3>
                  <p>
                    We collect your style preferences (style vibe, favorite colors, colors to avoid, budget level) to
                    personalize outfit recommendations. This information is stored in your profile.
                  </p>
                </div>

                <div>
                  <h3 className="font-medium text-dark-taupe mb-2">Voice Input (Optional)</h3>
                  <p>
                    If you choose to use voice input, your voice is processed locally on your device using your browser's
                    Web Speech API. We do not record, store, or transmit your voice audio. Only the transcribed text is
                    sent to our servers to generate outfit suggestions.
                  </p>
                </div>

                <div>
                  <h3 className="font-medium text-dark-taupe mb-2">Calendar Data (Optional)</h3>
                  <p>
                    If you connect your Google Calendar, we access your upcoming events to suggest outfits for specific
                    occasions. We only read event titles and dates - we do not store your calendar data permanently.
                  </p>
                </div>
              </div>
            </section>

            {/* How We Use Your Information */}
            <section>
              <h2 className="text-2xl font-light tracking-wide mb-4">How We Use Your Information</h2>
              <ul className="space-y-2 text-warm-grey leading-relaxed list-disc list-inside">
                <li>Generate personalized outfit recommendations using AI</li>
                <li>Provide weather-appropriate styling suggestions</li>
                <li>Remember your style preferences and closet items</li>
                <li>Improve our AI models and service quality</li>
                <li>Send important service updates (we do not send marketing emails)</li>
              </ul>
            </section>

            {/* Data Storage and Security */}
            <section>
              <h2 className="text-2xl font-light tracking-wide mb-4">Data Storage and Security</h2>
              <div className="space-y-4 text-warm-grey leading-relaxed">
                <p>
                  Your data is stored securely using Supabase, a secure cloud database platform. Your photos are stored
                  in encrypted cloud storage with access restricted to your account only.
                </p>
                <p>
                  We implement industry-standard security measures including:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Encrypted data transmission (HTTPS)</li>
                  <li>Secure authentication via Google OAuth</li>
                  <li>Access controls and user isolation</li>
                  <li>Regular security audits</li>
                </ul>
              </div>
            </section>

            {/* Third-Party Services */}
            <section>
              <h2 className="text-2xl font-light tracking-wide mb-4">Third-Party Services</h2>
              <div className="space-y-4 text-warm-grey leading-relaxed">
                <p>We use the following third-party services to provide our features:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li><strong>Anthropic Claude API:</strong> For AI-powered outfit generation (your data is processed but not stored by Anthropic)</li>
                  <li><strong>Google OAuth:</strong> For secure authentication</li>
                  <li><strong>Google Calendar API:</strong> For calendar integration (optional)</li>
                  <li><strong>Weather API:</strong> For real-time weather data</li>
                  <li><strong>Supabase:</strong> For secure data storage and authentication</li>
                </ul>
                <p>
                  These services have their own privacy policies. We only share the minimum data necessary for
                  these services to function.
                </p>
              </div>
            </section>

            {/* Your Rights */}
            <section>
              <h2 className="text-2xl font-light tracking-wide mb-4">Your Rights</h2>
              <ul className="space-y-2 text-warm-grey leading-relaxed list-disc list-inside">
                <li><strong>Access:</strong> You can view all your data in your profile and closet</li>
                <li><strong>Edit:</strong> You can update your preferences and closet items at any time</li>
                <li><strong>Delete:</strong> You can delete individual closet items or request full account deletion</li>
                <li><strong>Export:</strong> Contact us to request a copy of your data</li>
                <li><strong>Opt-out:</strong> You can disable location access, voice input, or calendar integration at any time</li>
              </ul>
            </section>

            {/* Data Retention */}
            <section>
              <h2 className="text-2xl font-light tracking-wide mb-4">Data Retention</h2>
              <p className="text-warm-grey leading-relaxed">
                We retain your data as long as your account is active. If you delete your account, we will permanently
                delete all your data within 30 days. Archived closet items are retained until you permanently delete them.
              </p>
            </section>

            {/* Children's Privacy */}
            <section>
              <h2 className="text-2xl font-light tracking-wide mb-4">Children's Privacy</h2>
              <p className="text-warm-grey leading-relaxed">
                Styled.AI is not intended for users under 13 years of age. We do not knowingly collect personal
                information from children under 13.
              </p>
            </section>

            {/* Changes to This Policy */}
            <section>
              <h2 className="text-2xl font-light tracking-wide mb-4">Changes to This Policy</h2>
              <p className="text-warm-grey leading-relaxed">
                We may update this privacy policy from time to time. We will notify you of any material changes by
                updating the "Last Updated" date at the top of this page. We encourage you to review this policy periodically.
              </p>
            </section>

            {/* Contact Us */}
            <section>
              <h2 className="text-2xl font-light tracking-wide mb-4">Contact Us</h2>
              <p className="text-warm-grey leading-relaxed">
                If you have questions about this privacy policy or your data, please contact us at:{' '}
                <a href="mailto:privacy@styled.ai" className="text-dark-taupe hover:text-blush transition-colors underline">
                  privacy@styled.ai
                </a>
              </p>
            </section>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-taupe/20 py-8 mt-12">
        <div className="max-w-4xl mx-auto px-6 text-center text-warm-grey text-sm">
          <p>© 2024 Styled.AI • Your AI Personal Stylist</p>
        </div>
      </footer>
    </div>
  )
}
