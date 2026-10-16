<h1 align="center">PokeAgents</h1>

<p align="center"><strong>Vos agents Claude Code deviennent des créatures en pixel art qui travaillent sur une route, façon jeux DS.</strong></p>

<p align="center">
  <a href="#installation">Installation</a> •
  <a href="#prise-en-main">Prise en main</a> •
  <a href="#ce-que-vous-voyez">Ce que vous voyez</a> •
  <a href="#réglages">Réglages</a> •
  <a href="#développement">Développement</a> •
  <a href="#crédits-et-mentions-légales">Crédits et mentions légales</a>
</p>

<p align="center">
  <img src="docs/images/overview.png" alt="La route d'PokeAgents avec trois agents au travail et des créatures sauvages" width="900">
</p>

> **Projet de fan non officiel.** PokeAgents n'est ni affilié, ni approuvé, ni sponsorisé par Nintendo, Creatures Inc., GAME FREAK inc. ou The Pokémon Company, ni par Anthropic. Pokémon et les noms des personnages sont des marques de leurs propriétaires respectifs. Le dépôt ne contient aucune image tirée des jeux. Voir [Crédits et mentions légales](#crédits-et-mentions-légales).

## Qu'est-ce que c'est ?

PokeAgents est une extension VS Code (et un petit serveur autonome) qui affiche chaque session [Claude Code](https://claude.com/claude-code) comme une créature sur une route en pixel art :

- **Chaque agent a son Pokémon**, tiré au sort et différent chaque jour. Les espèces rares le sont aussi ici, et un agent sur 64 est chromatique.
- **Il évolue quand son contexte se remplit** : première évolution à 30 % du contexte, seconde à 60 %.
- **Il se déplace selon ce qu'il fait** : il lit le panneau de la route, fouille les hautes herbes, coupe un arbre ou casse un rocher.
- **Il dort quand il attend.** Vous voyez d'un coup d'œil qui travaille, qui a fini et qui attend votre réponse.
- **Un clic ouvre son écran de combat**, avec un résumé de sa session : contexte, outils utilisés, journal et statistiques.
- **Des créatures sauvages** se promènent sur la route et viennent parfois voir vos agents.

PokeAgents est un fork de [Pixel Agents](https://github.com/pixel-agents-hq/pixel-agents) (licence MIT), qui affichait les agents dans un bureau.

## Installation

### Prérequis

- **VS Code 1.105** ou plus récent.
- **Claude Code** installé et connecté : `npm install -g @anthropic-ai/claude-code`, puis `claude` une première fois.
- **Node.js 20** ou plus récent, seulement pour installer depuis les sources ou utiliser le serveur autonome.
- Une **connexion Internet** : les sprites des créatures sont téléchargés à la première utilisation, puis gardés en cache dans `~/.pokeagents/pokemon`.

### Option 1 — Depuis un fichier `.vsix` (recommandé)

1. Téléchargez le dernier `pokeagents-x.y.z.vsix` dans les [Releases GitHub](https://github.com/Akinaru/PokeAgents/releases).
2. Installez-le :
   ```bash
   code --install-extension pokeagents-x.y.z.vsix
   ```
   Ou dans VS Code : vue **Extensions** → menu **⋯** → **Install from VSIX…**
3. Rechargez la fenêtre si VS Code vous le demande.

### Option 2 — Depuis les sources

```bash
git clone https://github.com/Akinaru/PokeAgents.git
cd PokeAgents
npm install
npm run package                 # build de production
npx @vscode/vsce package        # crée pokeagents-x.y.z.vsix
code --install-extension pokeagents-*.vsix
```

Pour essayer sans installer : ouvrez le dossier dans VS Code et appuyez sur **F5**. Une fenêtre « Extension Development Host » s'ouvre avec PokeAgents chargé.

### Option 3 — Serveur autonome (navigateur)

Pour suivre vos agents hors de VS Code (tmux, terminal seul, autre éditeur) :

```bash
npm install && npm run compile
node dist/cli.js --port 3100
```

Ouvrez l'adresse affichée (`http://127.0.0.1:3100/?token=…`). **Gardez cette adresse pour vous** : le jeton qu'elle contient permet de modifier vos réglages Claude Code.

## Prise en main

1. Ouvrez la palette de commandes (`Cmd+Shift+P` sur macOS, `Ctrl+Shift+P` ailleurs) et lancez **PokeAgents: Show Panel**. Le panneau s'ouvre en bas de VS Code.
2. Au premier lancement, un guide vous présente l'interface. Il vous propose d'activer la **détection instantanée** : PokeAgents ajoute alors des hooks dans `~/.claude/settings.json` pour être prévenu en direct de ce que font vos agents.
   - Le guide affiche tout ce qui sera modifié avant de vous demander votre accord.
   - Si vous refusez, PokeAgents lit les transcripts de Claude Code. Ça marche aussi, avec un peu de retard.
   - Les réglages permettent d'activer ou de retirer les hooks à tout moment.
3. Lancez un agent :
   - avec la **Poké Ball « + Agent »** de la barre du bas, qui ouvre un terminal Claude Code ;
   - ou en lançant `claude` dans n'importe quel terminal du projet.
4. Son Pokémon apparaît sur une souche, puis part travailler quand l'agent utilise ses outils.

## Ce que vous voyez

### La route

Chaque agent porte une étiquette avec le nom de son projet et une pastille d'état :

| État     | Signification                                    |
| -------- | ------------------------------------------------ |
| **ACT**  | L'agent travaille.                               |
| **ATT**  | Il attend votre permission pour lancer un outil. |
| **FINI** | Il vient de terminer sa tâche.                   |
| **SOM**  | Il ne fait rien ; son Pokémon dort sur place.    |

Un agent au travail change de poste toutes les 10 à 20 secondes. Son poste dépend de l'outil qu'il utilise :

| Outil de l'agent                      | Ce que fait son Pokémon                     |
| ------------------------------------- | ------------------------------------------- |
| Lecture de fichiers                   | Il lit le panneau de la route.              |
| Recherche (Grep, Glob, recherche web) | Il fouille les hautes herbes ou un buisson. |
| Édition de fichiers                   | Il coupe un arbre.                          |
| Commande dans le terminal             | Il casse un rocher.                         |

Les agents restent toujours dans la vue de départ de la caméra, à bonne distance les uns des autres, pour rester cliquables et lisibles.

### La fiche au survol

<p align="center"><img src="docs/images/hover.png" alt="Fiche d'un agent au survol" width="800"></p>

Passez la souris sur un Pokémon pour voir son nom, son niveau (une tâche terminée = un niveau), ce qu'il fait et sa barre de PV. **Les PV, c'est le contexte encore libre** : quand la barre est rouge, la session approche de sa limite.

### L'écran de combat

<p align="center"><img src="docs/images/battle.png" alt="Écran de combat d'un agent" width="800"></p>

Cliquez sur un Pokémon pour ouvrir son écran de combat :

- **TERMINAL !** ouvre le terminal de l'agent. Le bouton devient **RÉPONDRE !** quand l'agent attend votre permission.
- Les **Poké Balls** du haut permettent de passer d'un agent à l'autre. Une Ball ternie indique un agent endormi, une Ball qui tremble un agent qui attend.
- **RÉSUMÉ** ouvre le résumé, **ÉQUIPE** la liste des agents, **FUITE** ferme l'écran (ou `Échap`).

### Le résumé

<p align="center">
  <img src="docs/images/summary-infos.png" alt="Résumé, onglet Infos" width="49%">
  <img src="docs/images/summary-stats.png" alt="Résumé, onglet Stats" width="49%">
</p>

Quatre onglets, et ◀ ▶ pour changer d'agent :

- **INFOS** : numéro du Pokédex, types, projet, contexte utilisé, prochaine évolution.
- **MÉMO** : sa nature, déduite de ses outils favoris, et le journal de ses actions.
- **CAPACITÉS** : Édition, Lecture, Commande et Recherche, avec le nombre d'utilisations.
- **STATS** : PV = contexte libre, ATTAQUE = éditions, DÉFENSE = lectures, ATQ. SPÉ. = commandes, DÉF. SPÉ. = recherches, VITESSE = tâches par heure.

Les capacités, le journal et les stats comptent ce qui se passe pendant que le panneau est ouvert. Ils repartent de zéro quand vous le rechargez.

### Équipe et Pokédex

<p align="center">
  <img src="docs/images/party.png" alt="Liste des agents" width="49%">
  <img src="docs/images/pokedex.png" alt="Pokédex" width="49%">
</p>

- **ÉQUIPE** liste tous vos agents avec leur état et leurs PV. Un clic ouvre le terminal de l'agent.
- **POKéDEX** garde chaque espèce rencontrée, avec la date, le projet et le nombre de rencontres. Il est enregistré dans `~/.pokeagents/pokedex.json`.

## Réglages

Le bouton **OPTIONS** ouvre les réglages :

| Réglage                   | Effet                                                          |
| ------------------------- | -------------------------------------------------------------- |
| Sound Notifications       | Petits bips de menu quand un agent finit ou attend.            |
| Instant Detection (Hooks) | Installe ou retire les hooks Claude Code.                      |
| Watch All Sessions        | Suit aussi les sessions Claude Code lancées hors de ce projet. |
| Always Show Labels        | Affiche en permanence la fiche de chaque agent.                |

Les fichiers d'PokeAgents vivent dans `~/.pokeagents/` : réglages, carte, Pokédex et cache des sprites. Pour tout remettre à zéro, fermez VS Code et supprimez ce dossier. Pour retirer les hooks, décochez **Instant Detection** avant de désinstaller. La désinstallation de l'extension les retire aussi.

### Look Noir/Blanc local (optionnel)

Si vous possédez vos propres textures de carte des jeux, vous pouvez les utiliser **sur votre machine uniquement** :

1. Placez les textures `matrix1_*.png` dans `tmp/bw/matrix1/`. Ce dossier est ignoré par git.
2. Lancez `npx tsx scripts/build-bw-pack.ts`.

Le script crée un pack dans `~/.pokeagents/packs/pokemon-bw` et l'active. Ces fichiers ne doivent jamais être ajoutés au dépôt ni partagés.

## Développement

```bash
npm install          # installe tout le monorepo
npm run compile      # génère le protocole, vérifie les types, lint, build
npm test             # tests du serveur et de l'interface
npm run e2e          # tests de bout en bout (Playwright)
```

- **F5** dans VS Code lance une fenêtre de développement avec l'extension.
- `npx tsx scripts/generate-route-assets.ts` régénère la carte et ses décors, dessinés par script.
- `npx tsx scripts/generate-pokedex.ts` régénère les données des espèces.

L'architecture (serveur, protocole, interface) est décrite dans [CLAUDE.md](CLAUDE.md) et [CONTRIBUTING.md](CONTRIBUTING.md).

## Crédits et mentions légales

PokeAgents est un **projet de fan gratuit et non commercial**.

- **Pokémon** © Nintendo, Creatures Inc. et GAME FREAK inc. Pokémon et les noms des personnages sont des marques de Nintendo. PokeAgents n'est ni affilié à ces sociétés, ni approuvé par elles. Le dépôt et l'extension ne contiennent aucune image extraite des jeux.
- **Décor de la route** : la carte, les arbres, les herbes et les souches sont dessinés par les scripts du dépôt.
- **Sprites des créatures** : téléchargés à l'exécution, jamais stockés dans le dépôt.
  - Sprites de déplacement : [PMDCollab SpriteCollab](https://github.com/PMDCollab/SpriteCollab), par ses contributeurs, sous licence [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/). Cette licence interdit tout usage commercial d'PokeAgents.
  - Sprites animés, icônes et objets : dépôt [PokeAPI/sprites](https://github.com/PokeAPI/sprites).
- **Données des espèces** : [PokeAPI](https://pokeapi.co/).
- **Police** : [Pixelify Sans](https://github.com/eifetx/Pixelify-Sans), © 2021 The Pixelify Sans Project Authors, sous licence SIL Open Font License 1.1.
- **Base du projet** : [Pixel Agents](https://github.com/pixel-agents-hq/pixel-agents), © 2026 Pablo De Lucca, licence MIT. Les personnages humains d'origine s'inspirent du pack [Metro City de JIK-A-4](https://jik-a-4.itch.io/metrocity-free-topdown-character-pack).
- **Claude Code** est un produit d'Anthropic. PokeAgents n'est pas affilié à Anthropic.

Le détail des licences tierces est dans [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

### Licence

Le code d'PokeAgents est sous [licence MIT](LICENSE). Cette licence couvre le code uniquement. Elle ne donne aucun droit sur les marques et personnages Pokémon, ni sur les sprites tiers, qui gardent leur propre licence.

Vous êtes ayant droit et souhaitez qu'un élément soit retiré ? [Ouvrez une issue](https://github.com/Akinaru/PokeAgents/issues) : il le sera rapidement.
