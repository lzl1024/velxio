import React from 'react';
import { useSimulatorStore } from '../../store/useSimulatorStore';
import { WireRenderer } from './WireRenderer';
import { WireInProgressRenderer } from './WireInProgressRenderer';

interface WireLayerProps {
  hoveredWireId: string | null;
  wireDragPreview: { wireId: string; waypoints: { x: number; y: number }[] } | null;
}

export const WireLayer: React.FC<WireLayerProps> = ({ hoveredWireId, wireDragPreview }) => {
  const wires = useSimulatorStore((s) => s.wires);
  const wireInProgress = useSimulatorStore((s) => s.wireInProgress);
  const selectedWireId = useSimulatorStore((s) => s.selectedWireId);

  return (
    <svg
      className="wire-layer"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        overflow: 'visible',
        pointerEvents: 'none',
        zIndex: 1,
      }}
    >
      {wires.map((wire) => (
        <WireRenderer
          key={wire.id}
          wire={wire}
          isSelected={wire.id === selectedWireId}
          isHovered={wire.id === hoveredWireId}
          previewWaypoints={
            wireDragPreview?.wireId === wire.id ? wireDragPreview.waypoints : undefined
          }
        />
      ))}

      {wireInProgress && (
        <WireInProgressRenderer wireInProgress={wireInProgress} />
      )}
    </svg>
  );
};
