/// <reference types="bun-types" />
import { expect, describe, it } from 'bun:test'

import { createRouter } from './router'
import { HermesError, Request, RequestMetadata } from './common'
import { createSocket as _createSocket } from './socket'

describe('createRouter', () => {
  it('should create a router with endpoints and sockets', () => {
    const endpoints = {
      foo: async () => 'foo',
    }
    const sockets = {
      bar: async () => {},
    }
    const router = createRouter(endpoints, sockets)
    expect(router.endpoints.foo).toEqual(endpoints.foo)
    expect(router.sockets.bar).toEqual(sockets.bar)
  })
})

describe('handleEndpoint', () => {
  const createRequest = (path: string[], args: any[] = []): Request => ({
    __hermes__: 'endpoint',
    requestId: 'foo',
    address: 'bar',
    path,
    args,
  })

  it('should reject requests without __hermes__ field', () => {
    const router = createRouter({}, {})
    expect(router.handleEndpoint({} as any, {})).rejects.toBeInstanceOf(HermesError)
  })

  it('should reject requests when the __hermes__ field isn\'t equal to "endpoint"', () => {
    const router = createRouter({}, {})
    expect(router.handleEndpoint({ __hermes__: 'foo' } as any, {})).rejects.toBeInstanceOf(
      HermesError,
    )
  })

  it("should reject when the request doesn't include an address", () => {
    const router = createRouter({}, {})
    expect(router.handleEndpoint({ __hermes__: 'endpoint' } as any, {})).rejects.toBeInstanceOf(
      HermesError,
    )
  })

  it('should return a response with the same requestId', async () => {
    const router = createRouter({ noop: async () => {} }, {})
    const request = createRequest(['noop'])
    const response = await router.handleEndpoint(request, {})
    expect(response.requestId).toEqual(request.requestId)
  })

  it('should fail when the endpoint does not exist', () => {
    const router = createRouter({}, {})
    expect(router.handleEndpoint(createRequest(['example']), {})).rejects.toBeInstanceOf(
      HermesError,
    )
  })

  it('should fail when the endpoint is not a function', () => {
    const router = createRouter({ example: { noop: async () => {} } }, {})
    expect(router.handleEndpoint(createRequest(['example']), {})).rejects.toBeInstanceOf(
      HermesError,
    )
  })

  it('should call the endpoint with the correct arguments', async () => {
    const router = createRouter(
      {
        foo: async (a: number, b: number) => a + b,
        deep: { echo: async (message: string) => message },
        metadata: async (metadata: RequestMetadata<{ foo: 'bar' }>) => metadata.foo,
      },
      {},
    )

    const response = await router.handleEndpoint(createRequest(['foo'], [1, 2]), {})
    expect(response.value).toEqual(3)

    const metadata = await router.handleEndpoint(createRequest(['metadata'], []), { foo: 'bar' })
    expect(metadata.value).toEqual('bar')
  })

  it('should return the error as a string when the endpoint fails', async () => {
    const router = createRouter({ foo: () => Promise.reject(new Error('foo')) }, {})
    const response = await router.handleEndpoint(createRequest(['foo']), {})
    expect(response.error).toEqual('foo')
  })

  it('should return a promise when the endpoint does not', async () => {
    const router = createRouter({ foo: () => 'foo' }, {})
    const response = router.handleEndpoint(createRequest(['foo']), {})
    expect(response).toBeInstanceOf(Promise)
  })
})

describe('handleSocket', () => {
  const createSocket = () =>
    _createSocket(
      () => Promise.resolve(),
      () => Promise.resolve(),
    )
  const createRequest = (path: string[], args: any[] = []): Request => ({
    __hermes__: 'socket',
    requestId: 'foo',
    address: 'bar',
    path,
    args,
  })

  it('should reject requests without __hermes__ field', () => {
    const router = createRouter({}, {})
    const { sendMessage, socket } = createSocket()
    sendMessage({})
    expect(router.handleSocket(socket, {})).rejects.toBeInstanceOf(HermesError)
  })

  it('should reject requests when the __hermes__ field isn\'t equal to "socket"', () => {
    const router = createRouter({}, {})
    const { sendMessage, socket } = createSocket()
    sendMessage({ __hermes__: 'foo' })
    expect(router.handleSocket(socket, {})).rejects.toBeInstanceOf(HermesError)
  })

  it("should reject when the request doesn't include an address", () => {
    const router = createRouter({}, { echo: async () => {} })
    const { sendMessage, socket } = createSocket()
    sendMessage({
      __hermes__: 'socket',
      requestId: 'foo',
      path: ['echo'],
      args: [],
    })
    expect(router.handleSocket(socket, {})).rejects.toBeInstanceOf(HermesError)
  })

  it('should reject when the socket does not exist', () => {
    const router = createRouter({}, {})
    const { sendMessage, socket } = createSocket()
    sendMessage(createRequest(['example']))
    expect(router.handleSocket(socket, {})).rejects.toBeInstanceOf(HermesError)
  })

  it('should reject when the socket is not a function', () => {
    const router = createRouter({ example: { noop: async () => {} } }, {})
    const { sendMessage, socket } = createSocket()
    sendMessage(createRequest(['example']))
    expect(router.handleSocket(socket, {})).rejects.toBeInstanceOf(HermesError)
  })

  // TODO: Use an equivalent of expect.assertions once bun adds that
  it('should call the socket handler with the socket as the first argument', async () => {
    const router = createRouter(
      {},
      {
        foo: async (socket: any) => {
          expect(socket).toBeDefined()
          expect(socket).toHaveProperty('send')
          expect(socket).toHaveProperty('receive')
          expect(socket).toHaveProperty('close')
        },
      },
    )
    const { sendMessage, socket } = createSocket()
    sendMessage(createRequest(['foo']))
    await router.handleSocket(socket, {})
  })

  // TODO: Use an equivalent of expect.assertions once bun adds that
  it('should call the socket handler with the metadata as the final argument', async () => {
    const router = createRouter(
      {},
      {
        foo: async (_: any, metadata: RequestMetadata<{ foo: 'bar' }>) => {
          expect(metadata).toEqual({ foo: 'bar' })
        },
      },
    )
    const { sendMessage, socket } = createSocket()
    sendMessage(createRequest(['foo']))
    await router.handleSocket(socket, { foo: 'bar' })
  })

  it('should call onMessage when messages are pushed', async () => {
    const router = createRouter(
      {},
      {
        foo: async (socket) => {
          expect(socket.receive()).resolves.toEqual('foo')
        },
      },
    )
    const { sendMessage, socket } = createSocket()
    sendMessage(createRequest(['foo']))
    sendMessage('foo')
    await router.handleSocket(socket, {})
  })

  it('should call onClose when the socket is closed', async () => {
    const router = createRouter(
      {},
      {
        foo: async (socket) => {
          expect(socket.waitForClose()).resolves.toBeUndefined()
        },
      },
    )
    const { sendMessage, socket } = createSocket()
    sendMessage(createRequest(['foo']))
    await socket.close()
    await router.handleSocket(socket, {})
  })

  it('should return a promise when the socket handler does not', async () => {
    const router = createRouter({}, { foo: () => {} })
    const { sendMessage, socket } = createSocket()
    sendMessage(createRequest(['foo']))
    const response = router.handleSocket(socket, {})
    expect(response).toBeInstanceOf(Promise)
  })
})
