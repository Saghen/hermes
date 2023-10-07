import { SendTransport, SocketTransport } from '../common'
import { createSocket } from '../socket'
import { Router } from '../router'

export const createLoopback = (address: string = 'default') => {
  let internalRouter: Router<any, any>
  const listen = (router: Router<any, any>) => {
    internalRouter = router
  }
  const sendTransport: SendTransport = (request) => {
    if (!internalRouter) throw new Error('No router has been set')
    return internalRouter.handleEndpoint({ address, ...request })
  }
  const socketTransport: SocketTransport = async (request) => {
    if (!internalRouter) throw new Error('No router has been set')
    const {
      sendClose: sendCloseClient,
      sendMessage: sendMessageClient,
      socket: socketClient,
    } = createSocket(
      async (message) => sendMessageServer(message),
      async () => sendCloseServer(),
    )
    const {
      sendClose: sendCloseServer,
      sendMessage: sendMessageServer,
      socket: socketServer,
    } = createSocket(
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
