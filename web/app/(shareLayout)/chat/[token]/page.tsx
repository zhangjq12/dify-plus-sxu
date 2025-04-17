'use client'
import React from 'react'
import ChatWithHistoryWrap from '@/app/components/base/chat/chat-with-history'
import { setIsIframe } from '@/utils/globalIsIframe'

const Chat = () => {
  const handleIframeLogin = (e: any) => {
    const data = e.data
    const email = data.email
    const password = data.password
    const loginData: Record<string, any> = {
      email,
      password,
      language: 'zh-CN',
      remember_me: true,
    }

    setIsIframe(true)
    localStorage.setItem('loginData', JSON.stringify(loginData))
  }

  window.onmessage = handleIframeLogin

  return (
    <ChatWithHistoryWrap />
  )
}

export default React.memo(Chat)
