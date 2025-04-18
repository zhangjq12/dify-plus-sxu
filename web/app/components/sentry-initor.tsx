'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/react'
import { setIsIframe } from '@/utils/globalIsIframe'
import { login } from '@/service/common'

const isDevelopment = process.env.NODE_ENV === 'development'

const SentryInit = ({
  children,
}: { children: React.ReactNode }) => {
  useEffect(() => {
    const handleIframeLogin = async (e: any) => {
      if (e.data.env === 'developer') {
        const data = e.data
        const email = data.email
        const password = data.password
        const loginData: Record<string, any> = {
          email,
          password,
          language: 'zh-Hans',
          remember_me: true,
        }

        setIsIframe(true, false)

        const process = async () => {
          const res = await login({
            url: '/signuplogin',
            body: loginData,
          })
          if (res.result === 'success') {
            localStorage.setItem('console_token', res.data.access_token)
            localStorage.setItem('refresh_token', res.data.refresh_token)
          }
        }

        await process()
        parent.window.postMessage({ finish: true }, '*')
      }
    }

    window.addEventListener('message', handleIframeLogin)

    return () => {
      window.removeEventListener('message', handleIframeLogin)
    }
  }, [])

  useEffect(() => {
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
