import { spawnSync } from "node:child_process";
import process from "node:process";

const args = process.argv.slice(2);
const npmExecPath = process.env.npm_execpath;

if (!npmExecPath) {
	throw new Error("Run this helper through an npm package script so it can reuse the selected npm executable.");
}

if (args.length === 0) {
	throw new Error("An npm command is required.");
}

const env = { ...process.env };
delete env.npm_config_global_ignore_file;
delete env.NPM_CONFIG_GLOBAL_IGNORE_FILE;

const result = spawnSync(process.execPath, [npmExecPath, ...args], {
	env,
	stdio: "inherit"
});

if (result.error) {
	throw result.error;
}

if (result.signal) {
	throw new Error(`npm ${args.join(" ")} terminated with signal ${result.signal}.`);
}

process.exit(result.status ?? 1);
