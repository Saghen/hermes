import { EndpointHandler, Path, SendRequest, SocketHandler, SocketRequest, Tail } from './common'

export type Router<
  Endpoints extends Record<Path, EndpointHandler>,
  Sockets extends Record<Path, SocketHandler>,
> = {
  endpoints: Endpoints
  sockets: Sockets

  handleEndpoint: <Path extends keyof Endpoints & string>(
    request: SendRequest<Path, Parameters<Endpoints[Path]>>,
  ) => ReturnType<Endpoints[Path]>
  handleSocket: <Path extends keyof Sockets>(socket: Parameters<Sockets[Path]>[0]) => Promise<void>
}

export const createRouter = <
  Endpoints extends Record<Path, EndpointHandler>,
  Sockets extends Record<Path, SocketHandler>,
>(
  endpoints: Endpoints,
  sockets: Sockets,
): Router<Endpoints, Sockets> => ({
  endpoints,
  sockets,

  // @ts-expect-error Not worth trying to type this
  async handleEndpoint(request) {
    if (!('__fkn__' in request)) throw new Error("Provided request wasn't made by us")
    if (typeof request.path !== 'string') throw new Error('Path must be a string')

    const endpointHandler = endpoints[request.path] satisfies Endpoints[typeof request.path]
    if (!endpointHandler) throw new Error(`Endpoint ${request.path} does not exist`)
    return endpointHandler(...request.args)
  },

  async handleSocket<Path extends keyof Sockets & string>(socket: Parameters<Sockets[Path]>[0]) {
    const request = await new Promise<SocketRequest<Path, Tail<Parameters<Sockets[Path]>>>>(resolve => {
      const unsubscribe = socket.onMessage(message => {
        unsubscribe()
        resolve(message)
      })
    })

    if (!('__fkn__' in request)) throw new Error("Provided request wasn't made by us")
    if (typeof request.path !== 'string') throw new Error('Path must be a string')

    const socketHandler = sockets[request.path]
    if (!socketHandler) throw new Error(`Socket ${request.path} does not exist`)
    return socketHandler(socket, ...request.args)
  },
})
