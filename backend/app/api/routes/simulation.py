import json
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.qemu_manager import qemu_manager

router = APIRouter()
logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        self.active_connections[client_id] = websocket

    def disconnect(self, client_id: str):
        if client_id in self.active_connections:
            self.active_connections.pop(client_id, None)

    async def send_personal_message(self, message: str, client_id: str):
        if client_id in self.active_connections:
            await self.active_connections[client_id].send_text(message)

manager = ConnectionManager()

@router.websocket("/ws/{client_id}")
async def simulation_websocket(websocket: WebSocket, client_id: str):
    await manager.connect(websocket, client_id)
    
    # Callback for QEMU manager to send data to frontend
    async def qemu_callback(event_type: str, data: dict):
        payload = json.dumps({"type": event_type, "data": data})
        await manager.send_personal_message(payload, client_id)
        
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            msg_type = message.get("type")
            msg_data = message.get("data", {})
            
            if msg_type == "start_pi":
                board = msg_data.get("board", "raspberry-pi-3")
                qemu_manager.start_instance(client_id, board, qemu_callback)
            
            elif msg_type == "stop_pi":
                qemu_manager.stop_instance(client_id)
                
            elif msg_type == "pin_change":
                # Received from frontend (Arduino changed a pin connected to Pi)
                pin = msg_data.get("pin")
                state = msg_data.get("state")
                qemu_manager.set_pin_state(client_id, pin, state)
                
    except WebSocketDisconnect:
        manager.disconnect(client_id)
        qemu_manager.stop_instance(client_id)
    except Exception as e:
        logger.error(f"WebSocket error for {client_id}: {e}")
        manager.disconnect(client_id)
        qemu_manager.stop_instance(client_id)
