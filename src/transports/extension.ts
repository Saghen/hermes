/// <reference types="@types/chrome" />

import { SendTransport, SocketTransport } from '../common'
import { Path, EndpointHandler, SocketHandler } from '../common'
import { createSocket, Socket } from '../socket'
import { Router } from '../router'

const portToSocket = (port: chrome.runtime.Port): Socket<unknown, unknown> => {
  const { sendMessage, sendClose, socket } = createSocket(
    async (message) => port.postMessage(message),
    async () => port.disconnect(),
  )
  port.onDisconnect.addListener(sendClose)
  port.onMessage.addListener(sendMessage)
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
  chrome.runtime.onConnect.addListener((port) => {
    router.handleSocket(portToSocket(port))
  })
}

export const createSendTransport =
  (extensionId: string, address: string): SendTransport =>
  (request) =>
    new Promise((resolve) =>
      chrome.runtime.sendMessage(extensionId, { address, ...request }, resolve),
    )

export const createSocketTransport =
  (extensionId: string, address: string): SocketTransport =>
  async (request) => {
    const port = chrome.runtime.connect(extensionId)
    port.postMessage({ address, ...request })
    return portToSocket(port)
  }
