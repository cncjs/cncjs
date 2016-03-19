# CNC [![build status](https://travis-ci.org/cheton/cnc.svg?branch=master)](https://travis-ci.org/cheton/cnc) [![Coverage Status](https://coveralls.io/repos/cheton/cnc/badge.svg)](https://coveralls.io/r/cheton/cnc)

[![NPM](https://nodei.co/npm/cncjs.png?downloads=true&stars=true)](https://nodei.co/npm/cncjs/)
![cncjs](https://raw.githubusercontent.com/cheton/cnc/master/media/banner2.png)

A web-based CNC milling controller for the [Arduino](https://www.arduino.cc/) running [Grbl](https://github.com/grbl/grbl). It runs on an [Raspberry Pi](https://www.raspberrypi.org/) or a laptop computer that you have Node.js installed, connecting to the Arduino over a serial connection using a USB serial port, a Bluetooth serial module, or a  Serial-to-WiFi module like [XBee](https://www.arduino.cc/en/Guide/ArduinoWirelessShieldS2) or [USR-WIFI232-T](https://gist.github.com/ajfisher/1fdbcbbf96b7f2ba73cd).

![cncjs.png](https://raw.githubusercontent.com/cheton/cnc/master/media/cncjs.png) 

##### Widgets Management
![widgets.png](https://raw.githubusercontent.com/cheton/cnc/master/media/widgets.png)

## Demo
JSDC 2015 speech: http://cheton.github.io/jsdc2015/#/81
[![CNC](http://img.youtube.com/vi/fJyq4fyiGSc/0.jpg)](https://www.youtube.com/watch?v=fJyq4fyiGSc&hd=2 "CNC")

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

If you want to run it on Raspberry Pi with Raspbian Wheezy, be sure to [install gcc/g++ 4.8](https://somewideopenspace.wordpress.com/2014/02/28/gcc-4-8-on-raspberry-pi-wheezy/) before npm install.

Check out [wiki](https://github.com/cheton/cnc/wiki/Installation) for other installation methods.

## Upgrade
Run `npm update -g cncjs` to upgrade to a newer version.

## Usage
Run `cnc` or `~/.npm/bin/cnc` to start the server, and visit `http://yourhostname:8000/` to view the web interface:
```bash
$ cnc
```

Run `cnc` with -h for detailed usage:
```
$ cnc -h

  Usage: cnc [options]
  
  Options:

    -h, --help                  output usage information
    -V, --version               output the version number
    -p, --port                  set listen port (default: 8000)
    -l, --host                  set listen address or hostname (default: 0.0.0.0)
    -b, --backlog               set listen backlog (default: 511)
    -c, --config <filename>     set config file (default: ~/.cncrc)
    -v, --verbose               increase the verbosity level
    -m, --mount [<url>:]<path>  set the mount point for serving static files (default: /static:static)
```

## Wiki
https://github.com/cheton/cnc/wiki

## Examples
There are several *.gcode files in the [examples](https://github.com/cheton/cnc/tree/master/examples) directory. You can use the GCode widget to load a GCode file and make a trial run.

If you don't have a CAM software, try using [jscut](http://jscut.org/) to create G-Code from *.svg. It's a simple CAM package that runs in the browser.

Check out a live demo at http://jscut.org/jscut.html. 

### Photo Gallery
[![Photo Gallery](https://scontent-iad3-1.xx.fbcdn.net/hphotos-xtp1/t31.0-8/12138529_10207901191546433_3867236073352040616_o.jpg)](https://www.facebook.com/cheton.wu/media_set?set=a.10207901184746263.1073741852.1195704289&type=3)

## License

Copyright (c) 2015-2016 Cheton Wu

Licensed under the [MIT License](LICENSE).

## Donate

If you would like to support this project, you can make a donation using PayPal. Thank you!

[![Donate](https://www.paypalobjects.com/en_US/i/btn/btn_donateCC_LG.gif)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=38CYN33CWPBR2)
