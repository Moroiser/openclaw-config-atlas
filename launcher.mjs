import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT_DIR = path.dirname(fileURLToPath(import.meta.url));
const HOST = process.env.OPENCLAW_CONFIG_STUDIO_HOST || "127.0.0.1";
const PORT = Number(process.env.OPENCLAW_CONFIG_STUDIO_PORT || 3210);
const URL = `http://${HOST}:${PORT}`;
const RUNTIME_DIR = process.env.OPENCLAW_CONFIG_STUDIO_RUNTIME_DIR || path.join(ROOT_DIR, ".runtime");
const LOG_PATH = process.env.OPENCLAW_CONFIG_STUDIO_LOG || path.join(RUNTIME_DIR, "server.log");
const PID_PATH = process.env.OPENCLAW_CONFIG_STUDIO_PID || path.join(RUNTIME_DIR, "server.pid");
const SERVER_PATH = path.join(ROOT_DIR, "server.mjs");
const SERVICE_NAME = "openclaw-config-studio";
const args = new Set(process.argv.slice(2));

async function ensureRuntimeDir() {
  await fs.mkdir(RUNTIME_DIR, { recursive: true });
}

async function fileExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function isWsl() {
  return os.release().toLowerCase().includes("microsoft");
}

function healthcheck() {
  return new Promise((resolve) => {
    const req = http.get(
      `${URL}/api/health`,
      { timeout: 1500 },
      (res) => {
        res.resume();
        resolve(res.statusCode === 200);
      }
    );
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
    req.on("error", () => resolve(false));
  });
}

async function waitForHealth(attempts = 40, sleepMs = 250) {
  for (let index = 0; index < attempts; index += 1) {
    if (await healthcheck()) return true;
    await new Promise((resolve) => setTimeout(resolve, sleepMs));
  }
  return false;
}

async function readPid() {
  try {
    const raw = await fs.readFile(PID_PATH, "utf8");
    const value = Number(raw.trim());
    return Number.isInteger(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

function processExists(pid) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function writePid(pid) {
  await ensureRuntimeDir();
  await fs.writeFile(PID_PATH, `${pid}\n`, "utf8");
}

function spawnCommand(command, commandArgs, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, commandArgs, options);
    child.on("close", (code) => resolve(code === 0));
    child.on("error", () => resolve(false));
  });
}

async function canUseSystemd() {
  if (process.platform !== "linux") return false;
  const systemctlOk = await spawnCommand("systemctl", ["--user", "show-environment"], {
    stdio: "ignore"
  });
  return systemctlOk;
}

async function startViaSystemd() {
  if (!(await canUseSystemd())) return false;

  const hasService = await spawnCommand("systemctl", ["--user", "cat", `${SERVICE_NAME}.service`], {
    stdio: "ignore"
  });
  if (hasService) {
    return await spawnCommand("systemctl", ["--user", "start", `${SERVICE_NAME}.service`], {
      stdio: "ignore"
    });
  }

  const env = {
    ...process.env,
    OPENCLAW_CONFIG_STUDIO_HOST: HOST,
    OPENCLAW_CONFIG_STUDIO_PORT: String(PORT)
  };
  return await spawnCommand(
    "systemd-run",
    [
      "--user",
      "--unit",
      `${SERVICE_NAME}-transient`,
      "--quiet",
      "--collect",
      "--property",
      `WorkingDirectory=${ROOT_DIR}`,
      "--setenv",
      `OPENCLAW_CONFIG_STUDIO_HOST=${HOST}`,
      "--setenv",
      `OPENCLAW_CONFIG_STUDIO_PORT=${PORT}`,
      process.execPath,
      SERVER_PATH
    ],
    { cwd: ROOT_DIR, env, stdio: "ignore" }
  );
}

async function startDetachedNode() {
  await ensureRuntimeDir();
  const logHandle = await fs.open(LOG_PATH, "a");
  const child = spawn(process.execPath, [SERVER_PATH], {
    cwd: ROOT_DIR,
    env: {
      ...process.env,
      OPENCLAW_CONFIG_STUDIO_HOST: HOST,
      OPENCLAW_CONFIG_STUDIO_PORT: String(PORT)
    },
    detached: true,
    stdio: ["ignore", logHandle.fd, logHandle.fd],
    windowsHide: true
  });
  child.unref();
  await writePid(child.pid);
  await logHandle.close();
  return true;
}

async function ensureRunning() {
  if (await healthcheck()) return URL;

  const oldPid = await readPid();
  if (processExists(oldPid) && (await waitForHealth(12, 250))) return URL;

  const started = (await startViaSystemd()) || (await startDetachedNode());
  if (!started) {
    throw new Error(`Config Atlas failed to start. Log: ${LOG_PATH}`);
  }
  if (!(await waitForHealth())) {
    throw new Error(`Config Atlas failed to start. Log: ${LOG_PATH}`);
  }
  return URL;
}

async function tryOpen(command, commandArgs) {
  return await new Promise((resolve) => {
    const child = spawn(command, commandArgs, {
      detached: true,
      stdio: "ignore",
      windowsHide: true
    });
    child.on("error", () => resolve(false));
    child.unref();
    resolve(true);
  });
}

async function openBrowser(url) {
  if (process.platform === "win32") {
    return await tryOpen("cmd", ["/c", "start", "", url]);
  }
  if (isWsl()) {
    if (await tryOpen("wslview", [url])) return true;
  }
  if (process.platform === "darwin") {
    return await tryOpen("open", [url]);
  }
  return await tryOpen("xdg-open", [url]);
}

async function installLinuxAutostart() {
  const serviceDir = path.join(process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config"), "systemd", "user");
  const servicePath = path.join(serviceDir, `${SERVICE_NAME}.service`);
  await fs.mkdir(serviceDir, { recursive: true });
  const serviceText = `[Unit]
Description=OpenClaw Config Atlas
After=default.target

[Service]
Type=simple
WorkingDirectory=${ROOT_DIR}
Environment=OPENCLAW_CONFIG_STUDIO_HOST=${HOST}
Environment=OPENCLAW_CONFIG_STUDIO_PORT=${PORT}
ExecStart=${process.execPath} ${SERVER_PATH}
Restart=always
RestartSec=2

[Install]
WantedBy=default.target
`;
  await fs.writeFile(servicePath, serviceText, "utf8");
  const reloaded = await spawnCommand("systemctl", ["--user", "daemon-reload"], { stdio: "ignore" });
  const enabled = reloaded
    ? await spawnCommand("systemctl", ["--user", "enable", "--now", `${SERVICE_NAME}.service`], {
        stdio: "ignore"
      })
    : false;
  if (!enabled) throw new Error("systemd user service unavailable");
  return servicePath;
}

async function installWindowsAutostart() {
  const startupDir = path.join(
    process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"),
    "Microsoft",
    "Windows",
    "Start Menu",
    "Programs",
    "Startup"
  );
  const scriptPath = path.join(startupDir, "OpenClaw Config Atlas.cmd");
  const lines = [
    "@echo off",
    `cd /d "${ROOT_DIR}"`,
    `"${process.execPath}" "${path.join(ROOT_DIR, "launcher.mjs")}" ensure-running`
  ];
  await fs.mkdir(startupDir, { recursive: true });
  await fs.writeFile(scriptPath, `${lines.join("\r\n")}\r\n`, "utf8");
  return scriptPath;
}

async function installMacAutostart() {
  const agentsDir = path.join(os.homedir(), "Library", "LaunchAgents");
  const plistPath = path.join(agentsDir, `com.${SERVICE_NAME}.plist`);
  const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.${SERVICE_NAME}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${process.execPath}</string>
    <string>${SERVER_PATH}</string>
  </array>
  <key>WorkingDirectory</key>
  <string>${ROOT_DIR}</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>OPENCLAW_CONFIG_STUDIO_HOST</key>
    <string>${HOST}</string>
    <key>OPENCLAW_CONFIG_STUDIO_PORT</key>
    <string>${PORT}</string>
  </dict>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
</dict>
</plist>
`;
  await fs.mkdir(agentsDir, { recursive: true });
  await fs.writeFile(plistPath, plist, "utf8");
  const loaded = await spawnCommand("launchctl", ["load", "-w", plistPath], { stdio: "ignore" });
  if (!loaded) throw new Error("launchctl load failed");
  return plistPath;
}

async function installAutostart() {
  if (process.platform === "win32") return await installWindowsAutostart();
  if (process.platform === "darwin") return await installMacAutostart();
  return await installLinuxAutostart();
}

async function printStatus() {
  const healthy = await healthcheck();
  const pid = await readPid();
  const payload = {
    healthy,
    url: URL,
    pid,
    pidAlive: processExists(pid),
    logPath: LOG_PATH
  };
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
}

async function main() {
  if (args.has("status")) {
    await printStatus();
    return;
  }

  if (args.has("install-autostart")) {
    const installedPath = await installAutostart();
    process.stdout.write(`${installedPath}\n`);
    return;
  }

  if (args.has("ensure-running") || args.size === 0 || args.has("launch")) {
    const url = await ensureRunning();
    if (args.has("launch")) await openBrowser(url);
    process.stdout.write(`${url}\n`);
    return;
  }

  throw new Error(`Unknown command: ${[...args].join(" ")}`);
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});
