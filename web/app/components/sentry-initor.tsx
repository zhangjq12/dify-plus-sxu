'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/react'
import { setIsIframe } from '@/utils/globalIsIframe'
import { login } from '@/service/common'

const isDevelopment = process.env.NODE_ENV === 'development'

const SentryInit = ({
  children,
}: { children: React.ReactNode }) => {
  const handleIframeLogin = (e: any) => {
    const data = e.data
    const email = data.email
    const password = data.password
    const loginData: Record<string, any> = {
      email,
      password,
      remember_me: true,
    }

    // console.log(data)
    setIsIframe(true)
    // localStorage.setItem('loginData', JSON.stringify(loginData))
    const loginProcess = async () => {
      const data = loginData
      data.language = 'zh-Hans'
      const res = await login({
        url: '/signuplogin',
        body: data,
      })
      if (res.result === 'success') {
        localStorage.setItem('console_token', res.data.access_token)
        localStorage.setItem('refresh_token', res.data.refresh_token)
        if (localStorage.getItem('redirect_url')) {
          const redirectUrl = localStorage.getItem('redirect_url')
          localStorage.removeItem('redirect_url')
          window.location.replace(redirectUrl as string)
          return
        }
        window.location.replace('/apps')
      }
    }
    loginProcess()
  }

  useEffect(() => {
    window.onmessage = handleIframeLogin
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
