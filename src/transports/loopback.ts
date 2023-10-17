import {
  HermesError,
  EndpointTransport,
  SocketTransport,
  RequestMetadataSymbol,
  RequestMetadata,
} from '../common'
import { SocketWrapper, createSocket } from '../socket'
import { Router } from '../router'

export type LoopbackRequestMetadata = RequestMetadata<Record<never, never>>
const makeMetadata = (): LoopbackRequestMetadata => ({
  __hermes__: RequestMetadataSymbol,
})

export const createLoopback = (address = 'default') => {
  let internalRouter: Router<any, any> | undefined
  const listen = (router: Router<any, any>) => {
    internalRouter = router
    return () => {
      internalRouter = undefined
    }
  }
  const endpointTransport: EndpointTransport = (request) => {
    if (!internalRouter) throw new HermesError('No router has been set')
    return internalRouter.handleEndpoint({ address, ...request }, makeMetadata())
  }
  const socketTransport: SocketTransport = async (request) => {
    if (!internalRouter) throw new HermesError('No router has been set')
    const {
      sendClose: sendCloseClient,
      sendMessage: sendMessageClient,
      socket: socketClient,
    } = createSocket<unknown, unknown>(
      async (message) => sendMessageServer(message),
      async () => sendCloseServer(),
    ) as SocketWrapper<unknown, unknown>
    const {
      sendClose: sendCloseServer,
      sendMessage: sendMessageServer,
      socket: socketServer,
    } = createSocket<unknown, unknown>(
      async (message) => sendMessageClient(message),
      async () => sendCloseClient(),
    )
    internalRouter.handleSocket(socketServer, makeMetadata())
    sendMessageServer({ address, ...request })
    return socketClient
  }
  return {
    listen,
    endpointTransport,
    socketTransport,
  }
}
