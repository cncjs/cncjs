# CNC.js [![build status](https://travis-ci.org/cheton/cnc.js.svg?branch=master)](https://travis-ci.org/cheton/cnc.js) [![Coverage Status](https://coveralls.io/repos/cheton/cnc.js/badge.svg)](https://coveralls.io/r/cheton/cnc.js)
[![NPM](https://nodei.co/npm/cnc.js.png?downloads=true&stars=true)](https://nodei.co/npm/cnc.js/)   

CNC.js is a web-based CNC milling controller for the [Arduino](https://www.arduino.cc/) running [GRBL](https://github.com/grbl/grbl). It runs on an [Raspberry Pi](https://www.raspberrypi.org/) or a laptop computer that you have Node.js installed, connecting to the Arduino over a serial connection using a USB serial port, a Bluetooth serial module, or a  Serial-to-WiFi module like [XBee](https://www.arduino.cc/en/Guide/ArduinoWirelessShieldS2) or [USR-WIFI232-T](https://gist.github.com/ajfisher/1fdbcbbf96b7f2ba73cd).

![cnc.js](https://raw.githubusercontent.com/cheton/cnc.js/master/media/preview.gif) 

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
