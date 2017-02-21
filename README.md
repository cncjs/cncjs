# cncjs [![Travis CI Build Status](https://travis-ci.org/cncjs/cncjs.svg)](https://travis-ci.org/cncjs/cncjs) [![AppVeyor Build status](https://ci.appveyor.com/api/projects/status/qxx53wq32w3edule?svg=true)](https://ci.appveyor.com/project/cheton/cncjs) [![Coverage Status](https://coveralls.io/repos/github/cncjs/cncjs/badge.svg?branch=master)](https://coveralls.io/github/cncjs/cncjs?branch=master)

[![NPM](https://nodei.co/npm/cncjs.png?downloads=true&stars=true)](https://www.npmjs.com/package/cncjs)
![cncjs](https://raw.githubusercontent.com/cncjs/cncjs/master/media/banner.png)

A web-based interface for CNC milling controller running [Grbl](https://github.com/grbl/grbl), [Smoothieware](https://github.com/Smoothieware/Smoothieware), or [TinyG](https://github.com/synthetos/TinyG). It runs on an [Raspberry Pi](https://www.raspberrypi.org/) or a laptop computer that you have Node.js installed, connecting to the Arduino over a serial connection using a USB serial port, a Bluetooth serial module, or a  Serial-to-WiFi module like [XBee](https://www.arduino.cc/en/Guide/ArduinoWirelessShieldS2) or [USR-WIFI232-T](https://gist.github.com/ajfisher/1fdbcbbf96b7f2ba73cd).

![cnc.png](https://raw.githubusercontent.com/cncjs/cncjs/master/media/cnc.png)

## Features
* Supported CNC controllers
    - [Grbl](https://github.com/gnea/grbl)
    - [Smoothieware](https://github.com/Smoothieware/Smoothieware)
    - [TinyG](https://github.com/synthetos/TinyG) and [g2core](https://github.com/synthetos/g2)
* [Desktop App for Linux, Mac OS X, and Windows](https://github.com/cncjs/cncjs/wiki/Desktop-App)
* 3D Visualizer
* Allows multiple HTTP connections at the same serial port
* Responsive view for small screen display with device width less than 720px
    - <i>Safari on an iPhone 5S</i> [\[1\]](https://cloud.githubusercontent.com/assets/447801/15633749/b817cd4a-25e7-11e6-9beb-600c65ea1324.PNG) [\[2\]](https://cloud.githubusercontent.com/assets/447801/15633750/b819b5f6-25e7-11e6-8bfe-d3e6247e443b.PNG)
* [Account Management](https://github.com/cncjs/cncjs/wiki/User-Guide#account-management)
* [Widget Management](https://github.com/cncjs/cncjs/wiki/User-Guide#widget-management)
* [Keyboard Shortcuts](https://github.com/cncjs/cncjs/wiki/User-Guide#keyboard-shortcuts)
* [Contour ShuttleXpress](https://github.com/cncjs/cncjs/wiki/User-Guide#contour-shuttlexpress)
* Multi-Language Support 
* Watch Directory
* Z-Probing

## Ecosystem

* [cncjs-pendant-ps3](https://github.com/cncjs/cncjs-pendant-ps3)
* [cncjs-pendant-tinyweb](https://github.com/cncjs/cncjs-pendant-tinyweb)

## Browser Support
![Chrome](https://raw.github.com/alrra/browser-logos/master/src/chrome/chrome_48x48.png)<br>Chrome | ![Edge](https://raw.github.com/alrra/browser-logos/master/src/edge/edge_48x48.png)<br>Edge | ![Firefox](https://raw.github.com/alrra/browser-logos/master/src/firefox/firefox_48x48.png)<br>Firefox | ![IE](https://raw.github.com/alrra/browser-logos/master/src/archive/internet-explorer_9-11/internet-explorer_9-11_48x48.png)<br>IE | ![Opera](https://raw.github.com/alrra/browser-logos/master/src/opera/opera_48x48.png)<br>Opera | ![Safari](https://raw.github.com/alrra/browser-logos/master/src/safari/safari_48x48.png)<br>Safari
--- | --- | --- | --- | --- | --- |
 Yes | Yes | Yes| Not supported | Yes | Yes | 

## Getting Started

### Node.js Installation

Node.js 4 or higher is recommended. You can install [Node Version Manager](https://github.com/creationix/nvm) to manage multiple Node.js versions. If you have `git` installed, just clone the `nvm` repo, and check out the latest version:
```
git clone https://github.com/creationix/nvm.git ~/.nvm
cd ~/.nvm
git checkout `git describe --abbrev=0 --tags`
cd ..
. ~/.nvm/nvm.sh
```

Add these lines to your `~/.bash_profile`, `~/.bashrc`, or `~/.profile` file to have it automatically sourced upon login: 
```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" # This loads nvm
```

Once installed, you can select Node.js versions with:
```
nvm install 4
nvm use 4
```

If you're using Node.js 4 or earlier versions, it's recommended that you upgrade npm to the latest version. To upgrade, run:
```
npm install npm@latest -g
```

### Installation

Install cncjs as a non-root user, or the [serialport](https://github.com/EmergingTechnologyAdvisors/node-serialport) module may not install correctly on some platforms like Raspberry Pi.
```
npm install -g cncjs
```

If you're going to use sudo or root to install cncjs, you need to specify the `--unsafe-perm` option to run npm as the root account.
```
sudo npm install --unsafe-perm -g cncjs
```

It's recommended that you run [Raspbian Jessie](https://www.raspberrypi.org/downloads/raspbian/) on the RPi2 or RPi3. For Raspbian Wheezy, be sure to [install gcc/g++ 4.8](https://somewideopenspace.wordpress.com/2014/02/28/gcc-4-8-on-raspberry-pi-wheezy/) before npm install.

Check out [https://cnc.js.org/docs/installation/](https://cnc.js.org/docs/installation/) for other installation methods.

### Upgrade

Run `npm install -g cncjs@latest` to install the latest version. To determine the version, use `cnc -V`.

### Usage

Run `cnc` to start the server, and visit `http://yourhostname:8000/` to view the web interface. Pass `--help` to `cnc` for more options.

```
pi@rpi3$ cnc -h

  Usage: cnc [options]
  
  Options:

    -h, --help                          output usage information
    -V, --version                       output the version number
    -p, --port                          set listen port (default: 8000)
    -l, --host                          set listen address or hostname (default: 0.0.0.0)
    -b, --backlog                       set listen backlog (default: 511)
    -c, --config <filename>             set config file (default: ~/.cncrc)
    -v, --verbose                       increase the verbosity level
    -m, --mount [<url>:]<path>          set the mount point for serving static files (default: /static:static)
    -w, --watch-directory <path>        watch a directory for changes
    --access-token-lifetime <lifetime>  access token lifetime in seconds or a time span string (default: 30d)
    --allow-remote-access               allow remote access to the server

  Examples:

    $ cnc -vv
    $ cnc --mount /pendant:/home/pi/tinyweb
    $ cnc --watch-directory /home/pi/watch
    $ cnc --access-token-lifetime 60d  # e.g. 3600, 30m, 12h, 30d
    $ cnc --allow-remote-access
```

Instead of passing command line options for `--watch-directory`, `--access-token-lifetime`, and `--allow-remote-access`, you can create a `~/.cncrc` file that contains the following configuration in JSON format:
```json
{
    "watchDirectory": "/path/to/dir",
    "accessTokenLifetime": "30d",
    "allowRemoteAccess": false
}
```

To troubleshoot issues, run:
```
cnc -vvv
```

### Configuration File

The configuration file <b>.cncrc</b> contains settings that are equivalent to the cnc command-line options. The configuration file is stored in user's home directory. To find out the actual location of the home directory, do the following:

* Linux/Mac
  ```sh
  echo $HOME
  ```

* Windows
  ```sh
  echo %USERPROFILE%
  ```

Check out an example configuration file [here](https://github.com/cncjs/cncjs/blob/master/examples/.cncrc).

### File Format
```json
{
  "watchDirectory": "/path/to/dir",
  "accessTokenLifetime": "30d",
  "allowRemoteAccess": false,
  "state": {
    "checkForUpdates": true
  },
  "commands": [
    {
      "text": "Update (root user)",
      "command": "sudo npm install -g cncjs@latest --unsafe-perm; pkill -a -f cnc"
    },
    {
      "text": "Update (non-root user)",
      "command": "npm install -g cncjs@latest; pkill -a -f cnc"
    },
    {
      "text": "Reboot",
      "command": "sudo /sbin/reboot"
    },
    {
      "text": "Shutdown",
      "command": "sudo /sbin/shutdown"
    }
  ],
  "macros": [],
  "users": []
}
```

## Documentation

https://cnc.js.org/docs/

## Examples

There are several *.gcode files in the [examples](https://github.com/cncjs/cncjs/tree/master/examples) directory. You can use the GCode widget to load a GCode file and make a trial run.

If you don't have a CAM software, try using [jscut](http://jscut.org/) to create G-Code from *.svg. It's a simple CAM package that runs in the browser.

Check out a live demo at http://jscut.org/jscut.html.

## Contributions

Use [GitHub issues](https://github.com/cncjs/cncjs/issues) for requests.

Pull requests welcome! Learn how to [contribute](CONTRIBUTING.md).

## Localization

You can help translate resource files in both of [app](https://github.com/cncjs/cncjs/tree/master/src/app/i18n) and [web](https://github.com/cncjs/cncjs/tree/master/src/web/i18n) directories from English to other languages. Check out [Localization guide](https://github.com/cncjs/cncjs/blob/master/CONTRIBUTING.md#localization) to learn how to get started. If you are not familiar with GitHub development, you can [open an issue](https://github.com/cncjs/cncjs/issues) or send your translations to cheton@gmail.com.

Locale | Language | Status | Contributors 
:----- | :------- | :----- | :-----------
[cs](https://github.com/cncjs/cncjs/tree/master/src/web/i18n/cs) | Čeština (Czech) | ✔ | [Miroslav Zuzelka](https://github.com/dronecz)
[de](https://github.com/cncjs/cncjs/tree/master/src/web/i18n/de) | Deutsch (German) | ✔ | [Thorsten Godau](https://github.com/dl9sec)
[es](https://github.com/cncjs/cncjs/tree/master/src/web/i18n/es) | Español (Spanish) | |
[fr](https://github.com/cncjs/cncjs/tree/master/src/web/i18n/fr) | Français (French) | ✔ | [Simon Maillard](https://github.com/maisim), [CorentinBrulé](https://github.com/CorentinBrule)
[it](https://github.com/cncjs/cncjs/tree/master/src/web/i18n/it) | Italiano (Italian) | ✔ | [vince87](https://github.com/vince87)
[hu](https://github.com/cncjs/cncjs/tree/master/src/web/i18n/hu) | Magyar (Hungarian) | ✔ | Sipos Péter
[pt-br](https://github.com/cncjs/cncjs/tree/master/src/web/i18n/pt-br) | Português (Brasil) | ✔ | [cmsteinBR](https://github.com/cmsteinBR)
[ru](https://github.com/cncjs/cncjs/tree/master/src/web/i18n/ru) | Ру́сский (Russian) | ✔ | [Denis Yusupov](https://github.com/minithc)
[zh-tw](https://github.com/cncjs/cncjs/tree/master/src/web/i18n/zh-tw) | 繁體中文 (Traditional Chinese) | ✔ | [Cheton Wu](https://github.com/cheton)
[zh-cn](https://github.com/cncjs/cncjs/tree/master/src/web/i18n/zh-cn) | 简体中文 (Simplified Chinese) | ✔ | [Mandy Chien](https://github.com/MandyChien), [Terry Lee](https://github.com/TerryShampoo)
[ja](https://github.com/cncjs/cncjs/tree/master/src/web/i18n/ja) | 日本語 (Japanese) | ✔ | [Naoki Okamoto](https://github.com/toonaoki)

## Donate

If you would like to support this project, you can make a donation using PayPal. Thank you!

[![Donate](https://www.paypalobjects.com/en_US/i/btn/btn_donateCC_LG.gif)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=38CYN33CWPBR2)

## License

Licensed under the [MIT License](https://raw.githubusercontent.com/cncjs/cncjs/master/LICENSE).
