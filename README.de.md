<h1 align="center">PokeAgents</h1>

<p align="center">
  🇬🇧 <a href="README.md">English</a> ·
  🇫🇷 <a href="README.fr.md">Français</a> ·
  🇪🇸 <a href="README.es.md">Español</a> ·
  <strong>🇩🇪 Deutsch</strong> ·
  🇮🇹 <a href="README.it.md">Italiano</a> ·
  🇧🇷 <a href="README.pt-BR.md">Português</a> ·
  🇯🇵 <a href="README.ja.md">日本語</a> ·
  🇨🇳 <a href="README.zh-CN.md">简体中文</a>
</p>

<p align="center"><strong>Deine Claude-Code-Agenten werden zu Pixel-Art-Kreaturen, die auf einer Route arbeiten – ganz im Stil der DS-Spiele.</strong></p>

<p align="center">
  <a href="#installation">Installation</a> •
  <a href="#erste-schritte">Erste Schritte</a> •
  <a href="#was-du-siehst">Was du siehst</a> •
  <a href="#einstellungen">Einstellungen</a> •
  <a href="#entwicklung">Entwicklung</a> •
  <a href="#credits-und-rechtliche-hinweise">Credits und rechtliche Hinweise</a>
</p>

<p align="center">
  <img src="docs/images/overview.png" alt="Die PokeAgents-Route mit drei arbeitenden Agenten und wilden Kreaturen" width="900">
</p>

> **Inoffizielles Fanprojekt.** PokeAgents steht in keiner Verbindung zu Nintendo, Creatures Inc., GAME FREAK inc., The Pokémon Company oder Anthropic und wird von diesen weder unterstützt noch gesponsert. Pokémon und die Namen der Figuren sind Marken ihrer jeweiligen Inhaber. Das Repository enthält keine Bilder aus den Spielen. Siehe [Credits und rechtliche Hinweise](#credits-und-rechtliche-hinweise).

## Was ist das?

PokeAgents ist eine VS-Code-Erweiterung (plus ein kleiner eigenständiger Server), die jede [Claude Code](https://claude.com/claude-code)-Sitzung als Kreatur auf einer Pixel-Art-Route darstellt:

- **Jeder Agent bekommt sein eigenes Pokémon**, zufällig ausgelost und jeden Tag ein anderes. Seltene Arten sind auch hier selten, und einer von 64 Agenten ist schillernd.
- **Es entwickelt sich, wenn sich sein Kontext füllt**: erste Entwicklung bei 30 % des Kontexts, zweite bei 60 %.
- **Es bewegt sich je nachdem, was es gerade tut**: Es liest das Routenschild, durchsucht das hohe Gras, fällt einen Baum oder zertrümmert einen Felsen.
- **Es schläft, während es wartet.** Du siehst auf einen Blick, wer arbeitet, wer fertig ist und wer auf deine Antwort wartet.
- **Ein Klick öffnet seinen Kampfbildschirm** mit einer Übersicht seiner Sitzung: Kontext, verwendete Tools, Protokoll und Statuswerte.
- **Wilde Kreaturen** streifen über die Route und schauen manchmal bei deinen Agenten vorbei.

PokeAgents ist ein Fork von [Pixel Agents](https://github.com/pixel-agents-hq/pixel-agents) (MIT-Lizenz), das die Agenten in einem Büro zeigte.

## Installation

### Voraussetzungen

- **VS Code 1.105** oder neuer.
- **Claude Code**, installiert und angemeldet: `npm install -g @anthropic-ai/claude-code`, dann einmal `claude` ausführen.
- **Node.js 20** oder neuer, nur für die Installation aus dem Quellcode oder für den eigenständigen Server.
- Eine **Internetverbindung**: Die Sprites der Kreaturen werden bei der ersten Nutzung heruntergeladen und dann in `~/.pokeagents/pokemon` zwischengespeichert.

### Option 1 – Über den VS Code Marketplace (empfohlen)

Öffne in VS Code die Ansicht **Erweiterungen**, suche nach „PokeAgents“ und klicke auf **Install**. Oder über die Kommandozeile: `code --install-extension akinaru.pokeagents`. Seite der Erweiterung: [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=akinaru.pokeagents).

### Option 2 – Aus einer `.vsix`-Datei

1. Lade die neueste `pokeagents-x.y.z.vsix` aus den [GitHub-Releases](https://github.com/Akinaru/PokeAgents/releases) herunter.
2. Installiere sie:
   ```bash
   code --install-extension pokeagents-x.y.z.vsix
   ```
   Oder in VS Code: Ansicht **Erweiterungen** → Menü **⋯** → **Install from VSIX…**
3. Lade das Fenster neu, falls VS Code dich dazu auffordert.

### Option 3 – Aus dem Quellcode

```bash
git clone https://github.com/Akinaru/PokeAgents.git
cd PokeAgents
npm install
npm run package                 # Produktions-Build
npx @vscode/vsce package        # erzeugt pokeagents-x.y.z.vsix
code --install-extension pokeagents-*.vsix
```

Zum Ausprobieren ohne Installation: Öffne den Ordner in VS Code und drücke **F5**. Es öffnet sich ein „Extension Development Host“-Fenster mit geladenem PokeAgents.

### Option 4 – Eigenständiger Server (Browser)

Um deine Agenten außerhalb von VS Code zu verfolgen (tmux, ein reines Terminal, ein anderer Editor):

```bash
npm install && npm run compile
node dist/cli.js --port 3100
```

Öffne die angezeigte Adresse (`http://127.0.0.1:3100/?token=…`). **Behalte diese Adresse für dich**: Mit dem darin enthaltenen Token lassen sich deine Claude-Code-Einstellungen ändern.

## Erste Schritte

1. Öffne die Befehlspalette (`Cmd+Shift+P` unter macOS, sonst `Ctrl+Shift+P`) und führe **PokeAgents: Show Panel** aus. Das Panel öffnet sich unten in VS Code.
2. Beim ersten Start stellt dir eine Einführung die Oberfläche vor. Sie bietet dir an, die **Sofort-Erkennung** zu aktivieren: PokeAgents fügt dann Hooks in `~/.claude/settings.json` ein, um in Echtzeit zu erfahren, was deine Agenten tun.
   - Die Einführung zeigt alles, was geändert wird, bevor sie dich um Zustimmung bittet.
   - Wenn du ablehnst, liest PokeAgents stattdessen die Transkripte von Claude Code. Das funktioniert auch, nur mit etwas Verzögerung.
   - In den Einstellungen kannst du die Hooks jederzeit aktivieren oder entfernen.
3. Starte einen Agenten:
   - mit dem **„+ Agent“-Pokéball** in der unteren Leiste, der ein Claude-Code-Terminal öffnet;
   - oder indem du `claude` in einem beliebigen Terminal des Projekts ausführst.
4. Sein Pokémon erscheint auf einem Baumstumpf und macht sich an die Arbeit, sobald der Agent seine Tools nutzt.

## Was du siehst

Die Oberfläche des Panels ist derzeit auf Französisch. Die Beschriftungen unten stehen genau so da, wie sie auf dem Bildschirm erscheinen, mit ihrer deutschen Bedeutung in Klammern.

### Die Route

Jeder Agent trägt ein Namensschild mit dem Namen seines Projekts und einem Status-Abzeichen:

| Status   | Bedeutung                                                                     |
| -------- | ----------------------------------------------------------------------------- |
| **ACT**  | Aktiv: Der Agent arbeitet.                                                    |
| **ATT**  | Wartend (_attente_): Er braucht deine Erlaubnis, um ein Tool auszuführen.     |
| **FINI** | Fertig: Er hat gerade seine Aufgabe abgeschlossen.                            |
| **SOM**  | Schlafend (_sommeil_): Er tut nichts; sein Pokémon schläft an Ort und Stelle. |

Ein arbeitender Agent wechselt alle 10 bis 20 Sekunden seinen Platz. Der Platz hängt vom Tool ab, das er gerade nutzt:

| Tool des Agenten             | Was sein Pokémon tut                          |
| ---------------------------- | --------------------------------------------- |
| Dateien lesen                | Es liest das Routenschild.                    |
| Suche (Grep, Glob, Websuche) | Es durchsucht das hohe Gras oder einen Busch. |
| Dateien bearbeiten           | Es fällt einen Baum.                          |
| Befehl im Terminal           | Es zertrümmert einen Felsen.                  |

Die Agenten bleiben immer in der Startansicht der Kamera und halten Abstand voneinander, damit sie anklickbar und gut lesbar bleiben.

### Die Karte beim Überfahren

<p align="center"><img src="docs/images/hover.png" alt="Karte eines Agenten beim Überfahren mit der Maus" width="800"></p>

Fahre mit der Maus über ein Pokémon, um seinen Namen, sein Level (eine erledigte Aufgabe = ein Level), seine aktuelle Tätigkeit und seine KP-Leiste (beschriftet mit **PV**) zu sehen. **Die KP sind der noch freie Kontext**: Wird die Leiste rot, nähert sich die Sitzung ihrem Limit.

### Der Kampfbildschirm

<p align="center"><img src="docs/images/battle.png" alt="Kampfbildschirm eines Agenten" width="800"></p>

Klicke auf ein Pokémon, um seinen Kampfbildschirm zu öffnen:

- **TERMINAL !** öffnet das Terminal des Agenten. Die Schaltfläche wird zu **RÉPONDRE !** (ANTWORTEN!), wenn der Agent auf deine Erlaubnis wartet.
- Mit den **Pokébällen** oben wechselst du von einem Agenten zum anderen. Ein matter Ball steht für einen schlafenden Agenten, ein wackelnder Ball für einen wartenden.
- **RÉSUMÉ** (BERICHT) öffnet die Übersicht, **ÉQUIPE** (TEAM) die Liste der Agenten, und **FUITE** (FLUCHT) schließt den Bildschirm (oder `Esc`).

### Die Übersicht

<p align="center">
  <img src="docs/images/summary-infos.png" alt="Übersicht, Tab Infos" width="49%">
  <img src="docs/images/summary-stats.png" alt="Übersicht, Tab Stats" width="49%">
</p>

Vier Tabs, dazu ◀ ▶ zum Wechseln des Agenten:

- **INFOS**: Pokédex-Nummer, Typen, Projekt, genutzter Kontext, nächste Entwicklung.
- **MÉMO** (NOTIZEN): sein Wesen, abgeleitet aus seinen Lieblings-Tools, und das Protokoll seiner Aktionen.
- **CAPACITÉS** (ATTACKEN): Bearbeiten, Lesen, Befehl und Suche, jeweils mit der Anzahl der Einsätze.
- **STATS** (STATUSWERTE): PV (KP) = freier Kontext, ATTAQUE (ANGRIFF) = Bearbeitungen, DÉFENSE (VERTEIDIGUNG) = Lesevorgänge, ATQ. SPÉ. (SP.-ANGR.) = Befehle, DÉF. SPÉ. (SP.-VERT.) = Suchen, VITESSE (INITIATIVE) = Aufgaben pro Stunde.

Attacken, Protokoll und Statuswerte zählen, was passiert, während das Panel geöffnet ist. Beim Neuladen beginnen sie wieder bei null.

### Team und Pokédex

<p align="center">
  <img src="docs/images/party.png" alt="Liste der Agenten" width="49%">
  <img src="docs/images/pokedex.png" alt="Pokédex" width="49%">
</p>

- **ÉQUIPE** (TEAM) listet alle deine Agenten mit Status und KP auf. Ein Klick öffnet das Terminal des Agenten.
- **POKéDEX** verzeichnet jede Art, der du begegnet bist, mit Datum, Projekt und Anzahl der Begegnungen. Er wird in `~/.pokeagents/pokedex.json` gespeichert.

## Einstellungen

Die Schaltfläche **OPTIONS** öffnet die Einstellungen:

| Einstellung               | Wirkung                                                                 |
| ------------------------- | ----------------------------------------------------------------------- |
| Sound Notifications       | Kurze Menü-Pieptöne, wenn ein Agent fertig ist oder wartet.             |
| Instant Detection (Hooks) | Installiert oder entfernt die Claude-Code-Hooks.                        |
| Watch All Sessions        | Verfolgt auch Claude-Code-Sitzungen, die außerhalb des Projekts laufen. |
| Always Show Labels        | Zeigt die Karte jedes Agenten dauerhaft an.                             |

Die Dateien von PokeAgents liegen in `~/.pokeagents/`: Einstellungen, Karte, Pokédex und Sprite-Cache. Um alles zurückzusetzen, schließe VS Code und lösche diesen Ordner. Um die Hooks zu entfernen, deaktiviere **Instant Detection** vor der Deinstallation. Auch die Deinstallation der Erweiterung entfernt sie.

### Lokaler Schwarz/Weiß-Look (optional)

Wenn du eigene Kartentexturen aus den Spielen besitzt, kannst du sie **nur auf deinem Rechner** verwenden:

1. Lege die Texturen `matrix1_*.png` in `tmp/bw/matrix1/` ab. Dieser Ordner wird von git ignoriert.
2. Führe `npx tsx scripts/build-bw-pack.ts` aus.

Das Skript erstellt ein Pack in `~/.pokeagents/packs/pokemon-bw` und aktiviert es. Diese Dateien dürfen niemals ins Repository aufgenommen oder weitergegeben werden.

## Entwicklung

```bash
npm install          # installiert das gesamte Monorepo
npm run compile      # erzeugt das Protokoll, prüft Typen, Lint, Build
npm test             # Tests für Server und Oberfläche
npm run e2e          # End-to-End-Tests (Playwright)
```

- **F5** in VS Code öffnet ein Entwicklungsfenster mit der Erweiterung.
- `npx tsx scripts/generate-route-assets.ts` erzeugt die Karte und ihre per Skript gezeichneten Kulissen neu.
- `npx tsx scripts/generate-pokedex.ts` erzeugt die Artendaten neu.

Die Architektur (Server, Protokoll, Oberfläche) ist in [CLAUDE.md](CLAUDE.md) und [CONTRIBUTING.md](CONTRIBUTING.md) beschrieben.

## Credits und rechtliche Hinweise

PokeAgents ist ein **kostenloses, nicht kommerzielles Fanprojekt**.

- **Pokémon** © Nintendo, Creatures Inc. und GAME FREAK inc. Pokémon und die Namen der Figuren sind Marken von Nintendo. PokeAgents ist weder mit diesen Unternehmen verbunden noch von ihnen genehmigt. Repository und Erweiterung enthalten keine aus den Spielen extrahierten Bilder.
- **Kulisse der Route**: Karte, Bäume, Gras und Baumstümpfe werden von den Skripten im Repository gezeichnet.
- **Sprites der Kreaturen**: werden zur Laufzeit heruntergeladen und nie im Repository gespeichert.
  - Bewegungs-Sprites: [PMDCollab SpriteCollab](https://github.com/PMDCollab/SpriteCollab), von seinen Mitwirkenden, unter der Lizenz [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/). Diese Lizenz untersagt jede kommerzielle Nutzung von PokeAgents.
  - Animierte Sprites, Symbole und Items: Repository [PokeAPI/sprites](https://github.com/PokeAPI/sprites).
- **Artendaten**: [PokeAPI](https://pokeapi.co/).
- **Schriftart**: [Pixelify Sans](https://github.com/eifetx/Pixelify-Sans), © 2021 The Pixelify Sans Project Authors, unter der SIL Open Font License 1.1.
- **Projektbasis**: [Pixel Agents](https://github.com/pixel-agents-hq/pixel-agents), © 2026 Pablo De Lucca, MIT-Lizenz. Die ursprünglichen menschlichen Figuren sind vom [Metro-City-Pack von JIK-A-4](https://jik-a-4.itch.io/metrocity-free-topdown-character-pack) inspiriert.
- **Claude Code** ist ein Produkt von Anthropic. PokeAgents ist nicht mit Anthropic verbunden.

Die Einzelheiten zu den Lizenzen Dritter stehen in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

### Lizenz

Der Code von PokeAgents steht unter der [MIT-Lizenz](LICENSE). Diese Lizenz deckt nur den Code ab. Sie gewährt keinerlei Rechte an den Pokémon-Marken und -Figuren oder an den Sprites Dritter, für die weiterhin deren eigene Lizenz gilt.

Du bist Rechteinhaber und möchtest, dass etwas entfernt wird? [Eröffne ein Issue](https://github.com/Akinaru/PokeAgents/issues) – es wird umgehend entfernt.
