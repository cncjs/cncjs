# cnc [![Travis CI Build Status](https://travis-ci.org/cheton/cnc.svg)](https://travis-ci.org/cheton/cnc) [![AppVeyor Build Status](https://ci.appveyor.com/api/projects/status/bf64c0brafpp4ucg?svg=true)](https://ci.appveyor.com/project/cheton/cnc) [![Coverage Status](https://coveralls.io/repos/github/cheton/cnc/badge.svg?branch=master)](https://coveralls.io/github/cheton/cnc?branch=master)

[![NPM](https://nodei.co/npm/cncjs.png?downloads=true&stars=true)](https://www.npmjs.com/package/cncjs)
![cnc](https://raw.githubusercontent.com/cheton/cnc/master/media/banner.png)

A web-based CNC milling controller for the [Arduino](https://www.arduino.cc/) running [Grbl](https://github.com/grbl/grbl). It runs on an [Raspberry Pi](https://www.raspberrypi.org/) or a laptop computer that you have Node.js installed, connecting to the Arduino over a serial connection using a USB serial port, a Bluetooth serial module, or a  Serial-to-WiFi module like [XBee](https://www.arduino.cc/en/Guide/ArduinoWirelessShieldS2) or [USR-WIFI232-T](https://gist.github.com/ajfisher/1fdbcbbf96b7f2ba73cd).

![cnc.png](https://raw.githubusercontent.com/cheton/cnc/master/media/cnc.png)


## Key Features
* Supported CNC controllers
  * Grbl v0.9 or later
  * TinyG2 will be supported in v2.x
* [Desktop App for Linux, Mac OS X, and Windows](https://github.com/cheton/cnc/wiki/Desktop-App)
* 3D Visualizer
* Allows multiple HTTP connections at the same serial port
* Responsive view for small screen display with device width less than 720px
  - <i>Safari on an iPhone 5S</i><br>
  <img src="https://cloud.githubusercontent.com/assets/447801/15633749/b817cd4a-25e7-11e6-9beb-600c65ea1324.PNG" width="240" />
  <img src="https://cloud.githubusercontent.com/assets/447801/15633750/b819b5f6-25e7-11e6-8bfe-d3e6247e443b.PNG" width="240" />
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

## Localization

You can help translate [src/app/i18n/en/resource.json](https://github.com/cheton/cnc/tree/master/src/app/i18n/en/resource.json) and [src/web/i18n/en/resource.json](https://github.com/cheton/cnc/tree/master/src/web/i18n/en/resource.json) files from English to other languages. Check out [Localization guide](https://github.com/cheton/cnc/blob/master/CONTRIBUTING.md#localization) to learn how to get started. If you are not familiar with GitHub development, you can [open an issue](https://github.com/cheton/cnc/issues) or send your translations to cheton@gmail.com.

Locale | Language | Status | Contributors 
------ | -------- | ------ | ------------
[cs](https://github.com/cheton/cnc/tree/master/src/web/i18n/cs/resource.json)       | Čeština (Czech) | :heavy_check_mark: | [Miroslav Zuzelka](https://github.com/dronecz)
[de](https://github.com/cheton/cnc/tree/master/src/web/i18n/de/resource.json)       | Deutsch (German) | :heavy_check_mark: | [Thorsten Godau](https://github.com/dl9sec)
[es](https://github.com/cheton/cnc/tree/master/src/web/i18n/es/resource.json)       | Español (Spanish) | |
[fr](https://github.com/cheton/cnc/tree/master/src/web/i18n/fr/resource.json)       | Français (French) | |
[it](https://github.com/cheton/cnc/tree/master/src/web/i18n/it/resource.json)       | Italiano (Italian) | |
[ja](https://github.com/cheton/cnc/tree/master/src/web/i18n/ja/resource.json)       | にほんご (Japanese) | |
[ru](https://github.com/cheton/cnc/tree/master/src/web/i18n/ru/resource.json)       | Ру́сский язы́к (Russian) | :heavy_check_mark: | [Denis Yusupov](https://github.com/minithc)
[zh-cn](https://github.com/cheton/cnc/tree/master/src/web/i18n/zh-cn/resource.json) | 简体中文 (Simplified Chinese) | |
[zh-tw](https://github.com/cheton/cnc/tree/master/src/web/i18n/zh-tw/resource.json) | 繁體中文 (Traditional Chinese) | :heavy_check_mark: | [Cheton Wu](https://github.com/cheton)

## Donate

If you would like to support this project, you can make a donation using PayPal. Thank you!

[![Donate](https://www.paypalobjects.com/en_US/i/btn/btn_donateCC_LG.gif)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=38CYN33CWPBR2)

## License

Copyright (c) 2015-2016 Cheton Wu

Licensed under the [MIT License](https://raw.githubusercontent.com/cheton/cnc/master/LICENSE).
