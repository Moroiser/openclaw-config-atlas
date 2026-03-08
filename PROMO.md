# Promo Copy

## 一句话

OpenClaw Config Atlas 是一个只读、结构驱动的 OpenClaw 配置图谱界面，用来把 `openclaw.json`、workspace Markdown、bindings、channel robots 和 sessions 直接摊开看清楚。

## 中文短文案

### 版本 A

做了一个 `OpenClaw Config Atlas`。

它不是配置编辑器，而是一个只读结构图谱：

- 看 `openclaw.json` 的括号层级
- 看多 agent 结构
- 看 bindings、渠道机器人、会话层
- 看 workspace 里的 Markdown
- 顺手做备份和脱敏导出

界面用了“龙虾画布”来读结构：
头胸部 = 全局默认
体节 = Agents
神经 = Bindings
钳 = 渠道机器人
肉 = 会话

仓库：
<https://github.com/Moroiser/openclaw-config-atlas>

Release：
<https://github.com/Moroiser/openclaw-config-atlas/releases/latest>

### 版本 B

如果你维护的是多 agent 的 OpenClaw 配置，这个工具可能有用。

`OpenClaw Config Atlas` 是一个只读、结构驱动的配置图谱界面，重点不是“改配置”，而是“看清结构”：

- defaults 在哪一层
- agents.list[] 怎么展开
- bindings 怎么连
- channels / accounts / groups / dm 怎么分层
- workspace Markdown 怎么对应到 agent

现在已经有公开仓库和首个 Release：
<https://github.com/Moroiser/openclaw-config-atlas>

## 中文长文案

`OpenClaw Config Atlas` 是一个面向 OpenClaw 的只读结构图谱界面。

它不强调“编辑配置”，而强调“把结构看明白”。

现在这个界面主要做四件事：

1. 用龙虾画布展示配置结构，把 defaults、agents、bindings、渠道机器人、会话层拆开看。
2. 只读浏览 workspace 下的 Markdown 文件，方便对照 agent 结构理解规则来源。
3. 查看原始 JSON、创建备份、导出脱敏模板包。
4. 用“原理导览”解释 `agents.defaults / agents.list / bindings / channels / workspace` 的层级关系。

适合这些场景：

- 多 agent 配置越来越复杂，想先看清结构再动手
- 想把配置结构分享给别人，但不想暴露真实 token、ID、工作区内容
- 想给 OpenClaw 配置做一个更直观的“只读观察面板”

仓库：
<https://github.com/Moroiser/openclaw-config-atlas>

最新 Release：
<https://github.com/Moroiser/openclaw-config-atlas/releases/latest>

## English Short Copy

OpenClaw Config Atlas is a read-only, structure-driven visualization UI for OpenClaw config.

It helps you inspect:

- defaults
- agents
- bindings
- channel robots
- sessions
- workspace Markdown

Repo:
<https://github.com/Moroiser/openclaw-config-atlas>

Release:
<https://github.com/Moroiser/openclaw-config-atlas/releases/latest>
