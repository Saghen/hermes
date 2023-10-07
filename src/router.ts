import {
  DeepRecord,
  EndpointHandler,
  HermesError,
  Path,
  Request,
  Response,
  SocketHandler,
} from './common'
import { Socket } from './socket'

export type Router<
  Endpoints extends DeepRecord<Path, EndpointHandler>,
  Sockets extends DeepRecord<Path, SocketHandler>,
> = {
  endpoints: Endpoints
  sockets: Sockets

  handleEndpoint: (request: Request) => Promise<Response>
  handleSocket: (socket: Socket<any, any>) => Promise<void>
}

const valueToResponse =
  (request: Request) =>
  (value: any): Response => ({
    __hermes__: 'endpoint',
    requestId: request.requestId,
    value,
  })
const errorToResponse =
  (request: Request) =>
  (error: any): Response => ({
    __hermes__: 'endpoint',
    requestId: request.requestId,
    error: error instanceof Error ? error.message : String(error),
  })

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
    assertValidRequest('endpoint', request)

    const endpointHandler = getPath(request.path, endpoints)
    if (endpointHandler === undefined)
      throw new HermesError(`Endpoint "${request.path}" does not exist`)
    if (typeof endpointHandler !== 'function')
      throw new HermesError(`Endpoint "${request.path}" is not a function`)
    return endpointHandler(...request.args)
      .then(valueToResponse(request))
      .catch(errorToResponse(request))
  },

  async handleSocket(socket) {
    // Retrieve the initial request
    const request = await socket.receive()

    assertValidRequest('socket', request)

    const socketHandler = getPath(request.path, sockets)
    if (socketHandler === undefined)
      throw new HermesError(`Socket "${request.path}" does not exist`)
    if (typeof socketHandler !== 'function')
      throw new HermesError(`Socket "${request.path}" is not a function`)
    return socketHandler(socket, ...request.args)
  },
})

const assertValidRequest = (type: 'endpoint' | 'socket', request: Request) => {
  if (!('__hermes__' in request))
    throw new HermesError("Request missing __hermes__ key. It likely wasn't made by us")
  if (request.__hermes__ !== type) throw new HermesError(`Request is not a ${type} request`)
  if (!('address' in request)) {
    throw new HermesError(
      'Request does not have an address. The transport should have defined this',
    )
  }
}

const getPath = <T>(path: Path[], record: DeepRecord<Path, T>) =>
  path.reduce<T | DeepRecord<Path, T> | undefined>((value, pathPart) => value?.[pathPart], record)
