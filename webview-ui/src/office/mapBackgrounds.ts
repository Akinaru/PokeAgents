/**
 * Painted map backgrounds. A layout may name one in `background`; it is drawn
 * instead of the per-tile floors, so a map can have organic shapes (winding
 * paths, soft grass) that a 16px tile grid cannot express. Tiles still decide
 * where characters can walk.
 *
 * Backgrounds are inlined into the bundle (scripts/generate-route-assets.ts
 * paints them), so they load the same way in VS Code and the standalone app.
 */
import route1 from '../assets/maps/route-1.png?inline';

const SOURCES: Record<string, string> = { 'route-1': route1 };

const images = new Map<string, HTMLImageElement>();

/** The decoded background image, or null when unnamed, unknown or still loading. */
export function getMapBackground(name: string | undefined): HTMLImageElement | null {
  if (!name || !(name in SOURCES)) return null;
  let image = images.get(name);
  if (!image) {
    image = new Image();
    image.src = SOURCES[name];
    images.set(name, image);
  }
  return image.complete && image.naturalWidth > 0 ? image : null;
}
