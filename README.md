# CNC.js [![build status](https://travis-ci.org/cheton/cnc.js.svg?branch=master)](https://travis-ci.org/cheton/cnc.js) [![Coverage Status](https://coveralls.io/repos/cheton/cnc.js/badge.svg)](https://coveralls.io/r/cheton/cnc.js)
[![NPM](https://nodei.co/npm/cncjs.png?downloads=true&stars=true)](https://nodei.co/npm/cncjs/)   
![cncjs](https://raw.githubusercontent.com/cheton/cnc.js/master/media/banner.png)

CNC.js is a web-based CNC milling controller for the [Arduino](https://www.arduino.cc/) running [Grbl](https://github.com/grbl/grbl). It runs on an [Raspberry Pi](https://www.raspberrypi.org/) or a laptop computer that you have Node.js installed, connecting to the Arduino over a serial connection using a USB serial port, a Bluetooth serial module, or a  Serial-to-WiFi module like [XBee](https://www.arduino.cc/en/Guide/ArduinoWirelessShieldS2) or [USR-WIFI232-T](https://gist.github.com/ajfisher/1fdbcbbf96b7f2ba73cd).

![cnc.js](https://raw.githubusercontent.com/cheton/cnc.js/master/media/preview.gif) 

## Prerequisite
You will need an Arduino UNO/Nano board based on the ATmega328P. Download the latest Grbl firmware from the [Grbl  repository](https://github.com/grbl/grbl), and [flash Grbl to an Arduino](https://github.com/grbl/grbl/wiki/Flashing-Grbl-to-an-Arduino).

If you don't have an Arduino, check out [grbl-sim](https://github.com/grbl/grbl-sim) to compile Grbl into an executable for your computer.

1. Clone this repository into the directory containing the Grbl source code (i.e. `<repo>/grbl/`), like so:

  ```bash
  $ git clone git@github.com:grbl/grbl.git
  $ cd grbl/grbl
  $ git clone git@github.com:grbl/grbl-sim.git
  $ cd grbl-sim
  ```
2. Edit the Grbl-sim Makefile to select the correct `PLATFORM =` line.
3. Run `make new` to compile the Grbl sim, and it will create an executable file named `grbl_sim.exe`.

## Installation
```bash
$ npm install -g cncjs
```
Run `cnc` to start the server, and visit `http://yourhostname:8000/` to view the web console:
```bash
$ cnc
```

## License

Copyright (c) 2015 Cheton Wu

Licensed under the [MIT License](LICENSE).
