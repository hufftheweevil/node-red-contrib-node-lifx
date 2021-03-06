# LIFX nodes for Node-RED

A solution to control LIFX lights over local network using Node-RED that uses
[lifx-lan-client library](https://github.com/node-lifx/lifx-lan-client) for communicating with the lights.

This module provides input and output nodes for communicating with LIFX lights, the input node accepts multiple
color format and automatically converts the values to the right format. 

### Features

* Convert input arguments to light specific arguments
* Trigger events for light changes
* Self syncing, uses background polling to detect external changes to light
* Display current state for light in Node-RED UI
* Ability to set waveforms **EXPERIMENTAL**

### Examples

##### Dashboard example config:

This is an example of how to control the light using the
[node-red-dashboard](https://github.com/node-red/node-red-dashboard)
The split node can be used to get the `on` and `bri` payload from the light status message, and the join node to
combine the topic and value to an JSON object.

![UI example](./doc/example_ui.png)

##### Wakeup example config:

Simple example of using an inject node to trigger a wakeup light behavior every workday, the light transitions from
off to on with 75% brightness over a duration of 30s.

![Wakeup example](./doc/wakeup.png)

##### Hub Configuration

![Hub config](./doc/config_server.png)

##### Light Configuration

![Light config](./doc/config_light.png)

### Input node

Lights can be controlled by sending message with a payload containing the new state.

#### Set power state

Simplified control by sending the following values as payload

| Value | Info |
|---|---|
| `'on'` or `true` | Turn light on |
| `'off'`or `false` | Turn light off |
| numeric value | Turn light on and set brightness (0-100%) |

#### Set color

More advanced way to control the light is to send an object payload with one or more of the following properties set

| Property | Info |
|---|---|
| `on` | Set light state (true/false)|
| `red`, `green` and/or `blue` | Set one or more color change for light (0-255)|
| `hex` | Set color (#f49242) |
| `hue` | Set color hue (0-360) |
| `sat` or `saturation` | Set color saturation (0-100) | 
| `bri` or `brightness` | Set light brightness (0-100%) |
| `cr`, `mired` or `mirek` | Set Mired color temperature (153 - 500) |
| `kelvin` | Set kelvin color temperature (2200-6500) |
| `duration` | Transition time (ms) |

#### Set waveform

Waveform is a way to create effect in lifx bulbs, like the breath effect in the LIFX App. Setting a wave form
will be at the following JSON form.

```json5
{
  "isTransient": true,
  "color": { "hue": 0, "saturation": 65535, "brightness": 65535, "kelvin": 3500 },
  "period": 800,
  "cycles": 3,
  "skewRatio": 0,
  "waveform": "SINE"  // one of SAW, SINE, HALF_SINE, TRIANGLE, PULSE
}
```

**Notice:** to get the same behavior as with the LIFX app when modifying the color temperature you will need to
manually set the saturation to zero. This is because a LIFX light can adjust temperature and color independent
of each other, and I didn't want to limit the choices for the user.

Example: Sending the following to the light will turn it on and dim it upp to 77% over 10 seconds

```json
{
  "payload": {
    "on": true, 
    "bri": 77,
    "duration": 10000
  }
}
```


### Output node

Example output from change event 
```json
{
  "id": "d073d5015103",
  "info": {
    "id": "d073d5015103",
    "name": "LIFX Black",
    "address": "192.168.1.107", 
    "model": "Original 1000",
    "capability": ["temperature", "color"]
  },
  "payload": { 
    "on": true, 
    "reachable": true, 
    "bri": 57, 
    "hsv": [ 169, 37, 57 ], 
    "rgb": [ 91, 145, 135 ], 
    "hex": "5C9187", 
    "color": "cadetblue", 
    "kelvin": 2513, 
    "mired": 397
  },
  "state": {
    "on": true,
    "brightness": 57,
    "hue": 169,
    "saturation": 37,
    "kelvin": 2513
  },
  "event": "change",
  "_msgid": "cfd24df6.65934"
}
```


# Using independently

This library can be used independent of Node-RED, the [example/mqtt.js](./example/mqtt.js) file contains a
simple example using [MQTT.js](https://github.com/mqttjs/MQTT.js) to enable control lights on/off status
and brightness over MQTT.

The MQTT topic `lights` will contain a list of all currently detected lights.
Specific light can be controlled by sending a message to the topics `lights/<id>/on` (boolean) or
`lights/<id>/brightness` (number) with the new state.
