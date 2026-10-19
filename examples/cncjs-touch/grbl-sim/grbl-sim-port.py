#!/usr/bin/env python3
"""Virtual serial port for the Grbl simulator (no socat needed).

CNCjs opens LINK like a real serial port. Bytes are relayed, untouched, between
that pseudo-terminal and a second one on which grbl_sim.exe runs. Both are raw,
so Grbl realtime bytes (Ctrl-X, ?, !, ~, overrides 0x90-0x9F) pass through.
The simulator is restarted if it exits, unless it stops more than five times
in a minute (wrong or broken build): the bridge then gives up. Stop with SIGTERM
(SIGINT and SIGHUP too: a closed SSH session still removes the port link).
"""
import ctypes, os, pty, tty, signal, subprocess, select, sys, termios, time

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
PTY = os.ttyname(host_slave)
os.symlink(PTY, LINK)

running = True
def stop(*_):
    global running
    running = False
signal.signal(signal.SIGTERM, stop)
signal.signal(signal.SIGINT, stop)
signal.signal(signal.SIGHUP, stop)

def die_with_parent():
    # Linux: the simulator gets SIGTERM if this bridge dies, so a killed bridge
    # never leaves an orphan simulator running at full speed.
    try:
        ctypes.CDLL('libc.so.6', use_errno=True).prctl(1, signal.SIGTERM)  # PR_SET_PDEATHSIG
    except Exception:
        pass

def start_sim():
    sim_master, sim_slave = pty.openpty()
    tty.setraw(sim_slave)
    proc = subprocess.Popen([SIM, '-n', '-s', '/dev/null', '-b', '/dev/null'],
                            stdin=sim_slave, stdout=sim_slave, stderr=subprocess.DEVNULL,
                            cwd=os.path.dirname(SIM), start_new_session=True,
                            preexec_fn=die_with_parent)
    os.close(sim_slave)
    log('simulateur lancé pid=%d sur %s' % (proc.pid, os.ttyname(host_slave)))
    return proc, sim_master

proc = None
restarts = []
try:
    # Inside the try: a simulator that cannot start still removes the port link.
    proc, sim_master = start_sim()
    log('port virtuel prêt : %s -> %s' % (LINK, os.ttyname(host_slave)))
    while running:
        if proc.poll() is not None:
            now = time.monotonic()
            restarts = [t for t in restarts if now - t < 60] + [now]
            if len(restarts) > 5:
                log('simulateur arrêté %d fois en une minute (code %s) : abandon' % (len(restarts), proc.returncode))
                break
            log('simulateur arrêté (code %s), relance' % proc.returncode)
            os.close(sim_master)
            time.sleep(1)
            # Bytes sent to the dead simulator would come back as stale replies.
            termios.tcflush(host_slave, termios.TCIOFLUSH)
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
            try:
                os.write(sim_master if fd == host_master else host_master, data)
            except OSError as err:
                # The simulator died between select() and write(): restarted above.
                log('écriture impossible (%s)' % err)
finally:
    if proc is not None:
        proc.terminate()
        try:
            proc.wait(3)
        except subprocess.TimeoutExpired:
            proc.kill()
    # Only our own link: a bridge started meanwhile owns the path now.
    try:
        if os.readlink(LINK) == PTY:
            os.unlink(LINK)
    except OSError:
        pass
    log('port virtuel fermé')
