import { Socket } from './socket'

export type Path = string
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
export type Response = {
  __hermes__: 'endpoint'
  /** Unique identifier for this request. Equal to requestId in the request */
  requestId: string
  /** Set if the request was successful */
  value?: any
  /** Set if the request failed */
  error?: string
}

export type EndpointHandler = (...args: any[]) => Promise<any>
export type SocketHandler = (socket: Socket<any, any>, ...args: any[]) => Promise<void>

export type SendTransport = (message: Omit<Request, 'address'>) => Promise<Response>
export type SocketTransport = (message: Omit<Request, 'address'>) => Promise<Socket<any, any>>

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

export type Tail<T extends any[]> = T extends [any, ...infer U] ? U : never
export type DeepRecord<Key extends keyof any, Value> = {
  [key in Key]: Value | DeepRecord<Key, Value>
}
