import { useEffect, useState } from 'react';

import { POKEMON_ICON_URL, POKEMON_SCENE_SEC } from '../constants.js';
import type { PokemonMoment } from '../pokemon/moments.js';
import { onPokemonMoment } from '../pokemon/moments.js';

type Scene = Extract<PokemonMoment, { kind: 'evolve' | 'shiny' }>;

const spriteUrl = (dex: number, shiny: boolean): string =>
  `${POKEMON_ICON_URL}/${shiny ? 'shiny/' : ''}${dex}.png`;

/** Evolution timeline (fraction of the scene): old form, white flicker, new form. */
const FLICKER_FROM = 0.3;
const FLICKER_TO = 0.62;

/** Full-screen Black/White moment: an agent's Pokémon evolving, or a shiny appearing. */
export function PokemonScene() {
  const [queue, setQueue] = useState<Scene[]>([]);
  const [elapsed, setElapsed] = useState(0);

  useEffect(
    () =>
      onPokemonMoment((m) => {
        if (m.kind === 'evolve' || m.kind === 'shiny') setQueue((q) => [...q, m]);
      }),
    [],
  );

  const scene = queue[0];
  useEffect(() => {
    if (!scene) return;
    const start = performance.now();
    setElapsed(0);
    const timer = setInterval(() => {
      const t = (performance.now() - start) / 1000;
      if (t >= POKEMON_SCENE_SEC) setQueue((q) => q.slice(1));
      else setElapsed(t);
    }, 100);
    return () => clearInterval(timer);
  }, [scene]);

  if (!scene) return null;
  const close = () => setQueue((q) => q.slice(1));
  const progress = elapsed / POKEMON_SCENE_SEC;

  if (scene.kind === 'evolve') {
    const evolved = progress >= (FLICKER_FROM + FLICKER_TO) / 2;
    const flash =
      progress >= FLICKER_FROM && progress < FLICKER_TO && Math.floor(elapsed * 8) % 2 === 0;
    const form = evolved ? scene.to : scene.from;
    return (
      <div className="bw bw-scene evolve" style={{ zIndex: 55 }} onClick={close} role="status">
        <div className="bw-scene-stage">
          <img
            src={spriteUrl(form.dex, form.shiny)}
            alt={form.name}
            className={flash ? 'flash' : ''}
          />
        </div>
        <div className="bw-battle-box bw-text-light">
          {progress < FLICKER_TO
            ? `Quoi ? ${scene.from.name.toUpperCase()} évolue !`
            : `Félicitations ! ${scene.from.name.toUpperCase()} a évolué en ${scene.to.name.toUpperCase()} !`}
          <span className="bw-dialog-arrow" />
        </div>
      </div>
    );
  }

  return (
    <div className="bw bw-scene shiny" style={{ zIndex: 55 }} onClick={close} role="status">
      <div className="bw-scene-stage">
        {[
          [32, 30],
          [62, 24],
          [44, 62],
          [58, 58],
          [38, 44],
        ].map(([left, top], i) => (
          <span
            key={i}
            className="bw-sparkle"
            style={{ left: `${left}%`, top: `${top}%`, animationDelay: `${i * 0.22}s` }}
          >
            ✦
          </span>
        ))}
        <img src={spriteUrl(scene.form.dex, true)} alt={scene.form.name} />
      </div>
      <div className="bw-battle-box bw-text-light">
        Un {scene.form.name.toUpperCase()} chromatique sauvage apparaît
        {scene.folder ? ` dans ${scene.folder}` : ''} !
        <span className="bw-dialog-arrow" />
      </div>
    </div>
  );
}
