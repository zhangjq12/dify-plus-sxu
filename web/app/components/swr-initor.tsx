'use client'

import { SWRConfig } from 'swr'
import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { fetchSetupStatus, login } from '@/service/common'
import { useContext } from 'use-context-selector'
import I18NContext from '@/context/i18n'
import { setIsIframe } from '@/utils/globalIsIframe'

type SwrInitorProps = {
  children: ReactNode
}
const SwrInitor = ({
  children,
}: SwrInitorProps) => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const consoleToken = decodeURIComponent(searchParams.get('access_token') || '')
  const refreshToken = decodeURIComponent(searchParams.get('refresh_token') || '')
  // Extend Start DingTalk login compatible
  const console_token = decodeURIComponent(searchParams.get('console_token') || '')
  if (localStorage) {
    consoleToken && localStorage?.setItem('console_token', consoleToken)
    refreshToken && localStorage?.setItem('refresh_token', refreshToken)
    console_token && localStorage?.setItem('console_token', console_token)
  }
  // Extend Stop DingTalk login compatible
  const consoleTokenFromLocalStorage = localStorage?.getItem('console_token')
  const refreshTokenFromLocalStorage = localStorage?.getItem('refresh_token')
  const pathname = usePathname()
  const [init, setInit] = useState(false)
  const { locale } = useContext(I18NContext)

  const isSetupFinished = useCallback(async () => {
    try {
      if (localStorage.getItem('setup_status') === 'finished')
        return true
      const setUpStatus = await fetchSetupStatus()
      if (setUpStatus.step !== 'finished') {
        localStorage.removeItem('setup_status')
        return false
      }
      localStorage.setItem('setup_status', 'finished')
      return true
    }
    catch (error) {
      console.error(error)
      return false
    }
  }, [])

  useEffect(() => {
    const handleIframeLogin = async (e: any) => {
      if (e.data.env === 'developer') {
        const data = e.data
        const email = data.email
        const password = data.password
        const loginData: Record<string, any> = {
          email,
          password,
          language: locale,
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
    (async () => {
      try {
        const isFinished = await isSetupFinished()
        if (!isFinished) {
          router.replace('/install')
          return
        }
        if (!((consoleToken && refreshToken) || (consoleTokenFromLocalStorage && refreshTokenFromLocalStorage))) {
          router.replace('/signin')
          return
        }
        if (searchParams.has('access_token') || searchParams.has('refresh_token')) {
          consoleToken && localStorage.setItem('console_token', consoleToken)
          refreshToken && localStorage.setItem('refresh_token', refreshToken)
          router.replace(pathname)
        }

        setInit(true)
      }
      catch (error) {
        router.replace('/signin')
      }
    })()
  }, [isSetupFinished, router, pathname, searchParams, consoleToken, refreshToken, consoleTokenFromLocalStorage, refreshTokenFromLocalStorage])

  return init
    ? (
      <SWRConfig value={{
        shouldRetryOnError: false,
        revalidateOnFocus: false,
      }}>
        {children}
      </SWRConfig>
    )
    : null
}

export default SwrInitor
