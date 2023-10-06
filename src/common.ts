export type Path = string
export type SendRequest<Path extends string, Args extends any[]> = {
  __fkn__: true
  endpoint: true
  hash: string
  path: Path
  args: Args
}
export type SendResponse<Response> = { __fkn__: true; endpoint: true; hash: string; response: Response }
export type SocketRequest<Path extends string, Args extends any[]> = {
  __fkn__: true
  socket: true
  path: Path
  args: Args
}

export type EndpointHandler = (...args: any[]) => Promise<any>
export type SocketHandler = (socket: Socket<any, any>, ...args: any[]) => Promise<void>

/// Sockets
export type Socket<Send, Receive> = {
  send: (message: Send) => Promise<void>
  onMessage: (listener: (message: Receive) => void | Promise<void>) => () => void
  close: () => Promise<void>
  onClose: (listener: () => void | Promise<void>) => () => void
}

const createListener = <Args extends any[]>() => {
  const listeners: ((...args: Args) => void | Promise<void>)[] = []
  return {
    push: (...args: Args) => listeners.forEach(listener => listener(...args)),
    add: (listener: (...args: Args) => void | Promise<void>): (() => void) => {
      listeners.push(listener)
      return () => listeners.splice(listeners.indexOf(listener), 1)
    },
  }
}

export const createSocket = <Send, Receive>(
  sendTransport: (message: Send) => Promise<void>,
  closeTransport: () => Promise<void>,
) => {
  const messageListener = createListener<[Receive]>()
  const closeListener = createListener<[]>()

  const socket: Socket<Send, Receive> = {
    send: sendTransport,
    onMessage: messageListener.add,
    close: () => closeTransport().then(() => closeListener.push()),
    onClose: closeListener.add,
  }
  return {
    pushMessage: (message: Receive) => messageListener.push(message),
    pushClose: () => closeListener.push(),
    socket,
  }
}

/// Utils
export const generateHash = (rounds = 8) =>
  Array.from({ length: rounds }, Math.random)
    .map(val => val.toString(36).slice(2, 6))
    .join('')

export type Tail<T extends any[]> = T extends [any, ...infer U] ? U : never
