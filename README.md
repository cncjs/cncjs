# CNC.js [![build status](https://travis-ci.org/cheton/cnc.js.svg?branch=master)](https://travis-ci.org/cheton/cnc.js) [![Coverage Status](https://coveralls.io/repos/cheton/cnc.js/badge.svg)](https://coveralls.io/r/cheton/cnc.js)
[![NPM](https://nodei.co/npm/cncjs.png?downloads=true&stars=true)](https://nodei.co/npm/cncjs/)   
![cncjs](https://raw.githubusercontent.com/cheton/cnc.js/master/media/banner2.png)

CNC.js is a web-based CNC milling controller for the [Arduino](https://www.arduino.cc/) running [Grbl](https://github.com/grbl/grbl). It runs on an [Raspberry Pi](https://www.raspberrypi.org/) or a laptop computer that you have Node.js installed, connecting to the Arduino over a serial connection using a USB serial port, a Bluetooth serial module, or a  Serial-to-WiFi module like [XBee](https://www.arduino.cc/en/Guide/ArduinoWirelessShieldS2) or [USR-WIFI232-T](https://gist.github.com/ajfisher/1fdbcbbf96b7f2ba73cd).

![cnc.js](https://raw.githubusercontent.com/cheton/cnc.js/master/media/preview.gif) 

## Demo
JSDC 2015: http://cheton.github.io/jsdc2015/#/81

[![IMAGE ALT TEXT](http://img.youtube.com/vi/fJyq4fyiGSc/0.jpg)](https://www.youtube.com/watch?v=fJyq4fyiGSc&hd=2 "CNC.js")

## Installation
```bash
$ npm install -g cncjs
```

## Usage
Run `cnc` to start the server, and visit `http://yourhostname:8000/` to view the web console:
```bash
$ cnc
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
    -c, --config <filename>  set configuration file
```

## Examples
There are several *.gcode files in the [examples](https://github.com/cheton/cnc.js/tree/master/examples) directory. You can use the GCode widget to load a GCode file and make a trial run.

If you don't have a CAM software, try using [jscut](http://jscut.org/) to create G-Code from *.svg. It's a simple CAM package that runs in the browser.

Check out a live demo at http://jscut.org/jscut.html.

## User Guide

### Prerequisite
You will need an Arduino UNO/Nano board based on the ATmega328P. Download the latest Grbl firmware from the [Grbl  repository](https://github.com/grbl/grbl), and [flash Grbl to an Arduino](https://github.com/grbl/grbl/wiki/Flashing-Grbl-to-an-Arduino).

#### Running without using Arduino board
If you don't have an Arduino, check out [grbl-sim](https://github.com/grbl/grbl-sim) and follow the instructions below to compile Grbl into an executable for your computer:

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
4. On Linux, run the updated version of [simport.sh](https://github.com/cheton/cnc.js/blob/master/examples/grbl-sim/simport.sh) (`examples/grbl-sim/simport.sh`) to create a fake serial port (`/dev/ttyFAKE`), and use it to test your Grbl interface software.
5. Copy [config.js](https://github.com/cheton/cnc.js/blob/master/examples/grbl-sim/config.js) from [examples/grbl-sim](https://github.com/cheton/cnc.js/tree/master/examples/grbl-sim) to your local folder, and run `cnc -c /path/to/your/config.js` to start the server. The configuration file should look like below:

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

  ![ttyFAKE](https://raw.githubusercontent.com/cheton/cnc.js/master/media/ttyFAKE.png)

### Display Language
You can change the display language from the <b>Settings</b> menu, it will set the `lang` query string parameter: `?lang={locale}`

Here is a list of currently supported locales:

Locale | Language
------ | --------
de     | Deutsch
en     | English (US)
es     | Español
fr     | Français
it     | Italiano
ja     | 日本語
zh-cn  | 中文 (简体)
zh-tw  | 中文 (繁體)

We greatly appreciate your contributions for translation. Update resource strings in `web/i18n/{lang}/resource.json` and submit your pull request (PR) to make translation better.

### Widgets
TBD

## TODOs
- [ ] Spindle on/off
- [ ] Remember last working state upon browser refresh
- [ ] Soft reset GRBL / Unlock GRBL
- [ ] Drag and drop *.gcode files
- [ ] Display circular arcs with G02 and G03 in the 3D GCode viewer<br>
      http://www.cnccookbook.com/CCCNCGCodeArcsG02G03.htm
- [ ] Convert between Metric and Imperial unit<br>
      http://cnc-programming-tips.blogspot.tw/2014/12/g20-g21-unit-selection-codes.html
- [ ] Webcam support

## License

Copyright (c) 2015 Cheton Wu

Licensed under the [MIT License](LICENSE).
