# CNC.js [![build status](https://travis-ci.org/cheton/cnc.js.svg?branch=master)](https://travis-ci.org/cheton/cnc.js) [![Coverage Status](https://coveralls.io/repos/cheton/cnc.js/badge.svg)](https://coveralls.io/r/cheton/cnc.js)
[![NPM](https://nodei.co/npm/cncjs.png?downloads=true&stars=true)](https://nodei.co/npm/cncjs/)   
![cncjs](https://raw.githubusercontent.com/cheton/cnc.js/master/media/banner2.png)

CNC.js is a web-based CNC milling controller for the [Arduino](https://www.arduino.cc/) running [Grbl](https://github.com/grbl/grbl). It runs on an [Raspberry Pi](https://www.raspberrypi.org/) or a laptop computer that you have Node.js installed, connecting to the Arduino over a serial connection using a USB serial port, a Bluetooth serial module, or a  Serial-to-WiFi module like [XBee](https://www.arduino.cc/en/Guide/ArduinoWirelessShieldS2) or [USR-WIFI232-T](https://gist.github.com/ajfisher/1fdbcbbf96b7f2ba73cd).

![cnc.js](https://raw.githubusercontent.com/cheton/cnc.js/master/media/cncjs.png) 

## Demo

[![CNC](http://img.youtube.com/vi/fJyq4fyiGSc/0.jpg)](https://www.youtube.com/watch?v=fJyq4fyiGSc&hd=2 "CNC.js")

JSDC 2015 speech: http://cheton.github.io/jsdc2015/#/81

### Photo Gallery
[![Photo Gallery](https://scontent.xx.fbcdn.net/hphotos-xat1/v/t1.0-9/12118907_10207901191546433_3867236073352040616_n.jpg?oh=97c977c426367130eef35b5e230637c4&oe=56A65008)](https://www.facebook.com/cheton.wu/media_set?set=a.10207901184746263.1073741852.1195704289&type=3)

## Installation
First, ensure you have `prefix=~/.npm` in  `~/.npmrc`. For example:
```bash
$ echo "prefix=~/.npm" >> ~/.npmrc
$ cat ~/.npmrc
prefix=~/.npm
```

Then, install `cncjs` without `sudo`, or the `serialport` module may not install correctly on some platforms like Raspberry Pi.
```bash
$ npm install -g cncjs
```

## Usage
Run `cnc` or `~/.npm/bin/cnc` to start the server, and visit `http://yourhostname:8000/` to view the web console:
```bash
$ cnc # or ~/.npm/bin/cnc
```

Run `cnc` with -h for detailed usage:
```
$ cnc -h

  Usage: cnc [options]
  
  Options:

    -h, --help               output usage information
    -V, --version            output the version number
    -p, --port               set listen port (default: 8000)
    -l, --host               set listen address or hostname (default: 0.0.0.0)
    -b, --backlog            set listen backlog (default: 511)
    -c, --config <filename>  set config file (default: ~/.cncrc)
    -d, --debug              run in debug mode
```

## Examples
There are several *.gcode files in the [examples](https://github.com/cheton/cnc.js/tree/master/examples) directory. You can use the GCode widget to load a GCode file and make a trial run.

If you don't have a CAM software, try using [jscut](http://jscut.org/) to create G-Code from *.svg. It's a simple CAM package that runs in the browser.

Check out a live demo at http://jscut.org/jscut.html.

## Wiki
https://github.com/cheton/cnc.js/wiki
* [Prerequisite](https://github.com/cheton/cnc.js/wiki/Prerequisite)
* [User Guide](https://github.com/cheton/cnc.js/wiki/User-Guide)
* [FAQ](https://github.com/cheton/cnc.js/wiki/FAQ)

## TODOs
- [x] Soft reset GRBL / Unlock GRBL
- [x] Spindle on/off
- [x] Display G2/G3 arcs in the 3D visualizer</br>
      http://www.cnccookbook.com/CCCNCGCodeArcsG02G03.htm
- [x] Convert between Metric and Imperial unit<br>
      http://cnc-programming-tips.blogspot.tw/2014/12/g20-g21-unit-selection-codes.html
- [x] Drag and drop support for loading G-code file
- [ ] Remember last working state upon browser refresh
- [ ] Webcam support

## License

Copyright (c) 2015 Cheton Wu

Licensed under the [MIT License](LICENSE).
