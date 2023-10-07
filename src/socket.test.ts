/// <reference types="bun-types" />
import { expect, describe, it } from 'bun:test'

import { SocketClosedError, createSocket as _createSocket } from './socket'

describe('createSocket', () => {
  const createSocket = <Send, Receive>() =>
    _createSocket<Send, Receive>(
      async () => {},
      async () => {},
    )

  it('should queue messages until received', async () => {
    const { sendMessage, socket } = createSocket<void, string>()
    sendMessage('foo')
    expect(socket.receive()).resolves.toEqual('foo')
  })

  it('should queue multiple messages', async () => {
    const { sendMessage, socket } = createSocket<void, string>()
    sendMessage('foo')
    sendMessage('bar')
    expect(socket.receive()).resolves.toEqual('foo')
    expect(socket.receive()).resolves.toEqual('bar')
  })

  it('should queue receive requests until value sent', async () => {
    const { sendMessage, socket } = createSocket<void, string>()
    const receivePromise = socket.receive()
    sendMessage('foo')
    expect(receivePromise).resolves.toEqual('foo')
  })

  describe('send', () => {
    const createSocket = <Send, Receive>() => {
      const messages: Send[] = []
      return {
        ..._createSocket<Send, Receive>(
          async (message) => {
            messages.push(message)
          },
          async () => {},
        ),
        messages,
      }
    }

    it('should send a message', async () => {
      const { socket, messages } = createSocket<string, void>()
      await socket.send('foo')
      expect(messages).toEqual(['foo'])
    })

    it('should send multiple messages', async () => {
      const { socket, messages } = createSocket<string, void>()
      await socket.send('foo')
      await socket.send('bar')
      expect(messages).toEqual(['foo', 'bar'])
    })
  })

  describe('receiveIter', () => {
    it('should iterate until the socket is closed', async () => {
      const { sendMessage, socket } = createSocket<void, string>()
      sendMessage('foo')
      sendMessage('bar')
      socket.close()

      const messages: string[] = []
      for await (const message of socket.receiveIter()) {
        messages.push(message)
      }
      expect(messages).toEqual(['foo', 'bar'])
    })

    it('should return immediately if the socket is closed', async () => {
      const { socket } = createSocket<void, string>()
      socket.close()

      const messages: string[] = []
      for await (const message of socket.receiveIter()) {
        messages.push(message)
      }
      expect(messages).toEqual([])
    })

    it('should allow receiving within the iterator', async () => {
      const { sendMessage, socket } = createSocket<void, string>()
      const iterator = socket.receiveIter()
      sendMessage('foo')
      sendMessage('inside')
      sendMessage('bar')
      sendMessage('inside')
      socket.close()

      const messages: string[] = []
      for await (const message of iterator) {
        messages.push(message)
        expect(socket.receive()).resolves.toEqual('inside')
      }
      expect(messages).toEqual(['foo', 'bar'])
    })
  })

  describe('close', () => {
    it('should reject send after close', async () => {
      const { socket } = createSocket<string, void>()
      await socket.close()
      expect(socket.send('foo')).rejects.toBeInstanceOf(SocketClosedError)
    })

    it('should reject receive after close', async () => {
      const { socket } = createSocket<void, string>()
      await socket.close()
      expect(socket.receive()).rejects.toBeInstanceOf(SocketClosedError)
    })

    it('should reject sendMessage after close', async () => {
      const { sendMessage, socket } = createSocket<void, string>()
      await socket.close()
      expect(() => sendMessage('foo')).toThrow(new SocketClosedError())
    })

    it('should allow consuming remaining messages after close', async () => {
      const { sendMessage, socket } = createSocket<void, string>()
      sendMessage('foo')
      sendMessage('bar')
      await socket.close()
      expect(socket.receive()).resolves.toEqual('foo')
      expect(socket.receive()).resolves.toEqual('bar')
      expect(socket.receive()).rejects.toBeInstanceOf(SocketClosedError)
    })

    it('should call closeTransport when closed', async () => {
      let closed = false
      const { socket } = _createSocket<void, string>(
        async () => {},
        async () => {
          closed = true
        },
      )
      await socket.close()
      expect(closed).toBe(true)
    })

    it("shouldn't call closeTransport when already closed", async () => {
      let closedCount = 0
      const { socket } = _createSocket<void, string>(
        async () => {},
        async () => {
          closedCount++
        },
      )
      await socket.close()
      await socket.close()
      expect(closedCount).toBe(1)
    })
  })

  describe('waitForClose', () => {
    it('should resolve when the socket is closed after calling', async () => {
      const { socket } = createSocket<void, string>()
      const waitForClose = socket.waitForClose()
      await socket.close()
      expect(waitForClose).resolves.toBeUndefined()
    })

    it('should resolve immediately if the socket is closed', async () => {
      const { socket } = createSocket<void, string>()
      await socket.close()
      expect(socket.waitForClose()).resolves.toBeUndefined()
    })
  })

  describe('sendClose', () => {
    it("shouldn't call closeTransport", async () => {
      let called = false
      const { sendClose } = _createSocket<void, string>(
        async () => {},
        async () => {
          called = true
        },
      )
      await sendClose()
      expect(called).toBe(false)
    })

    it('should resolve waitForClose', async () => {
      const { sendClose, socket } = createSocket<void, string>()
      const waitForClose = socket.waitForClose()
      await sendClose()
      expect(waitForClose).resolves.toBeUndefined()
    })
  })
})
