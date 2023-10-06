import { createRouter } from './router'
import { createEndpointClient, createSocketClient } from './client'
import { createLoopback } from './transports/loopback'
import { Socket } from './common'

async function main() {
  const loopback = createLoopback()

  // Setup router
  const endpoints = {
    add: async (a: number, b: number) => a + b,
  }
  const sockets = {
    echo: async (socket: Socket<any, any>) => {
      socket.onMessage(message => socket.send(message))
    },
  }
  const router = createRouter(endpoints, sockets)
  loopback.listen(router)

  // Setup clients
  const endpointClient = createEndpointClient<typeof router.endpoints>(loopback.sendTransport)
  const socketClient = createSocketClient<typeof router.sockets>(loopback.socketTransport)

  // Test endpoint client
  const result = await endpointClient.add(1, 2)
  console.log(result)

  // Test socket client
  const socket = await socketClient.echo()
  socket.onMessage(message => console.log(message))
  socket.send('Hello world!')
}

main()
