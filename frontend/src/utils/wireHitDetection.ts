/**
 * Wire hit detection utilities.
 * Used by SimulatorCanvas to detect wire clicks/hover without relying on SVG pointer-events.
 */

import type { Wire } from '../types/wire';

export interface RenderedSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  axis: 'horizontal' | 'vertical';
  /** Index j: this segment was generated from stored[j] → stored[j+1] */
  storedPairIndex: number;
}

/**
 * Expand stored waypoints into the actual orthogonal (L-shape) rendered points.
 * Between each consecutive stored pair, a corner point is inserted if they are not axis-aligned.
 */
export function getRenderedPoints(wire: Wire): { x: number; y: number }[] {
  const stored = [
    { x: wire.start.x, y: wire.start.y },
    ...(wire.waypoints ?? []),
    { x: wire.end.x, y: wire.end.y },
  ];

  if (stored.length < 2) return stored;

  const result: { x: number; y: number }[] = [stored[0]];
  for (let i = 1; i < stored.length; i++) {
    const prev = stored[i - 1];
    const curr = stored[i];
    if (prev.x !== curr.x && prev.y !== curr.y) {
      // L-shape: horizontal-first corner
      result.push({ x: curr.x, y: prev.y });
    }
    result.push(curr);
  }
  return result;
}

/**
 * Get all rendered segments with their metadata (axis, storedPairIndex).
 */
export function getRenderedSegments(wire: Wire): RenderedSegment[] {
  const stored = [
    { x: wire.start.x, y: wire.start.y },
    ...(wire.waypoints ?? []),
    { x: wire.end.x, y: wire.end.y },
  ];

  const segments: RenderedSegment[] = [];
  let ri = 0;
  const rendered = getRenderedPoints(wire);

  for (let j = 0; j < stored.length - 1; j++) {
    const prev = stored[j];
    const curr = stored[j + 1];
    const hasCorner = prev.x !== curr.x && prev.y !== curr.y;
    const numSubs = hasCorner ? 2 : 1;

    for (let s = 0; s < numSubs; s++) {
      const p1 = rendered[ri + s];
      const p2 = rendered[ri + s + 1];
      if (!p1 || !p2) continue;
      segments.push({
        x1: p1.x,
        y1: p1.y,
        x2: p2.x,
        y2: p2.y,
        axis: p1.y === p2.y ? 'horizontal' : 'vertical',
        storedPairIndex: j,
      });
    }
    ri += numSubs;
  }
  return segments;
}

/** Distance from point (px, py) to line segment (x1,y1)-(x2,y2). */
export function distToSegment(
  px: number, py: number,
  x1: number, y1: number,
  x2: number, y2: number,
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

/** Find the topmost wire within `threshold` world-units of (wx, wy). */
export function findWireNearPoint(
  wires: Wire[],
  wx: number,
  wy: number,
  threshold: number,
): Wire | null {
  for (let i = wires.length - 1; i >= 0; i--) {
    const wire = wires[i];
    const segments = getRenderedSegments(wire);
    for (const seg of segments) {
      if (distToSegment(wx, wy, seg.x1, seg.y1, seg.x2, seg.y2) <= threshold) {
        return wire;
      }
    }
  }
  return null;
}

/** Find the segment of a wire closest to (wx, wy) within threshold. */
export function findSegmentNearPoint(
  wire: Wire,
  wx: number,
  wy: number,
  threshold: number,
): RenderedSegment | null {
  const segments = getRenderedSegments(wire);
  for (const seg of segments) {
    if (distToSegment(wx, wy, seg.x1, seg.y1, seg.x2, seg.y2) <= threshold) {
      return seg;
    }
  }
  return null;
}

/**
 * Compute new waypoints array when dragging a segment.
 * Inserts a new waypoint between stored[j] and stored[j+1] at the drag position.
 */
export function computeDragWaypoints(
  originalWaypoints: { x: number; y: number }[],
  storedPairIndex: number,
  dragX: number,
  dragY: number,
): { x: number; y: number }[] {
  const newWp = { x: dragX, y: dragY };
  return [
    ...originalWaypoints.slice(0, storedPairIndex),
    newWp,
    ...originalWaypoints.slice(storedPairIndex),
  ];
}
