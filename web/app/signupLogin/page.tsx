'use client'

import { login as loginPost } from '@/service/common'
import { setIsIframe } from '@/utils/globalIsIframe'
import { useEffect, useState } from 'react'

const SignUpLogin = () => {
  const [login, setLogin] = useState(false)

  useEffect(() => {
    setIsIframe(true)
    const handleLoginData = (e: any) => {
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

        localStorage.setItem('loginData', JSON.stringify(loginData))
        setLogin(true)
      }
    }

    if (typeof window !== 'undefined')
      window.addEventListener('message', handleLoginData, false)

    return () => {
      if (typeof window !== 'undefined')
        window.removeEventListener('message', handleLoginData, false)
    }
  }, [])

  useEffect(() => {
    const process = async () => {
      const loginData = localStorage.getItem('loginData')
      if (loginData) {
        const res = await loginPost({
          url: '/signuplogin',
          body: JSON.parse(loginData),
        })
        if (res.result === 'success') {
          localStorage.setItem('console_token', res.data.access_token)
          localStorage.setItem('refresh_token', res.data.refresh_token)
        }
      }
      parent.window.postMessage({ finish: true }, '*')
    }
    process()
  }, [login])

  return <div></div>
}

export default SignUpLogin
