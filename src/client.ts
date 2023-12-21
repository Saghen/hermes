import {
  DeepRecord,
  EndpointHandler,
  HermesError,
  Path,
  EndpointTransport,
  SocketTransport,
  SocketHandler,
  Tail,
  generateRandom,
  HermesUserError,
  Default,
  RequestMetadata,
  Last,
  Init,
} from './common'
import { Socket } from './socket'

// Removes the RequestMetadata argument from the handler if it's defined
// since this is injected by the transport and not by the client
type ClientHandler<Handler extends EndpointHandler> = (
  ...args: Last<Parameters<Handler>> extends RequestMetadata<Record<never, never>>
    ? Init<Parameters<Handler>>
    : Parameters<Handler>
) => Promise<Awaited<ReturnType<Handler>>>

/// Endpoints
export type EndpointClient<Endpoints extends DeepRecord<Path, EndpointHandler>> = {
  [Path in keyof Endpoints]: Endpoints[Path] extends EndpointHandler
    ? ClientHandler<Endpoints[Path]>
    : // @ts-expect-error Not sure how to tell typescript that this isn't a EndpointHandler
      EndpointClient<Endpoints[Path]>
}

export const createEndpointClient = <Endpoints extends DeepRecord<Path, EndpointHandler>>(
  endpointTransport: EndpointTransport,
): EndpointClient<Endpoints> => createEndpointClientInternal(endpointTransport)

const createEndpointClientInternal = <Endpoints extends DeepRecord<Path, EndpointHandler>>(
  endpointTransport: EndpointTransport,
  path: Path[] = [],
): EndpointClient<Endpoints> =>
  new Proxy(
    async (...args: any[]) => {
      const requestId = generateRandom()
      const response = await endpointTransport({
        __hermes__: 'endpoint',
        requestId,
        path,
        args,
      })

      if (!('__hermes__' in response))
        throw new HermesError(
          "Provided response wasn't made by us. Something went wrong with the transports",
        )
      if (response.requestId !== requestId)
        throw new HermesError('Response hash does not match request hash')
      if ('error' in response) throw new HermesUserError(response.error)
      return response.value
    },
    {
      get: (_, pathPart) => {
        if (typeof pathPart !== 'string') throw new HermesError('Path must be a string')
        return createEndpointClientInternal(endpointTransport, [...path, pathPart])
      },
    },
  ) as unknown as EndpointClient<Endpoints>

/// Sockets
// Removes the Socket argument from the handler if it's defined
// since this is injected by the transport and not by the client
type SocketClientHandler<Handler extends SocketHandler> = (
  ...args: Tail<Parameters<Handler>>
) => Promise<Default<Parameters<Handler>[0], Socket<never, never>>>

export type SocketClient<Sockets extends DeepRecord<Path, SocketHandler>> = {
  [Path in keyof Sockets]: Sockets[Path] extends SocketHandler
    ? ClientHandler<SocketClientHandler<Sockets[Path]>>
    : SocketClient<Exclude<Sockets[Path], SocketHandler>>
}

export const createSocketClient = <Sockets extends DeepRecord<Path, SocketHandler>>(
  socketTransport: SocketTransport,
): SocketClient<Sockets> => createSocketClientInternal(socketTransport)

const createSocketClientInternal = <Sockets extends DeepRecord<Path, SocketHandler>>(
  socketTransport: SocketTransport,
  path: Path[] = [],
): SocketClient<Sockets> =>
  // @ts-expect-error Typescript can't understand proxy types
  new Proxy(
    (...args: any[]) =>
      socketTransport({
        __hermes__: 'socket',
        requestId: generateRandom(),
        path,
        args,
      }),
    {
      get: (_, pathPart) => {
        if (typeof pathPart !== 'string') throw new HermesError('Path must be a string')
        return createSocketClientInternal(socketTransport, [...path, pathPart])
      },
    },
  )
