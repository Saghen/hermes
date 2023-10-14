/// <reference types="@types/chrome" />

import { RequestMetadata, SendTransport, SocketTransport } from '../common'
import { createSocket, Socket } from '../socket'
import { Router } from '../router'

export type ExtensionRequestMetadata = RequestMetadata<chrome.runtime.MessageSender>

const portToSocket = (port: chrome.runtime.Port): Socket<unknown, unknown> => {
  const { sendMessage, sendClose, socket } = createSocket(
    async (message) => port.postMessage(message),
    async () => port.disconnect(),
  )
  port.onDisconnect.addListener(sendClose)
  port.onMessage.addListener(sendMessage)
  return socket
}

export const listenOnMessage = (router: Router<any, any>, address = 'default') => {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.address !== address) return
    router.handleEndpoint(request, sender).then(sendResponse)
    return true
  })
}
export const listenOnMessageExternal = (router: Router<any, any>, address = 'default') => {
  chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
    if (request.address !== address) return
    router.handleEndpoint(request, sender).then(sendResponse)
    return true
  })
}
// FIXME: Doesn't handle address
export const listenOnConnect = (router: Router<any, any>) => {
  chrome.runtime.onConnect.addListener((port) => {
    router.handleSocket(portToSocket(port), {})
  })
}
export const listenOnConnectExternal = (router: Router<any, any>) => {
  chrome.runtime.onConnectExternal.addListener((port) => {
    router.handleSocket(portToSocket(port), {})
  })
}

export const createSendTransport =
  (extensionId: string, address = 'default'): SendTransport =>
  (request) =>
    new Promise((resolve) =>
      chrome.runtime.sendMessage(extensionId, { address, ...request }, resolve),
    )

export const createSocketTransport =
  (extensionId: string, address = 'default'): SocketTransport =>
  async (request) => {
    const port = chrome.runtime.connect(extensionId)
    port.postMessage({ address, ...request })
    return portToSocket(port)
  }
