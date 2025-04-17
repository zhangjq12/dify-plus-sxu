'use client'
import { useSearchParams } from 'next/navigation'
import OneMoreStep from './oneMoreStep'
import NormalForm from './normalForm'
import { useIsIframe } from '@/context/isIframe-context'

const SignIn = () => {
  const searchParams = useSearchParams()
  const step = searchParams.get('step')
  const [isIframe] = useIsIframe()

  // useEffect(() => {
  //   const loginProcess = async () => {
  //     console.log(isIframe)
  //     const loginData = localStorage.getItem('loginData') || ''
  //     const data = JSON.parse(loginData)
  //     data.language = 'zh-Hans'
  //     const res = await login({
  //       url: '/signuplogin',
  //       body: data,
  //     })
  //     if (res.result === 'success') {
  //       localStorage.setItem('console_token', res.data.access_token)
  //       localStorage.setItem('refresh_token', res.data.refresh_token)
  //       // window.location.replace('/apps')
  //       const redirectUrl = localStorage.getItem('redirect_url')
  //       if (redirectUrl) {
  //         localStorage.removeItem('redirect_url')
  //         router.replace(redirectUrl)
  //       } else {
  //         router.replace('/apps')
  //       }
  //     }
  //   }
  //   // console.log(isIframe)
  //   loginProcess()
  // }, [isIframe])

  if (step === 'next')
    return <OneMoreStep />
  return <NormalForm />
}

export default SignIn
