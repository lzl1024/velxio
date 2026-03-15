import React from 'react';
import type { BoardInstance } from '../../types/board';
import { ArduinoUno } from '../components-wokwi/ArduinoUno';
import { ArduinoNano } from '../components-wokwi/ArduinoNano';
import { ArduinoMega } from '../components-wokwi/ArduinoMega';
import { NanoRP2040 } from '../components-wokwi/NanoRP2040';
import { RaspberryPi3 } from '../components-wokwi/RaspberryPi3';
import { Esp32 } from '../components-wokwi/Esp32';
import { PinOverlay } from './PinOverlay';

// Board visual dimensions (width × height) for the drag-overlay sizing.
// ESP32 sizes match the wokwi-boards SVG rendered at 5 px/mm.
const BOARD_SIZE: Record<string, { w: number; h: number }> = {
  'arduino-uno':       { w: 360, h: 250 },
  'arduino-nano':      { w: 175, h:  70 },
  'arduino-mega':      { w: 530, h: 195 },
  'raspberry-pi-pico': { w: 280, h: 180 },
  'raspberry-pi-3':    { w: 250, h: 160 },
  'esp32':    { w: 141, h: 265 },  // esp32-devkit-v1: 28.2 × 53 mm
  'esp32-s3': { w: 128, h: 350 },  // esp32-s3-devkitc-1: 25.5 × 70 mm
  'esp32-c3': { w: 127, h: 215 },  // esp32-c3-devkitm-1: 25.4 × 42.9 mm
};

interface BoardOnCanvasProps {
  board: BoardInstance;
  running: boolean;
  led13?: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onPinClick: (componentId: string, pinName: string, x: number, y: number) => void;
}

export const BoardOnCanvas = ({
  board,
  running,
  led13 = false,
  onMouseDown,
  onPinClick,
}: BoardOnCanvasProps) => {
  const { id, boardKind, x, y } = board;
  const size = BOARD_SIZE[boardKind] ?? { w: 300, h: 200 };

  const boardEl = (() => {
    switch (boardKind) {
      case 'arduino-uno':
        return <ArduinoUno id={id} x={x} y={y} led13={led13} />;
      case 'arduino-nano':
        return <ArduinoNano id={id} x={x} y={y} led13={led13} />;
      case 'arduino-mega':
        return <ArduinoMega id={id} x={x} y={y} led13={led13} />;
      case 'raspberry-pi-pico':
        return <NanoRP2040 id={id} x={x} y={y} ledBuiltIn={led13} />;
      case 'raspberry-pi-3':
        return <RaspberryPi3 id={id} x={x} y={y} />;
      case 'esp32':
      case 'esp32-s3':
      case 'esp32-c3':
        return <Esp32 id={id} x={x} y={y} boardKind={boardKind} />;
    }
  })();

  return (
    <>
      {boardEl}

      {/* Drag overlay — hidden during simulation */}
      {!running && (
        <div
          data-board-overlay="true"
          data-board-id={id}
          style={{
            position: 'absolute',
            left: x,
            top: y,
            width: size.w,
            height: size.h,
            cursor: 'move',
            zIndex: 1,
          }}
          onMouseDown={(e) => { e.stopPropagation(); onMouseDown(e); }}
        />
      )}

      {/* Pin overlay for wire connections */}
      <PinOverlay
        componentId={id}
        componentX={x}
        componentY={y}
        onPinClick={onPinClick}
        showPins={true}
        wrapperOffsetX={0}
        wrapperOffsetY={0}
      />
    </>
  );
};
