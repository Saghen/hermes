/// <reference types="bun-types" />
import { expect, describe, it } from 'bun:test'
import { createEndpointClient, createSocketClient } from './client'
import { HermesError, HermesUserError, EndpointTransport, SocketTransport } from './common'
import { Socket, createSocket } from './socket'

const dummyTransport: EndpointTransport = async (request) => ({
  __hermes__: 'endpoint',
  requestId: request.requestId,
  value: request.args[0],
})

describe('createEndpointClient', () => {
  it('should accept any string key', () => {
    const client = createEndpointClient<{ foo: () => Promise<void> }>(dummyTransport)
    expect(client.foo).toBeTypeOf('function')
    expect(client.foo()).resolves.toBeUndefined()
  })

  it('should accept any deep nested string key', () => {
    const client = createEndpointClient<{ foo: { bar: () => Promise<void> } }>(dummyTransport)
    expect(client.foo.bar).toBeTypeOf('function')
    expect(client.foo.bar()).resolves.toBeUndefined()
  })

  it('should throw if the path is not a string', () => {
    const client = createEndpointClient(dummyTransport)
    // @ts-expect-error
    expect(() => client[Symbol.for('test')]).toThrow(new HermesError('Path must be a string'))
  })

  it('should throw if the response does not include __hermes__', async () => {
    // @ts-expect-error
    const client = createEndpointClient<{ foo: () => Promise<void> }>(async (request) => ({
      requestId: request.requestId,
      value: undefined,
    }))
    expect(client.foo()).rejects.toBeInstanceOf(HermesError)
  })

  it('should use random values for the requestId', async () => {
    const requestIds: string[] = []
    const client = createEndpointClient<{ foo: () => Promise<void> }>(async (request) => {
      requestIds.push(request.requestId)
      return {
        __hermes__: 'endpoint',
        requestId: request.requestId,
        value: undefined,
      }
    })
    await client.foo()
    await client.foo()
    expect(requestIds[0]).not.toEqual(requestIds[1])
  })

  it('should throw if the requestId of the response does not match the request', async () => {
    const client = createEndpointClient<{ foo: () => Promise<void> }>(async () => ({
      __hermes__: 'endpoint',
      requestId: 'notcorrect',
      value: undefined,
    }))
    expect(client.foo()).rejects.toBeInstanceOf(HermesError)
  })

  it('should throw if the requestId of the response is missing', async () => {
    // @ts-expect-error
    const client = createEndpointClient<{ foo: () => Promise<void> }>(async () => ({
      __hermes__: 'endpoint',
      value: undefined,
    }))
    expect(client.foo()).rejects.toBeInstanceOf(HermesError)
  })

  it('should return the value of the response', async () => {
    const client = createEndpointClient<{ foo: () => Promise<string> }>(async (request) => ({
      __hermes__: 'endpoint',
      requestId: request.requestId,
      value: 'test',
    }))
    expect(client.foo()).resolves.toBe('test')
  })

  it('should throw if the response has an error', async () => {
    const client = createEndpointClient<{ foo: () => Promise<void> }>(async (request) => ({
      __hermes__: 'endpoint',
      requestId: request.requestId,
      error: 'test',
    }))
    expect(client.foo()).rejects.toBeInstanceOf(HermesUserError)
    expect(client.foo().catch((err) => err.message)).resolves.toBe('test')
  })

  it('should throw if the transport throws', async () => {
    class CustomError extends Error {}
    const client = createEndpointClient<{ foo: () => Promise<void> }>(() =>
      Promise.reject(new CustomError('test')),
    )
    expect(client.foo()).rejects.toBeInstanceOf(CustomError)
  })
})

describe('createSocketClient', () => {
  const dummySocket = createSocket(
    () => Promise.resolve(),
    () => Promise.resolve(),
  ).socket
  const dummyTransport: SocketTransport = async () => dummySocket

  it('should accept any string key', () => {
    const client = createSocketClient<{ foo: (socket: Socket) => Promise<void> }>(dummyTransport)
    expect(client.foo).toBeTypeOf('function')
    expect(client.foo()).resolves.not.toBeUndefined()
  })

  it('should accept any deep nested string key', () => {
    const client = createSocketClient<{
      foo: { bar: (socket: Socket) => Promise<void> }
    }>(dummyTransport)
    expect(client.foo.bar).toBeTypeOf('function')
    expect(client.foo.bar()).resolves.not.toBeUndefined()
  })

  it('should throw if the path is not a string', () => {
    const client = createSocketClient(dummyTransport)
    // @ts-expect-error
    expect(() => client[Symbol.for('test')]).toThrow(new HermesError('Path must be a string'))
  })

  it('should use random values for the requestId', async () => {
    const requestIds: string[] = []
    const client = createSocketClient<{ foo: (socket: Socket<any, any>) => Promise<void> }>(
      async (request) => {
        requestIds.push(request.requestId)
        return dummySocket
      },
    )
    await client.foo()
    await client.foo()
    expect(requestIds[0]).not.toEqual(requestIds[1])
  })
})
