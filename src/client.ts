import {
  DeepRecord,
  EndpointHandler,
  Path,
  SendRequest,
  Socket,
  SocketHandler,
  SocketRequest,
  Tail,
  generateHash,
} from './common'

/// Endpoints
export type SendTransport = (message: SendRequest) => Promise<any>

export const createEndpointClient = <Endpoints extends DeepRecord<Path, EndpointHandler>>(
  sendTransport: SendTransport,
): Endpoints => createEndpointClientInternal(sendTransport)

const createEndpointClientInternal = <Endpoints extends DeepRecord<Path, EndpointHandler>>(
  sendTransport: SendTransport,
  path: Path[] = [],
): Endpoints =>
  // @ts-expect-error Typescript can't understand proxy types
  new Proxy(
    (...args: any[]) =>
      sendTransport({ __fkn__: true, endpoint: true, hash: generateHash(), path, args }),
    {
      get: (_, pathPart) => {
        if (typeof pathPart !== 'string') throw new Error('Path must be a string')
        return createEndpointClientInternal(sendTransport, [...path, pathPart])
      },
    },
  )

/// Sockets
export type SocketTransport = (message: SocketRequest) => Promise<Socket<any, any>>

type SocketClientHandler<Handler extends SocketHandler> = (
  ...args: Tail<Parameters<Handler>>
) => Promise<Parameters<Handler>[0]>

export type SocketClient<Sockets extends DeepRecord<Path, SocketHandler>> = {
  [Path in keyof Sockets]: Sockets[Path] extends SocketHandler
    ? SocketClientHandler<Sockets[Path]>
    : SocketClient<Sockets[Path]>
}

export const createSocketClient = <Sockets extends DeepRecord<Path, SocketHandler>>(
  socketTransport: SocketTransport,
): SocketClient<Sockets> => createSocketClientInternal(socketTransport)

const createSocketClientInternal = <Sockets extends DeepRecord<Path, SocketHandler>>(
  socketTransport: SocketTransport,
  path: Path[] = [],
): SocketClient<Sockets> =>
  // @ts-expect-error Typescript can't understand proxy types
  new Proxy((...args: any[]) => socketTransport({ __fkn__: true, socket: true, path, args }), {
    get: (_, pathPart) => {
      if (typeof pathPart !== 'string') throw new Error('Path must be a string')
      return createSocketClientInternal(socketTransport, [...path, pathPart])
    },
  })
