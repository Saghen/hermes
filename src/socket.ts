export type Socket<Send, Receive> = {
  send: (message: Send) => Promise<void>
  receive: () => Promise<Receive>
  receiveIter: () => AsyncGenerator<Receive>
  close: () => Promise<void>
  waitForClose: () => Promise<void>
}

export class SocketClosedError extends Error {
  constructor() {
    super('Socket is closed')
  }
}

export type SocketWrapper<Send, Receive> = {
  sendMessage: (message: Receive) => void
  sendClose: () => Promise<void>
  socket: Socket<Send, Receive>
}
export const createSocket = <Send, Receive>(
  sendTransport: (message: Send) => Promise<void>,
  closeTransport: () => Promise<void>,
): SocketWrapper<Send, Receive> => {
  let queue: Receive[] = []
  let receiveRequests: [(value: Receive) => void, (err: Error) => void][] = []

  let closed = false
  let closedRequests: (() => void)[] = []

  const sendClose = async () => {
    closed = true
    for (const request of closedRequests) request()
    while (receiveRequests.length > 0) receiveRequests.shift()![1](new SocketClosedError())
  }

  const socket: Socket<Send, Receive> = {
    send: async (message) => {
      if (closed) throw new SocketClosedError()
      return sendTransport(message)
    },
    receive: () => {
      if (queue.length > 0) return Promise.resolve(queue.shift()!)
      if (closed) return Promise.reject(new SocketClosedError())
      return new Promise<Receive>((resolve, reject) => receiveRequests.push([resolve, reject]))
    },
    receiveIter: async function* () {
      try {
        while (true) yield socket.receive()
      } catch (e) {
        if (e instanceof SocketClosedError) return
        throw e
      }
    },
    close: async () => {
      if (closed) return
      sendClose()
      await closeTransport()
    },
    waitForClose: () => {
      if (closed) return Promise.resolve()
      return new Promise<void>((resolve) => closedRequests.push(resolve))
    },
  }

  return {
    sendMessage: (message: Receive) => {
      if (closed) throw new SocketClosedError()
      if (receiveRequests.length > 0) receiveRequests.shift()![0](message)
      else queue.push(message)
    },
    sendClose,
    socket,
  }
}
