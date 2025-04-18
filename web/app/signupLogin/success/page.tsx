'use client'

import { login as loginPost } from '@/service/common'
import { useEffect } from 'react'

const SignUpLoginSuccess = () => {
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
        parent.window.postMessage({ finish: true }, '*')
      }
      else {
        parent.window.postMessage({ finish: false }, '*')
      }
    }
    process()
  }, [])

  return <div></div>
}

export default SignUpLoginSuccess
