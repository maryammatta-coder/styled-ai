'use client'

import { useEffect } from 'react'
import { StatusBar, Style } from '@capacitor/status-bar'
import { SplashScreen } from '@capacitor/splash-screen'
import { PushNotifications } from '@capacitor/push-notifications'
import { Capacitor } from '@capacitor/core'

export default function CapacitorProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Only run on native platforms
    if (!Capacitor.isNativePlatform()) {
      return
    }

    const initializeNativeFeatures = async () => {
      try {
        // Configure Status Bar
        await StatusBar.setStyle({ style: Style.Light })
        await StatusBar.setBackgroundColor({ color: '#F5F1E8' }) // cream color from your app

        // Hide splash screen after app is ready
        await SplashScreen.hide()

        // Request push notification permissions
        const permStatus = await PushNotifications.checkPermissions()

        if (permStatus.receive === 'prompt') {
          const result = await PushNotifications.requestPermissions()

          if (result.receive === 'granted') {
            await PushNotifications.register()
          }
        } else if (permStatus.receive === 'granted') {
          await PushNotifications.register()
        }

        // Listen for push notification events
        PushNotifications.addListener('registration', (token) => {
          console.log('Push registration success, token: ' + token.value)
          // You can send this token to your backend
        })

        PushNotifications.addListener('registrationError', (error) => {
          console.error('Error on registration: ' + JSON.stringify(error))
        })

        PushNotifications.addListener('pushNotificationReceived', (notification) => {
          console.log('Push notification received: ', notification)
          // Handle foreground notifications
        })

        PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
          console.log('Push notification action performed', notification)
          // Handle notification tap
        })

      } catch (error) {
        console.error('Error initializing native features:', error)
      }
    }

    initializeNativeFeatures()
  }, [])

  return <>{children}</>
}
