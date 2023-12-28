import {
  DeepRecord,
  EndpointHandler,
  HermesError,
  Path,
  Request,
  RequestMetadata,
  Response,
  SocketHandler,
  errorToResponse,
  valueToResponse,
} from './common'
import { Socket } from './socket'

export type Router<
  Endpoints extends DeepRecord<Path, EndpointHandler>,
  Sockets extends DeepRecord<Path, SocketHandler<any, any>>,
> = {
  endpoints: Endpoints
  sockets: Sockets

  handleEndpoint: (
    request: Request,
    metadata: RequestMetadata<Record<any, any>>,
  ) => Promise<Response>
  handleSocket: (socket: Socket, metadata: RequestMetadata<Record<any, any>>) => Promise<void>
}

// FIXME: OnError handler
export const createRouter = <
  Endpoints extends DeepRecord<Path, EndpointHandler>,
  Sockets extends DeepRecord<Path, SocketHandler<any, any>>,
>(
  endpoints: Endpoints,
  sockets: Sockets,
  disableMetadata = false,
): Router<Endpoints, Sockets> => ({
  endpoints,
  sockets,

  async handleEndpoint(request, metadata) {
    assertValidRequest('endpoint', request)

    const endpointHandler = getFunctionPath(request.path, endpoints)
    if (endpointHandler === undefined)
      throw new HermesError(`Endpoint "${request.path.join('.')}" does not exist`)
    if (typeof endpointHandler !== 'function')
      throw new HermesError(`Endpoint "${request.path.join('.')}" is not a function`)
    // FIXME: Check the number of arguments for the function and fill the args with undefined if needed
    return Promise.resolve()
      .then(() =>
        disableMetadata
          ? endpointHandler(...request.args)
          : endpointHandler(...request.args, metadata),
      )
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
    // FIXME: Check the number of arguments for the function and fill the args with undefined if needed
    return Promise.resolve().then(() =>
      disableMetadata
        ? socketHandler(socket, ...request.args)
        : socketHandler(socket, ...request.args, metadata),
    )
  },
})

function assertValidRequest(
  type: 'endpoint' | 'socket',
  request: unknown,
): asserts request is Request {
  if (typeof request !== 'object' || request === null)
    throw new HermesError('Request must be an object')
  if (!('__hermes__' in request))
    throw new HermesError("Request missing __hermes__ key. It likely wasn't made by us")
  if (request.__hermes__ !== type) throw new HermesError(`Request is not a ${type} request`)
  if (!('address' in request)) {
    throw new HermesError(
      'Request does not have an address. The transport should have defined this',
    )
  }
}

// FIXME: security issue and using typeof value === 'function' ? undefined : value?.[pathPart]
// doesn't work when using a proxy for the routes
const getFunctionPath = <T extends Function>(path: Path[], record: DeepRecord<Path, T>) =>
  // @ts-ignore
  path.reduce<T | DeepRecord<Path, T> | undefined>((value, pathPart) => value?.[pathPart], record)
