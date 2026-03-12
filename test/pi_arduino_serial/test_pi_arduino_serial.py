#!/usr/bin/env python3
"""
Pi <-> Arduino Serial Integration Test
=======================================

What this test proves
---------------------
Python code running on an **emulated Raspberry Pi 3B** (QEMU) sends the
string "HELLO_FROM_PI" over its UART serial port (ttyAMA0).
An **emulated Arduino Uno** (avr8js, via Node.js) receives it and replies
"ACK_FROM_ARDUINO".
The Pi receives that reply and prints "TEST_PASSED".

Architecture
------------

  ||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||
  |  Python Test Process (this file)                                 |
  |                                                                  |
  |  |||||||||||||||||||||||||||||||||||||||||||||||||||||||||||    |
  |  |  SerialBroker  (asyncio)                                |    |
  |  |                                                         |    |
  |  |  TCP server :5555  <||||||||||||||>  QEMU Pi (ttyAMA0) |    |
  |  |  TCP server :5556  <||>  avr_runner.js (Arduino UART)  |    |
  |  |                                                         |    |
  |  |  - Bridges bytes Pi <-> Arduino                         |    |
  |  |  - State machine automates Pi serial console:           |    |
  |  |      - waits for shell prompt                           |    |
  |  |      - disables TTY echo                                |    |
  |  |      - injects Pi Python test script via base64         |    |
  |  |  - Asserts "TEST_PASSED" in Pi output                   |    |
  |  |||||||||||||||||||||||||||||||||||||||||||||||||||||||||||    |
  |                                                                  |
  |  Subprocesses:                                                   |
  |    - qemu-system-arm  (Raspberry Pi 3B, init=/bin/sh)           |
  |    - node avr_runner.js  (ATmega328P emulation)                 |
  ||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||

Prerequisites
-------------
  - qemu-system-arm in PATH
  - node (Node.js >= 18) in PATH
  - arduino-cli in PATH, with arduino:avr core installed
  - QEMU images in <repo>/img/:
      kernel_extracted.img
      bcm271~1.dtb
      2025-12-04-raspios-trixie-armhf.img

Run
---
  cd <repo>
  python test/pi_arduino_serial/test_pi_arduino_serial.py

The test may take several minutes while the Pi boots inside QEMU.
"""

import asyncio
import base64
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path
from typing import Optional

# || Paths |||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||
REPO_ROOT   = Path(__file__).resolve().parent.parent.parent
IMG_DIR     = REPO_ROOT / "img"
TEST_DIR    = Path(__file__).resolve().parent

SKETCH_FILE = TEST_DIR / "arduino_sketch.ino"
AVR_RUNNER  = TEST_DIR / "avr_runner.js"

KERNEL_IMG  = IMG_DIR / "kernel_extracted.img"
DTB_FILE    = IMG_DIR / "bcm271~1.dtb"          # Windows 8.3 short name
SD_IMAGE    = IMG_DIR / "2025-12-04-raspios-trixie-armhf.img"

# || Network ports (must be free) |||||||||||||||||||||||||||||||||||||||||||||||
BROKER_PI_PORT   = 15555  # Broker listens; QEMU Pi connects here
BROKER_AVR_PORT  = 15556  # Broker listens; avr_runner.js connects here

# || Timeouts ||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||
BOOT_TIMEOUT_S    = 360   # 6 min -- Pi boot + shell prompt
SCRIPT_TIMEOUT_S  = 45    # Script execution after prompt seen
COMPILE_TIMEOUT_S = 120   # arduino-cli

# || Pi console state-machine ||||||||||||||||||||||||||||||||||||||||||||||||||
# States
ST_BOOT   = "BOOT"    # waiting for shell prompt
ST_SETUP  = "SETUP"   # sent stty -echo, waiting for next prompt
ST_INJECT = "INJECT"  # script injected, waiting for TEST_PASSED / TEST_FAILED
ST_DONE   = "DONE"

# Patterns that indicate a ready shell prompt
PROMPT_BYTES = [b"# ", b"$ "]

# || Pi Python test script ||||||||||||||||||||||||||||||||||||||||||||||||||||||
# This script is base64-encoded and written to /tmp/pi_test.py on the Pi,
# then executed with "python3 /tmp/pi_test.py".
#
# When python3 runs from the serial console, its stdin/stdout ARE ttyAMA0,
# i.e. the same wire the Arduino is connected to.  select() lets us poll
# for incoming bytes without busy-waiting.
_PI_SCRIPT_SRC = b"""\
import sys, os, time, select

# --- send trigger message to Arduino ---
sys.stdout.write("HELLO_FROM_PI\\n")
sys.stdout.flush()

# --- wait for Arduino reply ---
resp = b""
deadline = time.time() + 15          # 15-second window

while time.time() < deadline:
    readable, _, _ = select.select([sys.stdin], [], [], 1.0)
    if readable:
        chunk = os.read(sys.stdin.fileno(), 256)
        resp += chunk
        if b"ACK_FROM_ARDUINO" in resp:
            sys.stdout.write("TEST_PASSED\\n")
            sys.stdout.flush()
            sys.exit(0)

sys.stdout.write("TEST_FAILED_TIMEOUT\\n")
sys.stdout.flush()
sys.exit(1)
"""

# One-liner shell command injected into the Pi console:
#   1.  PATH is set explicitly (init=/bin/sh may not load a profile)
#   2.  TTY echo is disabled so our typed command doesn't loop back
#   3.  The base64-encoded script is decoded and written to /tmp/pi_test.py
#   4.  python3 runs it (stdin = ttyAMA0 = Arduino wire)
_PI_B64   = base64.b64encode(_PI_SCRIPT_SRC).decode()
_PI_CMD   = (
    "export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
    " && stty -echo"
    f" && printf '%s' '{_PI_B64}' | /usr/bin/base64 -d > /tmp/pi_test.py"
    " && /usr/bin/python3 /tmp/pi_test.py"
    "\n"
)


# |||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||
class SerialBroker:
    """
    Bridges the emulated Pi (QEMU) and the emulated Arduino (avr8js).

    Both sides connect to this broker via separate TCP ports.
    All bytes are forwarded transparently in both directions while the
    broker also automates the Pi serial console to inject and run the
    test script.
    """

    def __init__(self) -> None:
        self._pi_reader:  Optional[asyncio.StreamReader]  = None
        self._pi_writer:  Optional[asyncio.StreamWriter]  = None
        self._avr_reader: Optional[asyncio.StreamReader]  = None
        self._avr_writer: Optional[asyncio.StreamWriter]  = None

        # Accumulate Pi output for pattern matching
        self._pi_buf: bytearray = bytearray()

        # Full traffic log: list of (direction, bytes)
        self.traffic: list[tuple[str, bytes]] = []

        self._state = ST_BOOT
        self._prompt_count = 0
        self._script_deadline: float = 0.0

        # Signals
        self.pi_connected  = asyncio.Event()
        self.avr_connected = asyncio.Event()
        self.result_event  = asyncio.Event()
        self.test_passed   = False

    # || Server callbacks |||||||||||||||||||||||||||||||||||||||||||||||||||||||
    async def _on_pi_connect(self,
                              reader: asyncio.StreamReader,
                              writer: asyncio.StreamWriter) -> None:
        addr = writer.get_extra_info("peername")
        print(f"[broker] Pi (QEMU) connected from {addr}")
        self._pi_reader = reader
        self._pi_writer = writer
        self.pi_connected.set()

    async def _on_avr_connect(self,
                               reader: asyncio.StreamReader,
                               writer: asyncio.StreamWriter) -> None:
        addr = writer.get_extra_info("peername")
        print(f"[broker] Arduino (avr_runner.js) connected from {addr}")
        self._avr_reader = reader
        self._avr_writer = writer
        self.avr_connected.set()

    # || Start TCP servers ||||||||||||||||||||||||||||||||||||||||||||||||||||||
    async def start(self) -> tuple:
        pi_srv = await asyncio.start_server(
            self._on_pi_connect, "127.0.0.1", BROKER_PI_PORT
        )
        avr_srv = await asyncio.start_server(
            self._on_avr_connect, "127.0.0.1", BROKER_AVR_PORT
        )
        print(f"[broker] Listening -- Pi port:{BROKER_PI_PORT}  "
              f"Arduino port:{BROKER_AVR_PORT}")
        return pi_srv, avr_srv

    # || Main relay (call after both sides connected) |||||||||||||||||||||||||||
    async def run(self) -> None:
        await asyncio.gather(
            self._relay_pi_to_avr(),
            self._relay_avr_to_pi(),
            self._console_automator(),
        )

    # || Pi -> Arduino |||||||||||||||||||||||||||||||||||||||||||||||||||||||||||
    async def _relay_pi_to_avr(self) -> None:
        reader = self._pi_reader
        if reader is None:
            return
        while True:
            try:
                data = await reader.read(512)
            except Exception:
                break
            if not data:
                break

            self._log("Pi->AVR", data)
            self._pi_buf.extend(data)

            if self._avr_writer and not self._avr_writer.is_closing():
                self._avr_writer.write(data)
                await self._avr_writer.drain()

    # || Arduino -> Pi |||||||||||||||||||||||||||||||||||||||||||||||||||||||||||
    async def _relay_avr_to_pi(self) -> None:
        reader = self._avr_reader
        if reader is None:
            return
        while True:
            try:
                data = await reader.read(512)
            except Exception:
                break
            if not data:
                break

            self._log("AVR->Pi", data)

            if self._pi_writer and not self._pi_writer.is_closing():
                self._pi_writer.write(data)
                await self._pi_writer.drain()

    # || Console state machine ||||||||||||||||||||||||||||||||||||||||||||||||||
    async def _console_automator(self) -> None:
        boot_deadline   = time.monotonic() + BOOT_TIMEOUT_S
        last_poke_time  = time.monotonic()

        # Give QEMU a moment to start emitting serial output, then poke
        await asyncio.sleep(3.0)
        self._send_to_pi(b"\n")

        while self._state != ST_DONE:
            await asyncio.sleep(0.15)

            now = time.monotonic()

            # || Global boot timeout ||||||||||||||||||||||||||||||||||||||||||||
            if now > boot_deadline:
                print("\n[broker] [timeout] BOOT TIMEOUT -- shell prompt never appeared")
                self.test_passed = False
                self._state = ST_DONE
                self.result_event.set()
                return

            # || Script-execution timeout (after script was injected) ||||||||||
            if self._state == ST_INJECT and self._script_deadline and now > self._script_deadline:
                print("\n[broker] [timeout] SCRIPT TIMEOUT -- no result from Pi script")
                self.test_passed = False
                self._state = ST_DONE
                self.result_event.set()
                return

            buf = bytes(self._pi_buf)

            # || ST_BOOT: wait for shell prompt |||||||||||||||||||||||||||||||||
            if self._state == ST_BOOT:
                # Periodically poke the shell to get a fresh prompt
                # (in case we missed the initial one)
                if now - last_poke_time > 8.0:
                    self._send_to_pi(b"\n")
                    last_poke_time = now

                if self._prompt_seen(buf):
                    print("\n[broker] [OK] Shell prompt detected")
                    self._pi_buf.clear()
                    # Disable echo and set PATH, then wait for next prompt
                    self._send_to_pi(
                        b"export PATH=/usr/local/sbin:/usr/local/bin"
                        b":/usr/sbin:/usr/bin:/sbin:/bin && stty -echo\n"
                    )
                    self._state = ST_SETUP
                    self._prompt_count = 0

            # || ST_SETUP: wait for prompt after stty -echo |||||||||||||||||||||
            elif self._state == ST_SETUP:
                if self._prompt_seen(buf) or len(buf) > 10:
                    # Either got a prompt or the shell already answered
                    await asyncio.sleep(0.3)
                    self._pi_buf.clear()
                    print("[broker] [OK] Environment set -- injecting Pi test script")
                    self._send_to_pi(_PI_CMD.encode())
                    self._state = ST_INJECT
                    self._script_deadline = time.monotonic() + SCRIPT_TIMEOUT_S

            # || ST_INJECT: wait for TEST_PASSED / TEST_FAILED |||||||||||||||||
            elif self._state == ST_INJECT:
                if b"TEST_PASSED" in buf:
                    print("\n[broker] [OK]  TEST_PASSED  received from Pi!")
                    self.test_passed = True
                    self._state = ST_DONE
                    self.result_event.set()
                elif b"TEST_FAILED" in buf:
                    snippet = buf.decode("utf-8", errors="replace")[-120:]
                    print(f"\n[broker] [FAIL]  TEST_FAILED  received from Pi\n  last output: {snippet!r}")
                    self.test_passed = False
                    self._state = ST_DONE
                    self.result_event.set()

    # || Helpers ||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||
    def _prompt_seen(self, buf: bytes) -> bool:
        tail = buf[-32:]   # only check the last 32 bytes
        return any(p in tail for p in PROMPT_BYTES)

    def _send_to_pi(self, data: bytes) -> None:
        if self._pi_writer and not self._pi_writer.is_closing():
            self._pi_writer.write(data)
            asyncio.get_event_loop().create_task(self._pi_writer.drain())

    def _log(self, direction: str, data: bytes) -> None:
        self.traffic.append((direction, data))
        text = data.decode("utf-8", errors="replace")
        for line in text.splitlines():
            stripped = line.strip()
            if stripped:
                print(f"  [{direction}] {stripped}")


# |||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||
# Compilation
# |||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||
def compile_arduino_sketch() -> Path:
    """Compile arduino_sketch.ino via arduino-cli and return the .hex path."""
    print("\n[compile] Compiling Arduino sketch with arduino-cli ...")

    # arduino-cli requires the sketch to live inside a folder whose name
    # matches the .ino file (without extension).
    tmp_root  = Path(tempfile.mkdtemp())
    sk_dir    = tmp_root / "arduino_sketch"
    build_dir = tmp_root / "build"
    sk_dir.mkdir()
    build_dir.mkdir()
    shutil.copy(SKETCH_FILE, sk_dir / "arduino_sketch.ino")

    cli = shutil.which("arduino-cli") or "arduino-cli"
    cmd = [
        cli, "compile",
        "--fqbn",       "arduino:avr:uno",
        "--output-dir", str(build_dir),
        str(sk_dir),
    ]

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=COMPILE_TIMEOUT_S,
        )
    except FileNotFoundError:
        raise RuntimeError(
            "arduino-cli not found in PATH.\n"
            "Install: https://arduino.github.io/arduino-cli/\n"
            "Then:    arduino-cli core install arduino:avr"
        )
    except subprocess.TimeoutExpired:
        raise RuntimeError("arduino-cli compile timed out")

    if result.returncode != 0:
        raise RuntimeError(
            f"Compilation failed (exit {result.returncode}):\n"
            f"  STDOUT: {result.stdout.strip()}\n"
            f"  STDERR: {result.stderr.strip()}"
        )

    hex_files = sorted(build_dir.glob("*.hex"))
    if not hex_files:
        raise RuntimeError(f"No .hex file produced in {build_dir}")

    hex_path = hex_files[0]
    print(f"[compile] [OK]  {hex_path.name}  ({hex_path.stat().st_size:,} bytes)")
    return hex_path


# |||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||
# QEMU SD overlay  (qcow2 thin-copy aligned to 8 GiB power-of-2)
# |||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||
def _ensure_sd_overlay() -> Path:
    """
    QEMU raspi3b requires the SD card size to be a power of 2.
    The Raspbian image (5.29 GiB) does not satisfy this, so we create a
    qcow2 overlay that presents the image as 8 GiB without modifying the
    original file.  The overlay is re-created on every run.
    """
    overlay = IMG_DIR / "sd_overlay.qcow2"
    qemu_img = shutil.which("qemu-img") or "C:/Program Files/qemu/qemu-img.exe"

    # Always rebuild so stale overlays don't cause issues
    if overlay.exists():
        overlay.unlink()

    cmd = [
        qemu_img, "create",
        "-f",     "qcow2",
        "-b",     str(SD_IMAGE),
        "-F",     "raw",
        str(overlay),
        "8G",
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    if result.returncode != 0:
        raise RuntimeError(
            f"qemu-img overlay creation failed:\n{result.stderr}"
        )
    print(f"[qemu-img] SD overlay created: {overlay.name} (8 GiB virtual, "
          f"backed by {SD_IMAGE.name})")
    return overlay


# |||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||
# QEMU command builder
# |||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||
def build_qemu_cmd() -> list[str]:
    missing = [
        f"  {label}: {p}"
        for label, p in [("kernel", KERNEL_IMG), ("dtb", DTB_FILE), ("sd", SD_IMAGE)]
        if not p.exists()
    ]
    if missing:
        raise RuntimeError("Missing QEMU image files:\n" + "\n".join(missing))

    sd_path = _ensure_sd_overlay()

    # raspi3b is only available in qemu-system-aarch64 on this platform
    # (qemu-system-arm only ships raspi0/1ap/2b in this Windows build)
    qemu_bin = shutil.which("qemu-system-aarch64") or "qemu-system-aarch64"

    return [
        qemu_bin,
        "-M",       "raspi3b",
        "-kernel",  str(KERNEL_IMG),
        "-dtb",     str(DTB_FILE),
        "-drive",   f"file={sd_path},if=sd,format=qcow2",
        # init=/bin/sh  -> skip systemd, get a root shell immediately
        # rw            -> mount root filesystem read-write
        "-append",  (
            "console=ttyAMA0 "
            "root=/dev/mmcblk0p2 rootwait rw "
            "init=/bin/sh "
            "dwc_otg.lpm_enable=0"
        ),
        "-m",       "1G",
        "-smp",     "4",
        "-display", "none",
        # Connect Pi ttyAMA0 directly to our broker (broker is the TCP server)
        "-serial",  f"tcp:127.0.0.1:{BROKER_PI_PORT}",
    ]


# |||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||
# Subprocess log drainer
# |||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||
async def drain_log(stream: Optional[asyncio.StreamReader], prefix: str) -> None:
    if stream is None:
        return
    async for raw in stream:
        line = raw.decode("utf-8", errors="replace").rstrip()
        if line:
            # encode to the console charset, dropping unrepresentable chars
            safe = line.encode(sys.stdout.encoding or "ascii", errors="replace").decode(sys.stdout.encoding or "ascii")
            print(f"{prefix} {safe}")


# |||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||
# Main test coroutine
# |||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||
async def run_test() -> bool:
    _banner("Pi <-> Arduino Serial Integration Test")

    # 1. Compile ---------------------------------------------------------------
    hex_path = compile_arduino_sketch()

    # 2. Start broker ----------------------------------------------------------
    broker = SerialBroker()
    pi_srv, avr_srv = await broker.start()

    procs: list[asyncio.subprocess.Process] = []

    try:
        # 3. Start avr_runner.js (Arduino emulation) ---------------------------
        node_exe = shutil.which("node") or "node"
        avr_cmd  = [
            node_exe,
            str(AVR_RUNNER),
            str(hex_path),
            "127.0.0.1",
            str(BROKER_AVR_PORT),
        ]
        print(f"\n[avr] Starting Arduino emulator ...\n      {' '.join(avr_cmd)}")
        avr_proc = await asyncio.create_subprocess_exec(
            *avr_cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
        )
        procs.append(avr_proc)
        asyncio.create_task(drain_log(avr_proc.stdout, "[avr]"))

        # 4. Start QEMU (Raspberry Pi emulation) --------------------------------
        qemu_cmd = build_qemu_cmd()
        print(f"\n[qemu] Starting Raspberry Pi 3B emulation ...")
        print(f"       {' '.join(qemu_cmd[:6])} ...")
        qemu_proc = await asyncio.create_subprocess_exec(
            *qemu_cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
        )
        procs.append(qemu_proc)
        asyncio.create_task(drain_log(qemu_proc.stdout, "[qemu]"))

        # 5. Wait for both TCP connections -------------------------------------
        print(f"\n[broker] Waiting for Pi + Arduino TCP connections (30 s) ...")
        try:
            await asyncio.wait_for(
                asyncio.gather(
                    broker.pi_connected.wait(),
                    broker.avr_connected.wait(),
                ),
                timeout=30.0,
            )
        except asyncio.TimeoutError:
            print("[broker] [FAIL] Timeout waiting for TCP connections")
            return False

        # 6. Start relay + state machine ----------------------------------------
        print(f"\n[broker] Both sides connected. Boot timeout: {BOOT_TIMEOUT_S} s\n")
        asyncio.create_task(broker.run())

        # 7. Await test result --------------------------------------------------
        try:
            await asyncio.wait_for(
                broker.result_event.wait(),
                timeout=BOOT_TIMEOUT_S + SCRIPT_TIMEOUT_S + 10,
            )
        except asyncio.TimeoutError:
            print("[test] [FAIL] Global timeout -- no result received")
            return False

        return broker.test_passed

    finally:
        pi_srv.close()
        avr_srv.close()
        await pi_srv.wait_closed()
        await avr_srv.wait_closed()

        for p in procs:
            try:
                p.terminate()
                await asyncio.wait_for(p.wait(), timeout=5.0)
            except Exception:
                try:
                    p.kill()
                except Exception:
                    pass

        # Clean up temp compilation dir
        try:
            shutil.rmtree(hex_path.parent.parent, ignore_errors=True)
        except Exception:
            pass


# |||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||
# Helpers
# |||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||
def _banner(title: str) -> None:
    bar = "=" * 65
    print(f"\n{bar}\n  {title}\n{bar}")


def _print_result(passed: bool) -> None:
    _banner("Result")
    if passed:
        print("  [PASS]  INTEGRATION TEST PASSED\n")
        print("  Pi  -> Arduino : HELLO_FROM_PI")
        print("  Arduino -> Pi  : ACK_FROM_ARDUINO")
        print("  Pi confirmed   : TEST_PASSED")
    else:
        print("  [FAIL]  INTEGRATION TEST FAILED")
        print("\n  Troubleshooting hints:")
        print("  - Confirm qemu-system-arm, node, and arduino-cli are in PATH.")
        print("  - Check that init=/bin/sh produces a '#' prompt on the Pi OS.")
        print("  - The SD image may require 'pi'/'raspberry' user for python3.")
    print("=" * 65 + "\n")


# |||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||
def main() -> None:
    # Windows requires ProactorEventLoop for subprocess + asyncio
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

    passed = asyncio.run(run_test())
    _print_result(passed)
    sys.exit(0 if passed else 1)


if __name__ == "__main__":
    main()
