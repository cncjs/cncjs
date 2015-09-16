# CNC.js [![build status](https://travis-ci.org/cheton/cnc.js.svg?branch=master)](https://travis-ci.org/cheton/cnc.js) [![Coverage Status](https://coveralls.io/repos/cheton/cnc.js/badge.svg)](https://coveralls.io/r/cheton/cnc.js)
[![NPM](https://nodei.co/npm/cncjs.png?downloads=true&stars=true)](https://nodei.co/npm/cncjs/)   
![cncjs](https://raw.githubusercontent.com/cheton/cnc.js/master/media/banner.png)

CNC.js is a web-based CNC milling controller for the [Arduino](https://www.arduino.cc/) running [Grbl](https://github.com/grbl/grbl). It runs on an [Raspberry Pi](https://www.raspberrypi.org/) or a laptop computer that you have Node.js installed, connecting to the Arduino over a serial connection using a USB serial port, a Bluetooth serial module, or a  Serial-to-WiFi module like [XBee](https://www.arduino.cc/en/Guide/ArduinoWirelessShieldS2) or [USR-WIFI232-T](https://gist.github.com/ajfisher/1fdbcbbf96b7f2ba73cd).

![cnc.js](https://raw.githubusercontent.com/cheton/cnc.js/master/media/preview.gif) 

## Installation
```bash
$ npm install -g cncjs
```
Run `cnc` to start the server, and visit `http://yourhostname:8000/` to view the web console:
```bash
$ cnc
```

## Prerequisite
You will need an Arduino UNO/Nano board based on the ATmega328P. Download the latest Grbl firmware from the [Grbl  repository](https://github.com/grbl/grbl), and [flash Grbl to an Arduino](https://github.com/grbl/grbl/wiki/Flashing-Grbl-to-an-Arduino).

### Running without using Arduino board
If you don't have an Arduino, check out [grbl-sim](https://github.com/grbl/grbl-sim) to compile Grbl into an executable for your computer.

1. Clone this repository into the directory containing the Grbl source code (i.e. `<repo>/grbl/`), like so:

  ```bash
  $ git clone git@github.com:grbl/grbl.git
  $ cd grbl/grbl
  $ git clone git@github.com:grbl/grbl-sim.git
  $ cd grbl-sim
  ```
2. Edit the Grbl-sim Makefile to select the correct `PLATFORM =` line.
3. Run `make new` to compile the Grbl sim. It will create an executable file named `grbl_sim.exe`. See below:

  ![grbl-sim](https://raw.githubusercontent.com/cheton/cnc.js/master/media/grbl-sim.png).
4. On Linux, run the updated version of [simport.sh](https://raw.githubusercontent.com/cheton/cnc.js/master/examples/simport.sh) (`examples/grbl-sim/simport.sh`) to create a fake serial port (`/dev/ttyFAKE`), and use it to test your Grbl interface software.
5. Copy [config.js](https://raw.githubusercontent.com/cheton/cnc.js/master/examples/grbl-sim/config.js) from [examples/grbl-sim](https://github.com/cheton/cnc.js/examples/grbl-sim/) to your local folder, and run `cnc -c /path/to/your/config.js` to start the server. The configuration file should look like below:

  ```js
  module.exports = {
      ports: [
          {
              comName: '/dev/ttyFAKE',
              manufacturer: 'grbl-sim' // optional
          }
      ]
  };
  ```
6. Open `/dev/ttyFAKE` from the Connection widget to interact with the Grbl simulator as if connected to an Arduino with Grbl.

  ![ttyFAKE](https://github.com/cheton/cnc.js/blob/master/media/ttyFAKE.png)

## License

Copyright (c) 2015 Cheton Wu

Licensed under the [MIT License](LICENSE).
