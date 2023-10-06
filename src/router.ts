import {
  DeepRecord,
  EndpointHandler,
  Path,
  SendRequest,
  Socket,
  SocketHandler,
  SocketRequest,
} from './common'

export type Router<
  Endpoints extends DeepRecord<Path, EndpointHandler>,
  Sockets extends DeepRecord<Path, SocketHandler>,
> = {
  endpoints: Endpoints
  sockets: Sockets

  handleEndpoint: (request: SendRequest) => Promise<any>
  handleSocket: (socket: Socket<any, any>) => Promise<void>
}

export const createRouter = <
  Endpoints extends DeepRecord<Path, EndpointHandler>,
  Sockets extends DeepRecord<Path, SocketHandler>,
>(
  endpoints: Endpoints,
  sockets: Sockets,
): Router<Endpoints, Sockets> => ({
  endpoints,
  sockets,

  async handleEndpoint(request) {
    if (!('__fkn__' in request)) throw new Error("Provided request wasn't made by us")

    const endpointHandler = request.path.reduce<EndpointHandler | Endpoints>(
      (endpoints, pathPart) => endpoints?.[pathPart],
      endpoints,
    )
    if (!endpointHandler) throw new Error(`Endpoint ${request.path} does not exist`)
    if (typeof endpointHandler !== 'function')
      throw new Error(`Endpoint ${request.path} is not a function`)
    return endpointHandler(...request.args)
  },

  async handleSocket(socket) {
    const request = await new Promise<SocketRequest>((resolve) => {
      const unsubscribe = socket.onMessage((message) => {
        unsubscribe()
        resolve(message)
      })
    })

    if (!('__fkn__' in request)) throw new Error("Provided request wasn't made by us")

    const socketHandler = request.path.reduce<SocketHandler | Sockets>(
      (sockets, pathPart) => sockets?.[pathPart],
      sockets,
    )
    if (!socketHandler) throw new Error(`Socket ${request.path} does not exist`)
    if (typeof socketHandler !== 'function')
      throw new Error(`Socket ${request.path} is not a function`)
    return socketHandler(socket, ...request.args)
  },
})
