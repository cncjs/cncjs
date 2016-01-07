# CNC.js [![build status](https://travis-ci.org/cheton/cnc.js.svg?branch=master)](https://travis-ci.org/cheton/cnc.js) [![Coverage Status](https://coveralls.io/repos/cheton/cnc.js/badge.svg)](https://coveralls.io/r/cheton/cnc.js)

[![NPM](https://nodei.co/npm/cncjs.png?downloads=true&stars=true)](https://nodei.co/npm/cncjs/)
![cncjs](https://raw.githubusercontent.com/cheton/cnc.js/master/media/banner2.png)

CNC.js is a web-based CNC milling controller for the [Arduino](https://www.arduino.cc/) running [Grbl](https://github.com/grbl/grbl). It runs on an [Raspberry Pi](https://www.raspberrypi.org/) or a laptop computer that you have Node.js installed, connecting to the Arduino over a serial connection using a USB serial port, a Bluetooth serial module, or a  Serial-to-WiFi module like [XBee](https://www.arduino.cc/en/Guide/ArduinoWirelessShieldS2) or [USR-WIFI232-T](https://gist.github.com/ajfisher/1fdbcbbf96b7f2ba73cd).

![cnc.js](https://raw.githubusercontent.com/cheton/cnc.js/master/media/cncjs.png) 

## Demo
JSDC 2015 speech: http://cheton.github.io/jsdc2015/#/81
[![CNC](http://img.youtube.com/vi/fJyq4fyiGSc/0.jpg)](https://www.youtube.com/watch?v=fJyq4fyiGSc&hd=2 "CNC.js")

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

Check out [Git Installation](https://github.com/cheton/cnc.js#git-installation) and [Docker Image Installation (x64 only)](https://github.com/cheton/cnc.js#docker-image-installation-x64-only) for other installation methods.

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

    -h, --help               output usage information
    -V, --version            output the version number
    -p, --port               set listen port (default: 8000)
    -l, --host               set listen address or hostname (default: 0.0.0.0)
    -b, --backlog            set listen backlog (default: 511)
    -c, --config <filename>  set config file (default: ~/.cncrc)
    -d, --debug              run in debug mode
```

## Git Installation
If you prefer to use Git instead of `npm install`, You can create a local clone of the repository on your computer and sync from GitHub. Type the following commands to install and run `cnc.js`:
```bash
$ git clone https://github.com/cheton/cnc.js.git
$ cd cnc.js
$ npm install --production
$ ./bin/cnc
```

To update your local copy with latest changes, use:
```bash
$ git pull
$ npm install --production
$ ./bin/cnc
```

## Docker Image Installation (x64 only)
Alternatively, you can install and run a Docker image within a Docker container. The first installation may take a long time to complete, but further updates will be much faster.

To install and set up cnc.js, take the following steps:

<b>Step 1:</b> Enter the following command to retrieve the latest version of the image:
```bash
$ docker pull cheton/cnc:latest
```

<b>Step 2:</b> Use the `docker run` command to create the Docker container and run the server, like so:
```bash
$ docker run --privileged -p 8000:8000 --rm --name cnc cheton/cnc:latest
```
By default a container is not allowed to access any devices, but a "privileged" container is given access to all devices on the host.

<b>Step 3:</b> If everything works fine, you should be able to view the web interface at `http://yourhostname:8000/`.

### Tips

If you run into issues and need to restart the Docker container, use the following commands to first stop the Docker application, and then start it up again:
```bash
$ docker stop cnc
$ docker start cnc 
```

To view a list of all containers that are currently running in your Docker environment, use:
```bash
$ docker ps
```

To view all the images you have pulled into your Docker environment, use:
```bash
$ docker images
```

To delete containers in your Docker environment, use:
```bash
$ docker rm CONTAINER_ID
```

To delete images in your Docker environment, use:
```bash
$ docker rmi IMAGE_ID
```

To view the container in your terminal, use:
```bash
$ docker attach cnc
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

### Photo Gallery
[![Photo Gallery](https://scontent.xx.fbcdn.net/hphotos-xat1/v/t1.0-9/12118907_10207901191546433_3867236073352040616_n.jpg?oh=97c977c426367130eef35b5e230637c4&oe=56A65008)](https://www.facebook.com/cheton.wu/media_set?set=a.10207901184746263.1073741852.1195704289&type=3)

## License

Copyright (c) 2015-2016 Cheton Wu

Licensed under the [MIT License](LICENSE).

## Donate

If you would like to support this project, you can make a donation using PayPal. Thank you!

[![Donate](https://www.paypalobjects.com/en_US/i/btn/btn_donateCC_LG.gif)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=38CYN33CWPBR2)
