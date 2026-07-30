import { access, readdir, readFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import rootPackage from "../package.json" with { type: "json" };

const root = resolve(import.meta.dirname, "..");
const frontEndDist = join(root, "front-end/dist");
const backEndDist = join(root, "back-end/dist");

async function walk(directory) {
	const results = [];
	for (const entry of await readdir(directory, { withFileTypes: true })) {
		const path = join(directory, entry.name);
		if (entry.isDirectory()) results.push(...(await walk(path)));
		else results.push(path);
	}
	return results;
}

function assert(condition, message) {
	if (!condition) throw new Error(message);
}

const frontFiles = await walk(frontEndDist);
const backFiles = await walk(backEndDist);
await Promise.all([
	access(join(root, "node_modules/argon2/prebuilds/linux-arm64/argon2.armv8.glibc.node")),
	access(join(root, "node_modules/argon2/prebuilds/linux-arm64/argon2.armv8.musl.node"))
]);
assert(
	![...frontFiles, ...backFiles].some((file) => extname(file) === ".map"),
	"Production builds must not include source maps"
);
assert(!frontFiles.some((file) => /(^|\/)\.env(?:\.|$)/.test(file)), "Front-end build contains an environment file");
assert(!backFiles.some((file) => /(^|\/)test\//.test(file)), "Back-end runtime build contains tests");

for (const htmlFile of frontFiles.filter((file) => extname(file) === ".html")) {
	const html = await readFile(htmlFile, "utf8");
	assert(!/<script(?![^>]*\bsrc=)[^>]*>/i.test(html), `${htmlFile} contains an inline script`);
	assert(
		!/\b(?:SESSION_SECRET|VAULT_SECRET_ID|MONGODB_URI)\b/.test(html),
		`${htmlFile} contains a server-only setting`
	);
}

const release = JSON.parse(await readFile(join(frontEndDist, "release.json"), "utf8"));
assert(release.release === `v${rootPackage.version}`, "Static release identity is out of sync");
assert(/^[0-9a-f]{7,64}$/i.test(release.commit), "Static release commit is missing or invalid");
assert(
	/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(release.deployedAt),
	"Static deployment timestamp is missing or invalid"
);
console.log(
	JSON.stringify({
		release: release.release,
		commit: release.commit,
		deployedAt: release.deployedAt,
		frontEndFiles: frontFiles.length,
		backEndFiles: backFiles.length,
		linuxArm64PasswordBindings: 2,
		inlineScripts: 0,
		sourceMaps: 0
	})
);
