/// <reference types="@types/chrome" />

import { SendTransport, SocketTransport } from '../client'
import { Path, EndpointHandler, SocketHandler, createSocket, Socket } from '../common'
import { Router } from '../router'

const portToSocket = (port: chrome.runtime.Port): Socket<unknown, unknown> => {
  const { pushMessage, pushClose, socket } = createSocket(
    async message => port.postMessage(message),
    async () => port.disconnect(),
  )
  port.onDisconnect.addListener(pushClose)
  port.onMessage.addListener(pushMessage)
  return socket
}

export const listen = <
  Endpoints extends Record<Path, EndpointHandler>,
  Sockets extends Record<Path, SocketHandler>,
>(
  router: Router<Endpoints, Sockets>,
) => {
  chrome.runtime.onMessage.addListener((response, _, sendResponse) => {
    router.handleEndpoint(response).then(sendResponse)
    return true
  })
  chrome.runtime.onConnect.addListener(port => {
    router.handleSocket(portToSocket(port))
  })
}

export const createSendTransport =
  (extensionId: string): SendTransport =>
  request =>
    new Promise(resolve => chrome.runtime.sendMessage(extensionId, request, resolve))

export const createSocketTransport =
  (extensionId: string): SocketTransport =>
  async request => {
    const port = chrome.runtime.connect(extensionId)
    port.postMessage(request)
    return portToSocket(port)
  }
