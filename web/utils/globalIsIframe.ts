let isIframe = false
let isAgents = false

export const setIsIframe = (boo: boolean, isagents: boolean = false) => {
  isIframe = boo
  isAgents = isagents
}

export const getIsIframe = () => {
  return isIframe
}

export const getIsAgents = () => {
  return isAgents
}
