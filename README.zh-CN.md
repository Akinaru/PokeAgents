<h1 align="center">PokeAgents</h1>

<p align="center">
  🇬🇧 <a href="README.md">English</a> ·
  🇫🇷 <a href="README.fr.md">Français</a> ·
  🇪🇸 <a href="README.es.md">Español</a> ·
  🇩🇪 <a href="README.de.md">Deutsch</a> ·
  🇮🇹 <a href="README.it.md">Italiano</a> ·
  🇧🇷 <a href="README.pt-BR.md">Português</a> ·
  🇯🇵 <a href="README.ja.md">日本語</a> ·
  <strong>🇨🇳 简体中文</strong>
</p>

<p align="center"><strong>你的 Claude Code 智能体会变成像素风小精灵，在一条道路上工作，就像 DS 游戏里一样。</strong></p>

<p align="center">
  <a href="#安装">安装</a> •
  <a href="#快速上手">快速上手</a> •
  <a href="#界面说明">界面说明</a> •
  <a href="#设置">设置</a> •
  <a href="#开发">开发</a> •
  <a href="#致谢与法律声明">致谢与法律声明</a>
</p>

<p align="center">
  <img src="docs/images/overview.png" alt="PokeAgents 的道路：三个正在工作的智能体和几只野生小精灵" width="900">
</p>

> **非官方粉丝项目。** PokeAgents 与 Nintendo、Creatures Inc.、GAME FREAK inc.、The Pokémon Company 以及 Anthropic 均无关联，也未获得它们的认可或赞助。Pokémon 及角色名称是其各自所有者的商标。本仓库不包含任何取自游戏的图像。详见[致谢与法律声明](#致谢与法律声明)。

## 这是什么？

PokeAgents 是一个 VS Code 扩展（外加一个小型独立服务器），它把每个 [Claude Code](https://claude.com/claude-code) 会话显示为像素风道路上的一只小精灵：

- **每个智能体都有自己的宝可梦**，随机抽取，每天都不一样。稀有的种类在这里同样稀有，每 64 个智能体中就有一个是异色。
- **上下文越满，它就会进化**：上下文用到 30% 时第一次进化，60% 时第二次进化。
- **它会根据正在做的事情四处移动**：阅读道路告示牌、在草丛里翻找、砍树或者碎岩。
- **等待时它会睡觉。** 谁在工作、谁已完成、谁在等你回复，一眼就能看出来。
- **点击一下即可打开它的对战画面**，其中包含会话摘要：上下文、使用过的工具、日志和能力值。
- **野生小精灵** 会在道路上闲逛，有时还会过来看看你的智能体。

PokeAgents 是 [Pixel Agents](https://github.com/pixel-agents-hq/pixel-agents)（MIT 许可证）的一个分支，原项目把智能体显示在办公室里。

## 安装

### 前提条件

- **VS Code 1.105** 或更高版本。
- 已安装并登录的 **Claude Code**：运行 `npm install -g @anthropic-ai/claude-code`，然后运行一次 `claude`。
- **Node.js 20** 或更高版本，仅在从源码安装或使用独立服务器时需要。
- **网络连接**：小精灵的贴图会在首次使用时下载，之后缓存在 `~/.pokeagents/pokemon` 中。

### 方式 1 — 从 VS Code Marketplace 安装（推荐）

在 VS Code 中打开 **扩展** 视图，搜索“PokeAgents”并点击 **Install**。也可以在命令行中运行 `code --install-extension akinaru.pokeagents`。扩展页面：[VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=akinaru.pokeagents)。

### 方式 2 — 从 `.vsix` 文件安装

1. 从 [GitHub Releases](https://github.com/Akinaru/PokeAgents/releases) 下载最新的 `pokeagents-x.y.z.vsix`。
2. 安装：
   ```bash
   code --install-extension pokeagents-x.y.z.vsix
   ```
   或在 VS Code 中：**扩展** 视图 → **⋯** 菜单 → **Install from VSIX…**
3. 如果 VS Code 提示，请重新加载窗口。

### 方式 3 — 从源码安装

```bash
git clone https://github.com/Akinaru/PokeAgents.git
cd PokeAgents
npm install
npm run package                 # 生产构建
npx @vscode/vsce package        # 生成 pokeagents-x.y.z.vsix
code --install-extension pokeagents-*.vsix
```

想不安装就试用：在 VS Code 中打开该文件夹并按 **F5**。会打开一个已加载 PokeAgents 的“Extension Development Host”窗口。

### 方式 4 — 独立服务器（浏览器）

如果想在 VS Code 之外（tmux、纯终端、其他编辑器）查看你的智能体：

```bash
npm install && npm run compile
node dist/cli.js --port 3100
```

打开显示的地址（`http://127.0.0.1:3100/?token=…`）。**请不要把这个地址告诉别人**：其中的令牌可以用来修改你的 Claude Code 设置。

## 快速上手

1. 打开命令面板（macOS 上为 `Cmd+Shift+P`，其他系统为 `Ctrl+Shift+P`），运行 **PokeAgents: Show Panel**。面板会在 VS Code 底部打开。
2. 首次启动时，会有一个向导为你介绍界面。它会询问是否开启 **即时检测**：开启后，PokeAgents 会在 `~/.claude/settings.json` 中添加钩子（hooks），以便实时获知你的智能体在做什么。
   - 在征求你的同意之前，向导会列出所有将被修改的内容。
   - 如果你拒绝，PokeAgents 会改为读取 Claude Code 的会话记录（transcripts）。这样也能用，只是会稍有延迟。
   - 你可以随时在设置中开启或移除钩子。
3. 启动一个智能体：
   - 点击底部栏的 **“+ Agent”精灵球**，它会打开一个 Claude Code 终端；
   - 或者在项目中的任意终端里运行 `claude`。
4. 它的宝可梦会出现在一个树桩上，当智能体使用工具时就出发去工作。

## 界面说明

面板界面目前只有法语。下面的标签按屏幕上显示的原样列出，括号中为对应的中文含义。

### 道路

每个智能体都带有一个名牌，上面显示项目名称和一个状态标记：

| 状态     | 含义                                                      |
| -------- | --------------------------------------------------------- |
| **ACT**  | 工作中：智能体正在工作。                                  |
| **ATT**  | 等待中（_attente_）：它需要你的许可才能运行某个工具。     |
| **FINI** | 已完成：它刚刚完成了任务。                                |
| **SOM**  | 睡眠（_sommeil_）：它什么也没做，它的宝可梦正在原地睡觉。 |

正在工作的智能体每 10 到 20 秒换一个位置。位置取决于它正在使用的工具：

| 智能体的工具                 | 它的宝可梦在做什么     |
| ---------------------------- | ---------------------- |
| 读取文件                     | 阅读道路告示牌。       |
| 搜索（Grep、Glob、网页搜索） | 在草丛或灌木丛里翻找。 |
| 编辑文件                     | 砍树。                 |
| 在终端中执行命令             | 碎岩。                 |

智能体始终停留在镜头的初始视野内，彼此保持足够距离，方便点击和辨认。

### 悬停卡片

<p align="center"><img src="docs/images/hover.png" alt="鼠标悬停时显示的智能体卡片" width="800"></p>

把鼠标悬停在宝可梦上，可以看到它的名字、等级（完成一个任务 = 升一级）、正在做的事以及 HP 条（标为 **PV**）。**HP 就是剩余的可用上下文**：当 HP 条变红时，说明会话快要达到上限了。

### 对战画面

<p align="center"><img src="docs/images/battle.png" alt="智能体的对战画面" width="800"></p>

点击宝可梦即可打开它的对战画面：

- **TERMINAL !** 打开智能体的终端。当智能体在等待你的许可时，按钮会变成 **RÉPONDRE !**（回复！）。
- 顶部的 **精灵球** 用于在智能体之间切换。暗淡的球表示智能体在睡觉，晃动的球表示智能体在等待。
- **RÉSUMÉ**（查看能力）打开摘要，**ÉQUIPE**（同行宝可梦）打开智能体列表，**FUITE**（逃走）关闭画面（也可以按 `Esc`）。

### 摘要

<p align="center">
  <img src="docs/images/summary-infos.png" alt="摘要的 Infos 标签页" width="49%">
  <img src="docs/images/summary-stats.png" alt="摘要的 Stats 标签页" width="49%">
</p>

共有四个标签页，用 ◀ ▶ 切换智能体：

- **INFOS**（信息）：图鉴编号、属性、项目、已用上下文、下一次进化。
- **MÉMO**（训练家笔记）：根据它最常用的工具推断出的性格，以及它的操作日志。
- **CAPACITÉS**（招式）：编辑、读取、命令和搜索，以及各自的使用次数。
- **STATS**（能力）：PV（HP）= 剩余上下文，ATTAQUE（攻击）= 编辑次数，DÉFENSE（防御）= 读取次数，ATQ. SPÉ.（特攻）= 命令次数，DÉF. SPÉ.（特防）= 搜索次数，VITESSE（速度）= 每小时完成的任务数。

招式、日志和能力值只统计面板打开期间发生的事情。重新加载面板后会清零。

### 同行宝可梦与图鉴

<p align="center">
  <img src="docs/images/party.png" alt="智能体列表" width="49%">
  <img src="docs/images/pokedex.png" alt="宝可梦图鉴" width="49%">
</p>

- **ÉQUIPE**（同行宝可梦）列出你的所有智能体及其状态和 HP。点击即可打开该智能体的终端。
- **POKéDEX**（图鉴）记录你遇到过的每一个种类，包括日期、项目和遇到的次数。它保存在 `~/.pokeagents/pokedex.json` 中。

## 设置

点击 **OPTIONS** 按钮打开设置：

| 设置                      | 作用                                          |
| ------------------------- | --------------------------------------------- |
| Sound Notifications       | 智能体完成或等待时播放简短的菜单提示音。      |
| Instant Detection (Hooks) | 安装或移除 Claude Code 钩子。                 |
| Watch All Sessions        | 同时跟踪在本项目之外启动的 Claude Code 会话。 |
| Always Show Labels        | 始终显示每个智能体的卡片。                    |

PokeAgents 的文件位于 `~/.pokeagents/`：设置、地图、图鉴和贴图缓存。如需全部重置，请关闭 VS Code 并删除该文件夹。如需移除钩子，请在卸载前取消勾选 **Instant Detection**。卸载扩展时也会移除钩子。

### 本地黑/白风格外观（可选）

如果你拥有自己的游戏地图贴图，可以 **仅在你自己的电脑上** 使用它们：

1. 把 `matrix1_*.png` 贴图放到 `tmp/bw/matrix1/` 中。git 会忽略该文件夹。
2. 运行 `npx tsx scripts/build-bw-pack.ts`。

该脚本会在 `~/.pokeagents/packs/pokemon-bw` 中创建一个资源包并启用它。这些文件绝不能添加到仓库中，也不能分享。

## 开发

```bash
npm install          # 安装整个 monorepo
npm run compile      # 生成协议、类型检查、lint、构建
npm test             # 服务器和界面测试
npm run e2e          # 端到端测试（Playwright）
```

- 在 VS Code 中按 **F5** 会打开一个加载了扩展的开发窗口。
- `npx tsx scripts/generate-route-assets.ts` 重新生成由脚本绘制的地图及其场景。
- `npx tsx scripts/generate-pokedex.ts` 重新生成种类数据。

架构（服务器、协议、界面）见 [CLAUDE.md](CLAUDE.md) 和 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 致谢与法律声明

PokeAgents 是一个 **免费、非商业的粉丝项目**。

- **Pokémon** © Nintendo, Creatures Inc. and GAME FREAK inc. Pokémon 及角色名称是 Nintendo 的商标。PokeAgents 与这些公司无关，也未获得它们的认可。本仓库和扩展不包含任何从游戏中提取的图像。
- **道路场景**：地图、树木、草丛和树桩均由仓库中的脚本绘制。
- **小精灵贴图**：在运行时下载，绝不存储在仓库中。
  - 移动贴图：[PMDCollab SpriteCollab](https://github.com/PMDCollab/SpriteCollab)，由其贡献者创作，采用 [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/) 许可证。该许可证禁止对 PokeAgents 进行任何商业使用。
  - 动画贴图、图标和道具：[PokeAPI/sprites](https://github.com/PokeAPI/sprites) 仓库。
- **种类数据**：[PokeAPI](https://pokeapi.co/)。
- **字体**：[Pixelify Sans](https://github.com/eifetx/Pixelify-Sans)，© 2021 The Pixelify Sans Project Authors，采用 SIL Open Font License 1.1 许可证。
- **项目基础**：[Pixel Agents](https://github.com/pixel-agents-hq/pixel-agents)，© 2026 Pablo De Lucca，MIT 许可证。原有的人类角色灵感来自 [JIK-A-4 的 Metro City 素材包](https://jik-a-4.itch.io/metrocity-free-topdown-character-pack)。
- **Claude Code** 是 Anthropic 的产品。PokeAgents 与 Anthropic 无关。

第三方许可证的详细信息见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

### 许可证

PokeAgents 的代码采用 [MIT 许可证](LICENSE)。该许可证仅涵盖代码，不授予对 Pokémon 商标和角色或第三方贴图的任何权利，这些内容仍受其各自许可证约束。

你是版权方并希望移除某些内容吗？请[提交 issue](https://github.com/Akinaru/PokeAgents/issues)，我们会尽快移除。
