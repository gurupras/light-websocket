const { TextEncoder, TextDecoder } = require('./text-encoding')

function str2ab (str) {
  return new TextEncoder('utf-8').encode(str)
}

function ab2str (buf) {
  return new TextDecoder('utf-8').decode(buf)
}

class LightWebSocket {
  constructor (socket) {
    this.socket = socket
    this.listeners = {}

    socket.onmessage = (msg) => {
      // TODO: Write the conversion logic
      if (typeof msg.data !== 'string') {
        
      }
      const { data: packetStr } = msg
      let packet
      try {
        debugger
        packet = JSON.parse(packetStr)
      } catch (e) {
        console.error(`Message not a JSON. msg=${packetStr}: ${e.message}`)
        throw e
      }
      const { event, data } = packet
      const handlers = this.listeners[event] || []
      handlers.forEach(handler => handler(data))

      if (this.onmessage) {
        this.onmessage(msg)
      }
    }

    socket.onerror = (msg) => {
      if (this.onerror) {
        this.onerror(msg)
      }
    }
  }

  emit (event, data) {
    const packet = {
      event,
      data
    }
    const str = JSON.stringify(packet)
    const bytes = str2ab(str)
    this.socket.send(bytes)
  }

  on (event, callback) {
    const { listeners } = this
    if (!listeners[event]) {
      listeners[event] = []
    }
    const evtListeners = listeners[event]
    evtListeners.push(callback)
  }

  off (event, callback) {
    const { listeners } = this
    if (!listeners[event]) {
      return
    }
    const idx = listeners[event].indexOf(callback)
    if (idx >= 0) {
      listeners[event].splice(idx, 1)
    }
  }

  close () {
    return this.socket.close()
  }
}

module.exports = LightWebSocket
