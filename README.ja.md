<h1 align="center">PokeAgents</h1>

<p align="center">
  🇬🇧 <a href="README.md">English</a> ·
  🇫🇷 <a href="README.fr.md">Français</a> ·
  🇪🇸 <a href="README.es.md">Español</a> ·
  🇩🇪 <a href="README.de.md">Deutsch</a> ·
  🇮🇹 <a href="README.it.md">Italiano</a> ·
  🇧🇷 <a href="README.pt-BR.md">Português</a> ·
  <strong>🇯🇵 日本語</strong> ·
  🇨🇳 <a href="README.zh-CN.md">简体中文</a>
</p>

<p align="center"><strong>Claude Code のエージェントが、DS のゲームのようなドット絵の道路で働くモンスターになります。</strong></p>

<p align="center">
  <a href="#インストール">インストール</a> •
  <a href="#はじめかた">はじめかた</a> •
  <a href="#画面の見かた">画面の見かた</a> •
  <a href="#設定">設定</a> •
  <a href="#開発">開発</a> •
  <a href="#クレジットと法的表示">クレジットと法的表示</a>
</p>

<p align="center">
  <img src="docs/images/overview.png" alt="3 体のエージェントが働き、野生のモンスターがいる PokeAgents の道路" width="900">
</p>

> **非公式のファンプロジェクトです。** PokeAgents は Nintendo、Creatures Inc.、GAME FREAK inc.、The Pokémon Company、および Anthropic とは一切関係がなく、これらの企業による承認やスポンサーも受けていません。ポケモンおよびキャラクター名は各権利者の商標です。このリポジトリにはゲームから取り出した画像は一切含まれていません。詳しくは [クレジットと法的表示](#クレジットと法的表示) をご覧ください。

## PokeAgents とは

PokeAgents は VS Code 拡張機能（と小さなスタンドアロンサーバー）で、[Claude Code](https://claude.com/claude-code) の各セッションをドット絵の道路にいるモンスターとして表示します。

- **エージェントごとに自分のポケモンがいます。** ランダムに選ばれ、毎日変わります。珍しい種類はここでも珍しく、64 体に 1 体は色違いです。
- **コンテキストが埋まるにつれて進化します。** コンテキストの 30% で 1 回目、60% で 2 回目の進化です。
- **やっていることに応じて移動します。** 道路の看板を読んだり、草むらを探したり、木を切ったり、岩を砕いたりします。
- **待っているあいだは眠ります。** 誰が作業中で、誰が終わって、誰があなたの返事を待っているかがひと目でわかります。
- **クリックするとバトル画面が開き**、セッションの概要（コンテキスト、使ったツール、ログ、ステータス）が表示されます。
- **野生のモンスター** が道路を歩き回り、ときどきエージェントの様子を見に来ます。

PokeAgents は、エージェントをオフィスに表示していた [Pixel Agents](https://github.com/pixel-agents-hq/pixel-agents)（MIT ライセンス）のフォークです。

## インストール

### 必要なもの

- **VS Code 1.105** 以降。
- インストール済みでログイン済みの **Claude Code**：`npm install -g @anthropic-ai/claude-code` を実行し、一度 `claude` を起動してください。
- **Node.js 20** 以降（ソースからインストールする場合とスタンドアロンサーバーを使う場合のみ）。
- **インターネット接続**：モンスターのスプライトは初回使用時にダウンロードされ、その後 `~/.pokeagents/pokemon` にキャッシュされます。

### オプション 1 — VS Code Marketplace から（推奨）

VS Code で **拡張機能** ビューを開き、「PokeAgents」を検索して **Install** をクリックします。コマンドラインからは `code --install-extension akinaru.pokeagents` を実行します。拡張機能のページ：[VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=akinaru.pokeagents)。

### オプション 2 — `.vsix` ファイルから

1. [GitHub Releases](https://github.com/Akinaru/PokeAgents/releases) から最新の `pokeagents-x.y.z.vsix` をダウンロードします。
2. インストールします。
   ```bash
   code --install-extension pokeagents-x.y.z.vsix
   ```
   または VS Code で：**拡張機能** ビュー → **⋯** メニュー → **Install from VSIX…**
3. VS Code に求められたらウィンドウを再読み込みします。

### オプション 3 — ソースから

```bash
git clone https://github.com/Akinaru/PokeAgents.git
cd PokeAgents
npm install
npm run package                 # 本番ビルド
npx @vscode/vsce package        # pokeagents-x.y.z.vsix を作成
code --install-extension pokeagents-*.vsix
```

インストールせずに試すには、フォルダーを VS Code で開いて **F5** を押します。PokeAgents が読み込まれた「Extension Development Host」ウィンドウが開きます。

### オプション 4 — スタンドアロンサーバー（ブラウザー）

VS Code の外（tmux、ターミナルのみ、別のエディター）でエージェントを見るには：

```bash
npm install && npm run compile
node dist/cli.js --port 3100
```

表示されたアドレス（`http://127.0.0.1:3100/?token=…`）を開きます。**このアドレスは他人に教えないでください。** 含まれているトークンを使うと、Claude Code の設定を変更できてしまいます。

## はじめかた

1. コマンドパレット（macOS では `Cmd+Shift+P`、それ以外では `Ctrl+Shift+P`）を開き、**PokeAgents: Show Panel** を実行します。VS Code の下部にパネルが開きます。
2. 初回起動時には、ガイドがインターフェースを案内します。ガイドは **即時検出** を有効にするか尋ねます。有効にすると、PokeAgents は `~/.claude/settings.json` にフックを追加し、エージェントの動きをリアルタイムで受け取ります。
   - ガイドは同意を求める前に、変更される内容をすべて表示します。
   - 断った場合、PokeAgents は Claude Code のトランスクリプトを読み取ります。少し遅れますが、こちらでも動作します。
   - フックは設定からいつでも有効にしたり削除したりできます。
3. エージェントを起動します。
   - 下部バーの **「+ Agent」モンスターボール** を使うと、Claude Code のターミナルが開きます。
   - または、プロジェクト内の任意のターミナルで `claude` を実行します。
4. そのポケモンが切り株の上に現れ、エージェントがツールを使い始めると仕事に向かいます。

## 画面の見かた

パネルのインターフェースは現在フランス語のみです。以下のラベルは画面に表示されるとおりに記載し、かっこ内に日本語の意味を添えています。

### 道路

各エージェントには、プロジェクト名と状態バッジが付いた名札があります。

| 状態     | 意味                                                                    |
| -------- | ----------------------------------------------------------------------- |
| **ACT**  | 作業中：エージェントが働いています。                                    |
| **ATT**  | 待機中（_attente_）：ツールを実行するためにあなたの許可を待っています。 |
| **FINI** | 完了：タスクを終えたところです。                                        |
| **SOM**  | ねむり（_sommeil_）：何もしていません。ポケモンはその場で眠っています。 |

作業中のエージェントは 10〜20 秒ごとに持ち場を変えます。持ち場は使っているツールによって決まります。

| エージェントのツール           | ポケモンの行動           |
| ------------------------------ | ------------------------ |
| ファイルの読み取り             | 道路の看板を読みます。   |
| 検索（Grep、Glob、ウェブ検索） | 草むらや茂みを探します。 |
| ファイルの編集                 | 木を切ります。           |
| ターミナルでのコマンド         | 岩を砕きます。           |

エージェントはクリックしやすく見やすいよう、常にカメラの初期表示範囲内に、互いに十分な距離をとって配置されます。

### ホバー時のカード

<p align="center"><img src="docs/images/hover.png" alt="ホバー時のエージェントのカード" width="800"></p>

ポケモンにマウスを重ねると、名前、レベル（タスク 1 つ完了 = 1 レベル）、現在の作業、HP バー（**PV** と表示）が見られます。**HP はまだ空いているコンテキストです。** バーが赤くなったら、セッションが上限に近づいています。

### バトル画面

<p align="center"><img src="docs/images/battle.png" alt="エージェントのバトル画面" width="800"></p>

ポケモンをクリックするとバトル画面が開きます。

- **TERMINAL !** はエージェントのターミナルを開きます。エージェントが許可を待っているときは、ボタンが **RÉPONDRE !**（こたえる！）に変わります。
- 上部の **モンスターボール** でエージェントを切り替えられます。くすんだボールは眠っているエージェント、揺れているボールは待っているエージェントを表します。
- **RÉSUMÉ**（つよさをみる）で概要を、**ÉQUIPE**（てもち）でエージェントの一覧を開き、**FUITE**（にげる）で画面を閉じます（`Esc` でも閉じられます）。

### 概要

<p align="center">
  <img src="docs/images/summary-infos.png" alt="概要の Infos タブ" width="49%">
  <img src="docs/images/summary-stats.png" alt="概要の Stats タブ" width="49%">
</p>

4 つのタブがあり、◀ ▶ でエージェントを切り替えられます。

- **INFOS**（じょうほう）：図鑑番号、タイプ、プロジェクト、使用中のコンテキスト、次の進化。
- **MÉMO**（トレーナーメモ）：よく使うツールから決まる性格と、行動のログ。
- **CAPACITÉS**（わざ）：編集・読み取り・コマンド・検索と、それぞれの使用回数。
- **STATS**（のうりょく）：PV（HP）= 空きコンテキスト、ATTAQUE（こうげき）= 編集、DÉFENSE（ぼうぎょ）= 読み取り、ATQ. SPÉ.（とくこう）= コマンド、DÉF. SPÉ.（とくぼう）= 検索、VITESSE（すばやさ）= 1 時間あたりのタスク数。

わざ、ログ、ステータスは、パネルを開いているあいだの出来事を数えます。パネルを再読み込みするとゼロに戻ります。

### てもちとポケモン図鑑

<p align="center">
  <img src="docs/images/party.png" alt="エージェントの一覧" width="49%">
  <img src="docs/images/pokedex.png" alt="ポケモン図鑑" width="49%">
</p>

- **ÉQUIPE**（てもち）は、すべてのエージェントを状態と HP とともに一覧表示します。クリックするとそのエージェントのターミナルが開きます。
- **POKéDEX**（ずかん）は、出会ったすべての種類を、日付・プロジェクト・出会った回数とともに記録します。`~/.pokeagents/pokedex.json` に保存されます。

## 設定

**OPTIONS** ボタンで設定が開きます。

| 設定                      | 効果                                                                   |
| ------------------------- | ---------------------------------------------------------------------- |
| Sound Notifications       | エージェントが完了したときや待機中のときに短いメニュー音を鳴らします。 |
| Instant Detection (Hooks) | Claude Code のフックをインストールまたは削除します。                   |
| Watch All Sessions        | このプロジェクト外で起動した Claude Code のセッションも追跡します。    |
| Always Show Labels        | すべてのエージェントのカードを常に表示します。                         |

PokeAgents のファイルは `~/.pokeagents/` にあります（設定、マップ、図鑑、スプライトのキャッシュ）。すべてをリセットするには、VS Code を閉じてこのフォルダーを削除してください。フックを削除するには、アンインストールの前に **Instant Detection** のチェックを外します。拡張機能をアンインストールしてもフックは削除されます。

### ローカル用ブラック・ホワイト風の見た目（任意）

ゲームのマップテクスチャを自分で持っている場合は、**自分のマシン上でのみ** 使用できます。

1. `matrix1_*.png` テクスチャを `tmp/bw/matrix1/` に置きます。このフォルダーは git で無視されます。
2. `npx tsx scripts/build-bw-pack.ts` を実行します。

スクリプトが `~/.pokeagents/packs/pokemon-bw` にパックを作成し、有効にします。これらのファイルは絶対にリポジトリに追加したり共有したりしないでください。

## 開発

```bash
npm install          # モノレポ全体をインストール
npm run compile      # プロトコル生成、型チェック、lint、ビルド
npm test             # サーバーと UI のテスト
npm run e2e          # エンドツーエンドテスト（Playwright）
```

- VS Code で **F5** を押すと、拡張機能を読み込んだ開発用ウィンドウが開きます。
- `npx tsx scripts/generate-route-assets.ts` は、スクリプトで描かれたマップと背景を再生成します。
- `npx tsx scripts/generate-pokedex.ts` は種族データを再生成します。

アーキテクチャ（サーバー、プロトコル、UI）は [CLAUDE.md](CLAUDE.md) と [CONTRIBUTING.md](CONTRIBUTING.md) に記載されています。

## クレジットと法的表示

PokeAgents は **無料かつ非営利のファンプロジェクト** です。

- **Pokémon** © Nintendo, Creatures Inc. and GAME FREAK inc. ポケモンおよびキャラクター名は Nintendo の商標です。PokeAgents はこれらの企業とは関係がなく、承認も受けていません。リポジトリと拡張機能には、ゲームから抽出した画像は一切含まれていません。
- **道路の背景**：マップ、木、草、切り株はリポジトリ内のスクリプトで描かれています。
- **モンスターのスプライト**：実行時にダウンロードされ、リポジトリには保存されません。
  - 移動スプライト：[PMDCollab SpriteCollab](https://github.com/PMDCollab/SpriteCollab)（コントリビューターによる作品、[CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/) ライセンス）。このライセンスにより、PokeAgents の商用利用は一切禁止されています。
  - アニメーションスプライト、アイコン、道具：[PokeAPI/sprites](https://github.com/PokeAPI/sprites) リポジトリ。
- **種族データ**：[PokeAPI](https://pokeapi.co/)。
- **フォント**：[Pixelify Sans](https://github.com/eifetx/Pixelify-Sans)、© 2021 The Pixelify Sans Project Authors、SIL Open Font License 1.1。
- **プロジェクトのベース**：[Pixel Agents](https://github.com/pixel-agents-hq/pixel-agents)、© 2026 Pablo De Lucca、MIT ライセンス。オリジナルの人間キャラクターは [JIK-A-4 の Metro City パック](https://jik-a-4.itch.io/metrocity-free-topdown-character-pack) をもとにしています。
- **Claude Code** は Anthropic の製品です。PokeAgents は Anthropic とは関係がありません。

サードパーティのライセンスの詳細は [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) にあります。

### ライセンス

PokeAgents のコードは [MIT ライセンス](LICENSE) で提供されています。このライセンスが対象とするのはコードのみです。ポケモンの商標やキャラクター、サードパーティのスプライトに関する権利は一切与えません。それらはそれぞれのライセンスに従います。

権利者の方で、削除を希望するものがありますか？ [Issue を作成](https://github.com/Akinaru/PokeAgents/issues) していただければ、速やかに削除します。
