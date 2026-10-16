#!/usr/bin/env python3
"""Virtual serial port for the Grbl simulator (no socat needed).

CNCjs opens LINK like a real serial port. Bytes are relayed, untouched, between
that pseudo-terminal and a second one on which grbl_sim.exe runs. Both are raw,
so Grbl realtime bytes (Ctrl-X, ?, !, ~, overrides 0x90-0x9F) pass through.
The simulator is restarted if it exits. Stop with SIGTERM.
"""
import os, pty, tty, signal, subprocess, select, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
# Paths can be overridden; the defaults match build.sh run in this folder.
SIM = os.environ.get('GRBL_SIM', os.path.join(HERE, 'grbl', 'grbl', 'grbl-sim', 'grbl_sim.exe'))
LINK = os.environ.get('GRBL_SIM_PORT', os.path.expanduser('~/ttyGRBL-sim'))
LOG = os.environ.get('GRBL_SIM_LOG', os.path.join(HERE, 'port.log'))

def log(msg):
    with open(LOG, 'a') as f:
        f.write(time.strftime('%H:%M:%S ') + msg + '\n')

# Side seen by CNCjs: keep the slave open ourselves so the port survives reconnects.
host_master, host_slave = pty.openpty()
tty.setraw(host_slave)
try:
    os.unlink(LINK)
except FileNotFoundError:
    pass
os.symlink(os.ttyname(host_slave), LINK)

running = True
def stop(*_):
    global running
    running = False
signal.signal(signal.SIGTERM, stop)
signal.signal(signal.SIGINT, stop)

def start_sim():
    sim_master, sim_slave = pty.openpty()
    tty.setraw(sim_slave)
    proc = subprocess.Popen([SIM, '-n', '-s', '/dev/null', '-b', '/dev/null'],
                            stdin=sim_slave, stdout=sim_slave, stderr=subprocess.DEVNULL,
                            cwd=os.path.dirname(SIM), start_new_session=True)
    os.close(sim_slave)
    log('simulateur lancé pid=%d sur %s' % (proc.pid, os.ttyname(host_slave)))
    return proc, sim_master

proc, sim_master = start_sim()
log('port virtuel prêt : %s -> %s' % (LINK, os.ttyname(host_slave)))
while running:
    if proc.poll() is not None:
        log('simulateur arrêté (code %s), relance' % proc.returncode)
        os.close(sim_master)
        time.sleep(1)
        proc, sim_master = start_sim()
    try:
        ready, _, _ = select.select([host_master, sim_master], [], [], 0.5)
    except InterruptedError:
        continue
    for fd in ready:
        try:
            data = os.read(fd, 4096)
        except OSError:
            data = b''
        if not data:
            continue
        os.write(sim_master if fd == host_master else host_master, data)

proc.terminate()
try:
    proc.wait(3)
except subprocess.TimeoutExpired:
    proc.kill()
try:
    os.unlink(LINK)
except FileNotFoundError:
    pass
log('port virtuel fermé')
