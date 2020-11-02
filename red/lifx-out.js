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

    node.status({ fill: 'grey', shape: 'dot', text: 'Ready' })

    // Join array into string, easier to handle on input
    if (Array.isArray(config.lightID)) config.lightID = config.lightID.join(',')

    // Create map so that MAC, IP, and Name all point to ID (normalized MAC)
    const lightLookups = new Map()
    server.on('light-new', light => {
      lightLookups.set(light.id, light.id)
      let mac = light.id.match(/.{2}/g).join(':')
      lightLookups.set(mac, light.id)
      lightLookups.set(mac.toUpperCase(), light.id)
      lightLookups.set(light.info.address, light.id)
      lightLookups.set(light.info.name, light.id)
    })

    // Data from node, pass to light
    node.on('input', msg => {
      let idList = msg.topic || config.lightID
      idList.split(',').forEach(id => {
        let lightID = lightLookups.get(id)
        if (!lightID) {
          node.warn(`Light ${id} not found`)
          return
        }

        let handler = server.getLightHandler(lightID)
        if (!handler) {
          node.warn(`Unable to connect to ${lightID} (${id})`)
          return
        }

        try {
          if (msg.payload.waveform) {
            handler.setLightWaveForm(msg.payload)
          } else {
            handler.setLightState(msg.payload)
          }
          node.status({ fill: 'green', shape: 'ring', text: `Last msg sent at ${new Date()}` })
        } catch (e) {
          node.error(e.message, e.stack)
          node.status({ fill: 'red', shape: 'ring', text: `Last msg attempt at ${new Date()}` })
        }
      })
    })
  }

  RED.nodes.registerType('lifx out', LightNode)
}
