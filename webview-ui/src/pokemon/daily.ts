/**
 * Daily rotation: an agent's Pokémon is rolled from its session seed mixed
 * with the local date, so every agent meets a new Pokémon each day while
 * staying the same all day long (reloads included).
 */

/** Local calendar day as YYYYMMDD. */
export function dayKey(now: Date): number {
  return now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
}

let cachedAt = 0;
let cachedDay = 0;

/** Today's key, recomputed at most once a second (it is read every frame). */
function today(): number {
  const ms = Date.now();
  if (ms - cachedAt > 1000) {
    cachedAt = ms;
    cachedDay = dayKey(new Date(ms));
  }
  return cachedDay;
}

/** The seed an agent's Pokémon is rolled from on a given day. */
export function dailySeed(sessionSeed: number, day: number = today()): number {
  let h = (sessionSeed ^ Math.imul(day, 0x9e3779b1)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}
