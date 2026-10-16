import type { Blip } from './constants.js';
import { BLIP_VOLUME, DONE_BLIPS, EVOLVE_BLIPS, PERMISSION_BLIPS } from './constants.js';
import { isE2E } from './runtime.js';

let soundEnabled = true;
let audioCtx: AudioContext | null = null;

/** E2E test hook: append every (attempted) sound invocation to a window-side log
 *  under window.__pixelAgentsTestHooks.playedSounds (namespace and type
 *  declared by testHooks.ts). Records BEFORE the soundEnabled gate so tests
 *  verify dispatch independent of user audio prefs. Gated on the e2e harness
 *  flag so this unbounded log never grows in a real session. */
function recordSoundForTests(kind: 'done' | 'permission'): void {
  if (!isE2E || typeof window === 'undefined') return;
  if (!window.__pixelAgentsTestHooks) window.__pixelAgentsTestHooks = {};
  if (!window.__pixelAgentsTestHooks.playedSounds) {
    window.__pixelAgentsTestHooks.playedSounds = [];
  }
  window.__pixelAgentsTestHooks.playedSounds.push({ kind, at: Date.now() });
}

export function setSoundEnabled(enabled: boolean): void {
  soundEnabled = enabled;
}

export function isSoundEnabled(): boolean {
  return soundEnabled;
}

/** Play a short sequence of quiet square-wave blips, like the DS menus. */
async function playBlips(blips: readonly Blip[]): Promise<void> {
  if (!soundEnabled) return;
  try {
    if (!audioCtx) audioCtx = new AudioContext();
    // Resume suspended context (webviews suspend until user gesture)
    if (audioCtx.state === 'suspended') await audioCtx.resume();
    for (const [freq, start, duration] of blips) {
      const t = audioCtx.currentTime + start;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(BLIP_VOLUME, t + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0008, t + duration);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(t);
      osc.stop(t + duration + 0.02);
    }
  } catch {
    // Audio may not be available
  }
}

/** An agent finished its turn. */
export async function playDoneSound(): Promise<void> {
  recordSoundForTests('done');
  await playBlips(DONE_BLIPS);
}

/** An agent asks for a permission. */
export async function playPermissionSound(): Promise<void> {
  recordSoundForTests('permission');
  await playBlips(PERMISSION_BLIPS);
}

/** A Pokémon evolves, or a shiny appears. */
export async function playEvolutionSound(): Promise<void> {
  await playBlips(EVOLVE_BLIPS);
}

/** Call from any user-gesture handler to ensure AudioContext is unlocked */
export function unlockAudio(): void {
  try {
    if (!audioCtx) {
      audioCtx = new AudioContext();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  } catch {
    // ignore
  }
}
