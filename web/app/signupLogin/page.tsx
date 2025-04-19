'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

const SignUpLogin = () => {
  const router = useRouter()

  useEffect(() => {
    const loginDataFromLocalStorage = localStorage?.getItem('loginData')
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

    if (typeof window !== 'undefined' && !loginDataFromLocalStorage)
      window.onmessage = handleLoginData
    else if(loginDataFromLocalStorage)
      router.replace('/signupLogin/success')
    else
      parent.window.postMessage({ finish: true, isWindow: true }, '*')
  }, [router])

  return <div></div>
}

export default SignUpLogin
