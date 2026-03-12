import asyncio
import logging
import os
import subprocess
from typing import Dict, Callable, Awaitable, Any

logger = logging.getLogger(__name__)

class QemuManager:
    """
    Manages the QEMU subprocess for Raspberry Pi emulation.
    """
    def __init__(self):
        self.running_instances: Dict[str, dict] = {}
        self.callbacks: Dict[str, Callable[[str, dict], Awaitable[None]]] = {}
        
        # Paths for QEMU execution
        self.img_dir = r"e:\Hardware\wokwi_clon\img"
        self.kernel_path = os.path.join(self.img_dir, "kernel_extracted.img")
        self.dtb_path = os.path.join(self.img_dir, "bcm271~1.dtb")
        self.sd_path = os.path.join(self.img_dir, "2025-12-04-raspios-trixie-armhf.img")

    def start_instance(self, client_id: str, board_type: str, callback: Callable[[str, dict], Awaitable[None]]):
        """Starts a new QEMU emulator instance for the given client."""
        logger.info(f"Starting REAL QEMU instance for client {client_id}, board: {board_type}")
        
        self.running_instances[client_id] = {
            "board": board_type,
            "status": "booting",
            "pins": {},
            "process": None
        }
        self.callbacks[client_id] = callback

        # Check if files exist
        if not os.path.exists(self.kernel_path) or not os.path.exists(self.sd_path):
            logger.error("Missing QEMU image or kernel files!")
            asyncio.create_task(self.send_event_to_frontend(client_id, "error", {"message": "Missing QEMU boot files"}))
            return

        # Start QEMU in a background task
        asyncio.create_task(self._launch_qemu(client_id))

    async def _launch_qemu(self, client_id: str):
        try:
            # QEMU Command for Raspberry Pi 3 (32-bit armhf)
            cmd = [
                "qemu-system-arm",
                "-M", "raspi3b",
                "-kernel", self.kernel_path,
                "-dtb", self.dtb_path,
                "-drive", f"file={self.sd_path},if=sd,format=raw",
                "-append", "console=ttyAMA0 root=/dev/mmcblk0p2 rootwait dwc_otg.lpm_enable=0",
                "-m", "1G",
                "-smp", "4",
                "-nographic",
                "-serial", "mon:stdio"
            ]
            
            logger.info(f"Executing QEMU: {' '.join(cmd)}")
            
            # Use asyncio subprocess for non-blocking execution
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                stdin=subprocess.PIPE
            )
            
            self.running_instances[client_id]["process"] = process
            self.running_instances[client_id]["status"] = "running"
            
            await self.send_event_to_frontend(client_id, "system", {"event": "booted"})
            
            # Start background tasks to monitor QEMU output
            asyncio.create_task(self._monitor_qemu(client_id, process.stdout, "serial_output"))
            asyncio.create_task(self._monitor_qemu(client_id, process.stderr, "system_error"))
            
        except Exception as e:
            logger.error(f"Failed to launch QEMU: {e}")
            await self.send_event_to_frontend(client_id, "error", {"message": str(e)})

    async def _monitor_qemu(self, client_id: str, stream, event_type: str):
        """Monitors a QEMU stream and forwards it to the frontend."""
        try:
            while True:
                line = await stream.readline()
                if not line:
                    break
                decoded_line = line.decode("ascii", "ignore")
                await self.send_event_to_frontend(client_id, event_type, {"data": decoded_line})
        except Exception as e:
            logger.error(f"Error monitoring QEMU {event_type}: {e}")

    def stop_instance(self, client_id: str):
        """Stops the QEMU instance."""
        if client_id in self.running_instances:
            instance = self.running_instances[client_id]
            process = instance.get("process")
            if process:
                try:
                    process.terminate()
                except:
                    pass
            self.running_instances.pop(client_id, None)
        if client_id in self.callbacks:
            self.callbacks.pop(client_id, None)

    def set_pin_state(self, client_id: str, pin: str, state: int):
        """Called when the Arduino/Frontend changes a pin connected to the Pi."""
        if client_id in self.running_instances:
            self.running_instances[client_id]["pins"][pin] = state
            # For a real implementation, we would send this to the QEMU guest
            # via a virtual character device or a custom protocol.
            # Currently we maintain state internally for verification.
            logger.debug(f"Pi {client_id} Pin {pin} set to {state}")

    async def send_event_to_frontend(self, client_id: str, event_type: str, data: dict):
        if client_id in self.callbacks:
            try:
                await self.callbacks[client_id](event_type, data)
            except Exception as e:
                logger.error(f"Failed to send event to frontend: {e}")

qemu_manager = QemuManager()
