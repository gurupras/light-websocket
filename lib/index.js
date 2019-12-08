class LightWebSocket {
  constructor (socket) {
    this.socket = socket
    this.listeners = {}

    socket.onmessage = (msg) => {
      // TODO: Write the conversion logic
      const packetStr = msg.data
      let packet
      try {
        packet = JSON.parse(packetStr)
      } catch (e) {
        console.error(`Message not a JSON: ${e.message}`)
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
    this.socket.send(str)
  }

  on (event, callback) {
    const { listeners } = this
    if (!listeners[event]) {
      listeners[event] = new Set()
    }
    const evtListeners = listeners[event]
    evtListeners.add(callback)
  }

  off (event, callback) {
    const { listeners } = this
    if (!listeners[event]) {
      return
    }
    listeners[event].delete(callback)
  }

  close () {
    return this.socket.close()
  }
}

module.exports = LightWebSocket
