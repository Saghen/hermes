import { HermesError, SendTransport, SocketTransport } from '../common'
import { SocketWrapper, createSocket } from '../socket'
import { Router } from '../router'

export const createLoopback = (address: string = 'default') => {
  let internalRouter: Router<any, any>
  const listen = (router: Router<any, any>) => {
    internalRouter = router
  }
  const sendTransport: SendTransport = (request) => {
    if (!internalRouter) throw new HermesError('No router has been set')
    return internalRouter.handleEndpoint({ address, ...request })
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
    internalRouter.handleSocket(socketServer)
    sendMessageServer({ address, ...request })
    return socketClient
  }
  return {
    listen,
    sendTransport,
    socketTransport,
  }
}
