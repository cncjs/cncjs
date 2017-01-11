// Node.js Playstation 3 / DS3 Controller for CNC.js
// by Austin St. Aubin <austinsaintaubin@gmail.com>
// v0.8 BETA [2016/12/24]
// https://github.com/cheton/cnc/issues/103
// [PS3 CNC Control Button Map](https://docs.google.com/drawings/d/1DMzfBk5DSvjJ082FrerrfmpL19-pYAOcvcmTbZJJsvs/edit?usp=sharing)

// [Dependacies]
var io = require('socket.io-client');  // Socket.io connection to CNC
var jwt = require('jsonwebtoken');
var fs = require('fs');
var path = require('path');
var dualShock = require('dualshock-controller');  // ttps://www.npmjs.com/package/dualshock-controller


// [Varables]
var controller_serial_port = '/dev/ttyUSB0'
var controller_serial_baud = 115200

var socket_address = 'localhost'
	socket_port = '8000'
	socket_token_expiration = '30d' // The access token lifetime is a required field for jsonwebtoken, it can be expressed in seconds (e.g. 60) or a time span string like '7 days', '3d', '1h'.

var socket, controller;

// =====================================================
// Check/Wait for Controller to Connect
setInterval(checkController, 3*1000);
var controler_started = false;

// [Function] check for controller to conect (show up in devices), then start services. Kill services on disconect.
function checkController(socket, controller) {
	//console.log('Checkign Controller Status');

	// Check if Controller Exist
	fs.stat('/dev/input/js0', function(err, stat) {
		if(err == null) {
			// Controller Conected
			//console.log('js0 exists');

			if (!controler_started) {
				console.log('Controller Conected: /dev/input/js0');
				console.log('Starting Services');

				// Start Socket Connection & Controller Conection
				run();

				// Set Startup Varable
				controler_started = true;
			}

		} else if(err.code == 'ENOENT') {
			// Controller Disconected / Not Conected
			//console.log('js0 NOT exists');

			if (controler_started) {
				console.log('Stopping Services');

				// Kill Socket Connection
				//socket.destroy();

				// Kill  Controller Conection
				//controller.destroy();

				// !!!!!!!!!!!!!!! Exit Script (to be relauched by pm2)
				console.log('Exiting Script');
				process.exit();

				// Set Startup Varable
				controler_started = false;
			}
		} else {
			// Error Message
			console.log('An unexpected error has occurred: ', err.code);
		}
	});
}


// RUN EVERYTHING
function run(socket, controller)
{
	// =====================================================
	// [Socket.io Connection]

	// [Function] Generate Access Token
	// https://github.com/auth0/node-jsonwebtoken#jwtsignpayload-secretorprivatekey-options-callback
	var generateAccessToken = function(payload, secret, expiration) {
	    var token = jwt.sign(payload, secret, {
	        expiresIn: expiration //'30d' // 30 days
	    });

	    return token;
	};

	// Get Secret & Generate Token
	var getUserHome = function () { return process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME']; };
	var cncrc = path.resolve(getUserHome(), '.cncrc');
	var config = JSON.parse(fs.readFileSync(cncrc, 'utf8'));
	var token = generateAccessToken({ id: '', name: 'pendent' }, config.secret, '30d');

	/*
	// Debugging Output
	console.log('config.secret: ' + config.secret);
	console.log('config.secret: ' + token);
	*/

	// Connect to Socket.io on CNC
	//var socket = io.connect('ws://' + socket_address + ':' + socket_port, {
	socket = io.connect('ws://' + socket_address + ':' + socket_port, {
	  'query': 'token=' + token
	});

	// Detect Connect
	socket.on('connect', function() {
		console.log('Socket IO [Connected]: ' + socket_address + ':' + socket_port);


		// List Serial Ports
	    socket.emit('list');
	    socket.on ('serialport:list', function (data) {
		    console.log('-------------------------');
		    console.log('Listed Serial Ports: ');

			// List Ports
			for (var i = 0; i < data.length; i++) {
				console.log(i + "] Seral Port List: " + data[i].port);
			}

			console.log('-------------------------');
		});

		// Open port
		socket.emit('open', controller_serial_port, { baudrate: Number(controller_serial_baud) });
		console.log('Opened Serial Port: ' + controller_serial_port + ':' + controller_serial_baud);

		// Close port
		//socket.send('close', controller_serial_port);

		// Write
		//socket.send('write', controller_serial_port, 'G0 X0 Y0 Z0\n'); // should contain a newline character
		//socket.send('write', controller_serial_port, '?'); // No newline for Grbl realtime commands

		// Command
		//socket.emit('command', controller_serial_port, 'homing');
		//socket.send('command', controller_serial_port, 'cyclestart');
		//socket.send('command', controller_serial_port, 'reset');
	});

	// Detect Disconnect
	socket.on('disconnect', function() {
		 console.log('Socket IO [Disconnected]: ' + socket_address + ':' + socket_port);
	});

	// Redirect user to the Sign In page
	socket.on('error', function() {
		// Close port
		console.log('Closed Serial Port: ' + controller_serial_port + ':' + controller_serial_baud);
		socket.send('close', controller_serial_port);


		 // Disconnect
		 socket.destroy();
		 console.log('Socket IO ERROR, token is likly invalid');
	});


	// =====================================================
	// Play Station 3 Controller / Game Pad
	// https://www.npmjs.com/package/dualshock-controller
	//var dualShock = require('dualshock-controller');

	//pass options to init the controller.
	//var controller = dualShock(
	controller = dualShock(
		 {
			  //you can use a ds4 by uncommenting this line.
			  //config: "dualshock4-generic-driver",
			  //if using ds4 comment this line.
			  config : "dualShock3",
			  //smooths the output from the acelerometers (moving averages) defaults to true
			  accelerometerSmoothing : true,
			  //smooths the output from the analog sticks (moving averages) defaults to false
			  analogStickSmoothing : false // DO NOT ENABLE, does not retun sticks to center when enabled. 128 x 128
		 });

	//make sure you add an error event handler
	controller.on('connection:change', data => console.log("Conection" + data));

	controller.on('connected', function(state) {
		console.log('connected: ' + state);
	});

	controller.on('error', function(data) {
		controller.destroy();
		console.log('error: ' + data);
	});

	// ------------------------------------------

	// Safety Switches & Modifyers

	// psx
	var psx = false;
	controller.on('psxButton:press', function(data) {
		psx = true;
		//console.log(data + '|' + psx);
	});
	controller.on('psxButton:release', function(data) {
		psx = false;
		//console.log(data + '|' + psx);
	});

	// L1
	var l1 = false;
	controller.on('l1:press', function(data) {
		l1 = true;
		//console.log(data + '|' + l1);
	});
	controller.on('l1:release', function(data) {
		l1 = false;
		//console.log(data + '|' + l1);
	});

	// R1
	var r1 = false;
	controller.on('r1:press', function(data) {
		r1 = true;
		//console.log(data + '|' + r1);
	});
	controller.on('r1:release', function(data) {
		r1 = false;
		//console.log(data + '|' + r1);
	});

	// L2
	var l2 = false;
	controller.on('l2:press', function(data) {
		l2 = true;
		//console.log(data + '|' + l2);
	});
	controller.on('l2:release', function(data) {
		l2 = false;
		//console.log(data + '|' + l2);
	});

	// R2
	var r2 = false;
	controller.on('r2:press', function(data) {
		r2 = true;
		//console.log(data + '|' + r2);
	});
	controller.on('r2:release', function(data) {
		r2 = false;
		//console.log(data + '|' + r2);
	});

	// ------------------------------------------

	// Homing
	controller.on('start:press', function(data) {
		if (psx) {
			socket.emit('command', controller_serial_port, 'homing');
			//console.log('homing:' + data);
		}
	});

	// Reset
	controller.on('select:press', function(data) {
		if (psx) {
			socket.emit('command', controller_serial_port, 'reset');
			//console.log('reset:' + data);
		}
	});


	// Cyclestart
	controller.on('start:press', function(data) {
		if (!psx) {
			socket.emit('command', controller_serial_port, 'cyclestart');
			//console.log('cyclestart:' + data);
		}
	});

	// Feedhold
	controller.on('select:press', function(data) {
		if (!psx) {
			socket.emit('command', controller_serial_port, 'feedhold');
			//console.log('feedhold:' + data);
		}
	});

	// ------------------------------------------

	// Raise Z
	controller.on('triangle:hold', function(data) {
		if (l1) {
			socket.emit('command', controller_serial_port, 'gcode', 'G91 G0 Z0.25'); // Switch to relative coordinates, Move one unit right in X and one unit right in Y
			socket.emit('command', controller_serial_port, 'gcode', 'G90');  // Switch back to absolute coordinates

			//console.log('Raising Z:' + data);
		}
	});

	// Probe
	controller.on('square:press', function(data) {
		if (l1) {
			socket.emit('command', controller_serial_port, 'gcode', 'G91');
			socket.emit('command', controller_serial_port, 'gcode', 'G38.2 Z-15.001 F120');
			socket.emit('command', controller_serial_port, 'gcode', 'G90');
			socket.emit('command', controller_serial_port, 'gcode', 'G10 L20 P1 Z15.001');
			socket.emit('command', controller_serial_port, 'gcode', 'G91');
			socket.emit('command', controller_serial_port, 'gcode', 'G0 Z3');
			socket.emit('command', controller_serial_port, 'gcode', 'G90');

			//console.log('probe:' + data);
		}
	});

	// Lower Z (Slow)
	controller.on('circle:hold', function(data) {
		if (l1) {
			socket.emit('command', controller_serial_port, 'gcode', 'G91 G0 Z-0.05'); // Switch to relative coordinates, Move one unit right in X and one unit right in Y
			socket.emit('command', controller_serial_port, 'gcode', 'G90');  // Switch back to absolute coordinates

			//console.log('Lowering Z:' + data);
		}
	});

	// Lower Z
	controller.on('x:hold', function(data) {
		if (l1) {
			socket.emit('command', controller_serial_port, 'gcode', 'G91 G0 Z-0.25'); // Switch to relative coordinates, Move one unit right in X and one unit right in Y
			socket.emit('command', controller_serial_port, 'gcode', 'G90');  // Switch back to absolute coordinates

			//console.log('Lowering Z:' + data);
		}
	});

	// ------------------------------------------

	// Start
	controller.on('triangle:press', function(data) {
		if (r1) {
			socket.emit('command', controller_serial_port, 'start');
			//console.log('start:' + data);
		}
	});

	// Stop
	controller.on('square:press', function(data) {
		if (r1) {
			socket.emit('command', controller_serial_port, 'stop');
			//console.log('stop:' + data);
		}
	});

	// Pause
	controller.on('circle:press', function(data) {
		if (r1) {
			socket.emit('command', controller_serial_port, 'pause');
			//console.log('pause:' + data);
		}
	});

	// Resume
	controller.on('x:press', function(data) {
		if (r1) {
			socket.emit('command', controller_serial_port, 'resume');
			//console.log('resume:' + data);
		}
	});

	// ------------------------------------------

	// Cyclestart
	controller.on('triangle:press', function(data) {
		if (!r1 && !l1 && !psx) {
			socket.emit('command', controller_serial_port, 'cyclestart');
			//console.log('cyclestart:' + data);
		}
	});

	// Feedhold
	controller.on('square:press', function(data) {
		if (!r1 && !l1 && !psx) {
			socket.emit('command', controller_serial_port, 'feedhold');
			//console.log('feedhold:' + data);
		}
	});


	// Pause
	controller.on('circle:press', function(data) {
		if (!r1 && !l1 && !psx) {
			socket.emit('command', controller_serial_port, 'pause');
			//console.log('pause:' + data);
		}
	});

	// Unlock
	controller.on('x:press', function(data) {
		if (!r1 && !l1 && !psx) {
			socket.emit('command', controller_serial_port, 'unlock');
			//console.log('unlock:' + data);
		}
	});


	// ------------------------------------------

/*
	// Raise Z
	controller.on('triangle:press', function(data) {
		if (psx) {
			socket.emit('command', controller_serial_port, 'gcode', 'G91 G0 Z0.1'); // Switch to relative coordinates, Move one unit right in X and one unit right in Y
			socket.emit('command', controller_serial_port, 'gcode', 'G90');  // Switch back to absolute coordinates

			console.log('Raising Z:' + data);
		}
	});

	//
	controller.on('square:press', function(data) {
		if (psx) {

		}
	});


	// Probe
	controller.on('circle:press', function(data) {
		if (psx) {
			socket.emit('command', controller_serial_port, 'gcode', 'G91');
			socket.emit('command', controller_serial_port, 'gcode', 'G38.2 Z-15.001 F120');
			socket.emit('command', controller_serial_port, 'gcode', 'G90');
			socket.emit('command', controller_serial_port, 'gcode', 'G10 L20 P1 Z15.001');
			socket.emit('command', controller_serial_port, 'gcode', 'G91');
			socket.emit('command', controller_serial_port, 'gcode', 'G0 Z3');
			socket.emit('command', controller_serial_port, 'gcode', 'G90');

			console.log('probe:' + data);
		}
	});

	// Lower Z
	controller.on('x:hold', function(data) {
		if (psx) {
			socket.emit('command', controller_serial_port, 'gcode', 'G91 G0 Z-0.1'); // Switch to relative coordinates, Move one unit right in X and one unit right in Y
			socket.emit('command', controller_serial_port, 'gcode', 'G90');  // Switch back to absolute coordinates

			console.log('Lowering Z:' + data);
		}
	});
*/

	// ------------------------------------------

	// ==[ D Pad ]==

	// Move Gantry X | Y
	function moveAxis(axis, direction, speed) {
		// Set Direction
		if (direction) {
			direction = '';
		} else {
			direction = '-';
		}

		// Set Spped
		switch(speed) {
		    case 1:
		        speed = 0.05;
		        break;
		    case 3:
		        speed = 5;
		        break;
		    default:
		        speed = 0.5;
		}

		// Send gCode
		socket.emit('command', controller_serial_port, 'gcode', 'G91 G0 ' + axis + direction + speed);
		socket.emit('command', controller_serial_port, 'gcode', 'G90');  // Switch back to absolute coordinates

		// Debuging
		//console.log(axis + ': ' + direction + ' | ' + speed);
	}

	// Move Gantry Based on DPad
	function dpad(axis, direction, name) {
		if (l1) {
			// Fast
			moveAxis(axis, direction, 3);
		} else if (r1) {
			// Slow
			moveAxis(axis, direction, 1);
		} else {
			// Normal
			moveAxis(axis, direction, 2);
		}


		// Debugging
		//console.log(name + ': ' + direction + ' | ' + axis + ' | ' +  + l1 + r1);
	}

	// - - - - - - - - - - - - - - - - - - - -

	// Y Up
	controller.on('dpadUp:press', function(data) {
		dpad('Y', true, data)
	});
	controller.on('dpadUp:hold', function(data) {
		dpad('Y', true, data)
	});

	// Y Down
	controller.on('dpadDown:press', function(data) {
		dpad('Y', false, data)
	});
	controller.on('dpadDown:hold', function(data) {
		dpad('Y', false, data)
	});

	// X Right
	controller.on('dpadRight:press', function(data) {
		dpad('X', true, data)
	});
	controller.on('dpadRight:hold', function(data) {
		dpad('X', true, data)
	});

	// X Left
	controller.on('dpadLeft:press', function(data) {
		dpad('X', false, data)
	});
	controller.on('dpadLeft:hold', function(data) {
		dpad('X', false, data)
	});

	// ------------------------------------------

	// Spendle ON State
	var spindle = false;

	// Start Spindle
	controller.on('r2:press', function(data) {
		if (r2 && l2 && psx) {
			socket.emit('command', controller_serial_port, 'gcode', 'M3 S1000');
			spindle = true;
			//console.log('Spindle: ' + spindle);
		}
	});
	controller.on('l2:press', function(data) {
		if (r2 && l2 && psx) {
			socket.emit('command', controller_serial_port, 'gcode', 'M3 S1000');
			spindle = true;
			//console.log('Spindle: ' + spindle);
		}
	});

	// Stop Spendle
	controller.on('r2:release', function(data) {
		if (!psx && spindle) {
			socket.emit('command', controller_serial_port, 'gcode', 'M5');
			spindle = false;
			//console.log('Spindle: ' + spindle);
		}
	});
	controller.on('l2:release', function(data) {
		if (!psx && spindle) {
			socket.emit('command', controller_serial_port, 'gcode', 'M5');
			spindle = false;
			//console.log('Spindle: ' + spindle);
		}
	});

	// ------------------------------------------

	// Analog Sticks
	var stick_sensitivity = 1; // Do not set bellow 1

	var left_x = 0;
		left_y = 0;
	var right_x = 0;
		right_y = 0;

	// Safty
	var stick_left = false;
		stick_right = false;

	// Safty = Stick Button
	controller.on('leftAnalogBump:press', function(data) {
		stick_left = true;
		//console.log(data + '|' + stick_left);
	});
	controller.on('leftAnalogBump:release', function(data) {
		stick_left = false;
		//console.log(data + '|' + stick_left);
	});
	controller.on('rightAnalogBump:press', function(data) {
		stick_right = true;
		//console.log(data + '|' + stick_right);
	});
	controller.on('rightAnalogBump:release', function(data) {
		stick_right = false;
		//console.log(data + '|' + stick_right);
	});

	// - - - - - - - - - - - - - - - - - - - -

	// Analog Sticks
	controller.on('left:move', function(data) {
		//console.log('left Moved: ' + data.x + ' | ' + Number((data.y * -1) +255));
		if (stick_left) {
			left_x = data.x - 128
			left_y = (data.y * -1) +128
		} else {
			left_x = 0;
			left_y = 0;
		}

		//console.log('stick-left: ' +  Number(data.x - 128) + ' [' + right_x + '] | ' +  Number(data.y - 128) + ' [' + right_y + '] | ' + stick_left)
	});
	controller.on('right:move', function(data) {
		//console.log('right Moved: ' + data.x + ' | ' + Number((data.y * -1) +255));
		if (stick_right) {

			right_x = data.x - 128
			right_y = (data.y * -1) +128
		} else {
			right_x = 0;
			right_y = 0;
		}

		//console.log('stick-right: ' + Number(data.x - 128) + ' [' + right_x + '] | ' +  Number(data.y - 128) + ' [' + right_y + '] | ' + stick_right)
	});


	// Move Gantry bassed on Sticks at a regualr interval
	setInterval(stickMovment, 100);

	// [Function] map(value, fromLow, fromHigh, toLow, toHigh)   https://www.arduino.cc/en/Reference/Map
	function map(x, in_min, in_max, out_min, out_max)
	{
	  return Number((x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min);
	}

	// Move X & Y base on X & Y Stick Movments
	function stickMovment() {
		var sum_x = Number(left_x + right_x);
		var sum_y = Number(left_y + right_y);

		if (left_x >= stick_sensitivity | left_x <= -stick_sensitivity || left_y >= stick_sensitivity || left_y <= -stick_sensitivity || right_x >= stick_sensitivity || right_x <= -stick_sensitivity || right_y >= stick_sensitivity || right_y <= -stick_sensitivity) {
			// Additional Safty Catch
			if (!stick_left) {
					left_x = 0; left_y = 0;
			}
			if (!stick_right) {
					right_x = 0; right_y = 0;
			}

			//!!!!!!!!!!!!!!!!! need to detect if it's in inches or millimetersmm to avoid and overrun in the multiplier this can be done with agreeable status I believe.
			socket.emit('command', controller_serial_port, 'gcode', 'G21');  // set to millimeters

			// Move based on stick imput and mapping, need to add exponital curve.
			socket.emit('command', controller_serial_port, 'gcode', 'G91 G0 X' + map(sum_x, 0, 128, 0.0001, 2).toFixed(4) + ' Y' + map(sum_y, 0, 128, 0.0001, 2).toFixed(4)); // Switch to relative coordinates, Move one unit right in X and one unit right in Y
			socket.emit('command', controller_serial_port, 'gcode', 'G90');  // Switch back to absolute coordinates
			//console.log('setInterval: x' + sum_x + ' y' + sum_y + ' | ' + 'G91 G0 X' + map(sum_x, 0, 128, 0.0001, 2).toFixed(4) + ' Y' + map(sum_y, 0, 128, 0.0001, 2).toFixed(4));
		}
	}


	// ------------------------------------------

	//sixasis motion events:
	//the object returned from each of the movement events is as follows:
	//{
	//	 direction : values can be: 1 for right, forward and up. 2 for left, backwards and down.
	//	 value : values will be from 0 to 120 for directions right, forward and up and from 0 to -120 for left, backwards and down.
	//}

	//right-left movement
	controller.on('rightLeft:motion', function (data) {
		 //...doStuff();
	});

	//forward-back movement
	controller.on('forwardBackward:motion', function (data) {
		 //...doStuff();
	});
	//up-down movement
	controller.on('upDown:motion', function (data) {
		 //...doStuff();
	});

	//controller status
	//as of version 0.6.2 you can get the battery %, if the controller is connected and if the controller is charging
	controller.on('battery:change', function (value) {
		console.log('battery:change:' + value);
	});
	controller.on('connection:change', function (value) {
		console.log('connection:change:' + value);
	});
	controller.on('charging:change', function (value) {
		console.log('connection:change:' + value);
	});
}