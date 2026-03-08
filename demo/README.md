# Demo Data

这个目录用于生成公开截图和演示页面，不读取你的真实 `~/.openclaw`。

## 目录结构

- `atlas-demo-state/openclaw.json`：公开演示配置
- `atlas-demo-state/workspace/`：默认 workspace Markdown
- `atlas-demo-state/agents/<agent>/workspace/`：各 agent 的示例 Markdown

## 启动方式

```bash
cd openclaw-config-atlas
OPENCLAW_STATE_DIR="$PWD/demo/atlas-demo-state" \
OPENCLAW_CONFIG_PATH="$PWD/demo/atlas-demo-state/openclaw.json" \
OPENCLAW_CONFIG_STUDIO_PORT=4310 \
npm start
```

然后打开：

```text
http://127.0.0.1:4310
```

## 用途

- 生成公开 README 截图
- 录演示视频
- 做结构说明而不暴露真实 token、ID、工作区内容
