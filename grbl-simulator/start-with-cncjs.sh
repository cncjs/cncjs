#!/bin/bash

# Start Grbl Simulator with Serial Bridge for cncjs
# This script starts both the TCP server and the serial bridge

SERIAL_PATH="/tmp/ttyGRBL"

# Find an available port using Node.js
PORT=$(node -e "
const net = require('net');
const server = net.createServer();
server.listen(0, () => {
    console.log(server.address().port);
    server.close();
});
")

# Check if socat is installed
if ! command -v socat &> /dev/null; then
    echo "Error: socat is not installed"
    echo "Install with: sudo apt-get install socat"
    exit 1
fi

# Check if node files exist
if [ ! -f "grbl-server.js" ]; then
    echo "Error: grbl-server.js not found"
    echo "Run this script from the grbl-simulator directory"
    exit 1
fi

npx concurrently \
    --kill-others \
    --success first \
    --names "grbl-server,serial-bridge" \
    "node grbl-server.js $PORT" \
    "sleep 2; node serial-bridge.js $PORT $SERIAL_PATH" &
CONCURRENTLY_PID=$!

# Wait until the virtual serial path is available
until [ -e "$SERIAL_PATH" ]; do
  sleep 0.5
done

echo ""
echo "Virtual serial device available:"
echo "  $SERIAL_PATH"
echo ""
echo "To connect cncjs, add the following configuration to \"~/.cncrc\":"
echo '  {
    "ports": [
      {
        "path": "/tmp/ttyGRBL",
        "manufacturer": "Grbl Simulator"
      }
    ]
  }'
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Cleanup function
cleanup() {
    echo ""
    echo "Stopping services..."
    kill $CONCURRENRLY_PID 2>/dev/null
    rm -f $SERIAL_PATH
    echo "✓ Stopped"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Wait for processes
wait
