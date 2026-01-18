#!/bin/bash

# Start Grbl Simulator with Serial Bridge for cncjs
# This script starts both the TCP server and the serial bridge

GRBL_PORT=3000
SERIAL_PATH="/tmp/ttyGRBL"

# Check if socat is installed
if ! command -v socat &> /dev/null; then
    echo "Error: socat is not installed"
    echo "Install with: sudo apt-get install socat"
    exit 1
fi

# Check if node files exist
if [ ! -f "grbl-server.js" ]; then
    echo "Error: grbl-server.js not found"
    echo "Run this script from the grbl-sim directory"
    exit 1
fi

node grbl-server.js $GRBL_PORT &
SERVER_PID=$!
sleep 2

node serial-bridge.js $GRBL_PORT $SERIAL_PATH &
BRIDGE_PID=$!
sleep 2

echo ""
echo "Virtual serial path: $SERIAL_PATH"
echo ""
echo "To connect cncjs:"
echo "  cncjs -p $SERIAL_PATH"
echo ""
echo "Or add to ~/.cncrc:"
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
    kill $SERVER_PID 2>/dev/null
    kill $BRIDGE_PID 2>/dev/null
    rm -f $SERIAL_PATH
    echo "✓ Stopped"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Wait for processes
wait
