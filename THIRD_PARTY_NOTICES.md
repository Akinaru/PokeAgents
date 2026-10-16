# Third-party notices

PokeAgents is an unofficial, free and non-commercial fan project. It is not affiliated with, endorsed or sponsored by Nintendo, Creatures Inc., GAME FREAK inc., The Pokémon Company or Anthropic.

## Trademarks

- Pokémon and Pokémon character names are trademarks of Nintendo, Creatures Inc. and GAME FREAK inc. Pokémon © Nintendo, Creatures Inc., GAME FREAK inc.
- Claude and Claude Code are trademarks of Anthropic, PBC.
- VS Code and Visual Studio Code are trademarks of Microsoft Corporation.

Names are used only to describe what the software shows. No game files, ripped sprites or other assets extracted from Nintendo games are included in this repository or in the published extension.

## Code

### Pixel Agents

PokeAgents is a fork of [Pixel Agents](https://github.com/pixel-agents-hq/pixel-agents).

```
MIT License
Copyright (c) 2026 Pablo De Lucca
```

The full license text is in [LICENSE](LICENSE). The original character sprites bundled from Pixel Agents are based on the [Metro City free top-down character pack](https://jik-a-4.itch.io/metrocity-free-topdown-character-pack) by JIK-A-4.

## Fonts

### Pixelify Sans

Copyright 2021 The Pixelify Sans Project Authors (https://github.com/eifetx/Pixelify-Sans). Licensed under the SIL Open Font License, Version 1.1. The license text ships next to the font files in `webview-ui/public/fonts/PixelifySans-OFL.txt`.

## Assets downloaded at runtime

These files are **not** stored in the repository or the extension. The extension downloads them on first use and caches them on the user's machine, in `~/.pokeagents/pokemon`.

### PMDCollab SpriteCollab

Overworld sprite sheets come from [PMDCollab SpriteCollab](https://github.com/PMDCollab/SpriteCollab), made by its contributors (each sheet's artists are listed in that project's credits). They are licensed under [Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)](https://creativecommons.org/licenses/by-nc/4.0/). Because of this license, PokeAgents must not be used for commercial purposes.

### PokeAPI sprites

Animated battle sprites, menu icons and item icons are loaded from the [PokeAPI/sprites](https://github.com/PokeAPI/sprites) repository. The images depicted remain © Nintendo, Creatures Inc. and GAME FREAK inc.

## Data

Species data (names, types, categories, evolutions, capture rates) bundled in `webview-ui/src/pokemon/pokedex.json` was generated from [PokeAPI](https://pokeapi.co/) by `scripts/generate-pokedex.ts`.

## Removal requests

If you hold rights to any element used here and want it removed, please [open an issue](https://github.com/Akinaru/PokeAgents/issues).
