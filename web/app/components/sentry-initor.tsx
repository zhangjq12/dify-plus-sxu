'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/react'
import { setIsIframe } from '@/utils/globalIsIframe'

const isDevelopment = process.env.NODE_ENV === 'development'

const SentryInit = ({
  children,
}: { children: React.ReactNode }) => {
  const handleIframeLogin = async (e: any) => {
    const data = e.data
    const email = data.email
    const password = data.password
    const loginData: Record<string, any> = {
      email,
      password,
      remember_me: true,
    }

    setIsIframe(true)
    localStorage.setItem('loginData', JSON.stringify(loginData))
  }

  useEffect(() => {
    window.onmessage = handleIframeLogin

    const SENTRY_DSN = document?.body?.getAttribute('data-public-sentry-dsn')
    if (!isDevelopment && SENTRY_DSN) {
      Sentry.init({
        dsn: SENTRY_DSN,
        integrations: [
          Sentry.browserTracingIntegration(),
          Sentry.replayIntegration(),
        ],
        tracesSampleRate: 0.1,
        replaysSessionSampleRate: 0.1,
        replaysOnErrorSampleRate: 1.0,
      })
    }
  }, [])
  return children
}

export default SentryInit
