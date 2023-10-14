import {
  DeepRecord,
  EndpointHandler,
  HermesError,
  Path,
  Request,
  RequestMetadata,
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

  handleEndpoint: (request: Request, metadata: Record<any, any>) => Promise<Response>
  handleSocket: (socket: Socket<any, any>, metadata: Record<any, any>) => Promise<void>
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

  async handleEndpoint(request, metadata) {
    assertValidRequest('endpoint', request)

    const endpointHandler = getFunctionPath(request.path, endpoints)
    if (endpointHandler === undefined)
      throw new HermesError(`Endpoint "${request.path}" does not exist`)
    if (typeof endpointHandler !== 'function')
      throw new HermesError(`Endpoint "${request.path}" is not a function`)
    return Promise.resolve()
      .then(() => endpointHandler(...request.args, metadata))
      .then(valueToResponse(request))
      .catch(errorToResponse(request))
  },

  async handleSocket(socket, metadata) {
    // Retrieve the initial request
    const request = await socket.receive()

    assertValidRequest('socket', request)

    const socketHandler = getFunctionPath(request.path, sockets)
    if (socketHandler === undefined)
      throw new HermesError(`Socket "${request.path}" does not exist`)
    if (typeof socketHandler !== 'function')
      throw new HermesError(`Socket "${request.path}" is not a function`)
    // FIXME: Error handling should close the socket and send an error message to the client
    return Promise.resolve().then(() => socketHandler(socket, ...request.args, metadata))
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

const getFunctionPath = <T extends Function>(path: Path[], record: DeepRecord<Path, T>) =>
  path.reduce<T | DeepRecord<Path, T> | undefined>(
    (value, pathPart) => (typeof value === 'function' ? undefined : value?.[pathPart]),
    record,
  )
