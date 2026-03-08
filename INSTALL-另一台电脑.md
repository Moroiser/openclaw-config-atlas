# OpenClaw Config Atlas 安装与测试

这份包是一个可直接解压运行的本地只读结构图谱，不依赖额外 npm 依赖下载。

## 适用前提

- 已安装 Node.js，建议 `20+`
- 已安装可执行的 `openclaw` CLI
- 目标电脑本机有可读写的 OpenClaw 状态目录

## 安装步骤

1. 把 `openclaw-config-atlas-portable-*.tar.gz` 拷到目标电脑。
2. 解压：

```bash
tar -xzf openclaw-config-atlas-portable-*.tar.gz
cd openclaw-config-atlas
```

3. 启动：

```bash
npm start
```

4. 打开浏览器访问：

```text
http://127.0.0.1:3210
```

## 常见自定义

如果目标电脑的 OpenClaw 配置不在默认位置，可以这样启动：

```bash
OPENCLAW_STATE_DIR=/path/to/.openclaw \
OPENCLAW_CONFIG_PATH=/path/to/.openclaw/openclaw.json \
OPENCLAW_CONFIG_STUDIO_PORT=3210 \
npm start
```

可用环境变量：

- `OPENCLAW_CONFIG_STUDIO_HOST`
- `OPENCLAW_CONFIG_STUDIO_PORT`
- `OPENCLAW_STATE_DIR`
- `OPENCLAW_CONFIG_PATH`

## 这份包包含什么

- `server.mjs`：本地 Node 服务
- `public/`：前端页面
- `README.md`：项目说明
- `INSTALL-另一台电脑.md`：这份安装说明

## 不包含什么

- 不包含你当前电脑的 `openclaw.json`
- 不包含工作区 Markdown
- 不包含备份目录
- 不包含任何自动上传、联网安装逻辑

## 测试建议

启动后优先检查：

1. “龙虾画布”是否正常显示 defaults、agents、bindings、channels、sessions
2. “工作区文件”页是否能读取目标电脑本机的 Markdown 文件
3. “原理导览”页是否正常显示结构说明
4. “备份 / JSON / 分享”页是否能读取目标电脑自己的备份目录
5. “创建备份”是否能生成新的备份目录
6. “导出脱敏模板包”是否能成功下载 `.tar.gz`
