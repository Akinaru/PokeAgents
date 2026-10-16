<h1 align="center">PokeAgents</h1>

<p align="center">
  <strong>🇬🇧 English</strong> ·
  🇫🇷 <a href="README.fr.md">Français</a> ·
  🇪🇸 <a href="README.es.md">Español</a> ·
  🇩🇪 <a href="README.de.md">Deutsch</a> ·
  🇮🇹 <a href="README.it.md">Italiano</a> ·
  🇧🇷 <a href="README.pt-BR.md">Português</a> ·
  🇯🇵 <a href="README.ja.md">日本語</a> ·
  🇨🇳 <a href="README.zh-CN.md">简体中文</a>
</p>

<p align="center"><strong>Your Claude Code agents become pixel-art creatures working along a route, DS-game style.</strong></p>

<p align="center">
  <a href="#installation">Installation</a> •
  <a href="#getting-started">Getting started</a> •
  <a href="#what-you-see">What you see</a> •
  <a href="#settings">Settings</a> •
  <a href="#development">Development</a> •
  <a href="#credits-and-legal-notices">Credits and legal notices</a>
</p>

<p align="center">
  <img src="docs/images/overview.png" alt="The PokeAgents route with three agents at work and wild creatures" width="900">
</p>

> **Unofficial fan project.** PokeAgents is not affiliated with, endorsed by or sponsored by Nintendo, Creatures Inc., GAME FREAK inc. or The Pokémon Company, nor by Anthropic. Pokémon and character names are trademarks of their respective owners. The repository contains no images taken from the games. See [Credits and legal notices](#credits-and-legal-notices).

## What is it?

PokeAgents is a VS Code extension (plus a small standalone server) that shows every [Claude Code](https://claude.com/claude-code) session as a creature on a pixel-art route:

- **Every agent gets its own Pokémon**, drawn at random and different every day. Rare species are rare here too, and one agent in 64 is shiny.
- **It evolves as its context fills up**: first evolution at 30% of the context, second at 60%.
- **It moves around based on what it is doing**: it reads the route sign, searches the tall grass, cuts down a tree or smashes a rock.
- **It sleeps while it waits.** You can tell at a glance who is working, who is done and who is waiting for your answer.
- **One click opens its battle screen**, with a summary of its session: context, tools used, log and stats.
- **Wild creatures** wander along the route and sometimes come over to visit your agents.

PokeAgents is a fork of [Pixel Agents](https://github.com/pixel-agents-hq/pixel-agents) (MIT license), which showed agents in an office.

## Installation

### Requirements

- **VS Code 1.105** or later.
- **Claude Code** installed and signed in: `npm install -g @anthropic-ai/claude-code`, then run `claude` once.
- **Node.js 20** or later, only to install from source or to use the standalone server.
- An **Internet connection**: creature sprites are downloaded on first use, then cached in `~/.pokeagents/pokemon`.

### Option 1 — From the VS Code Marketplace (recommended)

In VS Code, open the **Extensions** view, search for "PokeAgents" and click **Install**. Or from the command line: `code --install-extension akinaru.pokeagents`. Extension page: [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=akinaru.pokeagents).

### Option 2 — From a `.vsix` file

1. Download the latest `pokeagents-x.y.z.vsix` from [GitHub Releases](https://github.com/Akinaru/PokeAgents/releases).
2. Install it:
   ```bash
   code --install-extension pokeagents-x.y.z.vsix
   ```
   Or in VS Code: **Extensions** view → **⋯** menu → **Install from VSIX…**
3. Reload the window if VS Code asks you to.

### Option 3 — From source

```bash
git clone https://github.com/Akinaru/PokeAgents.git
cd PokeAgents
npm install
npm run package                 # production build
npx @vscode/vsce package        # creates pokeagents-x.y.z.vsix
code --install-extension pokeagents-*.vsix
```

To try it without installing: open the folder in VS Code and press **F5**. An "Extension Development Host" window opens with PokeAgents loaded.

### Option 4 — Standalone server (browser)

To follow your agents outside VS Code (tmux, a plain terminal, another editor):

```bash
npm install && npm run compile
node dist/cli.js --port 3100
```

Open the address it prints (`http://127.0.0.1:3100/?token=…`). **Keep this address to yourself**: the token it contains lets anyone change your Claude Code settings.

## Getting started

1. Open the Command Palette (`Cmd+Shift+P` on macOS, `Ctrl+Shift+P` elsewhere) and run **PokeAgents: Show Panel**. The panel opens at the bottom of VS Code.
2. On first launch, a guide walks you through the interface. It offers to turn on **instant detection**: PokeAgents then adds hooks to `~/.claude/settings.json` so it hears about what your agents are doing in real time.
   - The guide shows everything that will be changed before asking for your consent.
   - If you decline, PokeAgents reads Claude Code's transcripts instead. That works too, with a little delay.
   - You can turn the hooks on or remove them at any time in the settings.
3. Start an agent:
   - with the **"+ Agent" Poké Ball** in the bottom bar, which opens a Claude Code terminal;
   - or by running `claude` in any terminal in the project.
4. Its Pokémon appears on a tree stump, then heads off to work when the agent uses its tools.

## What you see

The panel's interface is currently in French. The labels below are written exactly as they appear on screen, with their English meaning in parentheses.

### The route

Every agent wears a nametag with its project name and a status pill:

| Status   | Meaning                                                      |
| -------- | ------------------------------------------------------------ |
| **ACT**  | Active: the agent is working.                                |
| **ATT**  | Waiting (_attente_): it needs your permission to run a tool. |
| **FINI** | Finished: it has just completed its task.                    |
| **SOM**  | Asleep (_sommeil_): it is idle; its Pokémon sleeps in place. |

A working agent moves to a new spot every 10 to 20 seconds. The spot depends on the tool it is using:

| Agent's tool                    | What its Pokémon does                 |
| ------------------------------- | ------------------------------------- |
| Reading files                   | It reads the route sign.              |
| Searching (Grep, Glob, web)     | It searches the tall grass or a bush. |
| Editing files                   | It cuts down a tree.                  |
| Running a command in a terminal | It smashes a rock.                    |

Agents always stay inside the camera's starting view, well apart from each other, so they remain clickable and readable.

### The hover card

<p align="center"><img src="docs/images/hover.png" alt="An agent's card on hover" width="800"></p>

Hover over a Pokémon to see its name, its level (one finished task = one level), what it is doing and its HP bar (labelled **PV**). **HP is the context still free**: when the bar turns red, the session is nearing its limit.

### The battle screen

<p align="center"><img src="docs/images/battle.png" alt="An agent's battle screen" width="800"></p>

Click a Pokémon to open its battle screen:

- **TERMINAL !** opens the agent's terminal. The button becomes **RÉPONDRE !** (ANSWER!) when the agent is waiting for your permission.
- The **Poké Balls** at the top let you switch from one agent to another. A dimmed Ball means a sleeping agent, a shaking Ball an agent that is waiting.
- **RÉSUMÉ** (SUMMARY) opens the summary, **ÉQUIPE** (PARTY) the list of agents, and **FUITE** (RUN) closes the screen (or press `Esc`).

### The summary

<p align="center">
  <img src="docs/images/summary-infos.png" alt="Summary, Info tab" width="49%">
  <img src="docs/images/summary-stats.png" alt="Summary, Stats tab" width="49%">
</p>

Four tabs, plus ◀ ▶ to switch agents:

- **INFOS** (INFO): Pokédex number, types, project, context used, next evolution.
- **MÉMO** (TRAINER MEMO): its nature, inferred from its favourite tools, and the log of its actions.
- **CAPACITÉS** (MOVES): Edit, Read, Command and Search, with how many times each was used.
- **STATS**: PV (HP) = free context, ATTAQUE (ATTACK) = edits, DÉFENSE (DEFENSE) = reads, ATQ. SPÉ. (SP. ATK) = commands, DÉF. SPÉ. (SP. DEF) = searches, VITESSE (SPEED) = tasks per hour.

Moves, the log and stats count what happens while the panel is open. They reset when you reload it.

### Party and Pokédex

<p align="center">
  <img src="docs/images/party.png" alt="List of agents" width="49%">
  <img src="docs/images/pokedex.png" alt="Pokédex" width="49%">
</p>

- **ÉQUIPE** (PARTY) lists all your agents with their status and HP. One click opens the agent's terminal.
- **POKéDEX** records every species you have met, with the date, the project and the number of encounters. It is saved in `~/.pokeagents/pokedex.json`.

## Settings

The **OPTIONS** button opens the settings:

| Setting                   | Effect                                                          |
| ------------------------- | --------------------------------------------------------------- |
| Sound Notifications       | Short menu beeps when an agent finishes or is waiting.          |
| Instant Detection (Hooks) | Installs or removes the Claude Code hooks.                      |
| Watch All Sessions        | Also follows Claude Code sessions started outside this project. |
| Always Show Labels        | Always shows every agent's card.                                |

PokeAgents keeps its files in `~/.pokeagents/`: settings, map, Pokédex and sprite cache. To reset everything, close VS Code and delete that folder. To remove the hooks, untick **Instant Detection** before uninstalling. Uninstalling the extension removes them too.

### Local Black/White look (optional)

If you own your own map textures from the games, you can use them **on your machine only**:

1. Put the `matrix1_*.png` textures in `tmp/bw/matrix1/`. This folder is ignored by git.
2. Run `npx tsx scripts/build-bw-pack.ts`.

The script creates a pack in `~/.pokeagents/packs/pokemon-bw` and turns it on. These files must never be added to the repository or shared.

## Development

```bash
npm install          # installs the whole monorepo
npm run compile      # generates the protocol, type-checks, lints, builds
npm test             # server and UI tests
npm run e2e          # end-to-end tests (Playwright)
```

- **F5** in VS Code opens a development window with the extension.
- `npx tsx scripts/generate-route-assets.ts` regenerates the map and its scenery, drawn by script.
- `npx tsx scripts/generate-pokedex.ts` regenerates the species data.

The architecture (server, protocol, UI) is described in [CLAUDE.md](CLAUDE.md) and [CONTRIBUTING.md](CONTRIBUTING.md).

## Credits and legal notices

PokeAgents is a **free, non-commercial fan project**.

- **Pokémon** © Nintendo, Creatures Inc. and GAME FREAK inc. Pokémon and character names are trademarks of Nintendo. PokeAgents is neither affiliated with nor endorsed by these companies. The repository and the extension contain no images extracted from the games.
- **Route scenery**: the map, trees, grass and stumps are drawn by the scripts in the repository.
- **Creature sprites**: downloaded at runtime, never stored in the repository.
  - Movement sprites: [PMDCollab SpriteCollab](https://github.com/PMDCollab/SpriteCollab), by its contributors, under the [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/) license. This license forbids any commercial use of PokeAgents.
  - Animated sprites, icons and items: the [PokeAPI/sprites](https://github.com/PokeAPI/sprites) repository.
- **Species data**: [PokeAPI](https://pokeapi.co/).
- **Font**: [Pixelify Sans](https://github.com/eifetx/Pixelify-Sans), © 2021 The Pixelify Sans Project Authors, under the SIL Open Font License 1.1.
- **Project base**: [Pixel Agents](https://github.com/pixel-agents-hq/pixel-agents), © 2026 Pablo De Lucca, MIT license. The original human characters are based on the [Metro City pack by JIK-A-4](https://jik-a-4.itch.io/metrocity-free-topdown-character-pack).
- **Claude Code** is a product of Anthropic. PokeAgents is not affiliated with Anthropic.

Details of third-party licenses are in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

### License

The PokeAgents code is under the [MIT license](LICENSE). This license covers the code only. It grants no rights to the Pokémon trademarks and characters, nor to third-party sprites, which keep their own licenses.

Are you a rights holder and want something removed? [Open an issue](https://github.com/Akinaru/PokeAgents/issues) and it will be taken down promptly.
