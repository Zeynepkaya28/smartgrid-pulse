#!/usr/bin/env node
/**
 * Local stack orchestration that works the same in PowerShell, cmd and bash.
 *
 *   pnpm run up        supabase start + docker compose up (build, wait for healthy)
 *   pnpm run down      docker compose down + supabase stop
 *   pnpm run reset-db  supabase db reset (migrations + seed)
 *   pnpm run logs      follow compose logs
 *
 * `pnpm up` without `run` is pnpm's own "update" command, hence `pnpm run up`.
 * DASHBOARD_PORT (default 3000) changes the dashboard's host port.
 */
import { execSync, spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const compose = ["docker", "compose", "-f", "infra/docker-compose.yml"];

// The CLI reads the repo-root .env, which may hold the *remote* DB password;
// local commands must use the local default.
const supabaseEnv = { ...process.env, SUPABASE_DB_PASSWORD: "postgres" };

function run(cmd, args, env = process.env) {
  // Windows needs a shell to resolve pnpm.cmd; pass one quoted string (Node DEP0190).
  const result =
    process.platform === "win32"
      ? spawnSync([cmd, ...args].map((a) => (/[\s"`]/.test(a) ? `"${a.replaceAll('"', '\\"')}"` : a)).join(" "), {
          cwd: root,
          stdio: "inherit",
          env,
          shell: true,
        })
      : spawnSync(cmd, args, { cwd: root, stdio: "inherit", env });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function supabase(args, env = supabaseEnv) {
  run("pnpm", ["exec", "supabase", ...args], env);
}

function localSupabaseEnv() {
  const out = execSync("pnpm exec supabase status -o env", { cwd: root, env: supabaseEnv, encoding: "utf8" });
  const vars = Object.fromEntries(
    out
      .split(/\r?\n/)
      .map((line) => /^([A-Z_]+)="?(.*?)"?$/.exec(line))
      .filter(Boolean)
      .map((m) => [m[1], m[2]]),
  );
  const apiPort = new URL(vars.API_URL).port;
  const dbPort = new URL(vars.DB_URL).port;
  if (!vars.ANON_KEY || !vars.SERVICE_ROLE_KEY) throw new Error("supabase status did not return keys");
  return {
    SUPABASE_ANON_KEY: vars.ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: vars.SERVICE_ROLE_KEY,
    SUPABASE_API_PORT: apiPort,
    SUPABASE_DB_PORT: dbPort,
  };
}

const command = process.argv[2];
switch (command) {
  case "up": {
    supabase(["start"]);
    const env = { ...process.env, ...localSupabaseEnv() };
    run(compose[0], [...compose.slice(1), "up", "-d", "--build", "--wait"], env);
    const port = process.env.DASHBOARD_PORT ?? "3000";
    console.log(`\nSmartGrid Pulse: http://localhost:${port}`);
    console.log("Supabase Studio: http://127.0.0.1:54423 · Mail (magic links): http://127.0.0.1:54424");
    break;
  }
  case "down":
    // Compose interpolates required variables even for `down`; placeholders are fine here.
    run(compose[0], [...compose.slice(1), "down"], {
      ...process.env,
      SUPABASE_ANON_KEY: "unused",
      SUPABASE_SERVICE_ROLE_KEY: "unused",
    });
    supabase(["stop"]);
    break;
  case "reset-db":
    supabase(["db", "reset"]);
    break;
  case "logs":
    run(compose[0], [...compose.slice(1), "logs", "-f", "--tail", "100"], {
      ...process.env,
      SUPABASE_ANON_KEY: "unused",
      SUPABASE_SERVICE_ROLE_KEY: "unused",
    });
    break;
  default:
    console.error("usage: node scripts/stack.mjs <up|down|reset-db|logs>");
    process.exit(1);
}
