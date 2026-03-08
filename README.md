# OpenClaw Config Atlas

面向本机 `~/.openclaw/openclaw.json` 的只读结构图谱，用来把 OpenClaw 配置按括号层级直接摊开看清楚。

[![Release](https://img.shields.io/github/v/release/Moroiser/openclaw-config-atlas?display_name=tag)](https://github.com/Moroiser/openclaw-config-atlas/releases/latest)
[![License](https://img.shields.io/github/license/Moroiser/openclaw-config-atlas)](./LICENSE)

## 下载

- 最新版本：[`Releases`](https://github.com/Moroiser/openclaw-config-atlas/releases/latest)
- 当前首发版：[`v0.1.0`](https://github.com/Moroiser/openclaw-config-atlas/releases/tag/v0.1.0)
- 便携包：在 Release 页面下载 `openclaw-config-atlas-portable-*.tar.gz`

## 预览

公开截图会基于脱敏演示配置补入仓库，避免把真实 token、会话 ID、工作区内容带进公开页面。

在截图补入之前，推荐先从 Release 页面下载便携包，或按下面的方式本地启动体验。

建议使用这些文件名补图：

- `docs/screenshots/lobster-canvas.png`
- `docs/screenshots/workspace-files.png`
- `docs/screenshots/backups-json.png`
- `docs/screenshots/guide.png`

截图规范见 [docs/screenshots/README.md](./docs/screenshots/README.md)。

## 核心能力

- 龙虾画布：按“头胸部 / 体节 / 神经 / 钳 / 肉”展示 defaults、agents、bindings、channel robots 和 sessions
- 结构驱动：按真实 JSON 对象和数组层级渲染，不凭空补字段，不把语义解释硬塞进结构图
- 工作区阅读：只读浏览各 workspace 下的 `AGENTS.md`、`SOUL.md`、`USER.md`、`TOOLS.md` 等 Markdown
- 备份与导出：创建配置备份，查看原始 JSON，导出脱敏模板包
- 原理导览：用中文快速解释 `agents.defaults / agents.list / bindings / channels / workspace` 的结构顺序

## 适合谁

- 正在维护多 agent OpenClaw 配置的人
- 想快速看懂 `bindings / channels / accounts / groups` 关系的人
- 想把配置结构分享给别人，但不想直接暴露真实密钥和工作区内容的人

## 启动

```bash
git clone <your-repo-url>
cd openclaw-config-atlas
./launch-studio.sh
```

Windows 可以直接双击根目录下的 `launch-studio.cmd`。

也可以用 npm：

```bash
cd openclaw-config-atlas
npm run launch
```

默认监听 `http://127.0.0.1:3210`。启动器会先检查本地服务是否已经存在；如果没有，就自动在后台拉起本地 Atlas 服务，然后再打开浏览器。

可用环境变量：

- `OPENCLAW_CONFIG_STUDIO_HOST`
- `OPENCLAW_CONFIG_STUDIO_PORT`
- `OPENCLAW_STATE_DIR`
- `OPENCLAW_CONFIG_PATH`

## 版本发布

- 仓库主页：<https://github.com/Moroiser/openclaw-config-atlas>
- 最新 Release：<https://github.com/Moroiser/openclaw-config-atlas/releases/latest>
- 首个公开版本：<https://github.com/Moroiser/openclaw-config-atlas/releases/tag/v0.1.0>

## 安全说明

- 这是一个本机只读界面，默认不做认证，只应绑定在本地回环地址。
- 打开这个界面不要求 `openclaw gateway` 常驻运行；只需要 Atlas 自己的本地服务在监听 `3210`。
- 开机自启是可选项，不是默认建议。只有你确认自己长期在本机使用它时，才考虑执行 `./install-autostart.sh` 或 Windows 下的 `install-autostart.cmd`。
- 当前 UI 只读，不直接修改 `openclaw.json` 或工作区文件。
- 如果 OpenClaw 新增字段而界面没跟上，仍可在“备份 / JSON / 分享”页只读查看完整原始 JSON。

## 备份与导出

- 备份默认写入 `~/.openclaw/backups/config-studio-json/`
- 导出会生成脱敏模板包，适合分享结构，不适合恢复真实密钥
- 发布截图或录屏前，先确认页面里没有真实 token、secret、用户 ID、群 ID

## 发布建议

- 仓库里不要提交 `.runtime/`、`dist/`、日志和本机备份
- GitHub 首页至少准备一张龙虾画布截图和一张备份 / JSON 页截图
- 推荐通过 GitHub Releases 分发便携包，而不是先做 npm 发布

## 打包给另一台电脑

```bash
cd openclaw-config-atlas
npm run pack:portable
```

打包后会在 `dist/` 生成一个 `openclaw-config-atlas-portable-时间戳.tar.gz`。

另一台电脑的安装说明见 [INSTALL-另一台电脑.md](./INSTALL-另一台电脑.md)。
