// ── User-Level Layout Persistence (re-exports from server/) ──
// The user-level persistence contract, surfaced as one adapter-facing barrel so
// VS Code code never reaches into server/src/constants.js directly. Only
// LAYOUT_REVISION_KEY has an adapter consumer today (PixelAgentsViewProvider);
// the rest travel with it because they describe the same ~/.pokeagents
// file layout, and splitting the set would leave the next caller guessing which
// half to import from where.
/** @public */
export {
  CONFIG_FILE_NAME,
  LAYOUT_FILE_DIR,
  LAYOUT_FILE_NAME,
  LAYOUT_FILE_POLL_INTERVAL_MS,
  LAYOUT_REVISION_KEY,
} from '../../server/src/constants.js';

// ── Settings Persistence (VS Code globalState keys) ─────────
export const GLOBAL_KEY_SOUND_ENABLED = 'pokeagents.soundEnabled';
export const GLOBAL_KEY_LAST_SEEN_VERSION = 'pokeagents.lastSeenVersion';
export const GLOBAL_KEY_ALWAYS_SHOW_LABELS = 'pokeagents.alwaysShowLabels';
export const GLOBAL_KEY_GHOST_HEADLESS_AGENTS = 'pokeagents.ghostHeadlessAgents';
export const GLOBAL_KEY_WATCH_ALL_SESSIONS = 'pokeagents.watchAllSessions';
export const GLOBAL_KEY_HOOKS_INFO_SHOWN = 'pokeagents.hooksInfoShown';
export const GLOBAL_KEY_SHOW_AREAS = 'pokeagents.showAreas';

/**
 * Folder→Area mappings live inside the shared ~/.pokeagents/config.json
 * (vscode.areaMappings), not in VS Code globalState. Kept here as a key
 * constant for callers that need to reference it symbolically.
 *
 * @public
 */
export const SETTING_KEY_AREA_MAPPINGS = 'pokeagents.areaMappings';

// ── VS Code Settings (contributes.configuration keys) ───────
export const CONFIG_KEY_AUTO_SHOW_PANEL = 'pokeagents.autoShowPanel';
export const CONFIG_KEY_AUTO_SPAWN_AGENT = 'pokeagents.autoSpawnAgent';

// ── VS Code Identifiers ─────────────────────────────────────
export const VIEW_ID = 'pokeagents.panelView';
export const COMMAND_SHOW_PANEL = 'pokeagents.showPanel';
export const COMMAND_EXPORT_DEFAULT_LAYOUT = 'pokeagents.exportDefaultLayout';
