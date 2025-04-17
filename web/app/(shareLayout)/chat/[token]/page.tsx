'use client'
import React, { useEffect } from 'react'
import ChatWithHistoryWrap from '@/app/components/base/chat/chat-with-history'
import { setIsIframe } from '@/utils/globalIsIframe'
import { login } from '@/service/common'

const Chat = () => {
  const handleIframeLogin = async (e: any) => {
    const data = e.data
    const email = data.email
    const password = data.password
    const loginData: Record<string, any> = {
      email,
      password,
      language: 'zh-Hans',
      remember_me: true,
    }

    setIsIframe(true)
    const loginProcess = async () => {
      const res = await login({
        url: '/signuplogin',
        body: loginData,
      })
      if (res.result === 'success') {
        localStorage.setItem('console_token', res.data.access_token)
        localStorage.setItem('refresh_token', res.data.refresh_token)
      }
    }
    await loginProcess()
  }

  useEffect(() => {
    if (typeof window !== 'undefined')
      window.onmessage = handleIframeLogin
  }, [])

  return (
    <ChatWithHistoryWrap />
  )
}

export default React.memo(Chat)
