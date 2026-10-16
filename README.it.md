<h1 align="center">PokeAgents</h1>

<p align="center">
  🇬🇧 <a href="README.md">English</a> ·
  🇫🇷 <a href="README.fr.md">Français</a> ·
  🇪🇸 <a href="README.es.md">Español</a> ·
  🇩🇪 <a href="README.de.md">Deutsch</a> ·
  <strong>🇮🇹 Italiano</strong> ·
  🇧🇷 <a href="README.pt-BR.md">Português</a> ·
  🇯🇵 <a href="README.ja.md">日本語</a> ·
  🇨🇳 <a href="README.zh-CN.md">简体中文</a>
</p>

<p align="center"><strong>I tuoi agenti Claude Code diventano creature in pixel art che lavorano lungo un percorso, in stile giochi per DS.</strong></p>

<p align="center">
  <a href="#installazione">Installazione</a> •
  <a href="#primi-passi">Primi passi</a> •
  <a href="#cosa-vedi">Cosa vedi</a> •
  <a href="#impostazioni">Impostazioni</a> •
  <a href="#sviluppo">Sviluppo</a> •
  <a href="#crediti-e-note-legali">Crediti e note legali</a>
</p>

<p align="center">
  <img src="docs/images/overview.png" alt="Il percorso di PokeAgents con tre agenti al lavoro e creature selvatiche" width="900">
</p>

> **Progetto amatoriale non ufficiale.** PokeAgents non è affiliato, approvato né sponsorizzato da Nintendo, Creatures Inc., GAME FREAK inc. o The Pokémon Company, né da Anthropic. Pokémon e i nomi dei personaggi sono marchi dei rispettivi proprietari. Il repository non contiene alcuna immagine tratta dai giochi. Vedi [Crediti e note legali](#crediti-e-note-legali).

## Che cos'è?

PokeAgents è un'estensione per VS Code (più un piccolo server autonomo) che mostra ogni sessione di [Claude Code](https://claude.com/claude-code) come una creatura su un percorso in pixel art:

- **Ogni agente ha il suo Pokémon**, estratto a sorte e diverso ogni giorno. Le specie rare lo sono anche qui, e un agente su 64 è cromatico.
- **Si evolve man mano che il suo contesto si riempie**: prima evoluzione al 30% del contesto, seconda al 60%.
- **Si sposta in base a ciò che fa**: legge il cartello del percorso, fruga nell'erba alta, taglia un albero o spacca una roccia.
- **Dorme mentre aspetta.** Vedi a colpo d'occhio chi lavora, chi ha finito e chi aspetta la tua risposta.
- **Un clic apre la sua schermata di lotta**, con un riepilogo della sessione: contesto, strumenti usati, registro e statistiche.
- **Creature selvatiche** passeggiano lungo il percorso e a volte vengono a trovare i tuoi agenti.

PokeAgents è un fork di [Pixel Agents](https://github.com/pixel-agents-hq/pixel-agents) (licenza MIT), che mostrava gli agenti in un ufficio.

## Installazione

### Requisiti

- **VS Code 1.105** o successivo.
- **Claude Code** installato e con accesso effettuato: `npm install -g @anthropic-ai/claude-code`, poi `claude` una prima volta.
- **Node.js 20** o successivo, solo per installare dai sorgenti o usare il server autonomo.
- Una **connessione a Internet**: gli sprite delle creature vengono scaricati al primo utilizzo e poi conservati in cache in `~/.pokeagents/pokemon`.

### Opzione 1 — Dal VS Code Marketplace (consigliata)

In VS Code apri la vista **Estensioni**, cerca "PokeAgents" e fai clic su **Install**. Oppure da riga di comando: `code --install-extension akinaru.pokeagents`. Pagina dell'estensione: [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=akinaru.pokeagents).

### Opzione 2 — Da un file `.vsix`

1. Scarica l'ultimo `pokeagents-x.y.z.vsix` dalle [Release di GitHub](https://github.com/Akinaru/PokeAgents/releases).
2. Installalo:
   ```bash
   code --install-extension pokeagents-x.y.z.vsix
   ```
   Oppure in VS Code: vista **Estensioni** → menu **⋯** → **Install from VSIX…**
3. Ricarica la finestra se VS Code te lo chiede.

### Opzione 3 — Dai sorgenti

```bash
git clone https://github.com/Akinaru/PokeAgents.git
cd PokeAgents
npm install
npm run package                 # build di produzione
npx @vscode/vsce package        # crea pokeagents-x.y.z.vsix
code --install-extension pokeagents-*.vsix
```

Per provarlo senza installarlo: apri la cartella in VS Code e premi **F5**. Si apre una finestra "Extension Development Host" con PokeAgents caricato.

### Opzione 4 — Server autonomo (browser)

Per seguire i tuoi agenti fuori da VS Code (tmux, un semplice terminale, un altro editor):

```bash
npm install && npm run compile
node dist/cli.js --port 3100
```

Apri l'indirizzo mostrato (`http://127.0.0.1:3100/?token=…`). **Tieni questo indirizzo per te**: il token che contiene permette di modificare le tue impostazioni di Claude Code.

## Primi passi

1. Apri la palette dei comandi (`Cmd+Shift+P` su macOS, `Ctrl+Shift+P` altrove) ed esegui **PokeAgents: Show Panel**. Il pannello si apre nella parte inferiore di VS Code.
2. Al primo avvio, una guida ti presenta l'interfaccia. Ti propone di attivare il **rilevamento istantaneo**: PokeAgents aggiunge allora degli hook in `~/.claude/settings.json` per sapere in tempo reale cosa fanno i tuoi agenti.
   - La guida mostra tutto ciò che verrà modificato prima di chiederti il consenso.
   - Se rifiuti, PokeAgents legge i transcript di Claude Code. Funziona lo stesso, con un po' di ritardo.
   - Dalle impostazioni puoi attivare o rimuovere gli hook in qualsiasi momento.
3. Avvia un agente:
   - con la **Poké Ball "+ Agent"** nella barra in basso, che apre un terminale di Claude Code;
   - oppure eseguendo `claude` in un qualsiasi terminale del progetto.
4. Il suo Pokémon compare su un ceppo, poi si mette al lavoro quando l'agente usa i suoi strumenti.

## Cosa vedi

L'interfaccia del pannello è per ora in francese. Le etichette qui sotto sono riportate esattamente come appaiono sullo schermo, con il loro significato in italiano tra parentesi.

### Il percorso

Ogni agente porta un'etichetta con il nome del suo progetto e un badge di stato:

| Stato    | Significato                                                               |
| -------- | ------------------------------------------------------------------------- |
| **ACT**  | Attivo: l'agente sta lavorando.                                           |
| **ATT**  | In attesa (_attente_): gli serve il tuo permesso per usare uno strumento. |
| **FINI** | Finito: ha appena completato il suo compito.                              |
| **SOM**  | Addormentato (_sommeil_): non fa nulla; il suo Pokémon dorme sul posto.   |

Un agente al lavoro cambia postazione ogni 10-20 secondi. La postazione dipende dallo strumento che usa:

| Strumento dell'agente             | Cosa fa il suo Pokémon                  |
| --------------------------------- | --------------------------------------- |
| Lettura di file                   | Legge il cartello del percorso.         |
| Ricerca (Grep, Glob, ricerca web) | Fruga nell'erba alta o in un cespuglio. |
| Modifica di file                  | Taglia un albero.                       |
| Comando nel terminale             | Spacca una roccia.                      |

Gli agenti restano sempre nella vista iniziale della telecamera, ben distanziati tra loro, per restare cliccabili e leggibili.

### La scheda al passaggio del mouse

<p align="center"><img src="docs/images/hover.png" alt="Scheda di un agente al passaggio del mouse" width="800"></p>

Passa il mouse su un Pokémon per vedere il suo nome, il suo livello (un compito finito = un livello), cosa sta facendo e la sua barra dei PS (indicata come **PV**). **I PS sono il contesto ancora libero**: quando la barra diventa rossa, la sessione si avvicina al suo limite.

### La schermata di lotta

<p align="center"><img src="docs/images/battle.png" alt="Schermata di lotta di un agente" width="800"></p>

Fai clic su un Pokémon per aprire la sua schermata di lotta:

- **TERMINAL !** apre il terminale dell'agente. Il pulsante diventa **RÉPONDRE !** (RISPONDI!) quando l'agente aspetta il tuo permesso.
- Le **Poké Ball** in alto permettono di passare da un agente all'altro. Una Ball spenta indica un agente addormentato, una Ball che trema un agente in attesa.
- **RÉSUMÉ** (INFO) apre il riepilogo, **ÉQUIPE** (SQUADRA) l'elenco degli agenti e **FUITE** (FUGA) chiude la schermata (oppure `Esc`).

### Il riepilogo

<p align="center">
  <img src="docs/images/summary-infos.png" alt="Riepilogo, scheda Infos" width="49%">
  <img src="docs/images/summary-stats.png" alt="Riepilogo, scheda Stats" width="49%">
</p>

Quattro schede, più ◀ ▶ per cambiare agente:

- **INFOS** (INFORMAZIONI): numero del Pokédex, tipi, progetto, contesto usato, prossima evoluzione.
- **MÉMO** (PROMEMORIA): la sua natura, dedotta dai suoi strumenti preferiti, e il registro delle sue azioni.
- **CAPACITÉS** (MOSSE): Modifica, Lettura, Comando e Ricerca, con il numero di utilizzi.
- **STATS** (STATISTICHE): PV (PS) = contesto libero, ATTAQUE (ATTACCO) = modifiche, DÉFENSE (DIFESA) = letture, ATQ. SPÉ. (ATT. SP.) = comandi, DÉF. SPÉ. (DIF. SP.) = ricerche, VITESSE (VELOCITÀ) = compiti all'ora.

Mosse, registro e statistiche contano ciò che succede mentre il pannello è aperto. Ripartono da zero quando lo ricarichi.

### Squadra e Pokédex

<p align="center">
  <img src="docs/images/party.png" alt="Elenco degli agenti" width="49%">
  <img src="docs/images/pokedex.png" alt="Pokédex" width="49%">
</p>

- **ÉQUIPE** (SQUADRA) elenca tutti i tuoi agenti con il loro stato e i loro PS. Un clic apre il terminale dell'agente.
- **POKéDEX** registra ogni specie incontrata, con la data, il progetto e il numero di incontri. Viene salvato in `~/.pokeagents/pokedex.json`.

## Impostazioni

Il pulsante **OPTIONS** apre le impostazioni:

| Impostazione              | Effetto                                                            |
| ------------------------- | ------------------------------------------------------------------ |
| Sound Notifications       | Brevi bip di menu quando un agente finisce o è in attesa.          |
| Instant Detection (Hooks) | Installa o rimuove gli hook di Claude Code.                        |
| Watch All Sessions        | Segue anche le sessioni di Claude Code avviate fuori dal progetto. |
| Always Show Labels        | Mostra sempre la scheda di ogni agente.                            |

I file di PokeAgents si trovano in `~/.pokeagents/`: impostazioni, mappa, Pokédex e cache degli sprite. Per azzerare tutto, chiudi VS Code ed elimina questa cartella. Per rimuovere gli hook, deseleziona **Instant Detection** prima di disinstallare. Anche la disinstallazione dell'estensione li rimuove.

### Look Nero/Bianco locale (facoltativo)

Se possiedi le tue texture della mappa dai giochi, puoi usarle **solo sul tuo computer**:

1. Metti le texture `matrix1_*.png` in `tmp/bw/matrix1/`. Questa cartella è ignorata da git.
2. Esegui `npx tsx scripts/build-bw-pack.ts`.

Lo script crea un pack in `~/.pokeagents/packs/pokemon-bw` e lo attiva. Questi file non devono mai essere aggiunti al repository né condivisi.

## Sviluppo

```bash
npm install          # installa tutto il monorepo
npm run compile      # genera il protocollo, controlla i tipi, lint, build
npm test             # test del server e dell'interfaccia
npm run e2e          # test end-to-end (Playwright)
```

- **F5** in VS Code apre una finestra di sviluppo con l'estensione.
- `npx tsx scripts/generate-route-assets.ts` rigenera la mappa e i suoi elementi scenici, disegnati da script.
- `npx tsx scripts/generate-pokedex.ts` rigenera i dati delle specie.

L'architettura (server, protocollo, interfaccia) è descritta in [CLAUDE.md](CLAUDE.md) e [CONTRIBUTING.md](CONTRIBUTING.md).

## Crediti e note legali

PokeAgents è un **progetto amatoriale gratuito e non commerciale**.

- **Pokémon** © Nintendo, Creatures Inc. e GAME FREAK inc. Pokémon e i nomi dei personaggi sono marchi di Nintendo. PokeAgents non è affiliato a queste società né approvato da esse. Il repository e l'estensione non contengono alcuna immagine estratta dai giochi.
- **Scenario del percorso**: la mappa, gli alberi, l'erba e i ceppi sono disegnati dagli script del repository.
- **Sprite delle creature**: scaricati durante l'esecuzione, mai salvati nel repository.
  - Sprite di movimento: [PMDCollab SpriteCollab](https://github.com/PMDCollab/SpriteCollab), dei suoi collaboratori, con licenza [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/). Questa licenza vieta qualsiasi uso commerciale di PokeAgents.
  - Sprite animati, icone e strumenti: repository [PokeAPI/sprites](https://github.com/PokeAPI/sprites).
- **Dati delle specie**: [PokeAPI](https://pokeapi.co/).
- **Font**: [Pixelify Sans](https://github.com/eifetx/Pixelify-Sans), © 2021 The Pixelify Sans Project Authors, con licenza SIL Open Font License 1.1.
- **Base del progetto**: [Pixel Agents](https://github.com/pixel-agents-hq/pixel-agents), © 2026 Pablo De Lucca, licenza MIT. I personaggi umani originali si ispirano al [pack Metro City di JIK-A-4](https://jik-a-4.itch.io/metrocity-free-topdown-character-pack).
- **Claude Code** è un prodotto di Anthropic. PokeAgents non è affiliato ad Anthropic.

Il dettaglio delle licenze di terze parti si trova in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

### Licenza

Il codice di PokeAgents è distribuito con [licenza MIT](LICENSE). Questa licenza copre solo il codice. Non concede alcun diritto sui marchi e sui personaggi Pokémon, né sugli sprite di terze parti, che mantengono la propria licenza.

Sei titolare di diritti e vuoi che un elemento venga rimosso? [Apri una issue](https://github.com/Akinaru/PokeAgents/issues): verrà rimosso rapidamente.
