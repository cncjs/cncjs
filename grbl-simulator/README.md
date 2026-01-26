# Grbl Simulator

A Grbl v1.1 CNC controller simulator with TCP socket server for testing CNC software without physical hardware.

## Quick Start

```bash
# Start server (default port: 3000)
node grbl-server.js

# Or specify a port
node grbl-server.js 8080

# Connect with telnet
telnet localhost 3000
```

## Usage with CNCjs

```bash
# Automatically finds an available port and creates virtual serial port
./start-with-cncjs.sh

# Connect cncjs to virtual serial port
cncjs -p /tmp/ttyGRBL
```

Or add to `~/.cncrc`:
```json
{
  "ports": [{ "path": "/tmp/ttyGRBL", "manufacturer": "Grbl Simulator" }]
}
```

## Features

- **Grbl v1.1 Protocol** - Real-time commands (`?`, `!`, `~`, `Ctrl-X`), system commands (`$$`, `$#`, `$G`, `$H`, `$X`, `$J`)
- **G-code Support** - G0/G1 linear, G2/G3 arcs, G10/G92 offsets, G20/G21 units, G90/G91 modes
- **Position Tracking** - Real-time interpolation during motion
- **State Machine** - Idle, Run, Hold, Jog, Alarm, Door, Check, Home, Sleep
- **Coordinate Systems** - MPos, WPos, G54-G59 offsets
- **40+ Settings** - Configurable via `$x=value`

## Commands

| Command | Description |
|---------|-------------|
| `?` | Status report |
| `!` | Feed hold |
| `~` | Cycle resume |
| `Ctrl-X` | Soft reset |
| `$$` | View settings |
| `$#` | View parameters |
| `$G` | Parser state |
| `$H` | Homing cycle |
| `$X` | Kill alarm |
| `$J=X10 F500` | Jog command |


## References

- [Grbl GitHub Repository](https://github.com/gnea/grbl)
- [Grbl v1.1 Wiki](https://github.com/gnea/grbl/wiki)

## License

MIT
