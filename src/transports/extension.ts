import type { Runtime } from 'webextension-polyfill'

import {
  RequestMetadata,
  RequestMetadataSymbol,
  EndpointTransport,
  SocketTransport,
} from '../common'
import { createSocket, Socket } from '../socket'
import { Router } from '../router'

export type ExtensionRequestMetadata = RequestMetadata<{ sender: Runtime.MessageSender }>
const makeMetadata = (sender: Runtime.MessageSender): ExtensionRequestMetadata => ({
  __hermes__: RequestMetadataSymbol,
  sender,
})

const portToSocket = (port: Runtime.Port): Socket<unknown, unknown> => {
  const { sendMessage, sendClose, socket } = createSocket(
    async (message) => port.postMessage(message),
    async () => port.disconnect(),
  )
  port.onDisconnect.addListener(sendClose)
  port.onMessage.addListener(sendMessage)
  return socket
}

export const listenOnMessage = (
  browserRuntime: Runtime.Static,
  router: Router<any, any>,
  address = 'default',
) => {
  const listener = (
    request: any,
    sender: Runtime.MessageSender,
    sendResponse: (response?: any) => void,
  ) => {
    if (request.address !== address) return
    router.handleEndpoint(request, makeMetadata(sender)).then(sendResponse)
    return true
  }
  browserRuntime.onMessage.addListener(listener)
  return () => browserRuntime.onMessage.removeListener(listener)
}
export const listenOnMessageExternal = (
  browserRuntime: Runtime.Static,
  router: Router<any, any>,
  address = 'default',
) => {
  const listener = (
    request: any,
    sender: Runtime.MessageSender,
    sendResponse: (response?: any) => void,
  ) => {
    if (request.address !== address) return
    router.handleEndpoint(request, makeMetadata(sender)).then(sendResponse)
    return true
  }
  browserRuntime.onMessageExternal.addListener(listener)
  return () => browserRuntime.onMessageExternal.removeListener(listener)
}
// FIXME: Doesn't handle address
export const listenOnConnect = (browserRuntime: Runtime.Static, router: Router<any, any>) => {
  const listener = (port: Runtime.Port) => {
    router.handleSocket(portToSocket(port), { __hermes__: RequestMetadataSymbol })
  }
  browserRuntime.onConnect.addListener(listener)
  return () => browserRuntime.onConnect.removeListener(listener)
}
export const listenOnConnectExternal = (
  browserRuntime: Runtime.Static,
  router: Router<any, any>,
) => {
  const listener = (port: Runtime.Port) => {
    router.handleSocket(portToSocket(port), { __hermes__: RequestMetadataSymbol })
  }
  browserRuntime.onConnectExternal.addListener(listener)
  return () => browserRuntime.onConnectExternal.removeListener(listener)
}

export const createEndpointTransport =
  (browserRuntime: Runtime.Static, extensionId: string, address = 'default'): EndpointTransport =>
  (request) =>
    browserRuntime.sendMessage(extensionId, { address, ...request })

export const createSocketTransport =
  (browserRuntime: Runtime.Static, extensionId: string, address = 'default'): SocketTransport =>
  async (request) => {
    const port = browserRuntime.connect(extensionId)
    port.postMessage({ address, ...request })
    return portToSocket(port)
  }
