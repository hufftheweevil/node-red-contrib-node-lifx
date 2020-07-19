'use strict'

let LightServer = require('../lib/lifx-server.js')

/**
 * Exports LightServer to Node-Red
 * @param  {object} RED Node-red
 */
module.exports = function (RED) {
  // list of servers
  let lifxServerList = new Map()

  /**
   * LightServer wrapper for Node-Red
   * @param {object} config Configuration
   */
  function LightServerWrapper(config) {
    let self = this

    RED.nodes.createNode(this, config)

    self.config = {
      name: config.name,
      // key: config.key,
      // network: config.network,
      interval: config.interval
    }

    // Create server
    try {
      this.lightServer = new LightServer(config)
    } catch (e) {
      self.error(e.message, e.stack)
      return
    }

    // Create wrapper functions
    this.getLightHandler = this.lightServer.getLightHandler.bind(this.lightServer)
    this.getLights = this.lightServer.getLights.bind(this.lightServer)

    // Handle close event
    this.on('close', () => {
      this.lightServer.stop()
      lifxServerList.delete(this.id)
    })

    // Server errors
    this.lightServer.on('error', (msg, obj) => {
      this.error(msg, obj)
    })

    // Server warnings
    this.lightServer.on('warning', (msg, obj) => {
      if (msg == 'No LIFX response in time') return // Ignore
      this.warn(msg, obj)
    })

    this.lightServer.init(err => {
      if (err) {
        this.error(err.message, err.stack)
        return
      }
      lifxServerList.set(this.id, this)
    })
  }

  RED.nodes.registerType('lifx server', LightServerWrapper)

  // Get list of lights
  RED.httpAdmin.get('/node-lifx/lights', function (req, res) {
    if (!req.query.server) {
      res.status(500).send('Missing arguments')
      return
    }

    // Query server for information
    if (lifxServerList.has(req.query.server)) {
      let server = lifxServerList.get(req.query.server)

      res.set({ 'content-type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify(server.getLights()))
      return
    }

    res.status(500).send('Server not found or not activated')
    return
  })
}
