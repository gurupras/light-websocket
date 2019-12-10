const { TextEncoder, TextDecoder } = require('./text-encoding')

function str2ab (str) {
  return new TextEncoder('utf-8').encode(str)
}

function ab2str (buf) {
  return new TextDecoder('utf-8').decode(buf)
}

function memcpy (dst, dstOffset, src, srcOffset, length) {
  var dstU8 = new Uint8Array(dst, dstOffset, length)
  var srcU8 = new Uint8Array(src, srcOffset, length)
  dstU8.set(srcU8)
}

function messageToBytes (msg) {
  const { event, data } = msg
  const evtLength = event.length
  const dataLength = data !== undefined ? data.length : -1
  const totalLength = 4 + evtLength + 4 + (dataLength > 0 ? dataLength : 0)

  const evtBytes = str2ab(event)
  let dataBytes
  if (dataLength >= 0) {
    dataBytes = str2ab(data)
  }

  const bytes = new ArrayBuffer(totalLength)
  const view = new DataView(bytes)
  view.setUint32(0, evtLength)
  memcpy(bytes, 4, evtBytes, 0, evtLength)
  view.setUint32(4 + evtLength, dataLength)
  if (dataLength >= 0) {
    memcpy(bytes, 4 + evtLength + 4, dataBytes, 0, dataLength)
  }
  return bytes
}

function bytesToMessage (bytes) {
  const view = new DataView(bytes)
  const evtLength = view.getUint32(0)
  const dataLength = (view.getUint32(4 + evtLength) >> 0)

  const evtBytes = new Uint8Array(bytes, 4, evtLength)
  const evt = ab2str(evtBytes)

  let data

  if (dataLength >= 0) {
    const dataBytes = new Uint8Array(bytes, 4 + evtLength + 4, dataLength)
    data = ab2str(dataBytes)
    try {
      data = JSON.parse(data)
    } catch (e) {
    }
  }
  return {
    event: evt,
    data: data
  }
}

function onSocketMessage (msg) {
  // XXX: Hack for espruino
  if (msg.data === undefined) {
    msg = {
      data: msg
    }
  }
  let packet
  try {
    packet = bytesToMessage(msg.data)
  } catch (e) {
    console.error(`${e.message}`)
    throw e
  }
  const { event, data } = packet
  const handlers = this.listeners[event] || []
  handlers.forEach(handler => handler(data))

  if (this.onmessage) {
    this.onmessage(msg)
  }
}

function onSocketError (err) {
  if (this.onerror) {
    this.onerror(err)
  }
}

class LightWebSocket {
  constructor (socket) {
    this.socket = socket
    this.listeners = {}

    this.socket.binaryType = 'arraybuffer'

    if (typeof socket.on === 'function') {
      socket.on('message', onSocketMessage.bind(this))
      socket.on('error', onSocketError.bind(this))
    } else {
      socket.onmessage = onSocketMessage.bind(this)
      socket.onerror = onSocketError.bind(this)
    }
  }

  emit (event, data) {
    if (data !== undefined && typeof data !== 'string') {
      data = JSON.stringify(data)
    }
    const packet = {
      event,
      data
    }
    const bytes = messageToBytes(packet)
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

LightWebSocket.messageToBytes = messageToBytes
LightWebSocket.bytesToMessage = bytesToMessage

module.exports = LightWebSocket
