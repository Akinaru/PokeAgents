<h1 align="center">PokeAgents</h1>

<p align="center">
  🇬🇧 <a href="README.md">English</a> ·
  🇫🇷 <a href="README.fr.md">Français</a> ·
  <strong>🇪🇸 Español</strong> ·
  🇩🇪 <a href="README.de.md">Deutsch</a> ·
  🇮🇹 <a href="README.it.md">Italiano</a> ·
  🇧🇷 <a href="README.pt-BR.md">Português</a> ·
  🇯🇵 <a href="README.ja.md">日本語</a> ·
  🇨🇳 <a href="README.zh-CN.md">简体中文</a>
</p>

<p align="center"><strong>Tus agentes de Claude Code se convierten en criaturas de pixel art que trabajan en una ruta, al estilo de los juegos de DS.</strong></p>

<p align="center">
  <a href="#instalación">Instalación</a> •
  <a href="#primeros-pasos">Primeros pasos</a> •
  <a href="#lo-que-ves">Lo que ves</a> •
  <a href="#ajustes">Ajustes</a> •
  <a href="#desarrollo">Desarrollo</a> •
  <a href="#créditos-y-avisos-legales">Créditos y avisos legales</a>
</p>

<p align="center">
  <img src="docs/images/overview.png" alt="La ruta de PokeAgents con tres agentes trabajando y criaturas salvajes" width="900">
</p>

> **Proyecto de fans no oficial.** PokeAgents no está afiliado, respaldado ni patrocinado por Nintendo, Creatures Inc., GAME FREAK inc. o The Pokémon Company, ni por Anthropic. Pokémon y los nombres de los personajes son marcas de sus respectivos propietarios. El repositorio no contiene ninguna imagen extraída de los juegos. Consulta [Créditos y avisos legales](#créditos-y-avisos-legales).

## ¿Qué es?

PokeAgents es una extensión de VS Code (y un pequeño servidor independiente) que muestra cada sesión de [Claude Code](https://claude.com/claude-code) como una criatura en una ruta de pixel art:

- **Cada agente tiene su propio Pokémon**, elegido al azar y distinto cada día. Las especies raras también lo son aquí, y uno de cada 64 agentes es variocolor.
- **Evoluciona a medida que se llena su contexto**: primera evolución al 30 % del contexto, segunda al 60 %.
- **Se mueve según lo que hace**: lee el cartel de la ruta, rebusca en la hierba alta, tala un árbol o rompe una roca.
- **Duerme mientras espera.** Ves de un vistazo quién trabaja, quién ha terminado y quién espera tu respuesta.
- **Un clic abre su pantalla de combate**, con un resumen de su sesión: contexto, herramientas usadas, registro y estadísticas.
- **Criaturas salvajes** pasean por la ruta y a veces se acercan a ver a tus agentes.

PokeAgents es un fork de [Pixel Agents](https://github.com/pixel-agents-hq/pixel-agents) (licencia MIT), que mostraba a los agentes en una oficina.

## Instalación

### Requisitos

- **VS Code 1.105** o posterior.
- **Claude Code** instalado y con sesión iniciada: `npm install -g @anthropic-ai/claude-code` y luego `claude` una primera vez.
- **Node.js 20** o posterior, solo para instalar desde el código fuente o usar el servidor independiente.
- Una **conexión a Internet**: los sprites de las criaturas se descargan la primera vez y luego se guardan en caché en `~/.pokeagents/pokemon`.

### Opción 1 — Desde el VS Code Marketplace (recomendado)

En VS Code, abre la vista **Extensiones**, busca «PokeAgents» y haz clic en **Install**. O desde la línea de comandos: `code --install-extension akinaru.pokeagents`. Página de la extensión: [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=akinaru.pokeagents).

### Opción 2 — Desde un archivo `.vsix`

1. Descarga el último `pokeagents-x.y.z.vsix` desde las [Releases de GitHub](https://github.com/Akinaru/PokeAgents/releases).
2. Instálalo:
   ```bash
   code --install-extension pokeagents-x.y.z.vsix
   ```
   O en VS Code: vista **Extensiones** → menú **⋯** → **Install from VSIX…**
3. Recarga la ventana si VS Code te lo pide.

### Opción 3 — Desde el código fuente

```bash
git clone https://github.com/Akinaru/PokeAgents.git
cd PokeAgents
npm install
npm run package                 # build de producción
npx @vscode/vsce package        # crea pokeagents-x.y.z.vsix
code --install-extension pokeagents-*.vsix
```

Para probarlo sin instalar: abre la carpeta en VS Code y pulsa **F5**. Se abre una ventana «Extension Development Host» con PokeAgents cargado.

### Opción 4 — Servidor independiente (navegador)

Para seguir a tus agentes fuera de VS Code (tmux, un terminal solo, otro editor):

```bash
npm install && npm run compile
node dist/cli.js --port 3100
```

Abre la dirección que se muestra (`http://127.0.0.1:3100/?token=…`). **No compartas esta dirección**: el token que contiene permite modificar tus ajustes de Claude Code.

## Primeros pasos

1. Abre la paleta de comandos (`Cmd+Shift+P` en macOS, `Ctrl+Shift+P` en los demás sistemas) y ejecuta **PokeAgents: Show Panel**. El panel se abre en la parte inferior de VS Code.
2. En el primer inicio, una guía te presenta la interfaz. Te propone activar la **detección instantánea**: PokeAgents añade entonces hooks a `~/.claude/settings.json` para saber en tiempo real lo que hacen tus agentes.
   - La guía muestra todo lo que se va a modificar antes de pedirte permiso.
   - Si te niegas, PokeAgents lee los transcripts de Claude Code. También funciona, con algo de retraso.
   - Desde los ajustes puedes activar o quitar los hooks en cualquier momento.
3. Inicia un agente:
   - con la **Poké Ball «+ Agent»** de la barra inferior, que abre un terminal de Claude Code;
   - o ejecutando `claude` en cualquier terminal del proyecto.
4. Su Pokémon aparece sobre un tocón y luego se pone a trabajar cuando el agente usa sus herramientas.

## Lo que ves

La interfaz del panel está por ahora en francés. Las etiquetas de abajo aparecen tal como se muestran en pantalla, con su significado en español entre paréntesis.

### La ruta

Cada agente lleva una etiqueta con el nombre de su proyecto y una pastilla de estado:

| Estado   | Significado                                                               |
| -------- | ------------------------------------------------------------------------- |
| **ACT**  | Activo: el agente está trabajando.                                        |
| **ATT**  | En espera (_attente_): necesita tu permiso para ejecutar una herramienta. |
| **FINI** | Terminado: acaba de completar su tarea.                                   |
| **SOM**  | Dormido (_sommeil_): no hace nada; su Pokémon duerme en el sitio.         |

Un agente que trabaja cambia de puesto cada 10 a 20 segundos. Su puesto depende de la herramienta que use:

| Herramienta del agente              | Lo que hace su Pokémon                     |
| ----------------------------------- | ------------------------------------------ |
| Lectura de archivos                 | Lee el cartel de la ruta.                  |
| Búsqueda (Grep, Glob, búsqueda web) | Rebusca en la hierba alta o en un arbusto. |
| Edición de archivos                 | Tala un árbol.                             |
| Comando en el terminal              | Rompe una roca.                            |

Los agentes siempre se quedan dentro de la vista inicial de la cámara, bien separados entre sí, para que sigan siendo legibles y se pueda hacer clic en ellos.

### La ficha al pasar el ratón

<p align="center"><img src="docs/images/hover.png" alt="Ficha de un agente al pasar el ratón" width="800"></p>

Pasa el ratón por encima de un Pokémon para ver su nombre, su nivel (una tarea terminada = un nivel), lo que está haciendo y su barra de PS (indicada como **PV**). **Los PS son el contexto que queda libre**: cuando la barra se pone roja, la sesión se acerca a su límite.

### La pantalla de combate

<p align="center"><img src="docs/images/battle.png" alt="Pantalla de combate de un agente" width="800"></p>

Haz clic en un Pokémon para abrir su pantalla de combate:

- **TERMINAL !** abre el terminal del agente. El botón pasa a **RÉPONDRE !** (¡RESPONDER!) cuando el agente espera tu permiso.
- Las **Poké Balls** de arriba sirven para pasar de un agente a otro. Una Ball apagada indica un agente dormido; una Ball que tiembla, un agente que espera.
- **RÉSUMÉ** (DATOS) abre el resumen, **ÉQUIPE** (EQUIPO) la lista de agentes y **FUITE** (HUIR) cierra la pantalla (o pulsa `Esc`).

### El resumen

<p align="center">
  <img src="docs/images/summary-infos.png" alt="Resumen, pestaña Infos" width="49%">
  <img src="docs/images/summary-stats.png" alt="Resumen, pestaña Stats" width="49%">
</p>

Cuatro pestañas, y ◀ ▶ para cambiar de agente:

- **INFOS** (INFORMACIÓN): número de la Pokédex, tipos, proyecto, contexto usado, próxima evolución.
- **MÉMO** (NOTAS): su naturaleza, deducida de sus herramientas favoritas, y el registro de sus acciones.
- **CAPACITÉS** (MOVIMIENTOS): Edición, Lectura, Comando y Búsqueda, con el número de usos.
- **STATS** (ESTADÍSTICAS): PV (PS) = contexto libre, ATTAQUE (ATAQUE) = ediciones, DÉFENSE (DEFENSA) = lecturas, ATQ. SPÉ. (AT. ESP.) = comandos, DÉF. SPÉ. (DEF. ESP.) = búsquedas, VITESSE (VELOCIDAD) = tareas por hora.

Los movimientos, el registro y las estadísticas cuentan lo que ocurre mientras el panel está abierto. Vuelven a cero cuando lo recargas.

### Equipo y Pokédex

<p align="center">
  <img src="docs/images/party.png" alt="Lista de agentes" width="49%">
  <img src="docs/images/pokedex.png" alt="Pokédex" width="49%">
</p>

- **ÉQUIPE** (EQUIPO) muestra todos tus agentes con su estado y sus PS. Un clic abre el terminal del agente.
- **POKéDEX** registra cada especie que has encontrado, con la fecha, el proyecto y el número de encuentros. Se guarda en `~/.pokeagents/pokedex.json`.

## Ajustes

El botón **OPTIONS** abre los ajustes:

| Ajuste                    | Efecto                                                                  |
| ------------------------- | ----------------------------------------------------------------------- |
| Sound Notifications       | Pitidos cortos de menú cuando un agente termina o espera.               |
| Instant Detection (Hooks) | Instala o quita los hooks de Claude Code.                               |
| Watch All Sessions        | Sigue también las sesiones de Claude Code iniciadas fuera del proyecto. |
| Always Show Labels        | Muestra siempre la ficha de cada agente.                                |

Los archivos de PokeAgents están en `~/.pokeagents/`: ajustes, mapa, Pokédex y caché de sprites. Para restablecerlo todo, cierra VS Code y borra esa carpeta. Para quitar los hooks, desmarca **Instant Detection** antes de desinstalar. Desinstalar la extensión también los quita.

### Aspecto Negro/Blanco local (opcional)

Si tienes tus propias texturas de mapa de los juegos, puedes usarlas **solo en tu máquina**:

1. Coloca las texturas `matrix1_*.png` en `tmp/bw/matrix1/`. Git ignora esta carpeta.
2. Ejecuta `npx tsx scripts/build-bw-pack.ts`.

El script crea un pack en `~/.pokeagents/packs/pokemon-bw` y lo activa. Estos archivos nunca deben añadirse al repositorio ni compartirse.

## Desarrollo

```bash
npm install          # instala todo el monorepo
npm run compile      # genera el protocolo, comprueba los tipos, lint, build
npm test             # tests del servidor y de la interfaz
npm run e2e          # tests de extremo a extremo (Playwright)
```

- **F5** en VS Code abre una ventana de desarrollo con la extensión.
- `npx tsx scripts/generate-route-assets.ts` regenera el mapa y sus decorados, dibujados por script.
- `npx tsx scripts/generate-pokedex.ts` regenera los datos de las especies.

La arquitectura (servidor, protocolo, interfaz) se describe en [CLAUDE.md](CLAUDE.md) y [CONTRIBUTING.md](CONTRIBUTING.md).

## Créditos y avisos legales

PokeAgents es un **proyecto de fans gratuito y sin ánimo de lucro**.

- **Pokémon** © Nintendo, Creatures Inc. y GAME FREAK inc. Pokémon y los nombres de los personajes son marcas de Nintendo. PokeAgents no está afiliado a estas empresas ni cuenta con su aprobación. El repositorio y la extensión no contienen ninguna imagen extraída de los juegos.
- **Decorado de la ruta**: el mapa, los árboles, la hierba y los tocones los dibujan los scripts del repositorio.
- **Sprites de las criaturas**: se descargan en tiempo de ejecución y nunca se guardan en el repositorio.
  - Sprites de movimiento: [PMDCollab SpriteCollab](https://github.com/PMDCollab/SpriteCollab), de sus colaboradores, bajo licencia [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/). Esta licencia prohíbe cualquier uso comercial de PokeAgents.
  - Sprites animados, iconos y objetos: repositorio [PokeAPI/sprites](https://github.com/PokeAPI/sprites).
- **Datos de las especies**: [PokeAPI](https://pokeapi.co/).
- **Fuente**: [Pixelify Sans](https://github.com/eifetx/Pixelify-Sans), © 2021 The Pixelify Sans Project Authors, bajo licencia SIL Open Font License 1.1.
- **Base del proyecto**: [Pixel Agents](https://github.com/pixel-agents-hq/pixel-agents), © 2026 Pablo De Lucca, licencia MIT. Los personajes humanos originales se inspiran en el [pack Metro City de JIK-A-4](https://jik-a-4.itch.io/metrocity-free-topdown-character-pack).
- **Claude Code** es un producto de Anthropic. PokeAgents no está afiliado a Anthropic.

El detalle de las licencias de terceros está en [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

### Licencia

El código de PokeAgents está bajo [licencia MIT](LICENSE). Esta licencia cubre solo el código. No otorga ningún derecho sobre las marcas y personajes de Pokémon ni sobre los sprites de terceros, que conservan su propia licencia.

¿Eres titular de derechos y quieres que se retire algún elemento? [Abre una issue](https://github.com/Akinaru/PokeAgents/issues) y se retirará rápidamente.
