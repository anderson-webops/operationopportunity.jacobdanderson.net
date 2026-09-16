import assert from "node:assert/strict";
import { fork, execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

// Run the retained compiled API against the candidate's actual additive indexes.
const [, , retainedArg, fixture] = process.argv;
assert.match(fixture, /^mongodb:\/\/127\.0\.0\.1:\d+\/operation_security_test$/);
const retained = resolve(retainedArg),
	root = process.cwd();
const require = createRequire(join(root, "package.json")),
	mongoose = require("mongoose");
await import(pathToFileURL(join(root, "back-end/dist/app.js")));
const { createAccount } = await import(pathToFileURL(join(root, "back-end/dist/services/accountService.js")));
const uri = new URL(fixture);
uri.pathname = "/operation_security_test_directory_" + randomUUID().replaceAll("-", "").slice(0, 24);
const control = new mongoose.mongo.MongoClient(uri.toString(), { maxPoolSize: 2, timeoutMS: 10000 });
await control.connect();
let child,
	exited,
	stderr = "";
try {
	await mongoose.connect(uri.toString(), { maxPoolSize: 2, timeoutMS: 5000 });
	await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
	const password = "Synthetic-directory-rollback-123";
	const admin = await createAccount("admin", {
		name: "Manager",
		email: "manager@fixture.test",
		password,
		editAdmins: true
	});
	const tutor = await createAccount("tutor", {
		name: "Tutor",
		email: "tutor@fixture.test",
		password,
		age: "30",
		state: "GA"
	});
	const user = await createAccount("user", {
		name: "User",
		email: "user@fixture.test",
		password,
		age: "20",
		state: "GA"
	});
	await mongoose.models.Tutor.updateOne({ _id: tutor._id }, { $set: { status: "active" } });
	await mongoose.models.User.updateOne({ _id: user._id }, { $set: { tutor: tutor._id } });
	await mongoose.disconnect();
	const indexes = {};
	for (const name of ["admins", "tutors", "users"]) {
		indexes[name] = (await control.db().collection(name).indexes()).map((index) => index.name).sort();
		assert.ok(indexes[name].includes("name_1__id_1"));
		assert.ok(indexes[name].includes("createdAt_1__id_1"));
	}
	assert.ok(indexes.users.includes("tutor_1_name_1__id_1"));
	assert.ok(indexes.tutors.includes("status_1_name_1__id_1"));
	const origin = "http://fixture.example";
	child = fork(join(root, "scripts/measure-directory-runtime.mjs"), ["server", retained, uri.toString(), origin], {
		stdio: ["ignore", "ignore", "pipe", "ipc"]
	});
	child.stderr.on("data", (chunk) => {
		stderr = (stderr + chunk).slice(-8192);
	});
	exited = new Promise((done) => child.once("exit", (code, signal) => done({ code, signal })));
	const ready = await new Promise((done, reject) => {
		const timer = setTimeout(() => reject(Error("retained startup timed out: " + stderr)), 15000);
		child.once("message", (value) => {
			clearTimeout(timer);
			done(value);
		});
	});
	assert.equal(ready.type, "ready");
	let cookie = "",
		csrf = "";
	const request = async (route, method = "GET", body, status = 200) => {
		const response = await fetch("http://127.0.0.1:" + ready.port + route, {
			method,
			headers: { Origin: origin, "Content-Type": "application/json", Cookie: cookie, "X-CSRF-Token": csrf },
			...(body === undefined ? {} : { body: JSON.stringify(body) }),
			signal: AbortSignal.timeout(10000)
		});
		if (response.headers.has("set-cookie")) cookie = response.headers.get("set-cookie").split(";")[0];
		assert.equal(response.status, status, route);
		if (status === 204) return;
		const data = await response.json();
		csrf = data.csrfToken || response.headers.get("x-csrf-token") || csrf;
		return data;
	};
	const login = async (email) => {
		await request("/accounts/csrf");
		await request("/accounts/login", "POST", { email, password });
	};
	const logout = () => request("/accounts/logout", "DELETE", undefined, 204);
	await login(admin.email);
	assert.equal((await request("/admins")).length, 1);
	assert.equal((await request("/tutors/all")).length, 1);
	assert.equal((await request("/users/all")).length, 1);
	await logout();
	await login(tutor.email);
	const assigned = await request("/users/oftutor/" + tutor._id.toString());
	assert.equal(assigned.length, 1);
	assert.equal(assigned[0]._id, user._id.toString());
	await request("/admins", "GET", undefined, 403);
	await logout();
	await login(user.email);
	const updated = await request("/users/user/" + user._id.toString(), "PUT", {
		name: "Updated by retained application",
		age: "21",
		state: "GA"
	});
	assert.equal(updated.currentUser.name, "Updated by retained application");
	assert.equal((await request("/users/loggedin")).currentUser.tutor, tutor._id.toString());
	await logout();
	const stored = await control.db().collection("users").findOne({ _id: user._id });
	assert.equal(stored.name, "Updated by retained application");
	assert.equal(stored.role, "user");
	assert.equal(stored.authVersion, 0);
	for (const name of Object.keys(indexes))
		assert.deepEqual(
			(await control.db().collection(name).indexes()).map((index) => index.name).sort(),
			indexes[name]
		);
	console.log(
		JSON.stringify({
			passed: true,
			retainedRevision: execFileSync("git", ["-C", retained, "rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
			checks: [
				"candidate indexes retained",
				"complete legacy role directories",
				"assigned tutor scope",
				"cross-role denial",
				"retained profile write",
				"session login/logout",
				"role/auth-version/assignment preserved"
			],
			indexes
		})
	);
} finally {
	if (mongoose.connection.readyState) await mongoose.disconnect();
	if (child) {
		if (child.connected) child.send({ type: "stop" });
		const kill = setTimeout(() => child.kill("SIGKILL"), 10000);
		const status = await exited;
		clearTimeout(kill);
		await control.db().dropDatabase();
		await control.close();
		assert.deepEqual(status, { code: 0, signal: null }, stderr);
	} else {
		await control.db().dropDatabase();
		await control.close();
	}
}
