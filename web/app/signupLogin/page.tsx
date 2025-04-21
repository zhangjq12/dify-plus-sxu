'use client'

import { login } from '@/service/common'
import { useSearchParams } from 'next/navigation'
import { useEffect } from 'react'

const SignUpLogin = () => {
  // const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    // const loginDataFromLocalStorage = localStorage?.getItem('loginData')

    const handleLoginData = () => {
      // if (e.data.env === 'developer') {
      // const data = e.data
      // const email = data.email
      // const password = data.password
      const email = searchParams.get('email')
      const password = searchParams.get('password')
      const loginData: Record<string, any> = {
        email,
        password,
        language: 'zh-Hans',
        remember_me: true,
      }

      // localStorage.setItem('loginData', JSON.stringify(loginData))
      // router.replace('/signupLogin/success')
      const process = async () => {
        if (loginData) {
          const res = await login({
            url: '/signuplogin',
            body: loginData,
          })
          if (res.result === 'success') {
            localStorage.setItem('console_token', res.data.access_token)
            localStorage.setItem('refresh_token', res.data.refresh_token)
          }
          localStorage.removeItem('loginData')
          parent.window.postMessage({ finish: true }, '*')
        }
        else {
          parent.window.postMessage({ finish: false, isWindow: false }, '*')
        }
      }

      process()
      // }
    }

    handleLoginData()
    // if (typeof window !== 'undefined' && !loginDataFromLocalStorage) {
    //   window.addEventListener('message', handleLoginData, false)
    //   console.log(1)
    //   return () => {
    //     window.removeEventListener('message', handleLoginData)
    //   }
    // }
    // else if(loginDataFromLocalStorage) {
    //   router.replace('/signupLogin/success')
    //   console.log(2)
    // }
    // else {
    //   window.parent.window.postMessage({ finish: true, isWindow: true }, '*')
    //   console.log(3)
    // }
  }, [searchParams])

  return <div></div>
}

export default SignUpLogin
