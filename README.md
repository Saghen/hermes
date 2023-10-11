# hermes

Hermes provides a generic interface for one way (Endpoints) and two way (Sockets) communication. It requires a transport for sending data between the server and client. The library provides transport implementations for HTTP (Endpoints only), Websocket, Web `postMessage`, Browser Extension `browser.runtime.sendMessage/port` and a loopback.

## Usage

```ts
import { createEndpointClient, createSocketClient, Socket } from 'hermes'
import { createLoopback } from 'hermes/transports/loopback'

const loopback = createLoopback()

// Setup router
const endpoints = {
  add: async (a: number, b: number) => a + b,
  deep: {
    echo: async (message: string) => message,
  },
  fail: () => Promise.reject('This endpoint fails'),
}
const sockets = {
  echo: async (socket: Socket<any, any>) => {
    for await (const message of socket.receiveIter()) {
      await socket.send(message)
    }
  },
}
const router = createRouter(endpoints, sockets)
loopback.listen(router)

// Setup clients
const endpointClient = createEndpointClient<typeof router.endpoints>(loopback.sendTransport)
const socketClient = createSocketClient<typeof router.sockets>(loopback.socketTransport)

// Test endpoint client
await endpointClient.add(1, 2).then(console.log) // '3'
await endpointClient.deep.echo('foo').then(console.log) // 'foo'
await endpointClient.fail().catch(console.error) // 'This endpoint fails'

// Test socket client
const socket = await socketClient.echo()
await socket.send('Hello world!')
await socket.receive().then(console.log) // 'Hello world'
```
