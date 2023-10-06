import { createSocket } from '../common'
import { Router } from '../router'

export const createLoopback = () => {
  let internalRouter: Router<any, any>
  const listen = (router: Router<any, any>) => {
    internalRouter = router
  }
  const sendTransport = (request: any) => {
    if (!internalRouter) throw new Error('No router has been set')
    return internalRouter.handleEndpoint(request)
  }
  const socketTransport = async (request: any) => {
    if (!internalRouter) throw new Error('No router has been set')
    const {
      pushClose: pushCloseClient,
      pushMessage: pushMessageClient,
      socket: socketClient,
    } = createSocket(
      async message => pushMessageServer(message),
      async () => pushCloseServer(),
    )
    const {
      pushClose: pushCloseServer,
      pushMessage: pushMessageServer,
      socket: socketServer,
    } = createSocket(
      async message => pushMessageClient(message),
      async () => pushCloseClient(),
    )
    internalRouter.handleSocket(socketServer)
    pushMessageServer(request)
    return socketClient
  }
  return {
    listen,
    sendTransport,
    socketTransport,
  }
}
