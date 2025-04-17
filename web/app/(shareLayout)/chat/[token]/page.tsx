'use client'
import React, { useEffect } from 'react'
import ChatWithHistoryWrap from '@/app/components/base/chat/chat-with-history'
import { setIsIframe } from '@/utils/globalIsIframe'
import { login } from '@/service/common'

const Chat = () => {
  useEffect(() => {
    const handleIframeLogin = (e: any) => {
      const data = e.data
      const email = data.email
      const password = data.password
      const loginData: Record<string, any> = {
        email,
        password,
        language: 'zh-Hans',
        remember_me: true,
      }

      setIsIframe(true, true)
      // localStorage.setItem('loginData', JSON.stringify(loginData))

      const process = async () => {
        const res = await login({
          url: '/signuplogin',
          body: loginData,
        })
        if (res.result === 'success') {
          localStorage.setItem('console_token', res.data.access_token)
          localStorage.setItem('refresh_token', res.data.refresh_token)
          // router.replace('/apps')

          const redirectUrl = localStorage.getItem('redirect_url')
          if (redirectUrl) {
            localStorage.removeItem('redirect_url')
            window.location.replace(redirectUrl)
          }
          else {
            window.location.replace('/')
          }
        }
      }

      process()
    }

    window.addEventListener('message', handleIframeLogin)

    return () => {
      window.removeEventListener('message', handleIframeLogin)
    }
  }, [])

  return (
    <ChatWithHistoryWrap />
  )
}

export default React.memo(Chat)
