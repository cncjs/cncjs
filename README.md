# CNC [![build status](https://travis-ci.org/cheton/cnc.svg?branch=master)](https://travis-ci.org/cheton/cnc) [![Coverage Status](https://coveralls.io/repos/cheton/cnc/badge.svg)](https://coveralls.io/r/cheton/cnc)

[![NPM](https://nodei.co/npm/cncjs.png?downloads=true&stars=true)](https://nodei.co/npm/cncjs/)
![cncjs](https://raw.githubusercontent.com/cheton/cnc/master/media/banner2.png)

A web-based CNC milling controller for the [Arduino](https://www.arduino.cc/) running [Grbl](https://github.com/grbl/grbl). It runs on an [Raspberry Pi](https://www.raspberrypi.org/) or a laptop computer that you have Node.js installed, connecting to the Arduino over a serial connection using a USB serial port, a Bluetooth serial module, or a  Serial-to-WiFi module like [XBee](https://www.arduino.cc/en/Guide/ArduinoWirelessShieldS2) or [USR-WIFI232-T](https://gist.github.com/ajfisher/1fdbcbbf96b7f2ba73cd).

![cnc.png](https://raw.githubusercontent.com/cheton/cnc/master/media/cnc.png) 


## Key Features
* Supported CNC controller
  * Grbl v0.9 or later
  * TinyG2 will be supported in v2.x
* 3D Visualizer
* Allows multiple HTTP connections at the same serial port
* [Widget Management](https://github.com/cheton/cnc/wiki/User-Guide#widget-management)
* [TinyWeb Console for 320x240 LCD Display](https://github.com/cheton/cnc/wiki/User-Guide#tinyweb-console-for-320x240-lcd-display)
* [Keyboard Shortcuts](https://github.com/cheton/cnc/wiki/User-Guide#keyboard-shortcuts)
* [Contour ShuttleXpress](https://github.com/cheton/cnc/wiki/User-Guide#contour-shuttlexpress)
* I18n Ready
* Z-Probing

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
Run `npm update -g cncjs` to upgrade to a newer version. To determine the version, use `cnc -V`.

## Usage
Run `cnc` or `~/.npm/bin/cnc` to start the server, and visit `http://yourhostname:8000/` to view the web interface:
```bash
$ cnc
```

Run `cnc` with -h for detailed usage:
```bash
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

If you need view detailed logs for troubleshooting, you can run the server in debug mode.
```bash
$ cnc -vv
```

## Wiki
https://github.com/cheton/cnc/wiki

## Examples
There are several *.gcode files in the [examples](https://github.com/cheton/cnc/tree/master/examples) directory. You can use the GCode widget to load a GCode file and make a trial run.

If you don't have a CAM software, try using [jscut](http://jscut.org/) to create G-Code from *.svg. It's a simple CAM package that runs in the browser.

Check out a live demo at http://jscut.org/jscut.html.

## Contributions
Use [GitHub issues](https://github.com/cheton/cnc/issues) for requests.

Pull requests welcome! Learn how to [contribute](CONTRIBUTING.md).

## Donate

If you would like to support this project, you can make a donation using PayPal. Thank you!

[![Donate](https://www.paypalobjects.com/en_US/i/btn/btn_donateCC_LG.gif)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=38CYN33CWPBR2)

## License

Copyright (c) 2015-2016 Cheton Wu

Licensed under the [MIT License](LICENSE).
