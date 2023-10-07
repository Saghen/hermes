import { createRouter } from './src/router'
import { createEndpointClient, createSocketClient } from './src/client'
import { createLoopback } from './src/transports/loopback'
import { Socket } from './src/common'

async function main() {
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
      socket.onMessage((message) => socket.send(message))
    },
  }
  const router = createRouter(endpoints, sockets)
  loopback.listen(router)

  // Setup clients
  const endpointClient = createEndpointClient<typeof router.endpoints>(loopback.sendTransport)
  const socketClient = createSocketClient<typeof router.sockets>(loopback.socketTransport)

  // Test endpoint client
  await endpointClient.add(1, 2).then(console.log)
  await endpointClient.deep.echo('foo').then(console.log)
  await endpointClient.fail().catch(console.error)

  // Test socket client
  const socket = await socketClient.echo()
  socket.onMessage((message) => console.log(message))
  socket.send('Hello world!')
}

main()
