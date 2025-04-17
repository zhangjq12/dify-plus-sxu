'use client'

import type { FC, ReactNode } from 'react'
import React, { createContext, useContext, useState } from 'react'

export const IsIframeContext = createContext<[boolean, React.Dispatch<React.SetStateAction<boolean>>]>([
  false,
  () => { },
])

export type IsIframeContextProviderProps = {
  children: ReactNode
}

export const IsIframeProvider: FC<IsIframeContextProviderProps> = ({ children }) => {
  return <IsIframeContext.Provider value={useState(false)}>{children}</IsIframeContext.Provider>
}

export const useIsIframe = () => useContext(IsIframeContext)

export default IsIframeContext
