'use client'

import { setIsIframe } from '@/utils/globalIsIframe'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

const SignUpLogin = () => {
  const router = useRouter()

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
        router.replace('/signupLogin/success')
      }
    }

    if (typeof window !== 'undefined')
      window.addEventListener('message', handleLoginData, false)

    return () => {
      if (typeof window !== 'undefined')
        window.removeEventListener('message', handleLoginData, false)
    }
  }, [router])

  return <div></div>
}

export default SignUpLogin
