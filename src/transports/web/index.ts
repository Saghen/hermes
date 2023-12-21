/// <reference lib="DOM">

import {
  EndpointTransport,
  Request,
  RequestMetadata,
  RequestMetadataSymbol,
  Response,
  SocketTransport,
  errorToResponse,
} from '../../common'
import { Router } from '../../router'
import { Socket, createSocket } from '../../socket'
import { getTransferables } from './transferrables'

// TODO: Detect and handle transferables. Needs testing
// https://github.com/Banou26/osra/blob/4adab01b7403c2d19e9aa3586ea20a1d5de76e35/src/utils.ts#L16

type WebRequestMetadata = RequestMetadata<{ origin: string }>
const makeMetadata = (origin: string): WebRequestMetadata => ({
  __hermes__: RequestMetadataSymbol,
  origin,
})

export const listenOnEndpoint = (router: Router<any, any>, origin: string, address = 'default') => {
  const listener = async (event: MessageEvent<Request>) => {
    const request = event.data
    if (request?.address !== address) return
    // FIXME: Check if more complex origins should be supported like *.domain.tld
    if (origin !== '*' && event.origin !== origin) return

    if (request.__hermes__ !== 'endpoint') return
    await router
      .handleEndpoint(event.data, makeMetadata(event.origin))
      .catch(errorToResponse(request))
      .then((response) => window.postMessage(response, event.origin, getTransferables(response)))
  }

  window.addEventListener('message', listener)
  return () => window.removeEventListener('message', listener)
}

export const createEndpointTransport =
  (origin: string, address = 'default'): EndpointTransport =>
  (message) => {
    window.postMessage({ address, ...message }, origin, getTransferables(message))
    return new Promise((resolve) => {
      const listener = (event: MessageEvent<Response>) => {
        // TODO: create better way to check if the message is a request or a response
        // or use a port
        if ('args' in event.data) return
        if (event.data?.requestId !== message.requestId) return
        if (origin !== '*' && event.origin !== origin) return
        window.removeEventListener('message', listener)
        resolve(event.data)
      }
      window.addEventListener('message', listener)
    })
  }

const createSocketClosedMessage = () => ({
  __hermesWebTransportCloseMessage__: true,
})

// TODO: Handle messageerror event
const portToSocket = (port: MessagePort): Socket => {
  const { sendClose, sendMessage, socket } = createSocket(
    async (message) => port.postMessage(message, getTransferables(message)),
    async () => {
      port.postMessage(createSocketClosedMessage())
      port.close()
    },
  )
  port.addEventListener('message', (event) => {
    if (event.data?.__hermesWebTransportCloseMessage__) sendClose()
    else sendMessage(event.data)
  })
  port.start()
  return socket
}

// TODO: Implement heartbeat
export const listenOnSocket = (router: Router<any, any>, origin: string, address = 'default') => {
  const listener = async (event: MessageEvent<Request>) => {
    // Ensure that the request is for us
    if (event.data?.__hermes__ !== 'socket') return
    if (event.data.address !== address) return
    if (origin !== '*' && event.origin !== origin) return
    // TODO: Should throw an error here instead
    if (!event.ports[0]) return

    const socket = portToSocket(event.ports[0])
    router.handleSocket(socket, makeMetadata(event.origin))
  }
  window.addEventListener('message', listener)
  // TODO: Make awaitable for when all the sockets are cleaned up
  return () => window.removeEventListener('message', listener)
}

export const createSocketTransport =
  (origin: string, address = 'default'): SocketTransport =>
  async (message) => {
    const channel = new MessageChannel()
    window.postMessage({ address, ...message }, origin, [
      channel.port2,
      ...getTransferables(message),
    ])
    return portToSocket(channel.port1)
  }
