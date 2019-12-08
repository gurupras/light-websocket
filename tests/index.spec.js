const WebSocket = require('ws')
const portfinder = require('portfinder')
const LightWebSocket = require('../lib/index')

async function testForNoEvent(obj, evt, timeout = 250) {
  let failed = false
  function listener() { 
    obj.off(evt, listener)
    failed = true 
  }
  obj.on(evt, listener)
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      failed ? reject(new Error(`Should not have received event '${evt}'`)) : resolve()
    }, timeout)
  })
}


describe('LightWebSocket', () => {
  describe('Standalone', () => {
    test('Throws error on non-JSON', async () => {
      const ws = {}
      const socket = new LightWebSocket(ws)
      socket.onmessage = jest.fn()
      expect(() => ws.onmessage('non-json-string')).toThrow()
      expect(socket.onmessage).not.toHaveBeenCalled()
    })

    test(`Does not fail when no 'onmessage' handler is specified`, async () => {
      const msg = {
        data: JSON.stringify({
          event: 'test',
          data: 'test-123'
        })
      }
      const ws = {}
      const socket = new LightWebSocket(ws)
      expect(() => ws.onmessage(msg)).not.toThrow()
    })
    test(`Calls 'onmessage' when a valid message is received`, async () => {
      const msg = {
        data: JSON.stringify({
          event: 'test',
          data: 'test-123'
        })
      }
      const ws = {}
      const socket = new LightWebSocket(ws)
      socket.onmessage = jest.fn()
      ws.onmessage(msg)
      expect(socket.onmessage).toHaveBeenCalledTimes(1)
      expect(socket.onmessage).toHaveBeenCalledWith(msg)
    })

    test(`Does not fail when no 'onerror' handler is specified`, async () => {
      const data = 'non-json-string'
      const ws = {}
      const socket = new LightWebSocket(ws)
      expect(() => ws.onerror(data)).not.toThrow()
    })

    test(`Calls 'onerror' when an error is encountered`, async () => {
      const data = 'non-json-string'
      const ws = {}
      const socket = new LightWebSocket(ws)
      socket.onerror = jest.fn()
      ws.onerror(data)
      expect(socket.onerror).toHaveBeenCalledTimes(1)
      expect(socket.onerror).toHaveBeenCalledWith(data)
    })

    test(`Off with unregistered handler is a no-op`, async () => {
      const ws = {}
      const socket = new LightWebSocket(ws)
      expect(() => socket.off('test', () => {})).not.toThrow()
    })

    test(`Off removes handlers as expected`, async () => {
      const data = 'test-123'
      const msg = {
        data: JSON.stringify({
          event: 'test',
          data
        })
      }
      const ws = {}
      const socket = new LightWebSocket(ws)
      const handler = jest.fn()
      socket.on('test', handler)
      ws.onmessage(msg)
      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler).toHaveBeenCalledWith(data)

      jest.clearAllMocks()

      socket.off('test', handler)
      ws.onmessage(msg)
      expect(handler).not.toHaveBeenCalled()
    })
  })

  describe('end-to-end', () => {
    let port
    let wss
    beforeEach(async () => {
      port = await portfinder.getPortPromise()
      wss = new WebSocket.Server({ port })
    })

    afterEach((done) => {
      wss.close(done)
    })

    describe('Data is handled correctly', () => {
      let wsServer
      let wsClient
      beforeEach(async () => {
        const wsServerPromise = new Promise(resolve => {
          wss.on('connection', socket => {
            resolve(new LightWebSocket(socket))
          })
        })

        const clientSocket = new WebSocket(`ws://localhost:${port}`)
        await new Promise(resolve => { clientSocket.onopen = resolve })
        wsClient = new LightWebSocket(clientSocket)
        wsServer = await wsServerPromise
        // Now, server and client are connected
      })
      afterEach(() => {
        wsClient.close()
        try {
          wsServer.close()
        } catch (e) {
        }
      })

      async function testData (event, input, sender, receiver) {
        const dataPromise = new Promise(resolve => {
          receiver.on(event, resolve)
        })

        // Test string
        sender.emit(event, input)

        await expect(dataPromise).resolves.toEqual(input)
      }

      describe('Client -> Server', () => {
        test('String data is handled correctly', async () => {
          await testData('str-test', 'string data', wsClient, wsServer)
        })
        test('Number data is handled correctly', async () => {
          await testData('number-test', 1, wsClient, wsServer)
          await testData('number-test', 4.4, wsClient, wsServer)
        })

        test('Objects are handled correctly', async () => {
          await testData('obj-test', {}, wsClient, wsServer)
          await testData('obj-test', {
            a: 1,
            b: 'test',
            c: {
              d: 4,
              e: {
                f: 1
              }
            }
          }, wsClient, wsServer)
        })
      })

      describe('Server -> Client', () => {
        test('String data is handled correctly', async () => {
          await testData('str-test', 'string data', wsServer, wsClient)
        })
        test('Number data is handled correctly', async () => {
          await testData('number-test', 1, wsServer, wsClient)
          await testData('number-test', 4.4, wsServer, wsClient)
        })

        test('Objects are handled correctly', async () => {
          await testData('obj-test', {}, wsServer, wsClient)
          await testData('obj-test', {
            a: 1,
            b: 'test',
            c: {
              d: 4,
              e: {
                f: 1
              }
            }
          }, wsServer, wsClient)
        })
      })
    })
  })
})
