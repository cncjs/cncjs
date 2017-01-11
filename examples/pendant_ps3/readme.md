# [Remote Pendant (Playstation 3 Dualshock Controller / SIXAXIS Controller)](https://github.com/cheton/cnc/issues/103)

Use [Playstation 3 Controller](https://www.playstation.com/en-us/explore/accessories/dualshock-3-ps3/) wirelessly over bluetooth to control CNC from the host device (raspberry pi). [PS3 CNC Control Button Map](https://docs.google.com/drawings/d/1DMzfBk5DSvjJ082FrerrfmpL19-pYAOcvcmTbZJJsvs/edit?usp=sharing)

Using a wireless game controller (like a PS3 controller) seems to be one of the lowest cost & simplest solution method. See related issue [#103](https://github.com/cheton/cnc/issues/103)


## Playstation Controller Setup ( general guide to connect hardware & setup )

Here is what I have figured out so far for PS3 on Raspberry PI 3 w/ integrated bluetooth.
The bellow just shows how to get PS3 controller connected.


## Bluetooth Configuration

### Install
```
# Install & Enable Bluetooth Tools
sudo apt-get install -y bluetooth libbluetooth3 libusb-dev
sudo systemctl enable bluetooth.service

# Add pi user to bluetooth group
sudo usermod -G bluetooth -a pi
```

### Pairing Tools
```
# Get and build the command line pairing tool (sixpair)
wget http://www.pabr.org/sixlinux/sixpair.c
gcc -o sixpair sixpair.c -lusb

### Connect PS3 over USB
# Get PS3 DS 
sudo ./sixpair

# 
### Disonnect PS3 over USB
bluetoothctl
### Connect PS3 over USB
devices
agent on
trust MAC # Replace "MAC" with MAC of "Device 64:D4:BD:B3:9E:66 PLAYSTATION(R)3 Controller"
trust 64:D4:BD:B3:9E:66 
quit
### Disonnect PS3 over USB, you should now be able to connect wirelessly. To check this, first list everything in /dev/input:
```

### Test Controller Connectivity
```
# List Devices
ls /dev/input

### PS3 Controller: press the PS button, the lights on the front of the controller should flash for a couple of seconds then stop, leaving a single light on. If you now look again at the contents of /dev/input you should see a new device, probably called something like ‘js0’:

# List Devices
ls /dev/input
```

### Get Battery Level
`cat "/sys/class/power_supply/sony_controller_battery_64:d4:bd:b3:9e:66/capacity"`


### Joystick Application
```
# Install
sudo apt-get install joystick

# Usage / Test
jstest /dev/input/js0
```

----------------------------------------

## Install NodeJS Libraries
 - https://www.npmjs.com/package/node-hid
 - https://www.npmjs.com/package/dualshock-controller

### Node.js DS3 Controller Setup
```
# Install Tools
sudo apt-get install -y libudev-dev libusb-1.0-0-dev
sudo apt-get install -y build-essential git
sudo apt-get install -y gcc-4.8 g++-4.8 && export CXX=g++-4.8

# Set access to /usr/lib/node_modules
ls -ld /usr/lib/node_modules; stat --format '%a' /usr/lib/node_modules
sudo chmod a+w /usr/lib/node_modules  # chmod 777
ls -ld /usr/lib/node_modules; stat --format '%a' /usr/lib/node_modules

# Install Node-HID
sudo npm install -g node-hid --unsafe-perm
-- OR --
# Compile HID
cd ~/
git clone https://github.com/node-hid/node-hid.git
cd node-hid                                        # must change into node-hid directory
git submodule update --init                        # done on publish automatically
npm install -g  # npm install                      # rebuilds the module
node-pre-gyp rebuild                               # rebuilds the C code
node-pre-gyp install --fallback-to-build

# Install Node-dualshock-controller
sudo npm install -g dualshock-controller--unsafe-perm
-- OR --
# Compile HID
cd ~/
git clone https://github.com/rdepena/node-dualshock-controller.git
cd node-dualshock-controller                       # must change into node-hid directory
git submodule update --init                        # done on publish automatically
npm install -g  # npm install                      # rebuilds the module

# Set access to /usr/lib/node_modules
sudo chmod g-w,o-w /usr/lib/node_modules  # chmod 755
ls -ld /usr/lib/node_modules; stat --format '%a' /usr/lib/node_modules

# Test
node ~/node-dualshock-controller/examples/consolePrintDualShock3.js

```

## Install Socket.io Client
```
sudo npm install -g socket.io-client
```

----------------------------------------

# Run / Test Script
```
node cnc/examples/pendant_ps3/pendant_ps3.js
```

----------------------------------------

# Auto Start

### Install [Production Process Manager [PM2]](http://pm2.io)
```
# Install Production Process Manager [PM2]
npm install pm2 -g

# Start CNC.js (on port 8000) with PM2
pm2 start cnc/examples/pendant_ps3/pendant_ps3.js

# Setup PM2 Startup Script
pm2 startup debian
#[PM2] You have to run this command as root. Execute the following command:
sudo su -c "env PATH=$PATH:/home/pi/.nvm/versions/node/v4.5.0/bin pm2 startup debian -u pi --hp /home/pi"

# Set current running apps to startup
pm2 save

# Get list of PM2 processes
pm2 list
```