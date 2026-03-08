const app = document.querySelector("#app");
const state = {
  loaded: false,
  activeTab: "lobster",
  busy: false,
  message: null,
  info: null,
  studioSettings: {
    lastActiveTab: "lobster"
  },
  config: null,
  rawConfig: null,
  sourceConfig: null,
  modelCatalog: [],
  workspaces: [],
  sourceWorkspaces: [],
  rawEditor: "",
  dragPayload: null,
  backups: [],
  confirmSave: null
};

const WORKSPACE_FILE_HELP = {
  "AGENTS.md": "主行为规则和团队协作约束。",
  "SOUL.md": "人格、价值观、说话风格。",
  "USER.md": "用户画像、偏好、长期记忆摘要。",
  "TOOLS.md": "工具使用规范与边界。",
  "IDENTITY.md": "对外身份、名称、头像等。",
  "HEARTBEAT.md": "定时心跳行为说明。",
  "MEMORY.md": "长期记忆使用方式与约定。",
  "BOOT.md": "启动时注入的引导内容。"
};

const THINKING_OPTIONS = ["", "off", "minimal", "low", "medium", "high", "xhigh", "adaptive"];
const TOOL_PROFILE_OPTIONS = ["", "minimal", "coding", "messaging", "full"];
const SANDBOX_MODE_OPTIONS = ["", "off", "non-main", "all"];
const SANDBOX_ACCESS_OPTIONS = ["", "none", "ro", "rw"];
const SANDBOX_SCOPE_OPTIONS = ["", "session", "agent", "shared"];
const SESSION_TOOLS_VISIBILITY = ["", "spawned", "all"];
const EXEC_HOST_OPTIONS = ["", "sandbox", "gateway", "node"];
const EXEC_SECURITY_OPTIONS = ["", "deny", "allowlist", "full"];
const EXEC_ASK_OPTIONS = ["", "off", "on-miss", "always"];
const DM_POLICY_OPTIONS = ["", "pairing", "allowlist", "open", "disabled"];
const GROUP_POLICY_OPTIONS = ["", "open", "allowlist", "disabled"];
const CHANNEL_DM_POLICY_DOC_DEFAULTS = {
  telegram: "pairing",
  feishu: "pairing"
};
const CHANNEL_GROUP_POLICY_DOC_DEFAULT = "allowlist";
const GROUP_REQUIRE_MENTION_DOC_DEFAULT = true;
const DM_POLICY_LABELS = {
  pairing: "配对",
  allowlist: "白名单",
  open: "开放",
  disabled: "禁用"
};
const GROUP_POLICY_LABELS = {
  allowlist: "白名单",
  open: "开放",
  disabled: "禁用"
};
const TOOL_PROFILE_LABELS = {
  minimal: "最小",
  coding: "编码",
  messaging: "消息",
  full: "完全"
};
const SANDBOX_MODE_LABELS = {
  off: "关闭",
  "non-main": "仅非主会话",
  all: "全部"
};
const STREAMING_LABELS = {
  partial: "部分流式",
  full: "全量流式",
  off: "关闭"
};
const VALUE_GLOSSARY = [
  {
    title: "布尔值",
    items: [
      { raw: "true", display: "启用" },
      { raw: "false", display: "关闭" },
      { raw: "未填写", display: "未填写" }
    ]
  },
  {
    title: "私聊策略",
    items: Object.entries(DM_POLICY_LABELS).map(([raw, display]) => ({ raw, display }))
  },
  {
    title: "群聊策略",
    items: Object.entries(GROUP_POLICY_LABELS).map(([raw, display]) => ({ raw, display }))
  },
  {
    title: "工具档位",
    items: Object.entries(TOOL_PROFILE_LABELS).map(([raw, display]) => ({ raw, display }))
  },
  {
    title: "沙箱模式",
    items: Object.entries(SANDBOX_MODE_LABELS).map(([raw, display]) => ({ raw, display }))
  },
  {
    title: "流式模式",
    items: Object.entries(STREAMING_LABELS).map(([raw, display]) => ({ raw, display }))
  }
];
const DOC_LINKS = [
  { label: "官方 Config 文档", href: "https://docs.openclaw.ai/cli/config" },
  { label: "官方 Agents 文档", href: "https://docs.openclaw.ai/cli/agents" }
];
const TOOLBAR_ACTIONS = [
  {
    action: "reload",
    label: "重新载入",
    meaning: "重新从磁盘读取当前配置和工作区内容。"
  },
  {
    action: "create-backup",
    label: "创建备份",
    meaning: "把当前磁盘上的 openclaw.json 和工作区快照复制到备份目录。"
  },
  {
    action: "export-template",
    label: "导出脱敏模板包",
    meaning: "导出脱敏后的结构模板，不改原配置和工作区。"
  }
];
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
const GUIDE_SECTIONS = [
  {
    title: "1. 先看括号，不先解释字段",
    text: "先认对象和数组的嵌套层级，再看键和值。站点只负责把结构摊开，不先替你解释语义。"
  },
  {
    title: "2. 头胸部是全局底座",
    text: "这里放全局默认和运行底座，比如 defaults、gateway、tools。它不是某个具体 agent 或会话。"
  },
  {
    title: "3. 体节只认 agents.list[]",
    text: "每个体节对应一个真实 agent 对象。对象里没有的键，不补；对象里有的键，原样展开。"
  },
  {
    title: "4. 钳先看 channels，再看子层",
    text: "先认 channels.<name> 这个渠道外壳，再往里读 accounts、groups 等子结构，不把父层和子层混在一起。"
  },
  {
    title: "5. 神经只负责连接",
    text: "bindings 只表达谁连到谁。它不复制 agent 内容，也不承担渠道或会话本体。"
  },
  {
    title: "6. 肉层是会话落点",
    text: "群聊、私聊和各类入口最终都会落到具体会话节点。这里看的仍然是节点结构，不是解释文案。"
  },
  {
    title: "7. 工作区是 JSON 外围补层",
    text: "Markdown 不在 openclaw.json 内部，但会跟着 workspace 路径出现，适合和对应 agent 对照阅读。"
  }
];
const CHANNEL_FIELD_MAP = {
  telegram: [
    { path: "botToken", label: "Bot Token", help: "Telegram 机器人接入凭据。没有它就连不上。", sensitive: true, credential: true },
    { path: "streaming", label: "流式回复模式", help: "控制是否边生成边发消息。", credential: false }
  ],
  feishu: [
    { path: "appId", label: "App ID", help: "飞书应用标识。", credential: true },
    { path: "appSecret", label: "App Secret", help: "飞书应用密钥。", sensitive: true, credential: true },
    { path: "connectionMode", label: "连接模式", help: "常见是 websocket。", credential: false },
    { path: "domain", label: "域", help: "如 feishu / lark。", credential: false }
  ],
  qqbot: [
    { path: "appId", label: "App ID", help: "QQ 机器人应用 ID。", credential: true },
    { path: "clientSecret", label: "Client Secret", help: "QQ 机器人密钥。", sensitive: true, credential: true }
  ]
};
const CHANNEL_EXPLANATIONS = {
  enabled: "总开关。没开就算写了 token 也不会生效。",
  dmPolicy: "私聊准入策略。pairing 最安全，open 最宽松。",
  groupPolicy: "群聊准入策略。allowlist 表示只有白名单群能进来。",
  allowFrom: "私聊白名单。只有 policy=allowlist 时才有意义。",
  groupAllowFrom: "群聊白名单。通常和 groupPolicy=allowlist 搭配。",
  groups: "对具体群/会话的额外规则，比如 requireMention。"
};
const KNOWN_DYNAMIC_FIELD_TYPES = {
  botToken: "text",
  tokenFile: "text",
  streaming: "text",
  defaultAccount: "text",
  name: "text",
  replyToMode: "text",
  webhookUrl: "text",
  webhookSecret: "text",
  appId: "text",
  appSecret: "text",
  clientSecret: "text",
  connectionMode: "text",
  domain: "text",
  verificationToken: "text",
  typingIndicator: "bool",
  resolveSenderNames: "bool",
  botName: "text",
  enabled: "bool",
  groupPolicy: "groupPolicy"
};
const KNOWN_DYNAMIC_SELECT_OPTIONS = {
  dmPolicy: DM_POLICY_OPTIONS,
  groupPolicy: GROUP_POLICY_OPTIONS,
  streaming: ["", "partial", "full", "off"],
  connectionMode: ["", "websocket", "webhook"]
};

function displayValue(value) {
  if (value === undefined) return "未填写";
  if (typeof value === "boolean") return value ? "true（开启）" : "false（关闭）";
  if (typeof value === "string") return value || "(空字符串)";
  return JSON.stringify(value);
}

function compactDisplayPath(path) {
  const raw = stringValue(path).trim();
  if (!raw) return "";
  if (/^\/home\/[^/]+/.test(raw)) {
    return raw.replace(/^\/home\/[^/]+/, "~");
  }
  if (/^\/Users\/[^/]+/.test(raw)) {
    return raw.replace(/^\/Users\/[^/]+/, "~");
  }
  if (/^[A-Za-z]:\\Users\\[^\\]+/i.test(raw)) {
    return raw.replace(/^[A-Za-z]:\\Users\\[^\\]+/i, "~");
  }
  return raw;
}

function renderSidebarPath(label, path) {
  const fullPath = stringValue(path).trim();
  const displayPath = compactDisplayPath(fullPath);
  return `
    <div class="sidebar-path-card" title="${escapeHtml(fullPath)}">
      <small>${escapeHtml(label)}</small>
      <span>${escapeHtml(displayPath)}</span>
    </div>
  `;
}

function buildAtlasSections() {
  const defaultsWorkspace = state.config?.agents?.defaults?.workspace || "~/.openclaw/workspace";
  const channelSpecificItems = channelEntries().flatMap(([name, cfg]) => {
    const providerItems = (CHANNEL_FIELD_MAP[name] || []).map((field) => ({
      key: `channels.${name}.${field.path}`,
      current: getAtPath(state.config, `channels.${name}.${field.path}`),
      defaultValue: "默认通常为空",
      verified: true,
      where: `想改 ${name} 的 ${field.path}，就改 channels.${name}.${field.path}`,
      effect: `${field.path} 会影响 ${name} 是否能够成功连通或采用何种连接参数。`,
      note: `${field.help}${field.sensitive ? " 该字段属于敏感值，分享时应脱敏。" : ""}`,
      source: "当前配置 + 当前 UI 渠道字段映射",
      stability: "中等"
    }));
    return [
      {
        key: `channels.${name}.enabled`,
        current: getAtPath(state.config, `channels.${name}.enabled`),
        defaultValue: "很多渠道默认可视作未启用，建议显式填写；固定源码默认值未逐项完全核实",
        verified: false,
        where: `想开关 ${name} 渠道，就改 channels.${name}.enabled`,
        effect: `直接决定 ${name} 渠道当前是否参与接入。关闭后即使 token 还在，也不应继续处理该渠道消息。`,
        note: "这是渠道总开关。字段图谱会根据你当前草稿动态显示当前值；现在会显式区分 false 和未填写。",
        source: "当前配置 + 本机 schema；固定默认未完全核实",
        stability: "中等"
      },
      {
        key: `channels.${name}.dmPolicy`,
        current: getAtPath(state.config, `channels.${name}.dmPolicy`),
        defaultValue: "pairing",
        verified: true,
        where: `想改 ${name} 私聊准入策略，就改 channels.${name}.dmPolicy`,
        effect: `影响 ${name} 私聊消息如何进入系统。`,
        note: "若该渠道未显式填写，常见回落值是 pairing；你当前页里看到的是按配置实时展开的。",
        source: "本机 schema 和源码默认值",
        stability: "较稳定"
      },
      {
        key: `channels.${name}.groupPolicy`,
        current: getAtPath(state.config, `channels.${name}.groupPolicy`),
        defaultValue: "allowlist",
        verified: true,
        where: `想改 ${name} 群聊准入策略，就改 channels.${name}.groupPolicy`,
        effect: `影响 ${name} 群聊/会话消息是否会被接受。`,
        note: "若该渠道未显式填写，常见回落值是 allowlist。",
        source: "本机 schema 和源码默认值",
        stability: "较稳定"
      },
      ...providerItems
    ];
  });
  const sections = [
    {
      title: "模型层",
      intro: "先回答“系统认识哪些模型、如何连接这些模型”。这里不直接决定谁来用，而是决定可选范围。",
      items: [
        {
          key: "models.providers",
          current: getAtPath(state.config, "models.providers"),
          defaultValue: "无固定内建列表；通常由扫描、onboarding 或你手工登记",
          verified: false,
          where: "改这里会改变整个系统可见的模型目录",
          effect: "影响所有 agent 的可选模型上限。这里没登记，后面一般就不能稳定选用。",
          note:
            "这是供应商目录层，不是 agent 的最终选择结果。包含 baseUrl、apiKey、API 协议、模型元数据。",
          source: "官方 docs + 本机 schema",
          stability: "中等，供应商和模型清单常随版本/生态变化"
        },
        {
          key: "agents.defaults.models",
          current: getAtPath(state.config, "agents.defaults.models"),
          defaultValue: "默认可为空",
          verified: true,
          where: "全局 agent 默认层。想给模型加 alias/params/streaming 偏好，优先改这里。",
          effect: "影响 agent 层如何引用模型，不会替代 models.providers。",
          note:
            "这是 agent 视角的模型别名/参数表。适合把底层模型登记成更好记的别名，或附加每模型参数。",
          source: "官方 docs + 本机 schema",
          stability: "较稳定"
        },
        {
          key: "agents.defaults.model.primary",
          current: getAtPath(state.config, "agents.defaults.model.primary"),
          defaultValue: "无可靠内建固定默认；通常由 onboarding 或现有配置给出",
          verified: false,
          where: "想改“多数 agent 默认用哪个主模型”，改这里；只改单个 agent 则改 agents.list[].model.primary。",
          effect: "影响所有未在 agents.list 单独覆盖主模型的 agent。",
          note:
            "这是默认主模型，不是模型目录本身。若某个 agent 单独写了 model.primary，它会覆盖这里。",
          source: "本机 schema，可覆盖关系已核实；固定默认值未核实",
          stability: "中等"
        }
      ]
    },
    {
      title: "Agent 默认层",
      intro: "这一层写的是“大家默认都这样”。适合放全员通用策略。",
      items: [
        {
          key: "agents.defaults.workspace",
          current: getAtPath(state.config, "agents.defaults.workspace"),
          defaultValue: "~/.openclaw/workspace（非 default profile 时会变成 ~/.openclaw/workspace-<profile>）",
          verified: true,
          where: "想改默认 agent 工作区根目录，改这里；某个 agent 单独改则去 agents.list[].workspace。",
          effect: "影响默认 agent，以及所有未单独写 workspace 的 agent。",
          note:
            "工作区里通常放 AGENTS.md、SOUL.md、USER.md、TOOLS.md 等长期说明文件。",
          source: "本机源码 resolveDefaultAgentWorkspaceDir",
          stability: "较稳定"
        },
        {
          key: "agents.defaults.maxConcurrent",
          current: getAtPath(state.config, "agents.defaults.maxConcurrent"),
          defaultValue: "4",
          verified: true,
          where: "想改全局 agent 并发上限，改这里。",
          effect: "影响主 agent 及默认并发行为；过高可能增加资源争用。",
          note: "这是 agent 级并发，不等于子 agent 并发。",
          source: "本机源码 DEFAULT_AGENT_MAX_CONCURRENT",
          stability: "较稳定"
        },
        {
          key: "agents.defaults.subagents.maxConcurrent",
          current: getAtPath(state.config, "agents.defaults.subagents.maxConcurrent"),
          defaultValue: "8",
          verified: true,
          where: "想改所有子 agent 的默认并发上限，改这里。",
          effect: "影响子 agent 同时运行数量，值越大越激进。",
          note: "只影响子 agent，不影响主 agent 最大并发。",
          source: "本机源码 DEFAULT_SUBAGENT_MAX_CONCURRENT",
          stability: "较稳定"
        },
        {
          key: "agents.defaults.subagents.maxSpawnDepth",
          current: getAtPath(state.config, "agents.defaults.subagents.maxSpawnDepth"),
          defaultValue: "1",
          verified: true,
          where: "想决定子 agent 能不能继续生子 agent，就改这里。",
          effect: "1 表示不允许继续嵌套；2 才允许 sub-agent 再开 sub-sub-agent。",
          note: "这是多 agent 层级的关键限制项之一。",
          source: "本机源码 DEFAULT_SUBAGENT_MAX_SPAWN_DEPTH",
          stability: "较稳定"
        },
        {
          key: "tools.profile",
          current: getAtPath(state.config, "tools.profile"),
          defaultValue: "固定默认值未核实；常见显式值为 minimal / coding / messaging / full",
          verified: false,
          where: "想给全局工具权限定一个基线档位，改这里；某个 agent 单独改则改 agents.list[].tools.profile。",
          effect: "影响所有未单独覆盖工具档位的 agent。",
          note: "profile 是粗粒度权限包，allow/deny/alsoAllow 是细粒度覆盖。",
          source: "本机 schema；固定默认值未核实",
          stability: "中等"
        }
      ]
    },
    {
      title: "Agent 实例层",
      intro: "这一层写的是“谁真的存在，以及它和默认模板有什么不同”。",
      items: [
        {
          key: "agents.list[].id",
          current: agentList().map((agent) => agent.id),
          defaultValue: "若完全没有 agents.list，系统保留默认 agent id 为 main",
          verified: true,
          where: "新增/管理具体 agent 时改这里。",
          effect: "影响 routing、session key、workspace 派生路径、bindings 指向。",
          note: "main 是保留默认 agent id。你的当前配置原本未显式 list，所以界面物化了一个 main。",
          source: "本机源码 DEFAULT_AGENT_ID=main",
          stability: "较稳定"
        },
        {
          key: "agents.list[].default",
          current: agentList().map((agent) => `${agent.id}:${agent.default === true ? "true" : "false"}`),
          defaultValue:
            "若未明确标记，系统会按“第一个 default:true；否则第一个 agents.list 项；否则保留 main”解析默认 agent",
          verified: true,
          where: "想改“默认把消息交给谁”，改这里，不是改 agents.defaults。",
          effect: "影响默认路由目标、main session 归属和部分调度默认行为。",
          note: "这是默认路由目标，不是默认模板，两者不是一个概念。",
          source: "本机源码 resolveDefaultAgentId",
          stability: "较稳定"
        },
        {
          key: "agents.list[].workspace",
          current: agentList().map((agent) => `${agent.id}:${agent.workspace || "(继承 defaults)"}`),
          defaultValue: `默认 agent 继承 ${defaultsWorkspace}；非默认 agent 若不写，则派生到 ~/.openclaw/workspace-<agentId>`,
          verified: true,
          where: "只想让某个 agent 用独立 workspace，改单个 agent 这里。",
          effect: "影响这个 agent 读取哪套 Markdown 规则文件。",
          note: "默认 agent 和非默认 agent 的未填写行为不同，这是最容易搞混的地方之一。",
          source: "本机源码 resolveAgentWorkspaceDir",
          stability: "较稳定"
        },
        {
          key: "agents.list[].agentDir",
          current: agentList().map((agent) => `${agent.id}:${agent.agentDir || "(自动派生)"}`),
          defaultValue: "~/.openclaw/agents/<agentId>/agent",
          verified: true,
          where: "通常不用改；只有你要手动分离 agent 状态目录时才改。",
          effect: "影响 agent 自身的状态/缓存目录，不是 workspace 文档目录。",
          note: "很多人会把 agentDir 和 workspace 混淆，它们不是一回事。",
          source: "本机源码 resolveAgentDir",
          stability: "较稳定"
        },
        {
          key: "agents.list[].model.primary",
          current: agentList().map((agent) => `${agent.id}:${agent?.model?.primary || "(继承 defaults)"}`),
          defaultValue: "默认继承 agents.defaults.model.primary",
          verified: true,
          where: "只想改单个 agent 的主模型，改这里。",
          effect: "只影响该 agent 本身，不会改全局模型目录。",
          note: "这属于“个性覆盖”，比 agents.defaults.model.primary 优先级更高。",
          source: "本机源码覆盖逻辑 + schema",
          stability: "较稳定"
        },
        {
          key: "agents.list[].subagents.allowAgents",
          current: agentList().map((agent) => `${agent.id}:${csvValue(agent?.subagents?.allowAgents) || "(无下级授权)"}`),
          defaultValue: "默认可为空",
          verified: true,
          where: "想改谁能把任务派给谁，就改这里；拖拽组织图本质上也会回写这里。",
          effect: "影响多 agent 编排关系、可派工范围，以及组织图显示的直属层级。",
          note:
            "注意：被列为 subagent 的对象仍然会继续存在于 agents.list，因为它本质上仍是完整 agent，只是多了一条‘可被谁调用’的关系。",
          source: "官方 docs + 本机 schema + 当前 UI 行为",
          stability: "较稳定"
        }
      ]
    },
    {
      title: "渠道与网关层",
      intro: "这一层解决“从哪儿接消息进来、先做什么安全限制、最后怎样暴露服务”。",
      items: [
        {
          key: "gateway.port",
          current: getAtPath(state.config, "gateway.port"),
          defaultValue: "18789",
          verified: true,
          where: "想改本地 Gateway 端口，改这里。",
          effect: "影响 CLI / dashboard / 本工具等所有连网关的入口。",
          note: "这是默认网关端口，改了后其他连接端也要同步。",
          source: "本机源码 DEFAULT_GATEWAY_PORT",
          stability: "较稳定"
        },
        {
          key: "gateway.bind",
          current: getAtPath(state.config, "gateway.bind"),
          defaultValue: "loopback",
          verified: true,
          where: "想控制网关监听范围，改这里。",
          effect: "影响是否只本机可连，还是开放到局域网/其他范围。",
          note: "默认 loopback 最安全。若不是 loopback，要更谨慎处理认证和暴露。",
          source: "本机源码 bind ?? loopback",
          stability: "较稳定"
        },
        {
          key: "gateway.auth.mode",
          current: getAtPath(state.config, "gateway.auth.mode"),
          defaultValue: "固定默认值未完全核实；当前常见本地配置是 token",
          verified: false,
          where: "想改网关认证方式，改这里。",
          effect: "会影响所有连接网关的客户端。",
          note: "这是高敏感项，版本和部署形态不同，推荐结合官方文档与 doctor 一起看。",
          source: "当前配置 + docs；固定默认未核实",
          stability: "偏不稳定"
        },
        {
          key: "channels.*.dmPolicy",
          current: channelEntries().map(([name, cfg]) => `${name}:${cfg?.dmPolicy || "(未填写)"}`),
          defaultValue: "pairing",
          verified: true,
          where: "想改私聊准入策略，改各渠道自己的 dmPolicy。",
          effect: "决定陌生人私聊是要先配对、直接放行、只认白名单，还是完全禁用。",
          note: "这是渠道安全边界的第一层。",
          source: "本机 schema 和源码默认值",
          stability: "较稳定"
        },
        {
          key: "channels.*.groupPolicy",
          current: channelEntries().map(([name, cfg]) => `${name}:${cfg?.groupPolicy || "(未填写)"}`),
          defaultValue: "allowlist",
          verified: true,
          where: "想改群聊准入策略，改各渠道自己的 groupPolicy。",
          effect: "决定群聊默认是白名单、全开，还是禁用。",
          note: "群聊暴露风险通常高于私聊，所以默认更保守。",
          source: "本机 schema 和源码默认值",
          stability: "较稳定"
        },
        {
          key: "bindings",
          current: getAtPath(state.config, "bindings"),
          defaultValue: "默认可为空；为空时通常走默认 agent",
          verified: true,
          where: "想做多 agent 渠道路由，就改这里。",
          effect: "影响进来的消息最终落到哪个 agent。",
          note: "channels 负责接入和准入，bindings 负责最终分发，两者不要混看。",
          source: "官方 docs + 本机 schema",
          stability: "较稳定"
        },
        ...channelSpecificItems
      ]
    }
  ];

  return sections;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function ensureObject(root, path) {
  let cursor = root;
  for (let index = 0; index < path.length - 1; index += 1) {
    const key = path[index];
    const nextKey = path[index + 1];
    if (cursor[key] === undefined) {
      cursor[key] = /^\d+$/.test(nextKey) ? [] : {};
    }
    cursor = cursor[key];
  }
  return cursor;
}

function getAtPath(root, dotPath) {
  return dotPath.split(".").reduce((cursor, key) => (cursor == null ? undefined : cursor[key]), root);
}

function setAtPath(root, dotPath, rawValue) {
  const path = dotPath.split(".");
  const parent = ensureObject(root, path);
  const key = path[path.length - 1];
  if (rawValue === undefined) {
    if (Array.isArray(parent)) parent.splice(Number(key), 1);
    else delete parent[key];
    return;
  }
  parent[key] = rawValue;
}

function cleanConfig(value) {
  if (Array.isArray(value)) {
    return value
      .map((entry) => cleanConfig(entry))
      .filter((entry) => entry !== undefined);
  }
  if (!value || typeof value !== "object") return value;
  const out = {};
  for (const [key, child] of Object.entries(value)) {
    const normalized = cleanConfig(child);
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

function agentList() {
  return state.config?.agents?.list || [];
}

function rawAgentList() {
  return state.rawConfig?.agents?.list || state.config?.agents?.list || [];
}

function defaultModelOptions(selected) {
  const options = ['<option value="">未设置</option>'];
  for (const model of state.modelCatalog) {
    const alias = model.alias ? ` · ${model.alias}` : "";
    const meta = [];
    if (model.reasoning) meta.push("reasoning");
    if (model.contextWindow) meta.push(`${model.contextWindow.toLocaleString()} ctx`);
    options.push(
      `<option value="${escapeHtml(model.id)}" ${selected === model.id ? "selected" : ""}>${escapeHtml(
        `${model.id}${alias}${meta.length ? ` · ${meta.join(" · ")}` : ""}`
      )}</option>`
    );
  }
  return options.join("");
}

function optionsHtml(items, selected) {
  return items
    .map(
      (item) =>
        `<option value="${escapeHtml(item)}" ${selected === item ? "selected" : ""}>${
          item || "未设置"
        }</option>`
    )
    .join("");
}

function optionsHtmlWithInherited(items, selected, inheritedLabel = "") {
  const [empty, ...rest] = items;
  const visibleItems = selected && !rest.includes(selected) ? [...rest, selected] : rest;
  const options = [
    `<option value="${escapeHtml(empty || "")}" ${selected === (empty || "") ? "selected" : ""}>未设置</option>`
  ];
  for (const item of visibleItems) {
    options.push(
      `<option value="${escapeHtml(item)}" ${selected === item ? "selected" : ""}>${escapeHtml(item)}</option>`
    );
  }
  return options.join("");
}

function csvValue(values) {
  return Array.isArray(values) ? values.join(", ") : "";
}

function parseCsv(text) {
  return text
    .split(/[\n,]/)
    .map((value) => value.trim())
    .filter(Boolean);
}

function stringValue(value) {
  return value == null ? "" : String(value);
}

function truthyLabel(value, labels = ["已开启", "已关闭"]) {
  return value === true ? labels[0] : labels[1];
}

function uniqueStrings(values) {
  return [...new Set((values || []).map((value) => stringValue(value).trim()).filter(Boolean))];
}

function channelDocDefaultDmPolicy(channelName) {
  return CHANNEL_DM_POLICY_DOC_DEFAULTS[stringValue(channelName).trim()] || "";
}

function effectiveChannelGroupPolicy(channelName) {
  return (
    stringValue(getAtPath(state.config, `channels.${channelName}.groupPolicy`)).trim() ||
    stringValue(getAtPath(state.config, "channels.defaults.groupPolicy")).trim() ||
    CHANNEL_GROUP_POLICY_DOC_DEFAULT
  );
}

function effectiveChannelDmPolicy(channelName) {
  return (
    stringValue(getAtPath(state.config, `channels.${channelName}.dmPolicy`)).trim() ||
    stringValue(getAtPath(state.config, "channels.defaults.dmPolicy")).trim() ||
    channelDocDefaultDmPolicy(channelName)
  );
}

function effectiveAccountGroupPolicy(channelName, accountId) {
  return (
    stringValue(getAtPath(state.config, `channels.${channelName}.accounts.${accountId}.groupPolicy`)).trim() ||
    effectiveChannelGroupPolicy(channelName)
  );
}

function effectiveAccountDmPolicy(channelName, accountId) {
  return (
    stringValue(getAtPath(state.config, `channels.${channelName}.accounts.${accountId}.dmPolicy`)).trim() ||
    effectiveChannelDmPolicy(channelName)
  );
}

function isChannelEnabledEffective(channelName) {
  return getAtPath(state.config, `channels.${channelName}.enabled`) !== false;
}

function boolSelectOptions(currentValue, defaultValue = true) {
  const normalized =
    currentValue === true ? "true" : currentValue === false ? "false" : "";
  return [
    `<option value="" ${normalized === "" ? "selected" : ""}>未设置</option>`,
    `<option value="true" ${normalized === "true" ? "selected" : ""}>true</option>`,
    `<option value="false" ${normalized === "false" ? "selected" : ""}>false</option>`
  ].join("");
}

function isRenderableLeafValue(value) {
  return (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    Array.isArray(value)
  );
}

function detectConfiguredExtraKeys(target, excludeKeys = new Set()) {
  return Object.entries(target || {})
    .filter(([key]) => !excludeKeys.has(key))
    .filter(([, value]) => isRenderableLeafValue(value))
    .map(([key]) => key);
}

function mergeVisibleFieldKeys(channelName, scope, target, excludeKeys) {
  return [...new Set(detectConfiguredExtraKeys(target, excludeKeys))];
}

function inferDynamicFieldType(key, value) {
  if (KNOWN_DYNAMIC_SELECT_OPTIONS[key]) return "select";
  if (KNOWN_DYNAMIC_FIELD_TYPES[key]) return KNOWN_DYNAMIC_FIELD_TYPES[key];
  if (Array.isArray(value)) return "csv";
  if (typeof value === "boolean") return "bool";
  if (typeof value === "number") return "number";
  return "text";
}

function renderDynamicConfigField(basePath, key, value, placeholder = "") {
  const fieldType = inferDynamicFieldType(key, value);
  if (fieldType === "csv") {
    return renderLobsterEditorField(
      key,
      `<input data-csv-path="${escapeHtml(`${basePath}.${key}`)}" value="${escapeHtml(csvValue(value))}" placeholder="${escapeHtml(placeholder)}" />`
    );
  }
  if (fieldType === "bool") {
    return renderLobsterEditorField(
      key,
      `<select data-bool-select-path="${escapeHtml(`${basePath}.${key}`)}">${boolSelectOptions(value, true)}</select>`
    );
  }
  if (fieldType === "select") {
    return renderLobsterEditorField(
      key,
      `<select data-path="${escapeHtml(`${basePath}.${key}`)}">${optionsHtmlWithInherited(
        KNOWN_DYNAMIC_SELECT_OPTIONS[key] || [""],
        stringValue(value)
      )}</select>`
    );
  }
  if (fieldType === "groupPolicy") {
    return renderLobsterEditorField(
      key,
      `<select data-path="${escapeHtml(`${basePath}.${key}`)}">${optionsHtmlWithInherited(
        GROUP_POLICY_OPTIONS,
        stringValue(value)
      )}</select>`
    );
  }
  if (fieldType === "number") {
    return renderLobsterEditorField(
      key,
      `<input type="number" data-number-path="${escapeHtml(`${basePath}.${key}`)}" value="${escapeHtml(String(value))}" placeholder="${escapeHtml(placeholder)}" />`
    );
  }
  return renderLobsterEditorField(
    key,
    `<input data-path="${escapeHtml(`${basePath}.${key}`)}" value="${escapeHtml(stringValue(value))}" placeholder="${escapeHtml(placeholder)}" />`
  );
}

function renderDynamicConfigFieldGrid(channelName, scope, target, basePath, excludeKeys = new Set()) {
  const keys = mergeVisibleFieldKeys(channelName, scope, target, excludeKeys);
  if (keys.length === 0) return "";
  return `
    <div class="channel-robot-grid">
      ${keys
        .map((key) => renderDynamicConfigField(basePath, key, target?.[key], ""))
        .join("")}
    </div>
  `;
}

function normalizeEditableConfigShape(config) {
  const next = structuredClone(config || {});
  next.agents ??= {};
  next.agents.defaults ??= {};
  next.agents.list ??= [];
  next.channels ??= {};
  next.bindings ??= [];

  for (const agent of next.agents.list) {
    if (typeof agent.model === "string") {
      agent.model = { primary: agent.model };
    } else {
      agent.model ??= {};
    }
    if (typeof agent.subagents?.model === "string") {
      agent.subagents.model = { primary: agent.subagents.model };
    }
    agent.subagents ??= {};
    agent.tools ??= {};
    agent.sandbox ??= {};
    agent.identity ??= {};
    agent.groupChat ??= {};
    agent.heartbeat ??= {};
  }

  if (typeof next.agents.defaults.model === "string") {
    next.agents.defaults.model = { primary: next.agents.defaults.model };
  } else {
    next.agents.defaults.model ??= {};
  }

  return next;
}

function normalizedWorkspacePathForAgent(config, agent) {
  return agent?.workspace || config?.agents?.defaults?.workspace || "";
}

function workspaceSnapshotMap(workspaces) {
  const out = {};
  for (const workspace of workspaces || []) {
    out[workspace.path] = Object.fromEntries((workspace.files || []).map((file) => [file.name, file.content ?? ""]));
  }
  return out;
}

function buildWorkspacePlan() {
  const previousPaths = new Set((state.sourceWorkspaces || []).map((workspace) => workspace.path));
  const currentPaths = new Set((state.workspaces || []).map((workspace) => workspace.path));
  const obsoletePaths = [...previousPaths].filter((path) => !currentPaths.has(path));
  const relocations = [];

  const sourceDefaults = state.sourceConfig?.agents?.defaults?.workspace || "";
  const draftDefaults = state.config?.agents?.defaults?.workspace || "";
  if (sourceDefaults && draftDefaults && sourceDefaults !== draftDefaults) {
    relocations.push({
      scope: "defaults",
      id: "defaults",
      from: sourceDefaults,
      to: draftDefaults
    });
  }

  const sourceAgents = new Map((state.sourceConfig?.agents?.list || []).map((agent) => [agent.id, agent]));
  for (const agent of agentList()) {
    const source = sourceAgents.get(agent.id);
    if (!source) continue;
    const from = normalizedWorkspacePathForAgent(state.sourceConfig, source);
    const to = normalizedWorkspacePathForAgent(state.config, agent);
    if (from && to && from !== to) {
      relocations.push({
        scope: "agent",
        id: agent.id,
        from,
        to
      });
    }
  }

  return { obsoletePaths, relocations };
}

function hasDraftChanges() {
  const currentConfig = JSON.stringify(cleanConfig(state.config) || {});
  const sourceConfig = JSON.stringify(cleanConfig(state.sourceConfig) || {});
  const currentWorkspaces = JSON.stringify(workspaceSnapshotMap(state.workspaces));
  const sourceWorkspaces = JSON.stringify(workspaceSnapshotMap(state.sourceWorkspaces));
  return currentConfig !== sourceConfig || currentWorkspaces !== sourceWorkspaces;
}

function buildDraftSummary() {
  const sourceAgents = new Map((state.sourceConfig?.agents?.list || []).map((agent) => [agent.id, agent]));
  const currentAgents = new Map(agentList().map((agent) => [agent.id, agent]));
  const addedAgents = [...currentAgents.keys()].filter((id) => !sourceAgents.has(id));
  const removedAgents = [...sourceAgents.keys()].filter((id) => !currentAgents.has(id));
  const changedAgents = [...currentAgents.keys()].filter((id) => {
    const source = sourceAgents.get(id);
    if (!source) return false;
    return JSON.stringify(cleanConfig(currentAgents.get(id)) || {}) !== JSON.stringify(cleanConfig(source) || {});
  });

  const sourceChannels = new Map(Object.entries(state.sourceConfig?.channels || {}).filter(([name]) => name !== "defaults"));
  const currentChannels = new Map(channelEntries());
  const addedChannels = [...currentChannels.keys()].filter((id) => !sourceChannels.has(id));
  const removedChannels = [...sourceChannels.keys()].filter((id) => !currentChannels.has(id));
  const changedChannels = [...currentChannels.keys()].filter((id) => {
    const source = sourceChannels.get(id);
    if (!source) return false;
    return JSON.stringify(cleanConfig(currentChannels.get(id)) || {}) !== JSON.stringify(cleanConfig(source) || {});
  });

  const headPaths = [
    "agents.defaults.model.primary",
    "agents.defaults.workspace",
    "tools.profile",
    "gateway.mode",
    "gateway.port",
    "gateway.bind",
    "channels.defaults.groupPolicy"
  ];
  const changedHeadFields = headPaths.filter((path) => {
    const current = JSON.stringify(cleanConfig(getAtPath(state.config, path)));
    const source = JSON.stringify(cleanConfig(getAtPath(state.sourceConfig, path)));
    return current !== source;
  });

  const currentBindings = JSON.stringify(cleanConfig(state.config?.bindings) || []);
  const sourceBindings = JSON.stringify(cleanConfig(state.sourceConfig?.bindings) || []);
  const changedBindings = currentBindings !== sourceBindings;

  const workspacePlan = buildWorkspacePlan();
  const changedWorkspaces = [...new Set([
    ...workspacePlan.relocations.map((item) => item.to),
    ...workspacePlan.obsoletePaths
  ])];

  return {
    dirty: hasDraftChanges(),
    addedAgents,
    removedAgents,
    changedAgents,
    addedChannels,
    removedChannels,
    changedChannels,
    changedHeadFields,
    changedBindings,
    changedWorkspaces,
    workspacePlan
  };
}

function summarizeSaveConfirmation(restart) {
  const draft = buildDraftSummary();
  return {
    ...draft,
    restart,
    lines: [
      `头胸部：修改 ${draft.changedHeadFields.length}`,
      `Agent：新增 ${draft.addedAgents.length} / 修改 ${draft.changedAgents.length} / 删除 ${draft.removedAgents.length}`,
      `渠道：新增 ${draft.addedChannels.length} / 修改 ${draft.changedChannels.length} / 删除 ${draft.removedChannels.length}`,
      `bindings：${draft.changedBindings ? "已修改" : "未修改"}`,
      `工作区迁移：${draft.workspacePlan.relocations.length} 项`,
      `退出受管工作区：${draft.workspacePlan.obsoletePaths.length} 项`,
      restart ? "保存后会继续请求重启网关。" : "本次只保存，不会重启网关。"
    ]
  };
}

function collectWorkspaceEdits() {
  const result = {};
  for (const workspace of state.workspaces) {
    result[workspace.path] = {};
    for (const file of workspace.files) {
      result[workspace.path][file.name] = file.content ?? "";
    }
  }
  return result;
}

function syncWorkspacesFromConfig() {
  const previousWorkspaces = state.workspaces.map((workspace) => structuredClone(workspace));
  const nextWorkspaces = new Map();
  const defaultsWorkspace = state.config?.agents?.defaults?.workspace || "";
  const usedSeeds = new Set();
  const findSeedWorkspace = (workspacePath, agentIds) => {
    const direct = previousWorkspaces.find((item) => item.path === workspacePath);
    if (direct) return direct;

    const overlapCandidates = previousWorkspaces
      .map((workspace) => ({
        workspace,
        overlap: agentIds.filter((id) => workspace.agentIds?.includes(id)).length
      }))
      .filter((entry) => entry.overlap > 0)
      .sort((a, b) => b.overlap - a.overlap);

    const fallback = overlapCandidates.find((entry) => !usedSeeds.has(entry.workspace.path));
    if (fallback) return fallback.workspace;
    return null;
  };
  const addWorkspace = (workspacePath) => {
    if (!workspacePath) return;
    if (nextWorkspaces.has(workspacePath)) return;
    const agentIds = agentList()
      .filter((agent) => (agent.workspace || defaultsWorkspace) === workspacePath)
      .map((agent) => agent.id);
    const existing = findSeedWorkspace(workspacePath, agentIds);
    if (existing) usedSeeds.add(existing.path);
    nextWorkspaces.set(
      workspacePath,
      existing
        ? { ...structuredClone(existing), path: workspacePath }
        : {
            path: workspacePath,
            label: "derived",
            agentIds: [],
            localSkills: [],
            files: STANDARD_WORKSPACE_FILES.map((name) => ({
              name,
              exists: false,
              content: ""
            }))
          }
    );
  };

  addWorkspace(defaultsWorkspace);
  for (const agent of agentList()) addWorkspace(agent.workspace || defaultsWorkspace);

  state.workspaces = [...nextWorkspaces.values()].map((workspace) => {
    const copy = structuredClone(workspace);
    copy.agentIds = agentList()
      .filter((agent) => (agent.workspace || defaultsWorkspace) === workspace.path)
      .map((agent) => agent.id);
    return copy;
  });
}

function syncDerivedState() {
  syncWorkspacesFromConfig();
  refreshRawEditor();
}

function listAgentEdges() {
  const ids = new Set(agentList().map((agent) => agent.id));
  const edges = [];
  for (const agent of agentList()) {
    for (const childId of agent?.subagents?.allowAgents || []) {
      if (ids.has(childId)) edges.push([agent.id, childId]);
    }
  }
  return edges;
}

function buildOrgTreeData() {
  const ids = agentList().map((agent) => agent.id);
  const incoming = new Map(ids.map((id) => [id, []]));
  for (const [from, to] of listAgentEdges()) incoming.get(to)?.push(from);

  const parentByChild = new Map();
  const multiParentNodes = [];
  for (const [childId, parents] of incoming.entries()) {
    if (parents.length === 0) {
      parentByChild.set(childId, null);
      continue;
    }
    const sorted = [...parents].sort((a, b) => {
      const agentA = agentList().find((agent) => agent.id === a);
      const agentB = agentList().find((agent) => agent.id === b);
      const scoreA = agentA?.default ? 1 : 0;
      const scoreB = agentB?.default ? 1 : 0;
      return scoreB - scoreA || a.localeCompare(b);
    });
    parentByChild.set(childId, sorted[0]);
    if (sorted.length > 1) multiParentNodes.push({ childId, parents: sorted });
  }

  const childrenByParent = new Map([[null, []]]);
  for (const id of ids) childrenByParent.set(id, []);
  for (const id of ids) {
    const parent = parentByChild.get(id) ?? null;
    if (!childrenByParent.has(parent)) childrenByParent.set(parent, []);
    childrenByParent.get(parent).push(id);
  }
  for (const list of childrenByParent.values()) list.sort((a, b) => a.localeCompare(b));

  const roots = childrenByParent.get(null) || [];
  return { parentByChild, childrenByParent, roots, multiParentNodes };
}

function isDescendant(candidateId, ancestorId) {
  const edges = listAgentEdges();
  const stack = [ancestorId];
  const seen = new Set();
  while (stack.length > 0) {
    const current = stack.pop();
    if (current === candidateId) return true;
    if (seen.has(current)) continue;
    seen.add(current);
    for (const [from, to] of edges) if (from === current) stack.push(to);
  }
  return false;
}

function moveAgentUnderParent(agentId, parentId) {
  if (!agentId) return;
  if (parentId === agentId) {
    showMessage("error", "不能把 agent 拖到自己下面。");
    return;
  }
  if (parentId && isDescendant(parentId, agentId)) {
    showMessage("error", "这次拖拽会形成循环层级，已阻止。");
    return;
  }

  for (const agent of agentList()) {
    const next = (agent?.subagents?.allowAgents || []).filter((id) => id !== agentId);
    if (next.length > 0) {
      agent.subagents ??= {};
      agent.subagents.allowAgents = next;
    } else if (agent.subagents) {
      delete agent.subagents.allowAgents;
    }
  }

  if (parentId) {
    const parent = agentList().find((agent) => agent.id === parentId);
    if (!parent) return;
    parent.subagents ??= {};
    parent.subagents.allowAgents = [...new Set([...(parent.subagents.allowAgents || []), agentId])];
    showMessage("info", `已将 ${agentId} 挂到 ${parentId} 下面。`);
  } else {
    showMessage("info", `已将 ${agentId} 提升为顶层 agent。`);
  }

  syncDerivedState();
  render();
}

function showMessage(kind, text) {
  state.message = { kind, text };
  render();
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "content-type": "application/json" },
    ...options
  });
  const payload = await response.json();
  if (!response.ok) {
    const error = payload?.error || payload?.message || payload?.validation?.message || "Request failed";
    throw new Error(error);
  }
  return payload;
}

async function loadState() {
  state.busy = true;
  render();
  try {
    const payload = await api("/api/state");
    const validTabs = new Set(["lobster", "guide", "backups", "workspaces"]);
    state.info = payload.info;
    state.studioSettings = payload.studioSettings || state.studioSettings;
    state.activeTab = validTabs.has(state.activeTab) ? state.activeTab : "lobster";
    state.rawConfig = structuredClone(payload.config || {});
    state.config = normalizeEditableConfigShape(payload.config);
    state.sourceConfig = structuredClone(state.config);
    state.modelCatalog = payload.modelCatalog;
    state.workspaces = payload.workspaces;
    state.sourceWorkspaces = structuredClone(payload.workspaces);
    state.backups = payload.backups || [];
    state.rawEditor = JSON.stringify(state.config, null, 2);
    state.loaded = true;
    state.message = null;
  } catch (error) {
    state.loaded = false;
    state.message = { kind: "error", text: String(error.message || error) };
  } finally {
    state.busy = false;
    render();
  }
}

async function saveStudioSettings(partial, options = {}) {
  const { silent = false } = options;
  const payload = await api("/api/studio-settings", {
    method: "POST",
    body: JSON.stringify(partial)
  });
  state.studioSettings = payload.studioSettings || state.studioSettings;
  state.info = {
    ...(state.info || {}),
    backupsDir: payload.backupsDir || state.info?.backupsDir || ""
  };
  state.backups = payload.backups || state.backups;
  if (!silent) showMessage("info", "界面设置已保存。");
}

function refreshRawEditor() {
  state.rawEditor = JSON.stringify(cleanConfig(state.config), null, 2);
}

function renderMetric(label, value) {
  return `<div class="metric"><div class="label">${escapeHtml(label)}</div><div class="value">${escapeHtml(
    value
  )}</div></div>`;
}

function renderDraftTrash() {
  return "";
}

function renderGlossaryPanel() {
  return `
    <div class="panel">
      <h3>本地值对照表</h3>
      <p>这个界面离线运行，中文解释不是联网推理出来的，而是按本地内建映射表实时翻译。下面这张表就是当前界面会用到的原值对照。</p>
      <div class="hint-list">
        ${VALUE_GLOSSARY.map(
          (group) => `
            <div>
              <strong>${escapeHtml(group.title)}</strong><br />
              ${group.items.map((item) => `<code>${escapeHtml(item.raw)}</code> → ${escapeHtml(item.display)}`).join(" · ")}
            </div>
          `
        ).join("")}
      </div>
    </div>
  `;
}

function rawBoolLabel(value) {
  if (value === true) return "true";
  if (value === false) return "false";
  return "未填写";
}

function displayBoolLabel(value) {
  if (value === true) return "启用";
  if (value === false) return "关闭";
  return "未填写";
}

function translatedValue(rawValue, labels = {}, fallback = "未填写") {
  const raw = stringValue(rawValue).trim();
  if (!raw) return { display: fallback, raw: "未填写" };
  return {
    display: labels[raw] || raw,
    raw
  };
}

function renderLobsterKv(label, value) {
  return `<div><span class="kv-label"><small>${escapeHtml(label)}</small></span><span class="kv-value"><strong>${escapeHtml(
    value
  )}</strong></span></div>`;
}

function renderLobsterEditorField(label, controlMarkup, wide = false, detail = "") {
  return `
    <label class="lobster-editor-field${wide ? " wide" : ""}">
      <small>${escapeHtml(label)}</small>
      ${controlMarkup}
    </label>
  `;
}

function displayFieldLabel(label) {
  return label;
}

function formatReadonlyValue(value) {
  if (value === undefined || value === null) return "";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (Array.isArray(value)) return value.length > 0 ? value.join(", ") : "";
  if (typeof value === "object") return Object.keys(value).length > 0 ? JSON.stringify(value) : "";
  return stringValue(value).trim();
}

function hasVisibleValue(value) {
  return formatReadonlyValue(value) !== "";
}

function renderLobsterReadonlyField(label, value, wide = false) {
  const text = formatReadonlyValue(value);
  const cardTitle = `${label}\n${text}`;
  return `
    <label class="lobster-editor-field lobster-readonly-chip${wide ? " wide" : ""}" title="${escapeHtml(cardTitle)}">
      <small title="${escapeHtml(label)}">${escapeHtml(displayFieldLabel(label))}</small>
      <div class="lobster-readonly-value">${escapeHtml(text)}</div>
    </label>
  `;
}

function renderLobsterReadonlyFieldIfValue(label, value, wide = false) {
  return hasVisibleValue(value) ? renderLobsterReadonlyField(label, value, wide) : "";
}

function renderCompactFact(label, value) {
  const text = formatReadonlyValue(value);
  const cardTitle = `${label}\n${text}`;
  return `
    <div class="compact-fact" title="${escapeHtml(cardTitle)}">
      <small title="${escapeHtml(label)}">${escapeHtml(label)}</small>
      <div class="compact-fact-value" title="${escapeHtml(text)}">${escapeHtml(text)}</div>
    </div>
  `;
}

function renderStructuredCompactFacts(target, basePath = "") {
  if (isPlainConfigObject(target)) {
    return Object.keys(target)
      .map((key) => renderStructuredCompactFacts(target[key], basePath ? `${basePath}.${key}` : key))
      .join("");
  }
  if (!basePath) return "";
  return renderCompactFact(basePath, target);
}

function renderReadonlyFieldEntries(target, excludeKeys = new Set(), basePath = "") {
  const keys = detectConfiguredExtraKeys(target, excludeKeys);
  return keys.map((key) => renderLobsterReadonlyField(basePath ? `${basePath}.${key}` : key, target?.[key])).join("");
}

function renderReadonlyFieldGrid(target, excludeKeys = new Set(), basePath = "") {
  const entries = renderReadonlyFieldEntries(target, excludeKeys, basePath);
  if (!entries) return "";
  return `<div class="lobster-editor-grid">${entries}</div>`;
}

function isPlainConfigObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasConfigPath(target, path) {
  if (!path) return false;
  const segments = String(path).split(".").filter(Boolean);
  let cursor = target;
  for (const segment of segments) {
    if (!isPlainConfigObject(cursor) && !Array.isArray(cursor)) return false;
    if (!Object.prototype.hasOwnProperty.call(cursor, segment)) return false;
    cursor = cursor[segment];
  }
  return true;
}

function renderStructuredFieldEntries(target, basePath = "") {
  if (!isPlainConfigObject(target)) return "";
  return Object.keys(target)
    .map((key) => {
      const path = basePath ? `${basePath}.${key}` : key;
      const value = target[key];
      if (isPlainConfigObject(value)) {
        const nested = renderStructuredFieldEntries(value, path);
        return nested || renderLobsterReadonlyField(path, value);
      }
      return renderLobsterReadonlyField(path, value);
    })
    .join("");
}

function renderHeadpieceFields(defaults, tools, gateway, channelDefaults) {
  return [
    renderStructuredFieldEntries(defaults || {}, "agents.defaults"),
    renderStructuredFieldEntries(tools || {}, "tools"),
    renderStructuredFieldEntries(gateway || {}, "gateway"),
    hasOwn(state.config?.channels || {}, "defaults")
      ? renderStructuredFieldEntries(channelDefaults || {}, "channels.defaults")
      : ""
  ].join("");
}

function renderLobsterInlineToggle(path, label, checked, falseMode = "") {
  return `
    <label class="lobster-inline-toggle">
      <input type="checkbox" data-bool-path="${escapeHtml(path)}" ${falseMode ? `data-bool-false="${escapeHtml(falseMode)}"` : ""} ${
        checked ? "checked" : ""
      } />
      <span>${escapeHtml(label)}</span>
    </label>
  `;
}

function renderSaveModal() {
  return "";
}

function routeSummaryForAgent(agentId) {
  const bindings = (state.config?.bindings || []).filter((binding) => binding.agentId === agentId);
  const agent = agentList().find((item) => item.id === agentId);
  const explicitChannels = [...new Set(bindings.map((binding) => stringValue(binding?.match?.channel).trim()).filter(Boolean))];
  const fallbackChannels = channelEntries()
    .filter(([, channelConfig]) => channelConfig?.enabled !== false)
    .map(([channelName]) => channelName)
    .filter((channelName) => !explicitChannels.includes(channelName))
    .filter((channelName) => {
      const targets = effectiveTargetAgentsForChannel(channelName);
      return targets.includes(agentId);
    });

  const parts = [];
  if (explicitChannels.length > 0) {
    parts.push(...explicitChannels.map((channelName) => `${channelName}（显式）`));
  }
  if (fallbackChannels.length > 0 && agent?.default) {
    parts.push(...fallbackChannels.map((channelName) => `${channelName}（默认兜底）`));
  }
  if (parts.length > 0) return parts.join(" / ");
  return agent?.default ? "默认兜底入口（当前无启用渠道落到这里）" : "等待 bindings 或上级派工";
}

function effectiveTargetAgentsForChannel(channelName) {
  const bindings = (state.config?.bindings || []).filter((binding) => binding?.match?.channel === channelName);
  const targetAgents = [...new Set(bindings.map((binding) => binding.agentId).filter(Boolean))];
  if (targetAgents.length > 0) return targetAgents;
  return agentList().filter((agent) => agent.default).map((agent) => agent.id);
}

function describeChannelCredentialState(name, config) {
  const providerFields = CHANNEL_FIELD_MAP[name] || [];
  if (providerFields.length === 0) return "当前界面未内建该渠道的专属凭据字段";
  const countPresentFields = (target) =>
    providerFields.filter((field) => stringValue(target?.[field.path]).trim() !== "").length;
  const accountEntries = Object.entries(config?.accounts || {});
  if (accountEntries.length === 0) {
    const presentCount = countPresentFields(config);
    return `${presentCount}/${providerFields.length} 项已填写`;
  }
  const fullAccounts = accountEntries.filter(([, accountConfig]) => countPresentFields(accountConfig) === providerFields.length).length;
  const partialAccounts = accountEntries.filter(([, accountConfig]) => countPresentFields(accountConfig) > 0).length;
  if (fullAccounts > 0) return `${fullAccounts}/${accountEntries.length} 个账号凭据齐全`;
  if (partialAccounts > 0) return `${partialAccounts}/${accountEntries.length} 个账号已填部分凭据`;
  return `0/${accountEntries.length} 个账号已填凭据`;
}

function routeAgentOptions(selectedAgentId, explicitAgentId) {
  const options = ['<option value="">沿用当前继承关系</option>'];
  for (const agent of agentList()) {
    const label = explicitAgentId
      ? `${agent.id}${explicitAgentId === agent.id ? " · 当前显式" : ""}`
      : `${agent.id}${selectedAgentId === agent.id ? " · 当前生效" : ""}`;
    options.push(
      `<option value="${escapeHtml(agent.id)}" ${
        explicitAgentId === agent.id ? "selected" : ""
      }>${escapeHtml(label)}</option>`
    );
  }
  return options.join("");
}

function currentDefaultAgentId() {
  return (
    agentList().find((agent) => agent.default)?.id ||
    agentList()[0]?.id ||
    "main"
  );
}

function channelRobotLabel(channelName, accountId) {
  const trimmed = stringValue(accountId).trim();
  if (!trimmed) return channelName;
  return trimmed;
}

function hasOwn(target, key) {
  return Boolean(target) && Object.prototype.hasOwnProperty.call(target, key);
}

function channelGlobalGroupsApplyToAccount(channelName, accountId, explicitAccountCount) {
  return explicitAccountCount <= 1;
}

function effectiveGroupRuleSource(channelName, accountId, groupId) {
  const channelConfig = state.config?.channels?.[channelName] || {};
  const accountGroups = channelConfig.accounts?.[accountId]?.groups || {};
  const explicitAccountCount = Object.keys(channelConfig.accounts || {}).filter(Boolean).length;
  if (accountId && hasOwn(accountGroups, groupId)) {
    return {
      source: "account",
      rule: accountGroups[groupId],
      requireMentionPath: `channels.${channelName}.accounts.${accountId}.groups.${groupId}.requireMention`,
      allowFromPath: `channels.${channelName}.accounts.${accountId}.groups.${groupId}.allowFrom`
    };
  }
  if (
    hasOwn(channelConfig.groups || {}, groupId) &&
    channelGlobalGroupsApplyToAccount(channelName, accountId, explicitAccountCount)
  ) {
    return {
      source: "global",
      rule: channelConfig.groups[groupId],
      requireMentionPath: `channels.${channelName}.groups.${groupId}.requireMention`,
      allowFromPath: `channels.${channelName}.groups.${groupId}.allowFrom`
    };
  }
  return {
    source: "implicit",
    rule: { requireMention: true },
    requireMentionPath: accountId
      ? `channels.${channelName}.accounts.${accountId}.groups.${groupId}.requireMention`
      : `channels.${channelName}.groups.${groupId}.requireMention`,
    allowFromPath: accountId
      ? `channels.${channelName}.accounts.${accountId}.groups.${groupId}.allowFrom`
      : `channels.${channelName}.groups.${groupId}.allowFrom`
  };
}

function buildChannelRobots(channelName) {
  const accountIds = listChannelAccountIds(channelName);
  if (accountIds.length === 0) {
    const merged = mergeChannelAccountConfig(channelName, "");
    return [
      {
        id: "",
        label: channelName,
        badge: "渠道默认",
        summary: `${truthyLabel(merged.enabled === true, ["启用", "停用"])} · dm ${merged.dmPolicy || "pairing"}`
      }
    ];
  }
  return accountIds.map((accountId) => {
    const merged = mergeChannelAccountConfig(channelName, accountId);
    return {
      id: accountId,
      label: channelRobotLabel(channelName, accountId),
      badge: "机器人",
      summary: `${describeChannelCredentialState(channelName, merged)} · dm ${merged.dmPolicy || "pairing"}`
    };
  });
}

function isMaterializedRobotAccount(channelName, accountId) {
  if (!accountId) return false;
  return true;
}

function channelRobotFieldDescriptors(channelName, robotId) {
  const hasAccounts = listChannelAccountIds(channelName).length > 0;
  const basePath = hasAccounts ? `channels.${channelName}.accounts.${robotId}` : `channels.${channelName}`;
  return [
    {
      label: "appId",
      path: `${basePath}.appId`,
      mergedKey: "appId",
      fallbackPath: `channels.${channelName}.appId`
    },
    {
      label: "key",
      path: `${basePath}.appSecret`,
      mergedKey: "appSecret",
      fallbackPath: `channels.${channelName}.appSecret`
    },
    {
      label: "token",
      path: `${basePath}.botToken`,
      mergedKey: "botToken",
      fallbackPath: `channels.${channelName}.botToken`
    }
  ];
}

function renderChannelRobotList(channelName) {
  const robots = buildChannelRobots(channelName);
  const hasAccounts = listChannelAccountIds(channelName).length > 0;
  return `
    <div class="channel-robot-shell">
      <div class="channel-robot-path">${escapeHtml(`channels.${channelName}.accounts.<accountId>.*`)}</div>
      <div class="channel-robot-list">
        ${robots
          .map((robot) => {
            const robotConfig = hasAccounts
              ? getAtPath(state.config, `channels.${channelName}.accounts.${robot.id}`) || {}
              : state.config?.channels?.[channelName] || {};
            return `
              <article class="channel-robot-card">
                <div class="channel-robot-head">
                  <strong>${escapeHtml(robot.label || "default")}</strong>
                  <span>${escapeHtml(robot.badge || "机器人")}</span>
                </div>
                <div class="channel-robot-grid channel-policy-grid">
                  ${renderStructuredFieldEntries(
                    robotConfig,
                    hasAccounts ? `channels.${channelName}.accounts.${robot.id}` : `channels.${channelName}`
                  )}
                </div>
              </article>
            `;
          })
          .join("")}
      </div>
    </div>
  `;
}

function agentColorIndex(agentId) {
  const seed = stringValue(agentId).trim() || currentDefaultAgentId();
  const orderedIds = agentList().map((agent) => stringValue(agent.id).trim()).filter(Boolean);
  const directIndex = orderedIds.indexOf(seed);
  if (directIndex >= 0) return directIndex % 7;
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 97;
  }
  return hash % 7;
}

function buildSessionLane(slot, lane) {
  const hasExplicitBind = Boolean(lane.route?.agentId) && lane.route?.matchedBy !== "default-agent";
  const targetAgentId = hasExplicitBind ? lane.route.agentId : "";
  const colorIndex = hasExplicitBind ? agentColorIndex(targetAgentId) : 0;
  const routeText = [routeMatchLabel(lane.route.matchedBy), lane.metaText].filter(Boolean).join(" / ");
  return `
    <div
      class="session-link session-link-${escapeHtml(slot.side || "left")}${hasExplicitBind ? ` robot-color-${colorIndex}` : " session-link-unbound"}"
      data-route-channel="${escapeHtml(slot.channel)}"
      data-route-account="${escapeHtml(stringValue(lane.accountId))}"
      data-route-kind="${escapeHtml(slot.kind)}"
      data-route-title="${escapeHtml(slot.title)}"
      data-route-peer-kind="${escapeHtml(slot.peer?.kind || "")}"
      data-route-peer-id="${escapeHtml(slot.peer?.id || "")}"
      data-session-channel="${escapeHtml(slot.channel)}"
      data-session-kind="${escapeHtml(slot.kind)}"
      data-session-title="${escapeHtml(slot.title)}"
      data-session-account="${escapeHtml(stringValue(lane.accountId))}"
      data-session-peer-kind="${escapeHtml(slot.peer?.kind || "")}"
      data-session-peer-id="${escapeHtml(slot.peer?.id || "")}"
      ${hasExplicitBind ? `data-session-target-agent="${escapeHtml(targetAgentId)}"` : ""}
      data-link-side="${escapeHtml(slot.side || "left")}"
      ${hasExplicitBind ? `data-link-color="${escapeHtml(String(colorIndex))}"` : ""}
    >
      <div
        class="session-link-bot"
        title="${escapeHtml(lane.membershipText)}"
      >
        <div class="session-link-copy">
          <strong class="session-link-name">${escapeHtml(lane.botLabel)}</strong>
          <span class="session-link-rule">${escapeHtml(routeText)}</span>
        </div>
        <div class="session-link-avatar">
          <span
            class="session-link-bot-icon"
            aria-hidden="true"
            data-link-source="${escapeHtml(`${slot.channel}::${slot.kind}::${stringValue(lane.accountId)}::${slot.peer?.id || slot.title}`)}"
          >🤖</span>
        </div>
      </div>
    </div>
  `;
}

function renderLobsterSessionCard(slot) {
  const displayLanes =
    slot.kind === "group" && slot.lanes.length === 0
      ? [
          {
            accountId: "",
            botLabel: "未显式",
            route: { matchedBy: "default-agent", agentId: "", explicitBindingIndex: null },
            membershipText: "当前没有检测到显式机器人挂载",
            metaText: ""
          }
        ]
      : slot.lanes;
  const hasExplicitBind = slot.lanes.some((lane) => lane.route?.matchedBy !== "default-agent");
  const sessionHeading =
    slot.kind === "group"
      ? "群聊groups"
      : "私聊dm";
  const links = `
    <div class="${hasExplicitBind ? "bind-layer-shell" : "bind-layer-shell bind-layer-shell-implicit"}">
      <div class="session-link-list">${displayLanes.map((lane) => buildSessionLane(slot, lane)).join("")}</div>
    </div>
  `;
  const rawTarget = state.rawConfig || state.config;
  const sessionFacts =
    slot.kind === "group"
      ? [
          `channels.${slot.channel}.groups.${slot.peer?.id || ""}`,
          ...displayLanes
            .map((lane) => stringValue(lane.accountId).trim())
            .filter(Boolean)
            .map((accountId) => `channels.${slot.channel}.accounts.${accountId}.groups.${slot.peer?.id || ""}`)
        ]
          .filter((path, index, list) => path && list.indexOf(path) === index)
          .map((path) => (hasConfigPath(rawTarget, path) ? renderStructuredCompactFacts(getAtPath(rawTarget, path), path) : ""))
          .join("")
      : "";
  const info = `
    <div class="session-card-info">
      <div class="route-slot-head session-card-head">
        <strong>${escapeHtml(sessionHeading)}</strong>
      </div>
      ${sessionFacts ? `<div class="compact-fact-row">${sessionFacts}</div>` : ""}
    </div>
  `;
  return `
    <article
      class="route-slot session-card session-card-${escapeHtml(slot.side || "left")}"
      style="--lane-count:${Math.max(displayLanes.length, 1)};--session-card-min-height:calc(58px + (var(--lane-count) - 1) * 28px);"
      data-session-channel="${escapeHtml(slot.channel)}"
      data-session-kind="${escapeHtml(slot.kind)}"
      data-session-title="${escapeHtml(slot.title)}"
      data-session-peer-kind="${escapeHtml(slot.peer?.kind || "")}"
      data-session-peer-id="${escapeHtml(slot.peer?.id || "")}"
      data-session-target-agent="${escapeHtml(slot.defaultAgentId || currentDefaultAgentId())}"
    >
      <div class="session-card-main">
        ${info}
        ${links}
      </div>
    </article>
  `;
}

function normalizeAgentModelValue(agent) {
  if (!agent) return "";
  if (typeof agent.model === "string") return agent.model;
  return agent?.model?.primary || "";
}

function routeMatchLabel(matchedBy) {
  return (
    {
      "binding.peer": "bindings",
      "binding.guild+roles": "bindings",
      "binding.guild": "bindings",
      "binding.team": "bindings",
      "binding.account": "bindings",
      "binding.channel": "bindings",
      "default-agent": "未显式 bind"
    }[matchedBy] || matchedBy
  );
}

function renderLobsterAgent(agent, index) {
  const heading = `体节 ${index + 1}`;
  return `
    <article class="lobster-segment ${agent.default ? "default" : ""}" draggable="true" data-drag-kind="agent" data-drag-id="${escapeHtml(
      agent.id
    )}" data-drop-agent="${escapeHtml(agent.id)}" data-agent-anchor="${escapeHtml(agent.id)}">
      <div class="lobster-segment-head" data-fixed-text="true">
        <strong>${escapeHtml(heading)}</strong>
      </div>
      <div class="lobster-editor-grid">${renderStructuredFieldEntries(agent, `agents.list.${index}`)}</div>
    </article>
  `;
}

function renderLobsterAgentBranch(agentId, tree, depth = 0, order = new Map()) {
  const agent = rawAgentList().find((item) => item.id === agentId);
  if (!agent) return "";
  const children = tree.childrenByParent.get(agentId) || [];
  const index = order.get(agentId) ?? rawAgentList().findIndex((item) => item.id === agentId);
  const heading = `体节 ${(index ?? 0) + 1}`;
  return `
    <div class="lobster-branch ${depth > 0 ? "lobster-branch-child" : "lobster-branch-root"}">
      <article
        class="lobster-segment ${agent.default ? "default" : ""}${depth > 0 ? " lobster-segment-child" : ""}"
        data-agent-anchor="${escapeHtml(agent.id)}"
      >
        <div class="lobster-segment-head" data-fixed-text="true">
          <strong>${escapeHtml(heading)}</strong>
        </div>
        <div class="lobster-editor-grid">${renderStructuredFieldEntries(agent, `agents.list.${index ?? 0}`)}</div>
      </article>
      ${
        children.length > 0
          ? `<div class="lobster-children">${children.map((childId) => renderLobsterAgentBranch(childId, tree, depth + 1, order)).join("")}</div>`
          : ""
      }
    </div>
  `;
}

function renderLobsterChannelLimb(side, role, name, config) {
  if (!name) {
    return `
      <article class="lobster-limb placeholder ${role}">
        <div class="lobster-limb-head">
          <strong>${role === "claw" ? "空钳子" : "空肢体"}</strong>
          <span>${side === "left" ? "左侧" : "右侧"}</span>
        </div>
        <p>这里还没有接入渠道。保留形状，是为了让新手一眼理解“渠道在外，agent 在体内”。</p>
      </article>
    `;
  }

  const routeSlots = buildChannelRouteSlots(name);
  const channelEnabled = isChannelEnabledEffective(name);
  return `
    <article class="lobster-limb ${role}">
      <div class="lobster-limb-head" data-fixed-text="true">
        <div class="lobster-limb-title">
          <strong>钳（渠道机器人）</strong>
          <span>${escapeHtml(`channels.${name}.*`)}</span>
        </div>
        <div class="lobster-limb-meta-card">
          <span>${escapeHtml(name)}</span>
          <strong>${escapeHtml(`enabled=${channelEnabled ? "true" : "false"}`)}</strong>
        </div>
      </div>
      <div class="lobster-editor-grid lobster-channel-editor-grid">
        ${renderStructuredFieldEntries(
          Object.fromEntries(
            Object.entries(config || {}).filter(([key]) => !["enabled", "groups", "accounts"].includes(key))
          ),
          `channels.${name}`
        )}
      </div>
      ${renderChannelRobotList(name)}
      <div class="session-shell">
        <div class="session-shell-head" data-fixed-text="true">
          <strong>肉（会话）</strong>
          <span>${escapeHtml(`channels.${name}.groups.* / channels.${name}.accounts.<accountId>.*`)}</span>
        </div>
        <div class="route-slot-list">
          ${routeSlots.map((slot) => renderLobsterSessionCard({ ...slot, side })).join("")}
        </div>
      </div>
    </article>
  `;
}

function renderLobsterSide(side, items) {
  const slots = [];
  const minSlots = 4;
  const total = Math.max(minSlots, items.length);
  for (let index = 0; index < total; index += 1) {
    const item = items[index];
    const role = index === 0 ? "claw" : "leg";
    slots.push(renderLobsterChannelLimb(side, role, item?.[0], item?.[1]));
  }
  return `<div class="lobster-side ${side}">${slots.join("")}</div>`;
}

function renderLobsterRoutes() {
  return `<svg class="lobster-routes" aria-hidden="true"></svg>`;
}

function renderLobsterIntegratedControls() {
  return "";
}

function renderLobsterStudio() {
  const channels = channelEntries();
  const leftChannels = channels.filter((_, index) => index % 2 === 0);
  const rightChannels = channels.filter((_, index) => index % 2 === 1);
  const sessionCount = totalResolvedSessionCount();
  const defaults = state.rawConfig?.agents?.defaults || state.config?.agents?.defaults || {};
  const tools = state.config?.tools || {};
  const gateway = state.config?.gateway || {};
  const channelDefaults = state.rawConfig?.channels?.defaults || state.config?.channels?.defaults || {};
  const tree = buildOrgTreeData();
  const order = new Map(rawAgentList().map((agent, index) => [agent.id, index]));
  const lobsterAgentTree =
    rawAgentList().length > 0
      ? tree.roots.map((agentId) => renderLobsterAgentBranch(agentId, tree, 0, order)).join("")
      : `<article class="lobster-segment placeholder"><strong>空身体</strong><p>当前还没有 agent。</p></article>`;

  return `
    <section class="section ${state.activeTab === "lobster" ? "active" : ""}" data-section="lobster">
      <div class="panel">
        <h3>龙虾画布</h3>
        <div class="lobster-legend-card" aria-label="龙虾画布层级示意图">
          <span class="legend-chip legend-structure" data-fixed-text="true">头胸部（全局默认）</span>
          <span class="legend-arrow" data-fixed-text="true">→</span>
          <span class="legend-chip legend-agent" data-fixed-text="true">体节（Agents）</span>
          <span class="legend-arrow" data-fixed-text="true">→</span>
          <span class="legend-chip legend-bind" data-fixed-text="true">神经（bindings）</span>
          <span class="legend-arrow" data-fixed-text="true">→</span>
          <span class="legend-chip legend-robot" data-fixed-text="true">钳（渠道机器人）</span>
          <span class="legend-arrow" data-fixed-text="true">→</span>
          <span class="legend-chip legend-session" data-fixed-text="true">肉（会话）</span>
        </div>
      </div>
      <div class="lobster-board">
        ${renderLobsterIntegratedControls()}
        <div class="lobster-shell">
          ${renderLobsterRoutes()}
          ${renderLobsterSide("left", leftChannels)}
          <div class="lobster-body">
            <div class="lobster-core lobster-core-headpiece">
              <div class="lobster-core-head" data-fixed-text="true">
                <strong>头胸部（全局默认）</strong>
                <span>agents.defaults / gateway / tools / channels.defaults</span>
              </div>
              <div class="lobster-editor-grid lobster-core-form">
                ${renderHeadpieceFields(defaults, tools, gateway, channelDefaults)}
              </div>
            </div>
            <div class="lobster-segments">
              ${lobsterAgentTree}
            </div>
            <div class="lobster-tail">
              <div class="lobster-tail-fan">
                <div class="tail-card">
                  <small>渠道数</small>
                  <strong>${escapeHtml(String(channelEntries().length))}</strong>
                </div>
                <div class="tail-card">
                  <small>Agent 数</small>
                  <strong>${escapeHtml(String(agentList().length))}</strong>
                </div>
                <div class="tail-card">
                  <small>会话数</small>
                  <strong>${escapeHtml(String(sessionCount))}</strong>
                </div>
              </div>
            </div>
          </div>
          ${renderLobsterSide("right", rightChannels)}
        </div>
      </div>
    </section>
  `;
}

function renderOrgBranch(agentId, tree, depth = 0) {
  const agent = agentList().find((item) => item.id === agentId);
  if (!agent) return "";
  const children = tree.childrenByParent.get(agentId) || [];
  return `
    <div class="org-branch">
      <div class="org-node ${agent.default ? "default" : ""}" draggable="true" data-drag-agent="${escapeHtml(
        agent.id
      )}" data-drag-kind="agent" data-drag-id="${escapeHtml(agent.id)}" data-drop-agent="${escapeHtml(agent.id)}">
        <div class="org-node-head">
          <strong>${escapeHtml(agent.name || agent.id)}</strong>
          <span>${escapeHtml(agent.id)}</span>
        </div>
        <div class="org-node-body">
          <div>${escapeHtml(agent?.model?.primary || "继承默认模型")}</div>
          <div>${escapeHtml(agent.workspace || "继承默认 workspace")}</div>
        </div>
        <div class="tags">
          ${agent.default ? `<span class="tag">默认入口</span>` : ""}
          <span class="tag">深度 ${depth}</span>
          <span class="tag">下级 ${children.length}</span>
        </div>
      </div>
      ${
        children.length > 0
          ? `<div class="org-children">${children.map((childId) => renderOrgBranch(childId, tree, depth + 1)).join("")}</div>`
          : ""
      }
    </div>
  `;
}

function renderOverview() {
  return "";
}

function channelEntries() {
  return Object.entries(state.config?.channels || {}).filter(([name]) => name !== "defaults");
}

function channelCount() {
  return channelEntries().length;
}

function normalizeChatKind(kind) {
  if (kind === "dm") return "direct";
  return stringValue(kind).trim().toLowerCase();
}

function normalizeRouteId(value) {
  return stringValue(value).trim();
}

function resolveChannelDefaultAccountId(channelName) {
  const channelConfig = state.config?.channels?.[channelName] || {};
  const accountIds = Object.keys(channelConfig.accounts || {}).filter(Boolean).sort((a, b) => a.localeCompare(b));
  const explicit = stringValue(channelConfig.defaultAccount).trim();
  if (explicit && accountIds.includes(explicit)) return explicit;
  if (accountIds.includes("default")) return "default";
  if (accountIds.length > 0) return accountIds[0];
  return explicit || "default";
}

function listChannelAccountIds(channelName) {
  const channelConfig = state.config?.channels?.[channelName] || {};
  const explicitIds = Object.keys(channelConfig.accounts || {}).filter(Boolean).sort((a, b) => a.localeCompare(b));
  return explicitIds;
}

function accountIdPathForDm(channelName, accountId) {
  return accountId ? `channels.${channelName}.accounts.${accountId}.allowFrom` : `channels.${channelName}.allowFrom`;
}

function policyPathForDm(channelName, accountId) {
  return accountId ? `channels.${channelName}.accounts.${accountId}.dmPolicy` : `channels.${channelName}.dmPolicy`;
}

function mergeChannelAccountConfig(channelName, accountId) {
  const channelConfig = structuredClone(state.config?.channels?.[channelName] || {});
  const accountConfig = structuredClone(channelConfig.accounts?.[accountId] || {});
  const merged = {
    ...channelConfig,
    ...accountConfig
  };
  const mergedGroups = {
    ...(channelConfig.groups || {}),
    ...(accountConfig.groups || {})
  };
  merged.groups = Object.keys(mergedGroups).length > 0 ? mergedGroups : {};
  merged.allowFrom = [...new Set([...(channelConfig.allowFrom || []), ...(accountConfig.allowFrom || [])])];
  merged.groupAllowFrom = [...new Set([...(channelConfig.groupAllowFrom || []), ...(accountConfig.groupAllowFrom || [])])];
  merged.accounts = channelConfig.accounts || {};
  return merged;
}

function bindingDescriptor(binding) {
  const match = binding?.match || {};
  return {
    channel: stringValue(match.channel).trim().toLowerCase(),
    accountId: stringValue(match.accountId).trim(),
    peerKind: normalizeChatKind(match?.peer?.kind),
    peerId: normalizeRouteId(match?.peer?.id),
    guildId: normalizeRouteId(match.guildId),
    teamId: normalizeRouteId(match.teamId),
    roles: Array.isArray(match.roles) ? match.roles.map((role) => stringValue(role).trim()).filter(Boolean) : []
  };
}

function routeScopeDescriptor(scope) {
  return {
    channel: stringValue(scope.channel).trim().toLowerCase(),
    accountId: stringValue(scope.accountId).trim(),
    peerKind: normalizeChatKind(scope?.peer?.kind),
    peerId: normalizeRouteId(scope?.peer?.id),
    guildId: normalizeRouteId(scope.guildId),
    teamId: normalizeRouteId(scope.teamId),
    roles: Array.isArray(scope.roles) ? scope.roles.map((role) => stringValue(role).trim()).filter(Boolean) : []
  };
}

function bindingMatchesAccount(accountPattern, actualAccountId, defaultAccountId) {
  if (!accountPattern) return actualAccountId === defaultAccountId;
  if (accountPattern === "*") return true;
  return accountPattern === actualAccountId;
}

function rolesMatch(requiredRoles, actualRoles) {
  if (!requiredRoles || requiredRoles.length === 0) return true;
  const roleSet = new Set(actualRoles || []);
  return requiredRoles.every((role) => roleSet.has(role));
}

function sameArrayItems(left, right) {
  if (left.length !== right.length) return false;
  return [...left].sort().join("\u0000") === [...right].sort().join("\u0000");
}

function findExactBindingIndex(scope) {
  const target = routeScopeDescriptor(scope);
  return (state.config?.bindings || []).findIndex((binding) => {
    const current = bindingDescriptor(binding);
    return (
      current.channel === target.channel &&
      current.accountId === target.accountId &&
      current.peerKind === target.peerKind &&
      current.peerId === target.peerId &&
      current.guildId === target.guildId &&
      current.teamId === target.teamId &&
      sameArrayItems(current.roles, target.roles)
    );
  });
}

function resolveScopeRoute(scope) {
  const normalized = routeScopeDescriptor(scope);
  const channelName = normalized.channel;
  const defaultAgentId =
    agentList().find((agent) => agent.default)?.id ||
    agentList()[0]?.id ||
    "main";
  const defaultAccountId = resolveChannelDefaultAccountId(channelName);
  const actualAccountId = normalized.accountId || defaultAccountId;

  const candidates = (state.config?.bindings || [])
    .map((binding, index) => ({ binding, index, match: bindingDescriptor(binding) }))
    .filter((entry) => entry.match.channel === channelName)
    .filter((entry) => bindingMatchesAccount(entry.match.accountId, actualAccountId, defaultAccountId));

  const tiers = [
    {
      matchedBy: "binding.peer",
      test: (entry) =>
        Boolean(entry.match.peerKind && entry.match.peerId) &&
        normalized.peerKind === entry.match.peerKind &&
        normalized.peerId === entry.match.peerId &&
        (!entry.match.guildId || entry.match.guildId === normalized.guildId) &&
        (!entry.match.teamId || entry.match.teamId === normalized.teamId) &&
        rolesMatch(entry.match.roles, normalized.roles)
    },
    {
      matchedBy: "binding.guild+roles",
      test: (entry) =>
        !entry.match.peerKind &&
        !entry.match.peerId &&
        Boolean(entry.match.guildId) &&
        entry.match.guildId === normalized.guildId &&
        entry.match.roles.length > 0 &&
        rolesMatch(entry.match.roles, normalized.roles)
    },
    {
      matchedBy: "binding.guild",
      test: (entry) =>
        !entry.match.peerKind &&
        !entry.match.peerId &&
        Boolean(entry.match.guildId) &&
        entry.match.guildId === normalized.guildId &&
        entry.match.roles.length === 0
    },
    {
      matchedBy: "binding.team",
      test: (entry) =>
        !entry.match.peerKind &&
        !entry.match.peerId &&
        !entry.match.guildId &&
        Boolean(entry.match.teamId) &&
        entry.match.teamId === normalized.teamId
    },
    {
      matchedBy: "binding.account",
      test: (entry) =>
        !entry.match.peerKind &&
        !entry.match.peerId &&
        !entry.match.guildId &&
        !entry.match.teamId &&
        entry.match.roles.length === 0 &&
        entry.match.accountId !== "*"
    },
    {
      matchedBy: "binding.channel",
      test: (entry) =>
        !entry.match.peerKind &&
        !entry.match.peerId &&
        !entry.match.guildId &&
        !entry.match.teamId &&
        entry.match.roles.length === 0 &&
        entry.match.accountId === "*"
    }
  ];

  for (const tier of tiers) {
    const match = candidates.find((entry) => tier.test(entry));
    if (match) {
      return {
        agentId: match.binding.agentId,
        matchedBy: tier.matchedBy,
        bindingIndex: match.index,
        explicitBindingIndex: findExactBindingIndex(scope)
      };
    }
  }

  return {
    agentId: defaultAgentId,
    matchedBy: "default-agent",
    bindingIndex: null,
    explicitBindingIndex: findExactBindingIndex(scope)
  };
}

function setScopeBindingTarget(scope, agentId) {
  const bindingIndex = findExactBindingIndex(scope);
  const normalized = routeScopeDescriptor(scope);
  if (!agentId) {
    if (bindingIndex >= 0) {
      state.config.bindings.splice(bindingIndex, 1);
      syncDerivedState();
      showMessage("info", `已移除 ${scope.title || normalized.channel} 的显式绑定，改为沿用更宽泛规则。`);
      render();
    }
    return;
  }

  const nextBinding = {
    agentId,
    match: {
      channel: normalized.channel
    }
  };
  if (normalized.accountId) nextBinding.match.accountId = normalized.accountId;
  if (normalized.peerKind && normalized.peerId) {
    nextBinding.match.peer = {
      kind: normalized.peerKind,
      id: normalized.peerId
    };
  }
  if (normalized.guildId) nextBinding.match.guildId = normalized.guildId;
  if (normalized.teamId) nextBinding.match.teamId = normalized.teamId;
  if (normalized.roles.length > 0) nextBinding.match.roles = normalized.roles;

  if (bindingIndex >= 0) state.config.bindings[bindingIndex] = nextBinding;
  else state.config.bindings.push(nextBinding);
  syncDerivedState();
  showMessage("info", `已把 ${scope.title || normalized.channel} 显式路由到 ${agentId}。`);
  render();
}

function scopeFromDataset(dataset) {
  return {
    title: dataset.routeTitle || "",
    channel: dataset.routeChannel || "",
    accountId: dataset.routeAccount || "",
    guildId: dataset.routeGuildId || "",
    teamId: dataset.routeTeamId || "",
    peer:
      dataset.routePeerKind && dataset.routePeerId
        ? {
            kind: dataset.routePeerKind,
            id: dataset.routePeerId
          }
      : undefined
  };
}

function sessionFromDataset(dataset) {
  return {
    channel: dataset.sessionChannel || "",
    kind: dataset.sessionKind || "",
    title: dataset.sessionTitle || "",
    accountId: dataset.sessionAccount || "",
    targetAgentId: dataset.sessionTargetAgent || currentDefaultAgentId(),
    peer:
      dataset.sessionPeerKind && dataset.sessionPeerId
        ? {
            kind: dataset.sessionPeerKind,
            id: dataset.sessionPeerId
          }
        : undefined
  };
}

function buildChannelRouteSlots(channelName) {
  const channelConfig = state.config?.channels?.[channelName] || {};
  const accountIds = listChannelAccountIds(channelName);
  const hasAccounts = accountIds.length > 0;
  const explicitAccountCount = Object.keys(channelConfig.accounts || {}).filter(Boolean).length;
  const defaultAccountId = resolveChannelDefaultAccountId(channelName);
  const slots = [];
  const seenKeys = new Set();
  const defaultAgentId = currentDefaultAgentId();
  const pushSlot = (slot) => {
    if (seenKeys.has(slot.id)) return;
    seenKeys.add(slot.id);
    slots.push({
      ...slot
    });
  };
  const accountPool = hasAccounts ? accountIds : [""];
  const accountSet = new Set(accountPool);

  const directPeers = new Map();
  for (const binding of state.config?.bindings || []) {
    if (stringValue(binding?.match?.channel).trim().toLowerCase() !== channelName) continue;
    const peerKind = normalizeChatKind(binding?.match?.peer?.kind);
    const peerId = normalizeRouteId(binding?.match?.peer?.id);
    if (peerKind !== "direct" || !peerId) continue;
    const effectiveAccountId = stringValue(binding?.match?.accountId).trim() || defaultAccountId;
    if (!accountSet.has(effectiveAccountId)) continue;
    const bucket = directPeers.get(peerId) || new Set();
    bucket.add(effectiveAccountId);
    directPeers.set(peerId, bucket);
  }

  for (const [peerId, memberSet] of directPeers.entries()) {
    const lanes = [...memberSet].sort().map((accountId) => {
      const scope = {
        title: `私聊 ${peerId}`,
        channel: channelName,
        accountId,
        peer: { kind: "direct", id: peerId }
      };
      const route = resolveScopeRoute(scope);
      return {
        accountId,
        botLabel: channelRobotLabel(channelName, accountId),
        route,
        explicitBindingIndex: route.explicitBindingIndex,
        membershipText: accountId === defaultAccountId ? "当前挂在默认机器人上" : "当前挂在该机器人上",
        metaText: ""
      };
    });
    pushSlot({
      id: `${channelName}::direct::${peerId}`,
      title: `私聊 ${peerId}`,
      kind: "direct",
      channel: channelName,
      peer: { kind: "direct", id: peerId },
      badge: "私聊会话",
      summary: "这是配置里能稳定识别到的显式私聊会话。",
      lanes,
      acceptsRobotDrop: hasAccounts,
      allowFromPath: lanes.length === 1 ? accountIdPathForDm(channelName, lanes[0]?.accountId || "") : "",
      dmPolicyPath: lanes.length === 1 ? policyPathForDm(channelName, lanes[0]?.accountId || "") : "",
      defaultAgentId: lanes[0]?.route?.agentId || defaultAgentId,
      repairHint: "私聊改机器人后，原来的配对关系不一定能沿用，通常需要在新的机器人上重新配对。"
    });
  }

  for (const accountId of accountPool) {
    const merged = mergeChannelAccountConfig(channelName, accountId);
    const scope = {
      title: "私聊入口",
      channel: channelName,
      accountId
    };
    const route = resolveScopeRoute(scope);
    pushSlot({
      id: `${channelName}::dm::${accountId || "channel"}`,
      title: "私聊入口",
      kind: "dm",
      channel: channelName,
      badge: "私聊入口",
      summary:
        merged.allowFrom?.length > 0
          ? `allowFrom ${merged.allowFrom.join(", ")}`
          : `dmPolicy ${merged.dmPolicy || "pairing"}`,
      lanes: [
        {
          accountId,
          botLabel: channelRobotLabel(channelName, accountId),
          route,
          explicitBindingIndex: route.explicitBindingIndex,
          membershipText: accountId ? "该机器人默认私聊入口" : "通道默认私聊入口",
          metaText: ""
        }
      ],
      acceptsRobotDrop: false,
      allowFromPath: accountIdPathForDm(channelName, accountId),
      dmPolicyPath: policyPathForDm(channelName, accountId),
      defaultAgentId: route.agentId || defaultAgentId,
      repairHint: merged.dmPolicy === "pairing" ? "这是入口位，不是运行中会话列表。真正已配对的私聊会话属于运行态，切换机器人时通常需要重新配对。" : ""
    });
  }

  const groupIds = new Set(Object.keys(channelConfig.groups || {}));
  for (const accountId of accountIds) {
    for (const groupId of Object.keys(channelConfig.accounts?.[accountId]?.groups || {})) groupIds.add(groupId);
  }

  for (const groupId of [...groupIds].sort((a, b) => a.localeCompare(b))) {
    const lanes = [];
    for (const accountId of accountPool) {
      const source = effectiveGroupRuleSource(channelName, accountId, groupId);
      if (hasAccounts && source.source === "implicit") continue;
      const scope = {
        title: `群/会话 ${groupId}`,
        channel: channelName,
        accountId,
        peer: { kind: "group", id: groupId }
      };
      const route = resolveScopeRoute(scope);
      lanes.push({
        accountId,
        botLabel: channelRobotLabel(channelName, accountId),
        route,
        explicitBindingIndex: route.explicitBindingIndex,
        membershipText:
          source.source === "global"
            ? "来自渠道级 groups"
            : source.source === "account"
              ? "这是挂在该机器人名下的群规则"
              : "当前只在无账号通道模式下生效",
        metaText: ""
      });
    }
    if (lanes.length === 0) {
      if (!(explicitAccountCount > 1 && hasOwn(channelConfig.groups || {}, groupId))) continue;
      pushSlot({
        id: `${channelName}::group::${groupId}`,
        title: `群/会话 ${groupId}`,
        kind: "group",
        channel: channelName,
        peer: { kind: "group", id: groupId },
        badge: "群聊会话",
        summary: "当前群/会话入口",
        lanes: [],
        acceptsRobotDrop: false,
        requireMentionPath: `channels.${channelName}.groups.${groupId}.requireMention`,
        allowFromPath: `channels.${channelName}.groups.${groupId}.allowFrom`,
        requireMention: getAtPath(state.config, `channels.${channelName}.groups.${groupId}.requireMention`) !== false,
        defaultAgentId
      });
      continue;
    }
    const firstSource = effectiveGroupRuleSource(channelName, lanes[0]?.accountId || "", groupId);
    pushSlot({
      id: `${channelName}::group::${groupId}`,
      title: `群/会话 ${groupId}`,
      kind: "group",
      channel: channelName,
      peer: { kind: "group", id: groupId },
      badge: "群聊会话",
      summary: "当前群/会话入口",
      lanes,
      acceptsRobotDrop: hasAccounts,
      requireMentionPath: firstSource.requireMentionPath,
      allowFromPath: firstSource.allowFromPath,
      requireMention: firstSource.rule?.requireMention !== false,
      defaultAgentId: lanes[0]?.route?.agentId || defaultAgentId
    });
  }

  return slots;
}

function totalResolvedSessionCount() {
  return channelEntries().reduce((count, [channelName]) => count + buildChannelRouteSlots(channelName).length, 0);
}

function renderGuide() {
  return `
    <section class="section ${state.activeTab === "guide" ? "active" : ""}" data-section="guide">
      <div class="panel guide-hero-panel">
        <h3>原理导览</h3>
        <p>先认清括号层级，再去看字段内容。这里只讲结构顺序，不讲编辑动作。</p>
        <div class="guide-ladder">
          <span>头胸部 defaults / gateway / tools</span>
          <span>agents.list[]</span>
          <span>bindings</span>
          <span>channels.&lt;name&gt;</span>
          <span>accounts / groups / dm</span>
          <span>workspace/*.md</span>
        </div>
      </div>
      <div class="guide-grid">
        ${GUIDE_SECTIONS.map(
          (item) => `
            <article class="panel guide-card">
              <h3>${escapeHtml(item.title)}</h3>
              <p>${escapeHtml(item.text)}</p>
            </article>
          `
        ).join("")}
      </div>
    </section>
  `;
}

function renderAtlas() {
  return "";
}

function renderSubagentToggles(agent, index) {
  const candidates = agentList().filter((candidate) => candidate.id !== agent.id);
  return candidates.length === 0
    ? `<div class="notice">当前只有一个 agent，没有可配置的下级派工目标。</div>`
    : `<div class="tags">${candidates
        .map(
          (candidate) => `
            <label class="tag">
              <input type="checkbox" data-array-toggle="agents.list.${index}.subagents.allowAgents" data-value="${escapeHtml(
                candidate.id
              )}" ${(agent?.subagents?.allowAgents || []).includes(candidate.id) ? "checked" : ""} />
              ${escapeHtml(candidate.id)}
            </label>
          `
        )
        .join("")}</div>`;
}

function renderAgentCard(agent, index) {
  const childCount = (agent?.subagents?.allowAgents || []).length;
  const routeInfo = routeSummaryForAgent(agent.id);
  return `
    <article class="agent-card" data-agent-index="${index}" draggable="true" data-drag-kind="agent" data-drag-id="${escapeHtml(agent.id)}">
      <div class="agent-head">
        <div class="agent-title">
          <h4><span class="agent-badge">Agent ${index + 1}</span> ${escapeHtml(agent.name || agent.id || `agent-${index + 1}`)}</h4>
          <p>${escapeHtml(agent.workspace || state.config?.agents?.defaults?.workspace || "")}</p>
        </div>
        <div class="agent-actions">
          <button type="button" data-action="clone-agent" data-index="${index}">复制 agent</button>
          <span class="mini-note">旧编辑分支占位</span>
        </div>
      </div>
      <div class="agent-summary-grid">
        <div><small>主模型</small><strong>${escapeHtml(agent?.model?.primary || state.config?.agents?.defaults?.model?.primary || "继承默认")}</strong></div>
        <div><small>工具档位</small><strong>${escapeHtml(agent?.tools?.profile || state.config?.tools?.profile || "继承默认")}</strong></div>
        <div><small>工作区</small><strong>${escapeHtml(agent.workspace || state.config?.agents?.defaults?.workspace || "继承默认")}</strong></div>
        <div><small>当前路由</small><strong>${escapeHtml(routeInfo)}</strong></div>
      </div>
      <div class="tags">
        <span class="tag">ID ${escapeHtml(agent.id || `agent-${index + 1}`)}</span>
        <span class="tag">${agent.default ? "默认入口 agent" : "非默认入口"}</span>
        <span class="tag">可派工下级 ${escapeHtml(String(childCount))}</span>
      </div>
      <div class="form-grid">
        <label class="field"><span>Agent ID</span><input data-path="agents.list.${index}.id" value="${escapeHtml(
          stringValue(agent.id)
        )}" /></label>
        <label class="field"><span>显示名</span><input data-path="agents.list.${index}.name" value="${escapeHtml(
          stringValue(agent.name)
        )}" /></label>
        <label class="field"><span>工作区</span><input data-path="agents.list.${index}.workspace" value="${escapeHtml(
          stringValue(agent.workspace)
        )}" /></label>
        <label class="field"><span>Agent 状态目录</span><input data-path="agents.list.${index}.agentDir" value="${escapeHtml(
          stringValue(agent.agentDir)
        )}" /></label>
        <label class="field"><span>主模型</span><select data-path="agents.list.${index}.model.primary">${defaultModelOptions(
          agent?.model?.primary || ""
        )}</select></label>
        <label class="field"><span>回退模型</span><input data-csv-path="agents.list.${index}.model.fallbacks" value="${escapeHtml(
          csvValue(agent?.model?.fallbacks)
        )}" placeholder="provider/model-a, provider/model-b" /></label>
        <label class="field"><span>子 agent 默认模型</span><select data-path="agents.list.${index}.subagents.model.primary">${defaultModelOptions(
          agent?.subagents?.model?.primary || ""
        )}</select></label>
        <label class="field"><span>子 agent thinking</span><select data-path="agents.list.${index}.subagents.thinking">${optionsHtml(
          THINKING_OPTIONS,
          agent?.subagents?.thinking || ""
        )}</select></label>
        <label class="checkline"><input type="checkbox" data-bool-path="agents.list.${index}.default" data-bool-false="explicit" ${
          agent.default ? "checked" : ""
        } /><span>设为默认 agent</span></label>
        <label class="field"><span>身份名称</span><input data-path="agents.list.${index}.identity.name" value="${escapeHtml(
          stringValue(agent?.identity?.name)
        )}" /></label>
        <label class="field"><span>身份主题</span><input data-path="agents.list.${index}.identity.theme" value="${escapeHtml(
          stringValue(agent?.identity?.theme)
        )}" /></label>
        <label class="field"><span>Emoji</span><input data-path="agents.list.${index}.identity.emoji" value="${escapeHtml(
          stringValue(agent?.identity?.emoji)
        )}" /></label>
        <label class="field"><span>头像</span><input data-path="agents.list.${index}.identity.avatar" value="${escapeHtml(
          stringValue(agent?.identity?.avatar)
        )}" /></label>
        <label class="field"><span>群聊 mentionPatterns</span><input data-csv-path="agents.list.${index}.groupChat.mentionPatterns" value="${escapeHtml(
          csvValue(agent?.groupChat?.mentionPatterns)
        )}" placeholder="@bot, 小助手" /></label>
        <label class="field"><span>群聊历史条数</span><input type="number" data-number-path="agents.list.${index}.groupChat.historyLimit" value="${escapeHtml(
          stringValue(agent?.groupChat?.historyLimit)
        )}" /></label>
        <label class="field"><span>Heartbeat every</span><input data-path="agents.list.${index}.heartbeat.every" value="${escapeHtml(
          stringValue(agent?.heartbeat?.every)
        )}" placeholder="30m / 2h" /></label>
        <label class="field"><span>Heartbeat target</span><input data-path="agents.list.${index}.heartbeat.target" value="${escapeHtml(
          stringValue(agent?.heartbeat?.target)
        )}" /></label>
        <label class="field"><span>Heartbeat model</span><input data-path="agents.list.${index}.heartbeat.model" value="${escapeHtml(
          stringValue(agent?.heartbeat?.model)
        )}" /></label>
        <label class="field-wide"><span>Heartbeat prompt</span><textarea data-path="agents.list.${index}.heartbeat.prompt">${escapeHtml(
          stringValue(agent?.heartbeat?.prompt)
        )}</textarea></label>
      </div>
      <div class="notice">Skills 未在此界面细配。OpenClaw 规则是：不填 <code>agents.list[].skills</code> = 默认允许全部可用 skills；只有你真想做白名单限制时，才建议去“原始 JSON”里改。</div>
      <div class="panel">
        <h3>子 Agent 派工关系</h3>
        <p>这里才是 <code>subagents.allowAgents</code>。勾选谁，就代表当前 agent 被允许把任务派给哪个下级 agent。</p>
        ${renderSubagentToggles(agent, index)}
        <div class="tags">
          ${agentList()
            .filter((candidate) => candidate.id !== agent.id)
            .map(
              (candidate) => `
                <label class="tag">
                  ${escapeHtml(candidate.id)}${(agent?.subagents?.allowAgents || []).includes(candidate.id) ? " · 已授权" : ""}
                </label>
              `
            )
            .join("")}
        </div>
      </div>
      <div class="panel">
        <h3>权限与工具</h3>
        <p>如果只想快速控权，优先改 tool profile、allow/deny、sandbox 和 exec 四块。</p>
        <div class="form-grid">
          <label class="field"><span>tool profile</span><select data-path="agents.list.${index}.tools.profile">${optionsHtml(
            TOOL_PROFILE_OPTIONS,
            agent?.tools?.profile || ""
          )}</select></label>
          <label class="field"><span>allow</span><input data-csv-path="agents.list.${index}.tools.allow" value="${escapeHtml(
            csvValue(agent?.tools?.allow)
          )}" placeholder="web.fetch, fs, exec" /></label>
          <label class="field"><span>alsoAllow</span><input data-csv-path="agents.list.${index}.tools.alsoAllow" value="${escapeHtml(
            csvValue(agent?.tools?.alsoAllow)
          )}" placeholder="在 profile 基础上追加" /></label>
          <label class="field"><span>deny</span><input data-csv-path="agents.list.${index}.tools.deny" value="${escapeHtml(
            csvValue(agent?.tools?.deny)
          )}" placeholder="message.send, browser" /></label>
          <label class="field"><span>exec host</span><select data-path="agents.list.${index}.tools.exec.host">${optionsHtml(
            EXEC_HOST_OPTIONS,
            agent?.tools?.exec?.host || ""
          )}</select></label>
          <label class="field"><span>exec security</span><select data-path="agents.list.${index}.tools.exec.security">${optionsHtml(
            EXEC_SECURITY_OPTIONS,
            agent?.tools?.exec?.security || ""
          )}</select></label>
          <label class="field"><span>exec ask</span><select data-path="agents.list.${index}.tools.exec.ask">${optionsHtml(
            EXEC_ASK_OPTIONS,
            agent?.tools?.exec?.ask || ""
          )}</select></label>
          <label class="field"><span>exec safeBins</span><input data-csv-path="agents.list.${index}.tools.exec.safeBins" value="${escapeHtml(
            csvValue(agent?.tools?.exec?.safeBins)
          )}" placeholder="git, rg, ls" /></label>
          <label class="field"><span>exec timeoutSec</span><input type="number" data-number-path="agents.list.${index}.tools.exec.timeoutSec" value="${escapeHtml(
            stringValue(agent?.tools?.exec?.timeoutSec)
          )}" /></label>
          <label class="field"><span>sandbox.mode</span><select data-path="agents.list.${index}.sandbox.mode">${optionsHtml(
            SANDBOX_MODE_OPTIONS,
            agent?.sandbox?.mode || ""
          )}</select></label>
          <label class="field"><span>workspaceAccess</span><select data-path="agents.list.${index}.sandbox.workspaceAccess">${optionsHtml(
            SANDBOX_ACCESS_OPTIONS,
            agent?.sandbox?.workspaceAccess || ""
          )}</select></label>
          <label class="field"><span>sandbox.scope</span><select data-path="agents.list.${index}.sandbox.scope">${optionsHtml(
            SANDBOX_SCOPE_OPTIONS,
            agent?.sandbox?.scope || ""
          )}</select></label>
          <label class="field"><span>sessionToolsVisibility</span><select data-path="agents.list.${index}.sandbox.sessionToolsVisibility">${optionsHtml(
            SESSION_TOOLS_VISIBILITY,
            agent?.sandbox?.sessionToolsVisibility || ""
          )}</select></label>
          <label class="checkline"><input type="checkbox" data-bool-path="agents.list.${index}.tools.fs.workspaceOnly" ${
            agent?.tools?.fs?.workspaceOnly ? "checked" : ""
          } /><span>只允许文件系统访问 workspace</span></label>
          <label class="checkline"><input type="checkbox" data-bool-path="agents.list.${index}.tools.elevated.enabled" ${
            agent?.tools?.elevated?.enabled ? "checked" : ""
          } /><span>允许 elevated 模式</span></label>
        </div>
      </div>
    </article>
  `;
}

function renderBindings() {
  const bindings = state.config?.bindings || [];
  return `
    <div class="panel">
      <div class="bindings-header">
        <div>
          <h3>Bindings 路由</h3>
          <p>如果你要把不同频道/群/账号直接分配给不同 agent，这里比手改 JSON 直观得多。</p>
        </div>
        <button type="button" class="pill-button" data-action="add-binding">新增 binding</button>
      </div>
      <div class="binding-list">
        ${
          bindings.length === 0
            ? `<div class="notice">当前没有 bindings。多 agent 已可用，但还没有做渠道级路由分配。</div>`
            : bindings
                .map(
                  (binding, index) => `
                    <article class="binding-card" draggable="true" data-drag-kind="binding" data-drag-id="${index}">
                      <div class="binding-head">
                        <div class="binding-title">
                          <h4>${escapeHtml(binding.agentId || "未选 agent")}</h4>
                          <p>${escapeHtml(binding?.match?.channel || "未选 channel")}</p>
                        </div>
                        <div class="binding-actions">
                          <span class="mini-note">旧编辑分支占位</span>
                        </div>
                      </div>
                      <div class="form-grid">
                        <label class="field"><span>agentId</span><select data-path="bindings.${index}.agentId"><option value="">请选择</option>${agentList()
                          .map(
                            (agent) =>
                              `<option value="${escapeHtml(agent.id)}" ${
                                binding.agentId === agent.id ? "selected" : ""
                              }>${escapeHtml(agent.id)}</option>`
                          )
                          .join("")}</select></label>
                        <label class="field"><span>comment</span><input data-path="bindings.${index}.comment" value="${escapeHtml(
                          stringValue(binding.comment)
                        )}" /></label>
                        <label class="field"><span>channel</span><input data-path="bindings.${index}.match.channel" value="${escapeHtml(
                          stringValue(binding?.match?.channel)
                        )}" placeholder="telegram / feishu / discord" /></label>
                        <label class="field"><span>accountId</span><input data-path="bindings.${index}.match.accountId" value="${escapeHtml(
                          stringValue(binding?.match?.accountId)
                        )}" /></label>
                        <label class="field"><span>peer.kind</span><input data-path="bindings.${index}.match.peer.kind" value="${escapeHtml(
                          stringValue(binding?.match?.peer?.kind)
                        )}" placeholder="direct / group / channel / dm" /></label>
                        <label class="field"><span>peer.id</span><input data-path="bindings.${index}.match.peer.id" value="${escapeHtml(
                          stringValue(binding?.match?.peer?.id)
                        )}" /></label>
                        <label class="field"><span>guildId</span><input data-path="bindings.${index}.match.guildId" value="${escapeHtml(
                          stringValue(binding?.match?.guildId)
                        )}" /></label>
                        <label class="field"><span>teamId</span><input data-path="bindings.${index}.match.teamId" value="${escapeHtml(
                          stringValue(binding?.match?.teamId)
                        )}" /></label>
                        <label class="field-wide"><span>roles</span><input data-csv-path="bindings.${index}.match.roles" value="${escapeHtml(
                          csvValue(binding?.match?.roles)
                        )}" placeholder="admin, reviewer" /></label>
                      </div>
                    </article>
                  `
                )
                .join("")
        }
      </div>
    </div>
  `;
}

function renderAgents() {
  return "";
}

function renderChannelDefaultsCard() {
  const defaults = state.config?.channels?.defaults || {};
  return `
    <article class="agent-card">
      <div class="agent-head">
        <div class="agent-title">
          <h4>channels.defaults</h4>
          <p>这里是渠道层的全局默认准入模板。具体渠道没写时，会尽量继承这里；再没有，很多渠道会回落到更底层默认。</p>
        </div>
      </div>
      <div class="form-grid">
        <label class="field"><span><strong>dmPolicy</strong>：未填时大多数常见渠道默认为 pairing</span><select data-path="channels.defaults.dmPolicy">${optionsHtml(
          DM_POLICY_OPTIONS,
          defaults?.dmPolicy || ""
        )}</select></label>
        <label class="field"><span><strong>groupPolicy</strong>：未填时大多数常见渠道默认为 allowlist</span><select data-path="channels.defaults.groupPolicy">${optionsHtml(
          GROUP_POLICY_OPTIONS,
          defaults?.groupPolicy || ""
        )}</select></label>
        <label class="field"><span><strong>allowFrom</strong>：私聊白名单默认模板</span><input data-csv-path="channels.defaults.allowFrom" value="${escapeHtml(
          csvValue(defaults?.allowFrom)
        )}" /></label>
        <label class="field"><span><strong>groupAllowFrom</strong>：群聊白名单默认模板</span><input data-csv-path="channels.defaults.groupAllowFrom" value="${escapeHtml(
          csvValue(defaults?.groupAllowFrom)
        )}" /></label>
      </div>
    </article>
  `;
}

function renderChannelGroups(name, groups) {
  const entries = Object.entries(groups || {});
  return `
    <div class="panel">
      <div class="bindings-header">
        <div>
          <h3>群 / 会话规则</h3>
          <p>这里是当前渠道的细粒度群规则。常见项是 <code>requireMention</code>，表示群里必须 @ 机器人才响应。</p>
        </div>
        <button type="button" class="pill-button" data-action="add-group" data-channel="${escapeHtml(name)}">新增群规则</button>
      </div>
      <div class="binding-list">
        ${
          entries.length === 0
            ? `<div class="notice">当前没有针对具体群/会话的单独规则。</div>`
            : entries
                .map(
                  ([groupId, rule]) => `
                    <article class="binding-card" draggable="true" data-drag-kind="group" data-drag-id="${escapeHtml(`${name}::${groupId}`)}">
                      <div class="binding-head">
                        <div class="binding-title">
                          <h4>${escapeHtml(groupId)}</h4>
                          <p>这是该渠道下某个具体群/会话的覆盖项。</p>
                        </div>
                        <div class="binding-actions">
                          <span class="mini-note">旧编辑分支占位</span>
                        </div>
                      </div>
                      <div class="form-grid">
                        <label class="field"><span>群 / 会话 ID</span><input data-group-key-path="channels.${name}.groups" data-group-key-old="${escapeHtml(
                          groupId
                        )}" value="${escapeHtml(groupId)}" /></label>
                        <label class="checkline"><input type="checkbox" data-bool-path="channels.${name}.groups.${groupId}.requireMention" data-bool-false="explicit" ${
                          rule?.requireMention ? "checked" : ""
                        } /><span>必须 @ 才响应</span></label>
                        <label class="field-wide"><span>该群完整规则 JSON</span><textarea data-json-path="channels.${name}.groups.${groupId}">${escapeHtml(
                          JSON.stringify(rule || {}, null, 2)
                        )}</textarea></label>
                      </div>
                    </article>
                  `
                )
                .join("")
        }
      </div>
    </div>
  `;
}

function renderChannelAccountCard(channelName, accountId, accountConfig, isDefaultAccount) {
  const providerFields = CHANNEL_FIELD_MAP[channelName] || [];
  const basePath = `channels.${channelName}.accounts.${accountId}`;
  const excludeKeys = new Set([
    ...providerFields.map((field) => field.path),
    "dmPolicy",
    "groupPolicy",
    "allowFrom",
    "groupAllowFrom",
    "groups"
  ]);
  return `
    <article class="binding-card">
      <div class="binding-head">
        <div class="binding-title">
          <h4>${escapeHtml(accountId)}</h4>
          <p>${escapeHtml(
            `${isDefaultAccount ? "默认账号" : "账号覆盖"} · 生效私聊策略 ${effectiveAccountDmPolicy(channelName, accountId) || "未设置"} · 群聊策略 ${
              effectiveAccountGroupPolicy(channelName, accountId) || "未设置"
            }`
          )}</p>
        </div>
      </div>
      <div class="form-grid">
        <label class="field"><span>accountId</span><input data-object-key-path="channels.${channelName}.accounts" data-object-key-old="${escapeHtml(
          accountId
        )}" value="${escapeHtml(accountId)}" /></label>
        ${providerFields
          .map(
            (field) => `
              <label class="field">
                <span><strong>${escapeHtml(field.path)}</strong>：${escapeHtml(field.help)}</span>
                <input data-path="${escapeHtml(`${basePath}.${field.path}`)}" value="${escapeHtml(stringValue(accountConfig?.[field.path]))}" ${
              field.sensitive ? 'placeholder="敏感字段，分享前会脱敏"' : ""
            } />
              </label>
            `
          )
          .join("")}
        <label class="field"><span>dmPolicy</span><select data-path="${escapeHtml(`${basePath}.dmPolicy`)}">${optionsHtml(
          DM_POLICY_OPTIONS,
          accountConfig?.dmPolicy || ""
        )}</select></label>
        <label class="field"><span>groupPolicy</span><select data-path="${escapeHtml(`${basePath}.groupPolicy`)}">${optionsHtml(
          GROUP_POLICY_OPTIONS,
          accountConfig?.groupPolicy || ""
        )}</select></label>
        <label class="field"><span>allowFrom</span><input data-csv-path="${escapeHtml(`${basePath}.allowFrom`)}" value="${escapeHtml(
          csvValue(accountConfig?.allowFrom)
        )}" placeholder="账号级私聊白名单" /></label>
        <label class="field"><span>groupAllowFrom</span><input data-csv-path="${escapeHtml(`${basePath}.groupAllowFrom`)}" value="${escapeHtml(
          csvValue(accountConfig?.groupAllowFrom)
        )}" placeholder="账号级群白名单" /></label>
      </div>
      ${renderDynamicConfigFieldGrid(channelName, "account", accountConfig, basePath, excludeKeys)}
      <label class="field-wide"><span>groups：账号级群规则 JSON</span><textarea data-json-path="${escapeHtml(
        `${basePath}.groups`
      )}">${escapeHtml(JSON.stringify(accountConfig?.groups || {}, null, 2))}</textarea></label>
    </article>
  `;
}

function renderChannelAccounts(name, config) {
  const entries = Object.entries(config?.accounts || {});
  if (entries.length === 0) return "";
  const defaultAccountId = resolveChannelDefaultAccountId(name);
  return `
    <div class="panel">
      <div class="bindings-header">
        <div>
          <h3>账号覆盖</h3>
          <p>多账号渠道在这里细分各自凭据、准入策略和群规则。这里补上了比整段 JSON 更细的字段级编辑。</p>
        </div>
        <button type="button" class="pill-button" data-action="add-account" data-channel="${escapeHtml(name)}">新增账号</button>
      </div>
      <div class="binding-list">
        ${entries.map(([accountId, accountConfig]) => renderChannelAccountCard(name, accountId, accountConfig, accountId === defaultAccountId)).join("")}
      </div>
    </div>
  `;
}

function renderChannelCard(name, config) {
  const providerFields = CHANNEL_FIELD_MAP[name] || [];
  const effectiveDm = config?.dmPolicy || "pairing（默认）";
  const effectiveGroup = config?.groupPolicy || "allowlist（默认）";
  const targets = effectiveTargetAgentsForChannel(name);
  const handledKeys = new Set([
    "enabled",
    "dmPolicy",
    "groupPolicy",
    "allowFrom",
    "groupAllowFrom",
    "accounts",
    "groups",
    ...providerFields.map((field) => field.path)
  ]);
  return `
    <article class="agent-card channel-card" draggable="true" data-drag-kind="channel" data-drag-id="${escapeHtml(name)}">
      <div class="agent-head">
        <div class="agent-title">
          <h4>${escapeHtml(name)}</h4>
          <p>先解决“能不能接进来”，再解决“进来以后交给谁”。当前有效私聊策略：${escapeHtml(
            effectiveDm
          )}；群聊策略：${escapeHtml(effectiveGroup)}。</p>
        </div>
        <div class="agent-actions">
          <span class="mini-note">旧编辑分支占位</span>
        </div>
      </div>
      <div class="agent-summary-grid channel-summary-grid">
        <div><small>状态</small><strong>${escapeHtml(truthyLabel(config?.enabled === true, ["已启用", "未启用"]))}</strong></div>
        <div><small>凭据填写</small><strong>${escapeHtml(describeChannelCredentialState(name, config))}</strong></div>
        <div><small>有效流向</small><strong>${escapeHtml(targets.join(", ") || "默认入口")}</strong></div>
        <div><small>群规则数</small><strong>${escapeHtml(String(Object.keys(config?.groups || {}).length))}</strong></div>
      </div>
      <div class="panel">
        <h3>连接与凭据</h3>
        <p>这一组字段决定该渠道能不能接进来。敏感字段在脱敏模板导出时会自动替换。</p>
        <div class="form-grid">
          <label class="checkline"><input type="checkbox" data-bool-path="channels.${name}.enabled" data-bool-false="explicit" ${
            config?.enabled ? "checked" : ""
          } /><span><strong>enabled</strong>：${escapeHtml(CHANNEL_EXPLANATIONS.enabled)}</span></label>
          ${providerFields
            .map(
              (field) => `
                <label class="field">
                  <span><strong>${escapeHtml(field.path)}</strong>：${escapeHtml(field.help)}</span>
                  <input data-path="channels.${name}.${field.path}" value="${escapeHtml(stringValue(config?.[field.path]))}" ${
                field.sensitive ? 'placeholder="敏感字段，分享前会脱敏"' : ""
              } />
                </label>
              `
            )
            .join("")}
        </div>
        ${renderDynamicConfigFieldGrid(name, "channel", config, `channels.${name}`, handledKeys)}
      </div>
      <div class="panel">
        <h3>准入控制</h3>
        <p>先决定“谁能触发这个渠道”，再去 Bindings 决定触发后交给谁。这里没写时，很多渠道会回落到 <code>pairing</code> 和 <code>allowlist</code>。</p>
        <div class="form-grid">
          <label class="field"><span><strong>dmPolicy</strong>：${escapeHtml(CHANNEL_EXPLANATIONS.dmPolicy)}</span><select data-path="channels.${name}.dmPolicy">${optionsHtml(
            DM_POLICY_OPTIONS,
            config?.dmPolicy || ""
          )}</select></label>
          <label class="field"><span><strong>groupPolicy</strong>：${escapeHtml(CHANNEL_EXPLANATIONS.groupPolicy)}</span><select data-path="channels.${name}.groupPolicy">${optionsHtml(
            GROUP_POLICY_OPTIONS,
            config?.groupPolicy || ""
          )}</select></label>
          <label class="field"><span><strong>allowFrom</strong>：${escapeHtml(CHANNEL_EXPLANATIONS.allowFrom)}</span><input data-csv-path="channels.${name}.allowFrom" value="${escapeHtml(
            csvValue(config?.allowFrom)
          )}" placeholder="用户 ID 白名单" /></label>
          <label class="field"><span><strong>groupAllowFrom</strong>：${escapeHtml(CHANNEL_EXPLANATIONS.groupAllowFrom)}</span><input data-csv-path="channels.${name}.groupAllowFrom" value="${escapeHtml(
            csvValue(config?.groupAllowFrom)
          )}" placeholder="群/会话 ID 白名单" /></label>
        </div>
      </div>
      ${renderChannelAccounts(name, config)}
      ${renderChannelGroups(name, config?.groups || {})}
      <div class="panel">
        <h3>高级 JSON</h3>
        <p>界面里还没单独建表单的嵌套字段，可以先在这里改。</p>
        <label class="field-wide"><span>channel JSON</span><textarea data-json-path="channels.${name}">${escapeHtml(
          JSON.stringify(config || {}, null, 2)
        )}</textarea></label>
      </div>
    </article>
  `;
}

function renderChannels() {
  return "";
}

function renderBackups() {
  return `
    <section class="section ${state.activeTab === "backups" ? "active" : ""}" data-section="backups">
      <div class="backup-page-layout">
        <article class="panel backup-card">
          <div class="backup-card-head">
            <div>
              <h3>备份卡片</h3>
              <p>这里只会创建或删除备份副本，不会改动当前 <code>openclaw.json</code> 和工作区。</p>
            </div>
            <button type="button" class="primary pill-button" data-action="create-backup">立即创建备份</button>
          </div>
          <div class="backup-count-line">
            <span>备份数量</span>
            <strong>${escapeHtml(String(state.backups.length))}</strong>
          </div>
          <div class="backup-preview-shell">
            ${
              state.backups.length > 0
                ? `
                  <div class="backup-record-list">
                    ${state.backups
                      .map(
                        (backup) => `
                          <article class="backup-record-card">
                            <div class="backup-record-copy">
                              <strong>${escapeHtml(backup.id)}</strong>
                              <span>${escapeHtml(backup.summary.configPath || "")}</span>
                            </div>
                            <button type="button" class="danger" data-action="delete-backup" data-backup-id="${escapeHtml(backup.id)}">删除</button>
                          </article>
                        `
                      )
                      .join("")}
                  </div>
                `
                : `<div class="backup-preview-empty">当前还没有备份包</div>`
            }
          </div>
        </article>
        <article class="raw-card backup-raw-card">
          <h3>原始 JSON</h3>
          <p>这里只读展示当前磁盘上的 <code>openclaw.json</code>。</p>
          <pre class="readonly-code-block raw-json-block">${escapeHtml(state.rawEditor)}</pre>
        </article>
        <article class="panel backup-share-card">
          <h3>分享与建议</h3>
          <div class="hint-list">
            <div><strong>推荐分享：</strong>脱敏模板包或备份包名称。</div>
            <div><strong>不要直发：</strong>真实密钥、账号 ID、群 ID、原始工作区内容。</div>
            <div><strong>官方资料：</strong> ${DOC_LINKS.map((item) => `<a href="${item.href}" target="_blank" rel="noreferrer">${escapeHtml(item.label)}</a>`).join(" · ")}</div>
          </div>
        </article>
      </div>
    </section>
  `;
}

function renderWorkspaceCard(workspace) {
  return `
    <article class="workspace-card">
      <div class="workspace-head">
        <div>
          <h3>${escapeHtml(workspace.path)}</h3>
          <p>绑定 agent: ${escapeHtml(workspace.agentIds.join(", ") || "defaults")} · MD 文件 ${escapeHtml(
            String((workspace.files || []).filter((file) => file.exists).length)
          )}${workspace.localSkills?.length ? ` · local skills: ${escapeHtml(workspace.localSkills.join(", "))}` : ""}</p>
        </div>
      </div>
      <div class="workspace-file-grid">
        ${workspace.files
          .map(
            (file) => `
              <article class="workspace-file-card ${file.exists ? "" : "workspace-file-missing"}">
                <div class="workspace-file-head">
                  <strong>${escapeHtml(file.name)}</strong>
                  <span>${escapeHtml(file.exists ? "已发现" : "未发现")}</span>
                </div>
                <div class="workspace-file-help">${escapeHtml(WORKSPACE_FILE_HELP[file.name] || "自动扫描到的 Markdown 文件。")}</div>
                <pre class="readonly-code-block workspace-code-block">${escapeHtml(file.content || "")}</pre>
              </article>
            `
          )
          .join("")}
      </div>
    </article>
  `;
}

function renderWorkspaces() {
  return `
    <section class="section ${state.activeTab === "workspaces" ? "active" : ""}" data-section="workspaces">
      <div class="panel">
        <div class="workspace-header">
          <div>
            <h3>工作区与 Markdown 文件</h3>
            <p>自动扫描每个工作区及其当前存在的 <code>.md</code> 文件，只读展示。增减文件后，用顶部固定的重新载入更新即可。</p>
          </div>
          <div class="notice">当前共 ${state.workspaces.length} 个工作区</div>
        </div>
      </div>
      <div class="workspace-list">${state.workspaces.map(renderWorkspaceCard).join("")}</div>
    </section>
  `;
}

function renderRaw() {
  return "";
}

function drawLobsterConnections() {
  const shell = document.querySelector(".lobster-shell");
  const svg = document.querySelector(".lobster-routes");
  if (!shell || !svg) return;

  const shellRect = shell.getBoundingClientRect();
  const links = [...document.querySelectorAll(".session-link[data-session-target-agent]")];
  const paths = [];

  for (const link of links) {
    const targetAgentId = link.dataset.sessionTargetAgent || "";
    const source = link.querySelector("[data-link-source]");
    const target = document.querySelector(`[data-agent-anchor="${CSS.escape(targetAgentId)}"]`);
    if (!source || !target) continue;

    const sourceRect = source.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const side = link.dataset.linkSide || "left";
    const colorIndex = Number(link.dataset.linkColor || 0) % 7;

    const startX = side === "left" ? sourceRect.right - shellRect.left : sourceRect.left - shellRect.left;
    const startY = sourceRect.top + sourceRect.height / 2 - shellRect.top;
    const endX = side === "left" ? targetRect.left - shellRect.left : targetRect.right - shellRect.left;
    const endY = targetRect.top + targetRect.height / 2 - shellRect.top;
    const delta = Math.max(56, Math.abs(endX - startX) * 0.35);
    const control1X = side === "left" ? startX + delta : startX - delta;
    const control2X = side === "left" ? endX - delta : endX + delta;

    paths.push(`
      <path class="direct-route direct-route-${colorIndex}" d="M ${startX} ${startY} C ${control1X} ${startY}, ${control2X} ${endY}, ${endX} ${endY}" />
    `);
  }

  svg.setAttribute("viewBox", `0 0 ${Math.max(1, Math.round(shellRect.width))} ${Math.max(1, Math.round(shellRect.height))}`);
  svg.innerHTML = paths.join("");
}

function elementOverflowing(element) {
  return element.scrollWidth - element.clientWidth > 1 || element.scrollHeight - element.clientHeight > 1;
}

function shouldSkipFit(element) {
  return Boolean(
    element.closest(
      '[data-fixed-text="true"], pre, code, textarea, input, select, option, .readonly-code-block, .session-link-bot-icon'
    )
  );
}

function fitTextGroup(selector, { min = 9, max = 11 } = {}) {
  for (const element of document.querySelectorAll(selector)) {
    if (shouldSkipFit(element)) continue;
    if (!element.isConnected) continue;
    element.style.fontSize = `${max}px`;
    element.dataset.fitState = "";
    const text = element.textContent?.trim() || "";
    if (text && !element.getAttribute("title")) element.setAttribute("title", text);
    let size = max;
    while (size > min && elementOverflowing(element)) {
      size -= 0.5;
      element.style.fontSize = `${size}px`;
    }
    if (elementOverflowing(element)) element.dataset.fitState = "clamped";
  }
}

function fitLobsterText() {
  fitTextGroup(
    [
      ".lobster-board .legend-chip",
      ".lobster-board .lobster-core-head strong",
      ".lobster-board .lobster-segment-head strong",
      ".lobster-board .lobster-limb-head strong",
      ".lobster-board .channel-robot-head strong",
      ".lobster-board .channel-robot-head span",
      ".lobster-board .session-card-head strong"
    ].join(", "),
    { min: 8.5, max: 10 }
  );
  fitTextGroup(
    [
      ".lobster-board .legend-arrow",
      ".lobster-board .lobster-core-head span",
      ".lobster-board .lobster-limb-head span",
      ".lobster-board .lobster-segment-head span",
      ".lobster-board .lobster-limb-title span",
      ".lobster-board .lobster-limb-meta-card span",
      ".lobster-board .lobster-limb-meta-card strong",
      ".lobster-board .layer-badge strong",
      ".lobster-board .layer-badge span",
      ".lobster-board .session-card-path",
      ".lobster-board .compact-fact small",
      ".lobster-board .compact-fact strong",
      ".lobster-board .lobster-readonly-value"
    ].join(", "),
    { min: 8, max: 9 }
  );
}

function fitAppText() {
  fitTextGroup(
    [
      "#app h1",
      "#app h2",
      "#app h3",
      "#app h4",
      "#app h5",
      "#app h6",
      "#app .status-pill",
      "#app .nav button",
      "#app .toolbar button",
      "#app .session-link-name",
      "#app .channel-robot-head strong",
      "#app .channel-robot-head span",
      "#app .route-slot-head strong",
      "#app .panel button",
      "#app .sidebar button"
    ].join(", "),
    { min: 8, max: 10 }
  );
  fitTextGroup(
    [
      "#app p",
      "#app small",
      "#app li",
      "#app a",
      "#app .sidebar-meta",
      "#app .hero-copy p",
      "#app .channel-robot-path",
      "#app .session-link-rule",
      "#app .session-link-meta",
      "#app .compact-fact small",
      "#app .compact-fact-value",
      "#app .lobster-readonly-value",
      "#app .lobster-limb-title span",
      "#app .lobster-limb-meta-card span",
      "#app .lobster-limb-meta-card strong",
      "#app .route-slot-head span",
      "#app .session-card-path"
    ].join(", "),
    { min: 7, max: 9 }
  );
  fitLobsterText();
}

function render() {
  try {
    if (!state.loaded && !state.message) {
      app.innerHTML = `<div class="loading">正在载入 OpenClaw 配置…</div>`;
      return;
    }

    if (!state.loaded && state.message) {
      app.innerHTML = `<div class="empty-state"><h2>加载失败</h2><p>${escapeHtml(state.message.text)}</p><button class="pill-button" id="reload-state">重试</button></div>`;
      document.querySelector("#reload-state")?.addEventListener("click", loadState);
      return;
    }

    app.innerHTML = `
      <div class="shell">
        <aside class="sidebar">
          <div class="brand">
            <h1>OpenClaw Config Atlas</h1>
            <p>专门给 <code>openclaw.json</code>、多 agent 层级和工作区 Markdown 用的只读结构图谱。</p>
          </div>
          <div class="nav">
            <button class="${state.activeTab === "lobster" ? "active" : ""}" data-tab="lobster">龙虾画布</button>
            <button class="${state.activeTab === "workspaces" ? "active" : ""}" data-tab="workspaces">工作区文件</button>
            <button class="${state.activeTab === "guide" ? "active" : ""}" data-tab="guide">原理导览</button>
            <button class="${state.activeTab === "backups" ? "active" : ""}" data-tab="backups">备份 / JSON / 分享</button>
          </div>
          <div class="sidebar-meta">
            ${renderSidebarPath("配置文件", state.info?.configPath || "")}
            ${renderSidebarPath("备份目录", state.info?.backupsDir || "")}
          </div>
        </aside>
        <main class="main">
          <section class="hero">
            <div class="hero-top">
              <div class="hero-copy">
                <div class="status-pill ${state.message?.kind === "error" ? "error" : ""}">${
                  state.busy ? "处理中…" : state.message?.text || "已载入当前配置"
                }</div>
                <h2>OpenClaw Config Atlas</h2>
                <p>水墨黑金风的只读结构图谱，专门用来看配置层级、会话关系、工作区文件与备份。</p>
              </div>
              <div class="toolbar">
                ${TOOLBAR_ACTIONS.map(
                  (item) => `
                    <div class="toolbar-item">
                      <button
                        type="button"
                        class="${escapeHtml(item.tone || "")}"
                        data-action="${escapeHtml(item.action)}"
                        title="${escapeHtml(item.meaning)}"
                      >${escapeHtml(item.label)}</button>
                    </div>
                  `
                ).join("")}
              </div>
            </div>
          </section>
          ${renderLobsterStudio()}
          ${renderWorkspaces()}
          ${renderGuide()}
          ${renderBackups()}
        </main>
      </div>
    `;

    bindEvents();
    requestAnimationFrame(drawLobsterConnections);
    requestAnimationFrame(fitAppText);
    setTimeout(drawLobsterConnections, 80);
    setTimeout(fitAppText, 120);
  } catch (error) {
    state.message = { kind: "error", text: `前端渲染失败：${String(error.message || error)}` };
    state.loaded = false;
    app.innerHTML = `<div class="empty-state"><h2>前端渲染失败</h2><p>${escapeHtml(String(error.message || error))}</p><button class="pill-button" id="reload-state">重试</button></div>`;
    document.querySelector("#reload-state")?.addEventListener("click", loadState);
  }
}

function updateWorkspaceFile(workspacePath, name, content) {
  const workspace = state.workspaces.find((item) => item.path === workspacePath);
  if (!workspace) return;
  const file = workspace.files.find((item) => item.name === name);
  if (!file) return;
  file.content = content;
}

function cloneAgent(index) {
  const source = structuredClone(agentList()[index]);
  source.id = `${source.id || "agent"}-copy`;
  source.name = source.name ? `${source.name} Copy` : "";
  source.default = false;
  agentList().splice(index + 1, 0, source);
}

function setDefaultAgent(agentIndex, checked) {
  const agents = agentList();
  if (!agents[agentIndex]) return;
  if (checked) {
    agents.forEach((agent, index) => {
      agent.default = index === agentIndex;
    });
    return;
  }

  const currentDefaultCount = agents.filter((agent) => agent.default === true).length;
  if (currentDefaultCount <= 1 && agents[agentIndex].default === true) {
    showMessage("error", "至少需要保留一个默认入口 agent。");
    return;
  }
  agents[agentIndex].default = false;
  normalizeDefaultAgentSelection();
}

function normalizeDefaultAgentSelection() {
  const agents = agentList();
  if (agents.length === 0) return;
  if (agents.some((agent) => agent.default === true)) return;
  agents[0].default = true;
}

function addAgent() {
  agentList().push({
    id: `agent-${agentList().length + 1}`,
    workspace: state.config?.agents?.defaults?.workspace || "",
    model: {},
    tools: {},
    sandbox: {},
    subagents: {},
    identity: {},
    heartbeat: {},
    groupChat: {}
  });
}

function addChannel() {
  state.config.channels ??= {};
  let index = channelEntries().length + 1;
  let channelName = `channel-${index}`;
  while (state.config.channels[channelName]) {
    index += 1;
    channelName = `channel-${index}`;
  }
  state.config.channels[channelName] = {
    enabled: false,
    dmPolicy: state.config?.channels?.defaults?.dmPolicy,
    groupPolicy: state.config?.channels?.defaults?.groupPolicy
  };
  syncDerivedState();
  render();
}

function addChannelAccount(channelName) {
  if (!channelName) return;
  const accounts = structuredClone(getAtPath(state.config, `channels.${channelName}.accounts`) || {});
  let index = Object.keys(accounts).length + 1;
  let accountId = `account-${index}`;
  while (accounts[accountId]) {
    index += 1;
    accountId = `account-${index}`;
  }
  accounts[accountId] = {
    dmPolicy: getAtPath(state.config, `channels.${channelName}.dmPolicy`) || state.config?.channels?.defaults?.dmPolicy,
    groupPolicy: getAtPath(state.config, `channels.${channelName}.groupPolicy`) || state.config?.channels?.defaults?.groupPolicy
  };
  setAtPath(state.config, `channels.${channelName}.accounts`, accounts);
  syncDerivedState();
  render();
}

function addChannelGroup(channelName) {
  if (!channelName) return;
  const groups = structuredClone(getAtPath(state.config, `channels.${channelName}.groups`) || {});
  let index = Object.keys(groups).length + 1;
  let groupId = `group-${index}`;
  while (groups[groupId]) {
    index += 1;
    groupId = `group-${index}`;
  }
  groups[groupId] = { requireMention: GROUP_REQUIRE_MENTION_DOC_DEFAULT };
  setAtPath(state.config, `channels.${channelName}.groups`, groups);
  syncDerivedState();
  render();
}

function removeAgentByIndex(index, options = {}) {
  const target = agentList()[index];
  if (!target) return;
  if (agentList().length <= 1) {
    showMessage("error", "至少需要保留一个 agent，不能删除最后一个。");
    return;
  }
  const ok =
    options.skipConfirm === true ||
    window.confirm(`确认删除 agent “${target.id}”吗？这会同时清理它在 bindings 和上级派工关系里的引用。`);
  if (!ok) return;

  const targetId = target.id;
  state.config.agents.list.splice(index, 1);

  for (const agent of agentList()) {
    const next = (agent?.subagents?.allowAgents || []).filter((id) => id !== targetId);
    if (next.length > 0) {
      agent.subagents ??= {};
      agent.subagents.allowAgents = next;
    } else if (agent.subagents) {
      delete agent.subagents.allowAgents;
    }
  }

  state.config.bindings = (state.config.bindings || []).filter((binding) => binding.agentId !== targetId);
  normalizeDefaultAgentSelection();
  syncDerivedState();
  showMessage("info", `已删除 agent ${targetId}。`);
}

function addBinding() {
  state.config.bindings.push({
    agentId: agentList()[0]?.id || "",
    match: {
      channel: ""
    }
  });
}

function removeChannelByName(name, options = {}) {
  if (!name) return;
  const ok =
    options.skipConfirm === true ||
    window.confirm(`确认删除渠道 “${name}”吗？这会移除该渠道下的凭据和策略配置。`);
  if (!ok) return;
  const nextChannels = { ...(state.config.channels || {}) };
  delete nextChannels[name];
  state.config.channels = nextChannels;
  syncDerivedState();
  showMessage("info", `已删除渠道 ${name}。`);
}

function deleteDraggedItem(payload) {
  if (!payload?.kind) return;
  if (payload.kind === "agent") {
    const index = agentList().findIndex((agent) => agent.id === payload.id);
    if (index >= 0) removeAgentByIndex(index, { skipConfirm: true });
    return;
  }
  if (payload.kind === "channel") {
    removeChannelByName(payload.id, { skipConfirm: true });
    return;
  }
  if (payload.kind === "binding") {
    const index = Number(payload.id);
    if (Number.isInteger(index) && state.config.bindings[index]) {
      state.config.bindings.splice(index, 1);
      syncDerivedState();
      showMessage("info", "已从当前草稿删除一个 binding。");
      render();
    }
    return;
  }
  if (payload.kind === "group") {
    const [channel, groupId] = String(payload.id).split("::");
    if (!channel || !groupId) return;
    const groups = { ...(getAtPath(state.config, `channels.${channel}.groups`) || {}) };
    delete groups[groupId];
    setAtPath(state.config, `channels.${channel}.groups`, Object.keys(groups).length > 0 ? groups : undefined);
    syncDerivedState();
    showMessage("info", `已从当前草稿删除 ${channel} 的群规则 ${groupId}。`);
    render();
    return;
  }
  if (payload.kind === "route-slot" && payload.scope) {
    setScopeBindingTarget(payload.scope, "");
    return;
  }
  if (payload.kind === "session-link" && payload.scope) {
    setScopeBindingTarget(payload.scope, "");
  }
}

function openSaveConfirm(restart) {
  const summary = summarizeSaveConfirmation(restart);
  if (!summary.dirty) {
    showMessage("info", "当前没有待保存的草稿改动。");
    return;
  }
  state.confirmSave = { summary };
  render();
}

function closeSaveConfirm() {
  state.confirmSave = null;
  render();
}

function renameObjectKey(parentPath, oldKey, newKey) {
  const container = getAtPath(state.config, parentPath) || {};
  const trimmed = (newKey || "").trim();
  if (!trimmed || trimmed === oldKey) return;
  if (Object.prototype.hasOwnProperty.call(container, trimmed)) {
    showMessage("error", `目标键 ${trimmed} 已存在，未重命名。`);
    return;
  }
  const next = { ...container };
  next[trimmed] = next[oldKey];
  delete next[oldKey];
  setAtPath(state.config, parentPath, next);
  syncDerivedState();
  render();
}

function bindEvents() {
  document.querySelectorAll("[data-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeTab = button.dataset.tab;
      render();
    });
  });

  document.querySelectorAll("[data-backup-select]").forEach((element) => {
    element.addEventListener("change", async () => {
      await previewBackup(element.value.trim());
    });
  });

  document.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", async () => {
      button.classList.remove("button-flash");
      void button.offsetWidth;
      button.classList.add("button-flash");
      const action = button.dataset.action;
      if (action === "reload") {
        await loadState();
        return;
      }
      if (action === "export-template") {
        await exportTemplate();
        return;
      }
      if (action === "create-backup") {
        await createBackupNow();
        return;
      }
      if (action === "delete-backup") {
        await deleteBackupById(button.dataset.backupId);
        return;
      }
    });
  });
}

async function validateOnly() {
  state.busy = true;
  render();
  try {
    const payload = await api("/api/validate", {
      method: "POST",
      body: JSON.stringify({ config: cleanConfig(state.config) })
    });
    showMessage("info", `校验通过：${payload.payload?.path || state.info?.configPath || "candidate config"}`);
  } catch (error) {
    showMessage("error", `校验失败：${error.message}`);
  } finally {
    state.busy = false;
    render();
  }
}

async function saveConfig(restart) {
  state.busy = true;
  state.confirmSave = null;
  render();
  try {
    const payload = await api("/api/save", {
      method: "POST",
      body: JSON.stringify({
        config: cleanConfig(state.config),
        workspaceFiles: collectWorkspaceEdits(),
        workspacePlan: buildWorkspacePlan(),
        restart
      })
    });
    const restartText =
      restart && payload.restart
        ? payload.restart.ok
          ? "，并已触发网关重启"
          : `，但网关重启失败：${payload.restart.payload?.error || payload.restart.stderr || payload.restart.stdout || "unknown error"}`
        : "";
    const backupId = String(payload.backupDir || "").split("/").pop() || "latest";
    await loadState();
    state.message = { kind: "info", text: `已保存，并生成配置备份 ${backupId}${restartText}` };
    render();
  } catch (error) {
    showMessage("error", `保存失败：${error.message}`);
    state.busy = false;
    render();
  }
}

async function loadBackups() {
  const payload = await api("/api/backups");
  state.backups = payload.backups || [];
}

async function deleteBackupById(backupId) {
  const ok = window.confirm(`确认删除备份 ${backupId} 吗？删除后不能恢复。`);
  if (!ok) return;
  state.busy = true;
  render();
  try {
    const payload = await api(`/api/backups/${encodeURIComponent(backupId)}`, {
      method: "DELETE"
    });
    state.backups = payload.backups || [];
    showMessage("info", `已删除备份 ${backupId}`);
  } catch (error) {
    showMessage("error", `删除备份失败：${error.message}`);
  } finally {
    state.busy = false;
    render();
  }
}

async function createBackupNow() {
  state.busy = true;
  render();
  try {
    const payload = await api("/api/backups/create", { method: "POST", body: "{}" });
    await loadBackups();
    const backupId = String(payload.backupDir || "").split("/").pop();
    if (backupId) {
      state.activeTab = "backups";
      try {
        await saveStudioSettings({ lastActiveTab: "backups" }, { silent: true });
      } catch {
        // Keep backup creation working even if UI settings fail.
      }
      showMessage("info", `已创建配置备份 ${backupId}。`);
      return;
    }
    showMessage("info", `已创建配置备份。`);
  } catch (error) {
    showMessage("error", `创建备份失败：${error.message}`);
  } finally {
    state.busy = false;
    render();
  }
}

async function restoreBackupById(backupId) {
  const ok = window.confirm(`确认恢复到备份 ${backupId} 吗？恢复前系统会先给当前状态再打一份保护性备份。`);
  if (!ok) return;
  state.busy = true;
  render();
  try {
    const payload = await api(`/api/backups/${encodeURIComponent(backupId)}/restore`, {
      method: "POST",
      body: "{}"
    });
    await loadState();
    showMessage("info", `已恢复备份 ${backupId}；当前状态保护性备份位于 ${payload.safetyBackupDir}`);
  } catch (error) {
    showMessage("error", `恢复备份失败：${error.message}`);
  } finally {
    state.busy = false;
    render();
  }
}

async function restartOnly() {
  state.busy = true;
  render();
  try {
    const payload = await api("/api/restart", { method: "POST", body: "{}" });
    showMessage(
      payload.ok ? "info" : "error",
      payload.ok
        ? "已请求重启网关"
        : `重启失败：${payload.payload?.error || payload.stderr || payload.stdout || "unknown error"}`
    );
  } catch (error) {
    showMessage("error", `重启失败：${error.message}`);
  } finally {
    state.busy = false;
    render();
  }
}

async function exportTemplate() {
  state.busy = true;
  render();
  try {
    const response = await fetch("/api/export-template", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        config: cleanConfig(state.config)
      })
    });
    if (!response.ok) {
      const payload = await response.json();
      throw new Error(payload?.error || payload?.message || "导出失败");
    }
    const blob = await response.blob();
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = `openclaw-share-template-${new Date().toISOString().slice(0, 10)}.tar.gz`;
    link.click();
    URL.revokeObjectURL(href);
    showMessage("info", "脱敏模板包已导出。适合分享结构，不适合直接当成你的真实配置使用。");
  } catch (error) {
    showMessage("error", `导出失败：${error.message}`);
  } finally {
    state.busy = false;
    render();
  }
}

function applyRawEditor() {
  try {
    const nextConfig = normalizeEditableConfigShape(JSON.parse(document.querySelector("#raw-editor").value));
    state.config = nextConfig;
    syncDerivedState();
    showMessage("info", "原始 JSON 已应用到表单。");
    render();
  } catch (error) {
    showMessage("error", `JSON 解析失败：${error.message}`);
  }
}

window.addEventListener("resize", () => {
  requestAnimationFrame(drawLobsterConnections);
  requestAnimationFrame(fitAppText);
});

loadState();
