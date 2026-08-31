import { spawn } from "node:child_process";

const processes = [
  spawn("uv", ["run", "--project", "../backend", "python", "../backend/server.py"], {
    shell: true,
    stdio: "inherit",
    windowsHide: true,
  }),
  spawn("pnpm", ["exec", "vinext", "dev"], {
    shell: true,
    stdio: "inherit",
    windowsHide: true,
  }),
];

let closing = false;

function close(code = 0) {
  if (closing) return;
  closing = true;
  for (const child of processes) child.kill();
  process.exitCode = code;
}

for (const child of processes) {
  child.on("exit", (code) => close(code ?? 0));
}

process.on("SIGINT", () => close(0));
process.on("SIGTERM", () => close(0));
