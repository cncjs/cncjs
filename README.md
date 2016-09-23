# cnc [![Travis CI Build Status](https://travis-ci.org/cheton/cnc.svg)](https://travis-ci.org/cheton/cnc) [![AppVeyor Build Status](https://ci.appveyor.com/api/projects/status/bf64c0brafpp4ucg?svg=true)](https://ci.appveyor.com/project/cheton/cnc) [![Coverage Status](https://coveralls.io/repos/github/cheton/cnc/badge.svg?branch=master)](https://coveralls.io/github/cheton/cnc?branch=master)

[![NPM](https://nodei.co/npm/cncjs.png?downloads=true&stars=true)](https://www.npmjs.com/package/cncjs)
![cnc](https://raw.githubusercontent.com/cheton/cnc/master/media/banner.png)

A web-based interface for CNC milling controller running [Grbl](https://github.com/grbl/grbl) or [TinyG2](https://github.com/synthetos/g2). It runs on an [Raspberry Pi](https://www.raspberrypi.org/) or a laptop computer that you have Node.js installed, connecting to the Arduino over a serial connection using a USB serial port, a Bluetooth serial module, or a  Serial-to-WiFi module like [XBee](https://www.arduino.cc/en/Guide/ArduinoWirelessShieldS2) or [USR-WIFI232-T](https://gist.github.com/ajfisher/1fdbcbbf96b7f2ba73cd).

![cnc.png](https://raw.githubusercontent.com/cheton/cnc/master/media/cnc.png)

## Features
* Supported CNC controllers
  * Grbl v0.9 or later
  * TinyG2 v0.97 or later
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

## Browser Support
![Chrome](https://raw.github.com/alrra/browser-logos/master/chrome/chrome_48x48.png)<br>Chrome | ![Edge](https://raw.github.com/alrra/browser-logos/master/edge/edge_48x48.png)<br>Edge | ![Firefox](https://raw.github.com/alrra/browser-logos/master/firefox/firefox_48x48.png)<br>Firefox | ![IE](https://raw.github.com/alrra/browser-logos/master/internet-explorer/internet-explorer_48x48.png)<br>IE | ![Opera](https://raw.github.com/alrra/browser-logos/master/opera/opera_48x48.png)<br>Opera | ![Safari](https://raw.github.com/alrra/browser-logos/master/safari/safari_48x48.png)<br>Safari
--- | --- | --- | --- | --- | --- |
 Yes | Yes | Yes| No | Yes | Yes | 

## Installation

### Node.js Installation

Node.js v4 or higher is recommended. You can install [Node Version Manager](https://github.com/creationix/nvm) to manage multiple Node.js versions. If you have `git` installed, just clone the `nvm` repo, and check out the latest version:
```bash
$ git clone https://github.com/creationix/nvm.git ~/.nvm
$ cd ~/.nvm
$ git checkout `git describe --abbrev=0 --tags`
$ cd ..
$ . ~/.nvm/nvm.sh
$ nvm install 4
```

Add these lines to your `~/.bash_profile`, `~/.bashrc`, or `~/.profile` file to have it automatically sourced upon login: 
```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" # This loads nvm
```

If you're using Node.js v4 or earlier versions, it's recommended that you use npm v3 to install packages. To upgrade, run:
```bash
$ npm install npm@latest -g
```

### Getting Started

Make sure you're using Node.js v4 (or higher) and npm v3:
```bash
$ nvm use 4
Now using node v4.5.0 (npm v3.10.6)
```

Install `cncjs` without `sudo`, or the `serialport` module may not install correctly on some platforms like Raspberry Pi.
```bash
$ npm install -g cncjs
```

It's recommended that you run [Raspbian Jessie](https://www.raspberrypi.org/downloads/raspbian/) on the RPi2 or RPi3. For Raspbian Wheezy, be sure to [install gcc/g++ 4.8](https://somewideopenspace.wordpress.com/2014/02/28/gcc-4-8-on-raspberry-pi-wheezy/) before npm install.

Check out [wiki](https://github.com/cheton/cnc/wiki/Installation) for other installation methods.

## Upgrade
Run `npm install -g cncjs@latest` to install the latest version. To determine the version, use `cnc -V`.

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

You can help translate resource files in both of [app](https://github.com/cheton/cnc/tree/master/src/app/i18n) and [web](https://github.com/cheton/cnc/tree/master/src/web/i18n) directories from English to other languages. Check out [Localization guide](https://github.com/cheton/cnc/blob/master/CONTRIBUTING.md#localization) to learn how to get started. If you are not familiar with GitHub development, you can [open an issue](https://github.com/cheton/cnc/issues) or send your translations to cheton@gmail.com.

Locale | Language | Status | Contributors 
------ | -------- | ------ | ------------
[cs](https://github.com/cheton/cnc/tree/master/src/web/i18n/cs) | Čeština (Czech) | :heavy_check_mark: | [Miroslav Zuzelka](https://github.com/dronecz)
[de](https://github.com/cheton/cnc/tree/master/src/web/i18n/de) | Deutsch (German) | :heavy_check_mark: | [Thorsten Godau](https://github.com/dl9sec)
[es](https://github.com/cheton/cnc/tree/master/src/web/i18n/es) | Español (Spanish) | |
[fr](https://github.com/cheton/cnc/tree/master/src/web/i18n/fr) | Français (French) | :heavy_check_mark: | [Simon Maillard](https://github.com/maisim), [CorentinBrulé](https://github.com/CorentinBrule)
[it](https://github.com/cheton/cnc/tree/master/src/web/i18n/it) | Italiano (Italian) | :heavy_check_mark: | [vince87](https://github.com/vince87)
[ja](https://github.com/cheton/cnc/tree/master/src/web/i18n/ja) | にほんご (Japanese) | |
[pt-br](https://github.com/cheton/cnc/tree/master/src/web/i18n/pt-br) | Português (Brasil) | :heavy_check_mark: | [cmsteinBR](https://github.com/cmsteinBR)
[ru](https://github.com/cheton/cnc/tree/master/src/web/i18n/ru) | Ру́сский язы́к (Russian) | :heavy_check_mark: | [Denis Yusupov](https://github.com/minithc)
[zh-cn](https://github.com/cheton/cnc/tree/master/src/web/i18n/zh-cn) | 简体中文 (Simplified Chinese) | :heavy_check_mark: | [Mandy Chien](https://github.com/MandyChien), [Terry Lee](https://github.com/TerryShampoo)
[zh-tw](https://github.com/cheton/cnc/tree/master/src/web/i18n/zh-tw) | 繁體中文 (Traditional Chinese) | :heavy_check_mark: | [Cheton Wu](https://github.com/cheton)

## Donate

If you would like to support this project, you can make a donation using PayPal. Thank you!

[![Donate](https://www.paypalobjects.com/en_US/i/btn/btn_donateCC_LG.gif)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=38CYN33CWPBR2)

## License

Copyright (c) 2015-2016 Cheton Wu

Licensed under the [MIT License](https://raw.githubusercontent.com/cheton/cnc/master/LICENSE).
