/**
 * World coordinates → screen coordinates, in one place.
 *
 * The office is drawn by centering the map in the canvas and then applying the
 * pan, both snapped to whole device pixels so sprites stay on the pixel grid.
 * That formula was reproduced in the renderer and in each DOM overlay that
 * floats something above a character; a copy that rounds differently puts the
 * overlay a pixel off the sprite it is labelling, which is invisible in review
 * and obvious on screen.
 *
 * Deliberately free of DOM access — `dpr` is passed in, not read from
 * `window`. Reading the environment belongs at the component boundary; a state
 * or math module that reaches for `window` drags the DOM into every module
 * graph that imports it.
 */

import { tiltCamera } from './camera.js';
import { TILE_SIZE } from './types.js';

/** Device-pixel offset of the map's top-left corner inside the canvas.
 *  This is the renderer's own frame of reference — overlays go through
 *  {@link overlayProjection} instead of calling this directly. */
export function mapOffset(
  canvasWidth: number,
  canvasHeight: number,
  cols: number,
  rows: number,
  zoom: number,
  panX: number,
  panY: number,
): { offsetX: number; offsetY: number } {
  const mapW = cols * TILE_SIZE * zoom;
  const mapH = rows * TILE_SIZE * zoom;
  return {
    offsetX: Math.floor((canvasWidth - mapW) / 2) + Math.round(panX),
    offsetY: Math.floor((canvasHeight - mapH) / 2) + Math.round(panY),
  };
}

/** Projects world points into CSS pixels within the overlay container that
 *  sits on top of the canvas. */
export interface OverlayProjection {
  /** CSS px of a point `lift` world px above the ground point (worldX, worldY).
   *  Under the tilted camera the lift scales with distance, like the billboard
   *  sprite it labels. */
  toScreen(worldX: number, worldY: number, lift?: number): { x: number; y: number };
  /** Container size in world units — what the viewport currently covers.
   *  Used to cap overlay offsets against the visible area. */
  readonly viewportWorldWidth: number;
  readonly viewportWorldHeight: number;
  /** CSS px → world units, for sizing overlay geometry in world terms. */
  toWorldLength(cssPx: number): number;
}

export function overlayProjection(
  layout: { cols: number; rows: number },
  containerRect: { width: number; height: number },
  zoom: number,
  pan: { x: number; y: number },
  dpr: number,
  /** Whether the canvas uses the tilted camera (everywhere but the layout editor). */
  tilted: boolean,
): OverlayProjection {
  const canvasW = Math.round(containerRect.width * dpr);
  const canvasH = Math.round(containerRect.height * dpr);
  const { offsetX, offsetY } = mapOffset(
    canvasW,
    canvasH,
    layout.cols,
    layout.rows,
    zoom,
    pan.x,
    pan.y,
  );
  const camera = tilted ? tiltCamera(offsetX, offsetY, layout.cols, layout.rows, zoom) : undefined;
  return {
    toScreen: (worldX, worldY, lift = 0) => {
      if (!camera) {
        return { x: (offsetX + worldX * zoom) / dpr, y: (offsetY + (worldY - lift) * zoom) / dpr };
      }
      const p = camera.project(worldX, worldY);
      return { x: p.x / dpr, y: (p.y - lift * zoom * p.scale) / dpr };
    },
    viewportWorldWidth: canvasW / zoom,
    viewportWorldHeight: canvasH / zoom,
    toWorldLength: (cssPx) => (cssPx * dpr) / zoom,
  };
}

/**
 * The pan closest to `pan` for which the tilted map covers the whole canvas,
 * so its empty surroundings never show; null when it cannot at this zoom.
 * The tilted map is a trapezoid narrowest at its far (top) edge, so the
 * width test uses the ground row seen at the top of the screen.
 */
export function containedPan(
  canvasWidth: number,
  canvasHeight: number,
  cols: number,
  rows: number,
  zoom: number,
  pan: { x: number; y: number },
): { x: number; y: number } | null {
  const { offsetX, offsetY } = mapOffset(canvasWidth, canvasHeight, cols, rows, zoom, 0, 0);
  const camera = tiltCamera(offsetX, offsetY, cols, rows, zoom);
  const mapW = cols * TILE_SIZE;
  const minY = canvasHeight - camera.project(0, rows * TILE_SIZE).y;
  const maxY = -camera.project(0, 0).y;
  if (minY > maxY) return null;
  const y = Math.max(minY, Math.min(maxY, pan.y));
  // Ground row under the top of the screen once panned by y
  const topRow = camera.unproject(0, -y);
  if (!topRow) return null;
  const minX = canvasWidth - camera.project(mapW, topRow.y).x;
  const maxX = -camera.project(0, topRow.y).x;
  if (minX > maxX) return null;
  return { x: Math.max(minX, Math.min(maxX, pan.x)), y };
}

/** Device-px margins kept clear inside the canvas edges. */
export interface ScreenMargins {
  top: number;
  bottom: number;
  side: number;
}

/**
 * Tiles whose center the tilted camera shows inside the canvas, `margins` in
 * from its edges, at `zoom` with the map centered (the default view, kept
 * inside the map's edges like the live camera).
 */
export function tilesInView(
  canvasWidth: number,
  canvasHeight: number,
  cols: number,
  rows: number,
  zoom: number,
  margins: ScreenMargins,
): Set<string> {
  const pan = containedPan(canvasWidth, canvasHeight, cols, rows, zoom, { x: 0, y: 0 }) ?? {
    x: 0,
    y: 0,
  };
  const { offsetX, offsetY } = mapOffset(canvasWidth, canvasHeight, cols, rows, zoom, pan.x, pan.y);
  const camera = tiltCamera(offsetX, offsetY, cols, rows, zoom);
  const tiles = new Set<string>();
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const p = camera.project((col + 0.5) * TILE_SIZE, (row + 0.5) * TILE_SIZE);
      if (
        p.x >= margins.side &&
        p.x <= canvasWidth - margins.side &&
        p.y >= margins.top &&
        p.y <= canvasHeight - margins.bottom
      ) {
        tiles.add(`${col},${row}`);
      }
    }
  }
  return tiles;
}
