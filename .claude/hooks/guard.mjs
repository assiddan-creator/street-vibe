// PreToolUse guard for Street Vibe. Blocks the project's hard rules (see CLAUDE.md):
// no local dev servers, no push to main, no blanket `git add`, no touching .env secrets.
// Exit 2 = block the tool call and show the reason to Claude.
import { execSync } from "node:child_process";
import path from "node:path";

const input = await new Promise((resolve) => {
  let data = "";
  process.stdin.on("data", (chunk) => (data += chunk));
  process.stdin.on("end", () => resolve(data));
});

let payload;
try {
  payload = JSON.parse(input || "{}");
} catch {
  process.exit(0);
}

const toolInput = payload.tool_input ?? {};

function block(reason) {
  process.stderr.write(`Blocked by .claude/hooks/guard.mjs: ${reason}\n`);
  process.exit(2);
}

const SECRET_FILE = /(^|[\\/\s"'=])\.env(\.[\w-]+)*\.local\b/;

function isSecretEnvPath(p) {
  const base = path.basename(String(p));
  return /^\.env(\..+)?$/.test(base) && base !== ".env.example";
}

function currentBranch() {
  try {
    return execSync("git rev-parse --abbrev-ref HEAD", {
      cwd: payload.cwd || process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

function checkCommand(command) {
  if (SECRET_FILE.test(command)) {
    block(".env.local holds secrets. Don't read, print or edit it; ask Assi to change it himself.");
  }

  for (const segment of command.split(/&&|\|\||[;|\n]/)) {
    const s = segment.trim();

    if (/\b(npm|pnpm|yarn|bun)\s+(run\s+)?(dev|start)\b/.test(s) || /\bnext\s+(dev|start)\b/.test(s)) {
      block("no local dev servers in this project (they froze the machine). Verify with `npx tsc --noEmit` and `npx next build`.");
    }

    if (/\bgit\s+add\b/.test(s)) {
      const args = s.replace(/^.*?\bgit\s+add\b/, "").trim().split(/\s+/);
      if (args.some((a) => a === "-A" || a === "--all" || a === "." || a === "./" || a === "*")) {
        block("never stage everything. Stage explicit file paths.");
      }
    }

    if (/\bgit\s+push\b/.test(s)) {
      const args = s.replace(/^.*?\bgit\s+push\b/, "").trim().split(/\s+/).filter(Boolean);
      const refs = args.filter((a) => !a.startsWith("-"));
      const targetsMain = refs.some((r) => r === "main" || /:main$/.test(r) || r === "refs/heads/main");
      const implicitMain = refs.length <= 1 && currentBranch() === "main";
      if (targetsMain || implicitMain) {
        block("never push to main. Push a feature branch and merge through a PR.");
      }
    }
  }
}

const command = toolInput.command ?? toolInput.cmd;
if (typeof command === "string") checkCommand(command);

const paths = [toolInput.file_path, toolInput.path, toolInput.notebook_path, ...(toolInput.paths ?? [])].filter(Boolean);
if (paths.some(isSecretEnvPath)) {
  block(".env files hold secrets. Don't read or edit them; .env.example is fine.");
}

process.exit(0);
