/**
 * Tilted camera, as in Pokémon Black/White: the ground is seen at an angle in
 * perspective, so far rows shrink and squeeze together, while characters and
 * props stand upright as billboards scaled by their distance.
 *
 * The camera looks at the map center from TILT_DISTANCE_WORLD away, pitched
 * TILT_PITCH_DEG below the horizon. For a ground point at `z` world px beyond
 * the center (toward the top of the map), the perspective scale is
 * D / (D + z·cos φ) and its screen height above the center is z·sin φ·scale.
 *
 * Pure math, like projection.ts: everything is in device pixels.
 */
import { TILT_DISTANCE_WORLD, TILT_PITCH_DEG } from '../constants.js';
import { TILE_SIZE } from './types.js';

/** Maps the cursor into the upright plane of a billboard standing at an anchor,
 *  so flat hit boxes still work under the tilted camera. */
export type BillboardHit = (anchorX: number, anchorY: number) => { x: number; y: number };

export interface TiltCamera {
  /** Device px of a ground point, and the scale of a billboard standing on it. */
  project(worldX: number, worldY: number): { x: number; y: number; scale: number };
  /** Ground point under a device-px screen point (null above the horizon). */
  unproject(screenX: number, screenY: number): { x: number; y: number } | null;
  /** Where a screen point lands in the upright plane of a billboard standing at
   *  (anchorX, anchorY), in flat world px — what flat hit boxes are tested against. */
  billboardPoint(
    screenX: number,
    screenY: number,
    anchorX: number,
    anchorY: number,
  ): { x: number; y: number };
}

const SIN = Math.sin((TILT_PITCH_DEG * Math.PI) / 180);
const COS = Math.cos((TILT_PITCH_DEG * Math.PI) / 180);
const D = TILT_DISTANCE_WORLD;

/**
 * @param offsetX device px of the map's top-left corner in the flat view (see mapOffset)
 */
export function tiltCamera(
  offsetX: number,
  offsetY: number,
  cols: number,
  rows: number,
  zoom: number,
): TiltCamera {
  const centerX = (cols * TILE_SIZE) / 2;
  const centerY = (rows * TILE_SIZE) / 2;
  // The map center stays where the flat view puts it, so pan and zoom keep working.
  const screenCX = offsetX + centerX * zoom;
  const screenCY = offsetY + centerY * zoom;

  const project = (worldX: number, worldY: number) => {
    const z = centerY - worldY;
    const scale = D / (D + z * COS);
    return {
      x: screenCX + (worldX - centerX) * scale * zoom,
      y: screenCY - z * SIN * scale * zoom,
      scale,
    };
  };

  return {
    project,
    unproject(screenX, screenY) {
      // Invert y = z·sinφ·D / (D + z·cosφ) for z
      const h = (screenCY - screenY) / zoom;
      const denominator = D * SIN - h * COS;
      if (denominator <= 0) return null;
      const z = (h * D) / denominator;
      const scale = D / (D + z * COS);
      return { x: centerX + (screenX - screenCX) / (scale * zoom), y: centerY - z };
    },
    billboardPoint(screenX, screenY, anchorX, anchorY) {
      const p = project(anchorX, anchorY);
      return {
        x: anchorX + (screenX - p.x) / (zoom * p.scale),
        y: anchorY + (screenY - p.y) / (zoom * p.scale),
      };
    },
  };
}
