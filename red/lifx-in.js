module.exports = function (RED) {
  'use strict'

  function LightNode(config) {
    // Get server configuration and ref the underlying light server
    let serverNode = RED.nodes.getNode(config.server)
    if (!serverNode) return
    const server = serverNode.lightServer

    // Create a RED node
    RED.nodes.createNode(this, config)
    const node = this

    // Setup local dictionary to track this node's lights
    const lights = new Map()

    node.watchLight = function (lightId) {
      if (lights.has(lightId)) return

      let light = {}

      lights.set(lightId, light)

      // Get light handler for this lightID
      try {
        light.handler = server.getLightHandler(lightId)
      } catch (e) {
        node.error(e.message, e.stack)
        lights.delete(lightId)
      }

      light.callback = function (data) {
        if (!data || !data.payload) return
        light.connected = data.payload.reachable
        if (light.connected) {
          data.topic = lightId
          node.send(data)
        }
        node.updateStatus()
      }

      // Try to get current state for the light
      let message
      try {
        if ((message = light.handler.getLightState()) != null) {
          message.event = 'new'
          light.callback(message)
        }
      } catch (e) {
        node.error(e.message, e.stack)
      }

      // Handle events from the light
      light.handler.on('new', light.callback)
      light.handler.on('update', light.callback)
    }

    // Must be array; strip blanks
    let lightIDs = Array.isArray(config.lightID)
      ? config.lightID
      : config.lightID.split(',').filter(id => id)

    // Watch lights listed or if none specified, watch all lights
    if (lightIDs.length) {
      lightIDs.forEach(node.watchLight)
    } else {
      server.on('light-new', light => node.watchLight(light.id))
    }

    // Status will update when any state update message received
    node.updateStatus = function () {
      let disconnectedCount = 0
      lights.forEach(light => !light.connected && disconnectedCount++)
      let text = `Watching ${lights.size - disconnectedCount} lights`
      if (disconnectedCount) text += ` (plus ${disconnectedCount} disconnected)`
      let fill = disconnectedCount ? 'red' : 'green'
      node.status({ fill, shape: 'dot', text })
    }

    // Node is closing down, remove listeners
    node.on('close', () => {
      lights.forEach(light => {
        if (light.handler) {
          light.handler.removeListener('new', light.callback)
          light.handler.removeListener('update', light.callback)
        }
      })
    })
  }

  RED.nodes.registerType('lifx in', LightNode)
}
