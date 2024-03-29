import { Socket } from './socket'

/// Request/Response
export type Path = string
/** Generated by the client and sent through the transports to the server */
export type Request = {
  __hermes__: 'endpoint' | 'socket'
  /**
   * Defines the hermes instance that this request should be routed to
   * Useful for when there's multiple hermes instances listening through the
   * same interface such as postMessage
   */
  address: string
  /** Unique identifier for this request. Equal to requestId in the response */
  requestId: string

  path: string[]
  args: any[]
}
/** Generated by the server and sent through the transports to the client */
export type Response = {
  __hermes__: 'endpoint'
  /** Unique identifier for this request. Equal to requestId in the request */
  requestId: string
  /** Set if the request was successful */
  value?: any
  /** Set if the request failed */
  error?: string
}

/** Transport dependent metadata passed as the last argument for the handlers */
export const RequestMetadataSymbol = Symbol('HermesRequestMetadata')
export type RequestMetadata<Metadata extends Record<never, never>> = {
  __hermes__: typeof RequestMetadataSymbol
} & Metadata

export type EndpointHandler = (...args: any[]) => any
export type SocketHandler<Send = unknown, Receive = unknown> = (
  socket: Socket<Send, Receive>,
  ...args: any[]
) => void | Promise<void>

export type EndpointTransport = (message: Omit<Request, 'address'>) => Promise<Response>
export type SocketTransport = (message: Omit<Request, 'address'>) => Promise<Socket>

export const valueToResponse =
  (request: Request) =>
  (value: any): Response => ({
    __hermes__: 'endpoint',
    requestId: request.requestId,
    value,
  })
export const errorToResponse =
  (request: Request) =>
  (error: any): Response => ({
    __hermes__: 'endpoint',
    requestId: request.requestId,
    error: error instanceof Error ? error.message : String(error),
  })

/// Errors
export class HermesError extends Error {
  constructor(message: string) {
    super(`Internal Hermes Error: ${message}`)
  }
}
export class HermesUserError extends Error {}

/// Utils
export const generateRandom = (rounds = 8) =>
  Array.from({ length: rounds }, Math.random)
    .map((val) => val.toString(36).slice(2, 6))
    .join('')

export type Last<T extends any[]> = T extends [...infer _, infer U] ? U : never
export type Init<T extends any[]> = T extends [...infer U, any] ? U : T
export type Tail<T extends any[]> = T extends [any, ...infer U] ? U : T
export type Default<T, U> = T extends undefined ? U : T
export type DeepRecord<Key extends keyof any, Value> = {
  [key in Key]: Value | DeepRecord<Key, Value>
}
