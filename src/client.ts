import {
  DeepRecord,
  EndpointHandler,
  HermesError,
  Path,
  SendTransport,
  SocketTransport,
  SocketHandler,
  Tail,
  generateRandom,
  HermesUserError,
} from './common'

/// Endpoints
export const createEndpointClient = <Endpoints extends DeepRecord<Path, EndpointHandler>>(
  sendTransport: SendTransport,
): Endpoints => createEndpointClientInternal(sendTransport)

const createEndpointClientInternal = <Endpoints extends DeepRecord<Path, EndpointHandler>>(
  sendTransport: SendTransport,
  path: Path[] = [],
): Endpoints =>
  // @ts-expect-error Typescript can't understand proxy types
  new Proxy(
    async (...args: any[]) => {
      const requestId = generateRandom()
      const response = await sendTransport({ __hermes__: 'endpoint', requestId, path, args })

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
        return createEndpointClientInternal(sendTransport, [...path, pathPart])
      },
    },
  )

/// Sockets
type SocketClientHandler<Handler extends SocketHandler> = (
  ...args: Tail<Parameters<Handler>>
) => Promise<Parameters<Handler>[0]>

export type SocketClient<Sockets extends DeepRecord<Path, SocketHandler>> = {
  [Path in keyof Sockets]: Sockets[Path] extends SocketHandler
    ? SocketClientHandler<Sockets[Path]>
    : // @ts-expect-error Not sure how to tell typescript that this isn't a SocketHandler
      SocketClient<Sockets[Path]>
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
      socketTransport({ __hermes__: 'socket', requestId: generateRandom(), path, args }),
    {
      get: (_, pathPart) => {
        if (typeof pathPart !== 'string') throw new HermesError('Path must be a string')
        return createSocketClientInternal(socketTransport, [...path, pathPart])
      },
    },
  )
