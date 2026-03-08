import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import http from "node:http";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, "public");
const HOST = process.env.OPENCLAW_CONFIG_STUDIO_HOST || "127.0.0.1";
const PORT = Number(process.env.OPENCLAW_CONFIG_STUDIO_PORT || 3210);
const HOME = os.homedir();
const BUILTIN_SKILLS_DIR = path.join(HOME, ".npm-global", "lib", "node_modules", "openclaw", "skills");
const STATE_DIR = process.env.OPENCLAW_STATE_DIR || path.join(HOME, ".openclaw");
const CONFIG_PATH = process.env.OPENCLAW_CONFIG_PATH || path.join(STATE_DIR, "openclaw.json");
const OPENCLAW_BIN = path.join(HOME, ".npm-global", "bin", "openclaw");
const SHARED_SKILLS_DIR = path.join(STATE_DIR, "skills");
const EXTENSIONS_DIR = path.join(STATE_DIR, "extensions");
const DEFAULT_BACKUPS_DIR = path.join(STATE_DIR, "backups", "config-studio-json");
const STUDIO_SETTINGS_PATH = path.join(STATE_DIR, "config-studio-ui.json");
const MAX_VISIBLE_BACKUPS = 10;
const STANDARD_WORKSPACE_FILES = [
  "AGENTS.md",
  "SOUL.md",
  "USER.md",
  "TOOLS.md",
  "IDENTITY.md",
  "HEARTBEAT.md",
  "MEMORY.md",
  "BOOT.md"
];
const CONTENT_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8"
};
const SENSITIVE_KEY_RE = /(token|secret|apiKey|password|signingSecret|webhookSecret|integrity|shasum)$/i;
const CHANNEL_ID_PATH_RE =
  /^channels\.[^.]+\.(?:allowFrom|groupAllowFrom)\.\d+$|^bindings\.\d+\.match\.(?:accountId|guildId|teamId)$|^bindings\.\d+\.match\.peer\.id$/;
const DEFAULT_STUDIO_SETTINGS = {
  lastActiveTab: "lobster"
};
const READ_ONLY_MESSAGE = "Config Atlas 当前为只读模式，不会写回 openclaw.json 或工作区。";

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  res.end(JSON.stringify(payload));
}

function sendText(res, statusCode, body, contentType = "text/plain; charset=utf-8") {
  res.writeHead(statusCode, {
    "content-type": contentType,
    "cache-control": "no-store"
  });
  res.end(body);
}

function notFound(res) {
  sendText(res, 404, "Not found");
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString("utf8");
  return text ? JSON.parse(text) : {};
}

async function exists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
}

function expandHome(inputPath) {
  const raw = String(inputPath || "").trim();
  if (!raw) return "";
  if (raw === "~") return HOME;
  if (raw.startsWith("~/")) return path.join(HOME, raw.slice(2));
  return raw;
}

function normalizeStudioSettings(input = {}) {
  const allowedTabs = new Set(["lobster", "guide", "backups", "workspaces"]);
  const lastActiveTab = allowedTabs.has(input.lastActiveTab) ? input.lastActiveTab : DEFAULT_STUDIO_SETTINGS.lastActiveTab;
  return {
    lastActiveTab
  };
}

async function readStudioSettings() {
  if (!(await exists(STUDIO_SETTINGS_PATH))) return { ...DEFAULT_STUDIO_SETTINGS };
  try {
    return normalizeStudioSettings(await readJson(STUDIO_SETTINGS_PATH));
  } catch {
    return { ...DEFAULT_STUDIO_SETTINGS };
  }
}

async function writeStudioSettings(input = {}) {
  const current = await readStudioSettings();
  const next = normalizeStudioSettings({ ...current, ...input });
  await fs.mkdir(path.dirname(STUDIO_SETTINGS_PATH), { recursive: true });
  await fs.writeFile(STUDIO_SETTINGS_PATH, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return next;
}

async function getBackupsDir() {
  return DEFAULT_BACKUPS_DIR;
}

function resolveWorkspacePath(workspacePath) {
  const expanded = expandHome(workspacePath);
  if (!expanded) return "";
  return path.resolve(expanded);
}

async function resolvePreferredNode() {
  const candidates = [
    process.execPath,
    path.join(HOME, ".nvm", "versions", "node", "v22.22.1", "bin", "node"),
    path.join(HOME, ".nvm", "versions", "node", "v22.12.0", "bin", "node")
  ];
  for (const candidate of candidates) {
    if (candidate && (await exists(candidate))) return candidate;
  }
  return process.execPath;
}

function normalizeObject(value) {
  if (Array.isArray(value)) {
    return value
      .map((entry) => normalizeObject(entry))
      .filter((entry) => entry !== undefined);
  }
  if (!value || typeof value !== "object") return value;
  const out = {};
  for (const [key, child] of Object.entries(value)) {
    const normalized = normalizeObject(child);
    if (normalized === undefined) continue;
    if (Array.isArray(normalized) && normalized.length === 0) continue;
    if (
      normalized &&
      typeof normalized === "object" &&
      !Array.isArray(normalized) &&
      Object.keys(normalized).length === 0
    ) {
      continue;
    }
    out[key] = normalized;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function defaultWorkspacePath(config) {
  return (
    config?.agents?.defaults?.workspace ||
    path.join(STATE_DIR, "workspace")
  );
}

function materializeConfigForEditor(config) {
  const editorConfig = structuredClone(config);
  editorConfig.agents ??= {};
  editorConfig.agents.defaults ??= {};
  editorConfig.agents.list ??= [];
  if (editorConfig.agents.list.length === 0) {
    editorConfig.agents.list.push({
      id: "main",
      default: true,
      name: "Main Agent",
      workspace: defaultWorkspacePath(editorConfig),
      model: editorConfig.agents.defaults.model
        ? structuredClone(editorConfig.agents.defaults.model)
        : undefined
    });
  }
  editorConfig.bindings ??= [];
  return editorConfig;
}

function buildModelCatalog(config) {
  const aliasMap = config?.agents?.defaults?.models || {};
  const models = [];
  const seen = new Set();
  for (const [providerId, provider] of Object.entries(config?.models?.providers || {})) {
    for (const model of provider?.models || []) {
      const fullId = `${providerId}/${model.id}`;
      seen.add(fullId);
      models.push({
        id: fullId,
        provider: providerId,
        name: model.name || model.id,
        alias: aliasMap[fullId]?.alias || "",
        contextWindow: model.contextWindow || null,
        maxTokens: model.maxTokens || null,
        reasoning: model.reasoning === true
      });
    }
  }
  for (const [modelId, meta] of Object.entries(aliasMap)) {
    if (seen.has(modelId)) continue;
    models.push({
      id: modelId,
      provider: modelId.split("/")[0] || "custom",
      name: modelId.split("/").slice(1).join("/") || modelId,
      alias: meta?.alias || "",
      contextWindow: null,
      maxTokens: null,
      reasoning: false
    });
  }
  return models.sort((a, b) => a.id.localeCompare(b.id));
}

async function listSkillNames(rootDir) {
  if (!(await exists(rootDir))) return [];
  const entries = await fs.readdir(rootDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .filter((entry) => !entry.name.startsWith("."))
    .filter((entry) => !entry.name.includes("Zone.Identifier"))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
}

async function listExtensionSkills(rootDir) {
  if (!(await exists(rootDir))) return [];
  const extensionEntries = await fs.readdir(rootDir, { withFileTypes: true });
  const results = [];
  for (const extensionEntry of extensionEntries) {
    if (!extensionEntry.isDirectory()) continue;
    if (extensionEntry.name.startsWith(".") || extensionEntry.name.includes("Zone.Identifier")) continue;
    const skillsRoot = path.join(rootDir, extensionEntry.name, "skills");
    if (!(await exists(skillsRoot))) continue;
    const skillEntries = await fs.readdir(skillsRoot, { withFileTypes: true });
    for (const skillEntry of skillEntries) {
      if (!skillEntry.isDirectory()) continue;
      if (skillEntry.name.startsWith(".") || skillEntry.name.includes("Zone.Identifier")) continue;
      results.push({
        name: skillEntry.name,
        extension: extensionEntry.name,
        path: path.join(skillsRoot, skillEntry.name)
      });
    }
  }
  return results.sort((a, b) => a.name.localeCompare(b.name));
}

async function readWorkspaceFiles(workspacePath) {
  const resolvedWorkspacePath = resolveWorkspacePath(workspacePath);
  const foundNames = new Set(STANDARD_WORKSPACE_FILES);
  if (resolvedWorkspacePath && (await exists(resolvedWorkspacePath))) {
    const entries = await fs.readdir(resolvedWorkspacePath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith(".md")) foundNames.add(entry.name);
    }
  }
  const files = [];
  for (const name of [...foundNames].sort((a, b) => a.localeCompare(b))) {
    const filePath = path.join(resolvedWorkspacePath, name);
    const present = await exists(filePath);
    const content = present ? await fs.readFile(filePath, "utf8") : "";
    files.push({
      name,
      exists: present,
      content
    });
  }
  return files;
}

async function buildWorkspaceSummary(config) {
  const workspaces = new Map();
  const ensureWorkspace = (workspacePath, label) => {
    if (!workspacePath) return;
    if (!workspaces.has(workspacePath)) {
      workspaces.set(workspacePath, {
        path: workspacePath,
        label,
        agentIds: [],
        files: [],
        localSkills: []
      });
    }
  };

  const defaultsWorkspace = defaultWorkspacePath(config);
  ensureWorkspace(defaultsWorkspace, "defaults");

  for (const agent of config?.agents?.list || []) {
    ensureWorkspace(agent.workspace || defaultsWorkspace, agent.id);
  }

  for (const workspace of workspaces.values()) {
    for (const agent of config?.agents?.list || []) {
      const candidatePath = agent.workspace || defaultsWorkspace;
      if (candidatePath === workspace.path) workspace.agentIds.push(agent.id);
    }
    workspace.files = await readWorkspaceFiles(workspace.path);
    workspace.localSkills = await listSkillNames(path.join(workspace.path, "skills"));
  }

  return [...workspaces.values()].sort((a, b) => a.path.localeCompare(b.path));
}

async function runCommand(command, args, extraEnv = {}) {
  const pathEntries = [
    path.dirname(process.execPath),
    path.join(HOME, ".npm-global", "bin"),
    process.env.PATH || ""
  ].filter(Boolean);
  let actualCommand = command;
  let actualArgs = [...args];
  if (command === "openclaw" && (await exists(OPENCLAW_BIN))) {
    actualCommand = await resolvePreferredNode();
    actualArgs = [OPENCLAW_BIN, ...args];
  }
  return await new Promise((resolve) => {
    const child = spawn(actualCommand, actualArgs, {
      env: {
        ...process.env,
        PATH: pathEntries.join(path.delimiter),
        ...extraEnv
      },
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });
    child.on("close", (code) => {
      resolve({
        ok: code === 0,
        code,
        stdout: stdout.trim(),
        stderr: stderr.trim()
      });
    });
    child.on("error", (error) => {
      resolve({
        ok: false,
        code: -1,
        stdout: "",
        stderr: String(error)
      });
    });
  });
}

async function runCommandInDir(command, args, cwd) {
  const pathEntries = [
    path.dirname(process.execPath),
    path.join(HOME, ".npm-global", "bin"),
    process.env.PATH || ""
  ].filter(Boolean);
  return await new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd,
      env: {
        ...process.env,
        PATH: pathEntries.join(path.delimiter)
      },
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });
    child.on("close", (code) => {
      resolve({
        ok: code === 0,
        code,
        stdout: stdout.trim(),
        stderr: stderr.trim()
      });
    });
    child.on("error", (error) => {
      resolve({
        ok: false,
        code: -1,
        stdout: "",
        stderr: String(error)
      });
    });
  });
}

function maybeParseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function validateConfig(candidateConfig) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-config-studio-"));
  const tempConfigPath = path.join(tempDir, "openclaw.json");
  try {
    await fs.writeFile(tempConfigPath, `${JSON.stringify(candidateConfig, null, 2)}\n`, "utf8");
    const result = await runCommand("openclaw", ["config", "validate", "--json"], {
      OPENCLAW_CONFIG_PATH: tempConfigPath
    });
    const parsed = maybeParseJson(result.stdout);
    if (parsed?.valid === true) return { ok: true, payload: parsed, command: result };
    return {
      ok: false,
      payload: parsed,
      command: result,
      message: parsed?.error || result.stderr || result.stdout || "Validation failed"
    };
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

function ensureSafeWorkspaceFilename(name) {
  return /^[A-Za-z0-9._-]+\.md$/.test(name);
}

async function snapshotCurrentWorkspaceFiles(config) {
  const workspaces = await buildWorkspaceSummary(config);
  return Object.fromEntries(
    workspaces.map((workspace) => [
      workspace.path,
      Object.fromEntries(workspace.files.map((file) => [file.name, file.content]))
    ])
  );
}

function summarizeConfigSnapshot(config, workspaceFiles, reason = "manual") {
  const channels = Object.keys(config?.channels || {}).filter((name) => name !== "defaults");
  const agents = Array.isArray(config?.agents?.list) ? config.agents.list : [];
  return {
    reason,
    createdAt: new Date().toISOString(),
    agentCount: agents.length,
    defaultAgentIds: agents.filter((agent) => agent?.default).map((agent) => agent.id),
    channelCount: channels.length,
    channels,
    bindingCount: Array.isArray(config?.bindings) ? config.bindings.length : 0,
    workspaceCount: Object.keys(workspaceFiles || {}).length
  };
}

async function createBackup(currentConfig, currentWorkspaceFiles, reason = "save") {
  const backupsDir = await getBackupsDir();
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = path.join(backupsDir, stamp);
  await fs.mkdir(backupDir, { recursive: true });
  await fs.writeFile(
    path.join(backupDir, "openclaw.json"),
    `${JSON.stringify(currentConfig, null, 2)}\n`,
    "utf8"
  );
  await fs.writeFile(
    path.join(backupDir, "meta.json"),
    `${JSON.stringify(summarizeConfigSnapshot(currentConfig, currentWorkspaceFiles, reason), null, 2)}\n`,
    "utf8"
  );
  return backupDir;
}

async function writeWorkspaceFiles(workspaceFiles, workspacePlan = {}) {
  for (const [workspacePath, files] of Object.entries(workspaceFiles || {})) {
    const resolvedWorkspacePath = resolveWorkspacePath(workspacePath);
    if (!resolvedWorkspacePath) continue;
    await fs.mkdir(resolvedWorkspacePath, { recursive: true });
    for (const [name, content] of Object.entries(files || {})) {
      if (!ensureSafeWorkspaceFilename(name)) {
        throw new Error(`Illegal workspace file name: ${name}`);
      }
      await fs.writeFile(path.join(resolvedWorkspacePath, name), content ?? "", "utf8");
    }
  }

  for (const workspacePath of workspacePlan.obsoletePaths || []) {
    const resolvedWorkspacePath = resolveWorkspacePath(workspacePath);
    if (!resolvedWorkspacePath) continue;
    for (const name of STANDARD_WORKSPACE_FILES) {
      const targetPath = path.join(resolvedWorkspacePath, name);
      if (await exists(targetPath)) {
        await fs.rm(targetPath, { force: true });
      }
    }
  }
}

function slugify(value) {
  return String(value || "item")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "item";
}

function buildShareContext(config) {
  const workspacePathMap = new Map();
  const agentDirPathMap = new Map();
  const defaultsWorkspace = defaultWorkspacePath(config);
  workspacePathMap.set(defaultsWorkspace, "./workspaces/main");
  agentDirPathMap.set(path.join(STATE_DIR, "agents", "main"), "./agent-state/main");

  (config?.agents?.list || []).forEach((agent, index) => {
    const agentSlug = slugify(agent.id || `agent-${index + 1}`);
    const workspace = agent.workspace || defaultsWorkspace;
    if (workspace && !workspacePathMap.has(workspace)) {
      workspacePathMap.set(workspace, `./workspaces/${agentSlug}`);
    }
    if (agent.agentDir) agentDirPathMap.set(agent.agentDir, `./agent-state/${agentSlug}`);
  });

  return {
    workspacePathMap,
    agentDirPathMap
  };
}

function placeholderForPath(pathParts, value, context) {
  if (context.workspacePathMap.has(value)) return context.workspacePathMap.get(value);
  if (context.agentDirPathMap.has(value)) return context.agentDirPathMap.get(value);
  const key = pathParts[pathParts.length - 1] || "path";
  if (path.isAbsolute(value)) return `./${slugify(key)}`;
  return value;
}

function sanitizeShareValue(value, pathParts, context) {
  const joinedPath = pathParts.join(".");
  const lastKey = pathParts[pathParts.length - 1] || "";

  if (Array.isArray(value)) {
    if (lastKey === "allowFrom" || lastKey === "groupAllowFrom") {
      return value.map((_, index) => `<redacted:${lastKey}-${index + 1}>`);
    }
    return value.map((entry, index) => sanitizeShareValue(entry, [...pathParts, String(index)], context));
  }

  if (!value || typeof value !== "object") {
    if (typeof value === "string") {
      if (SENSITIVE_KEY_RE.test(lastKey)) return `<redacted:${lastKey}>`;
      if (CHANNEL_ID_PATH_RE.test(joinedPath)) return `<redacted:${lastKey}>`;
      if (/(path|dir|root|workspace)$/i.test(lastKey)) return placeholderForPath(pathParts, value, context);
    }
    return value;
  }

  const out = {};
  const entries = Object.entries(value);

  if (pathParts.length === 3 && pathParts[0] === "channels" && pathParts[2] === "groups") {
    entries.forEach(([_, childValue], index) => {
      out[`group-${index + 1}`] = sanitizeShareValue(
        childValue,
        [...pathParts, `group-${index + 1}`],
        context
      );
    });
    return out;
  }

  for (const [key, child] of entries) {
    out[key] = sanitizeShareValue(child, [...pathParts, key], context);
  }
  return out;
}

function buildTemplateWorkspaceFiles(agentIds) {
  const names = agentIds.length > 0 ? agentIds.join(" / ") : "main";
  return {
    "AGENTS.md": `# AGENTS.md\n\n适用对象：${names}\n\n请在这里写这个 agent/这一组 agent 的总规则。\n\n- 先写职责边界\n- 再写回复风格\n- 最后写禁止事项\n`,
    "SOUL.md": `# SOUL.md\n\n请描述人格、价值观、语气和长期稳定的风格。\n\n示例：\n- 重视效率\n- 回答直接\n- 遇到不确定先校验再行动\n`,
    "USER.md": `# USER.md\n\n这里写使用者画像、偏好和长期注意事项。\n\n建议包含：\n- 称呼方式\n- 时区\n- 沟通偏好\n- 禁忌项\n`,
    "TOOLS.md": `# TOOLS.md\n\n这里写本地环境特有的工具说明。\n\n建议包含：\n- 常用命令\n- SSH/服务别名\n- 文件目录约定\n- 哪些操作必须二次确认\n`,
    "IDENTITY.md": `# IDENTITY.md\n\n这里写对外身份。\n\n建议包含：\n- 名称\n- 角色定位\n- 对外风格\n`,
    "HEARTBEAT.md": `# HEARTBEAT.md\n\n如果启用了 heartbeat，请在这里写它应该定时做什么、不该做什么。\n`,
    "MEMORY.md": `# MEMORY.md\n\n这里写长期记忆如何记录、如何更新、哪些内容不该进入记忆。\n`,
    "BOOT.md": `# BOOT.md\n\n这里写启动时要额外注入的短说明。\n\n建议只保留稳定规则，不要放临时任务。\n`
  };
}

function buildShareReadme(config) {
  const agentCount = config?.agents?.list?.length || 0;
  return `# OpenClaw 脱敏模板包\n\n这个模板包由 OpenClaw Config Atlas 导出，适合分享给别人作为“可运行结构参考”。\n\n## 里面有什么\n\n- \`openclaw.template.json\`：脱敏后的配置模板\n- \`workspaces/\`：按 agent 拆好的工作区 Markdown 模板\n\n## 已做的脱敏处理\n\n- 所有 token / secret / apiKey / password 等敏感值都被替换为占位符\n- 渠道 allowlist、binding 里的目标 ID 做了脱敏替换\n- 本机绝对路径改成了相对模板路径\n- 工作区 Markdown 改成了教学模板，而不是直接导出原文\n\n## 导入前要改什么\n\n1. 在 \`models.providers\` 里填自己的模型供应商地址和鉴权信息\n2. 在 \`channels\` 里填自己的 botToken / appId / appSecret 等渠道凭据\n3. 检查 \`agents.defaults\` 是否符合你的全局默认策略\n4. 检查 \`agents.list\` 里每个 agent 的模型、权限、workspace 是否符合你的部署方式\n5. 按需修改 \`bindings\`，决定不同渠道/群/账号该路由到哪个 agent\n6. 把 \`workspaces/\` 里的 Markdown 内容换成你自己的规则和说明\n\n## 关键概念简表\n\n- \`models.providers\`：模型供应商目录，解决“有哪些模型、怎么连上去”\n- \`agents.defaults.models\`：agent 层的模型别名/参数表，解决“agent 眼里这些模型叫什么、默认怎么用”\n- \`agents.defaults\`：全局默认模板，所有 agent 没单独写时就继承这里\n- \`agents.list\`：真正的 agent 实例列表，写的是“谁存在、各自特殊项是什么”\n- \`default: true\`：默认路由目标，不等于全局默认模板\n- \`bindings\`：把渠道/账号/群/对象路由到具体 agent 的规则表\n- \`channels\`：渠道接入和准入控制层，解决“怎么接入 Telegram/飞书，以及谁能进来”\n\n当前模板包含 ${agentCount} 个显式 agent。\n`;
}

async function buildShareBundleArchive(config) {
  const context = buildShareContext(config);
  const sanitizedConfig = sanitizeShareValue(structuredClone(config), [], context);
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-share-template-"));
  const bundleRoot = path.join(tempDir, "openclaw-share-template");
  const workspacesRoot = path.join(bundleRoot, "workspaces");
  await fs.mkdir(workspacesRoot, { recursive: true });

  await fs.writeFile(
    path.join(bundleRoot, "openclaw.template.json"),
    `${JSON.stringify(sanitizedConfig, null, 2)}\n`,
    "utf8"
  );
  await fs.writeFile(path.join(bundleRoot, "README-导入说明.md"), buildShareReadme(config), "utf8");

  const workspaceTargets = new Map();
  for (const [originalPath, sharePath] of context.workspacePathMap.entries()) {
    if (!workspaceTargets.has(sharePath)) workspaceTargets.set(sharePath, []);
    const agentIds = (config?.agents?.list || [])
      .filter((agent) => (agent.workspace || defaultWorkspacePath(config)) === originalPath)
      .map((agent) => agent.id);
    workspaceTargets.set(sharePath, agentIds);
  }

  for (const [sharePath, agentIds] of workspaceTargets.entries()) {
    const relativeDir = sharePath.replace(/^\.\//, "");
    const targetDir = path.join(bundleRoot, relativeDir);
    await fs.mkdir(targetDir, { recursive: true });
    const files = buildTemplateWorkspaceFiles(agentIds);
    for (const [name, content] of Object.entries(files)) {
      await fs.writeFile(path.join(targetDir, name), content, "utf8");
    }
  }

  const archivePath = path.join(tempDir, "openclaw-share-template.tar.gz");
  const tarResult = await runCommandInDir("tar", ["-czf", archivePath, "-C", tempDir, "openclaw-share-template"], tempDir);
  if (!tarResult.ok) {
    await fs.rm(tempDir, { recursive: true, force: true });
    throw new Error(tarResult.stderr || tarResult.stdout || "Failed to create tar archive");
  }

  const archive = await fs.readFile(archivePath);
  await fs.rm(tempDir, { recursive: true, force: true });
  return archive;
}

async function buildStatePayload() {
  const rawConfig = await readJson(CONFIG_PATH);
  const editorConfig = materializeConfigForEditor(rawConfig);
  const workspaces = await buildWorkspaceSummary(editorConfig);
  const backups = await listBackups();
  const versionResult = await runCommand("openclaw", ["--version"]);
  const studioSettings = await readStudioSettings();
  return {
    info: {
      configPath: CONFIG_PATH,
      stateDir: STATE_DIR,
      backupsDir: DEFAULT_BACKUPS_DIR,
      version: versionResult.ok ? versionResult.stdout : "unknown",
      materializedMainAgent:
        !Array.isArray(rawConfig?.agents?.list) || rawConfig.agents.list.length === 0
    },
    studioSettings,
    config: editorConfig,
    modelCatalog: buildModelCatalog(editorConfig),
    workspaces,
    backups
  };
}

async function restartGateway() {
  const result = await runCommand("openclaw", ["daemon", "restart", "--json"]);
  return {
    ok: result.ok,
    payload: maybeParseJson(result.stdout),
    stdout: result.stdout,
    stderr: result.stderr
  };
}

async function loadBackupRecord(dirName) {
  const backupDir = path.join(await getBackupsDir(), dirName);
  const configPath = path.join(backupDir, "openclaw.json");
  if (!(await exists(configPath))) return null;
  const config = await readJson(configPath);
  const metaPath = path.join(backupDir, "meta.json");
  const meta = (await exists(metaPath))
    ? await readJson(metaPath)
    : summarizeConfigSnapshot(config, {}, "legacy");
  return {
    id: dirName,
    dir: backupDir,
    summary: {
      ...meta,
      configPath
    },
    config
  };
}

async function listBackups() {
  const backupsDir = await getBackupsDir();
  if (!(await exists(backupsDir))) return [];
  const entries = await fs.readdir(backupsDir, { withFileTypes: true });
  const dirs = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => b.localeCompare(a));
  const records = [];
  for (const dirName of dirs) {
    const record = await loadBackupRecord(dirName);
    if (!record) continue;
    records.push({
      id: record.id,
      summary: record.summary
    });
  }
  return records;
}

async function pruneBackups() {
  const backupsDir = await getBackupsDir();
  if (!(await exists(backupsDir))) return;
  const entries = await fs.readdir(backupsDir, { withFileTypes: true });
  const dirs = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => b.localeCompare(a));
  for (const dirName of dirs.slice(MAX_VISIBLE_BACKUPS)) {
    await fs.rm(path.join(backupsDir, dirName), { recursive: true, force: true });
  }
}

async function restoreBackup(record) {
  const currentConfig = await readJson(CONFIG_PATH);
  const currentWorkspaceFiles = await snapshotCurrentWorkspaceFiles(materializeConfigForEditor(currentConfig));
  const safetyBackupDir = await createBackup(currentConfig, currentWorkspaceFiles, "restore-safety");
  await pruneBackups();
  await fs.writeFile(CONFIG_PATH, `${JSON.stringify(record.config, null, 2)}\n`, "utf8");

  return {
    ok: true,
    restoredBackupId: record.id,
    safetyBackupDir
  };
}

async function deleteBackupById(dirName) {
  const backupDir = path.join(await getBackupsDir(), dirName);
  if (!(await exists(backupDir))) return false;
  await fs.rm(backupDir, { recursive: true, force: true });
  return true;
}

async function serveStatic(req, res, urlPath) {
  const requestedPath = urlPath === "/" ? "/index.html" : urlPath;
  const safePath = path.normalize(requestedPath).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(PUBLIC_DIR, safePath);
  if (!filePath.startsWith(PUBLIC_DIR)) return notFound(res);
  if (!(await exists(filePath))) return notFound(res);
  const ext = path.extname(filePath);
  const contentType = CONTENT_TYPES[ext] || "application/octet-stream";
  const content = await fs.readFile(filePath);
  res.writeHead(200, {
    "content-type": contentType,
    "cache-control": "no-store"
  });
  res.end(content);
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || `${HOST}:${PORT}`}`);

    if (req.method === "GET" && url.pathname === "/api/health") {
      sendJson(res, 200, {
        ok: true,
        host: HOST,
        port: PORT,
        configPath: CONFIG_PATH
      });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/state") {
      sendJson(res, 200, await buildStatePayload());
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/studio-settings") {
      sendJson(res, 403, { ok: false, message: READ_ONLY_MESSAGE });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/validate") {
      sendJson(res, 403, { ok: false, message: READ_ONLY_MESSAGE });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/save") {
      sendJson(res, 403, { ok: false, message: READ_ONLY_MESSAGE });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/backups") {
      sendJson(res, 200, { backups: await listBackups() });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/backups/create") {
      const currentConfig = await readJson(CONFIG_PATH);
      const currentWorkspaceFiles = await snapshotCurrentWorkspaceFiles(materializeConfigForEditor(currentConfig));
      const backupDir = await createBackup(currentConfig, currentWorkspaceFiles, "manual");
      await pruneBackups();
      sendJson(res, 200, { ok: true, backupDir });
      return;
    }

    if (req.method === "GET" && url.pathname.startsWith("/api/backups/")) {
      const backupId = decodeURIComponent(url.pathname.replace("/api/backups/", ""));
      const record = await loadBackupRecord(backupId);
      if (!record) {
        sendJson(res, 404, { ok: false, message: "Backup not found" });
        return;
      }
      sendJson(res, 200, {
        id: record.id,
        summary: record.summary,
        configPreview: {
          meta: record.config?.meta || null,
          agents: record.config?.agents?.list || [],
          channels: Object.keys(record.config?.channels || {}).filter((name) => name !== "defaults"),
          bindings: record.config?.bindings || []
        }
      });
      return;
    }

    if (req.method === "POST" && url.pathname.startsWith("/api/backups/") && url.pathname.endsWith("/restore")) {
      sendJson(res, 403, { ok: false, message: READ_ONLY_MESSAGE });
      return;
    }

    if (req.method === "DELETE" && url.pathname.startsWith("/api/backups/")) {
      const backupId = decodeURIComponent(url.pathname.replace("/api/backups/", ""));
      const deleted = await deleteBackupById(backupId);
      if (!deleted) {
        sendJson(res, 404, { ok: false, message: "Backup not found" });
        return;
      }
      sendJson(res, 200, { ok: true, backups: await listBackups() });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/export-template") {
      const body = await readBody(req);
      const candidate = normalizeObject(body.config);
      if (!candidate) {
        sendJson(res, 400, { ok: false, message: "Missing config payload" });
        return;
      }
      const archive = await buildShareBundleArchive(candidate);
      res.writeHead(200, {
        "content-type": "application/gzip",
        "content-disposition": `attachment; filename="openclaw-share-template-${Date.now()}.tar.gz"`,
        "cache-control": "no-store"
      });
      res.end(archive);
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/restart") {
      sendJson(res, 403, { ok: false, message: READ_ONLY_MESSAGE });
      return;
    }

    if (req.method === "GET") {
      await serveStatic(req, res, url.pathname);
      return;
    }

    notFound(res);
  } catch (error) {
    sendJson(res, 500, {
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`OpenClaw Config Atlas listening on http://${HOST}:${PORT}`);
  console.log(`State dir: ${STATE_DIR}`);
  console.log(`Config path: ${CONFIG_PATH}`);
});
