import {
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
export type SendTransport = (message: SendRequest<string, any>) => Promise<any>
export function createEndpointClient<Endpoints extends Record<Path, EndpointHandler>>(
  sendTransport: SendTransport,
): Endpoints {
  // @ts-expect-error Typescript can't understand proxy types
  return new Proxy(
    {},
    {
      get: (_, path) => {
        if (typeof path !== 'string') throw new Error('Path must be a string')
        return (...args: any[]) =>
          sendTransport({ __fkn__: true, endpoint: true, hash: generateHash(), path, args })
      },
    },
  )
}

/// Sockets
export type SocketTransport = (message: SocketRequest<string, any>) => Promise<Socket<any, any>>

export type SocketClient<Sockets extends Record<Path, SocketHandler>> = {
  [Path in keyof Sockets]: (...args: Tail<Parameters<Sockets[Path]>>) => Promise<Parameters<Sockets[Path]>[0]>
}

export function createSocketClient<Sockets extends Record<Path, SocketHandler>>(
  socketTransport: SocketTransport,
): SocketClient<Sockets> {
  // @ts-expect-error Typescript can't understand proxy types
  return new Proxy(
    {},
    {
      get: (_, path) => {
        if (typeof path !== 'string') throw new Error('Path must be a string')
        return (...args: any[]) => socketTransport({ __fkn__: true, socket: true, path, args })
      },
    },
  )
}
