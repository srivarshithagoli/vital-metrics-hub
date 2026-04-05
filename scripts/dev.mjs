import { spawn } from "node:child_process";

const children = [];
const isWindows = process.platform === "win32";

function run(name, command, args) {
  const child = spawn(command, args, {
    cwd: process.cwd(),
    stdio: "inherit",
  });

  children.push(child);

  child.on("exit", (code) => {
    if (code && code !== 0) {
      process.exitCode = code;
      shutdown();
    }
  });

  return child;
}

function shutdown() {
  for (const child of children) {
    if (!child.killed) {
      child.kill();
    }
  }
}

process.on("SIGINT", () => {
  shutdown();
  process.exit(0);
});

process.on("SIGTERM", () => {
  shutdown();
  process.exit(0);
});

if (isWindows) {
  run("server", "cmd.exe", ["/c", "node", "server/index.js"]);
  run("client", "cmd.exe", ["/c", "npm", "run", "dev:client"]);
} else {
  run("server", process.execPath, ["server/index.js"]);
  run("client", "npm", ["run", "dev:client"]);
}
