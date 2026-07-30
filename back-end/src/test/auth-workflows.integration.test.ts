import type { AppConfig } from "../config.js";
import assert from "node:assert/strict";
import process from "node:process";
import { after, before, describe, it } from "node:test";
import argon2 from "argon2";
import MongoStore from "connect-mongo";
import mongoose from "mongoose";
import request from "supertest";
import { createApp } from "../app.js";
import { Admin } from "../models/schemas/Admin.js";
import { Tutor } from "../models/schemas/Tutor.js";
import { User } from "../models/schemas/User.js";
import { createAccount } from "../services/accountService.js";
import { ensureIdentityRegistry } from "../services/identityRegistry.js";
import { applyAdditiveSecurityMigrations } from "../services/securityMigration.js";

const integrationUri = process.env.TEST_MONGODB_URI?.trim();
const origin = "http://localhost:3333";
const config: AppConfig = {
	environment: "test",
	isProduction: false,
	host: "127.0.0.1",
	port: 3002,
	publicOrigin: origin,
	trustedProxyIps: [],
	sessionSecrets: ["integration-session-secret-".padEnd(48, "s")],
	sessionCookieName: "operation.sid",
	sessionMaxAgeMs: 60_000,
	sessionRememberMaxAgeMs: 120_000,
	mongoUri: integrationUri,
	allowUnauthenticatedLoopbackMongo: true,
	enableInternalDiagnostics: false,
	quotesUpstreamUrl: new URL("https://jacobdanderson.net/quotes-api"),
	requestBodyLimit: "64kb"
};

function assertDisposableMongoUri(uri: string): void {
	if (!/^mongodb:\/\/(?:127\.0\.0\.1|localhost|\[::1\]):\d+\/operation_security_test_[\w-]+(?:\?.*)?$/i.test(uri)) {
		throw new Error(
			"TEST_MONGODB_URI must target a loopback database named operation_security_test_*"
		);
	}
}

describe("Mongo-backed authorization lifecycle", { skip: !integrationUri }, () => {
	let app: ReturnType<typeof createApp>;
	let store: ReturnType<typeof MongoStore.create>;
	let managerId = "";

	before(async () => {
		assert.ok(integrationUri);
		assertDisposableMongoUri(integrationUri);
		await mongoose.connect(integrationUri, {
			serverSelectionTimeoutMS: 5_000,
			connectTimeoutMS: 5_000,
			maxPoolSize: 10,
			autoCreate: false,
			autoIndex: false
		});
		await mongoose.connection.dropDatabase();
		await Promise.all([
			Admin.createCollection(),
			Tutor.createCollection(),
			User.createCollection()
		]);
		await Promise.all([
			Admin.syncIndexes(),
			Tutor.syncIndexes(),
			User.syncIndexes()
		]);
		const legacyUserId = new mongoose.Types.ObjectId();
		await User.collection.insertOne({
			_id: legacyUserId,
			name: "Legacy User",
			email: " Legacy.User@Example.TEST ",
			password: await argon2.hash("legacy-user-password-123"),
			role: "admin",
			createdAt: new Date(),
			updatedAt: new Date()
		});
		await applyAdditiveSecurityMigrations();
		await ensureIdentityRegistry();
		const normalizedLegacyUser = await User.findById(legacyUserId).exec();
		assert.equal(normalizedLegacyUser?.email, "legacy.user@example.test");
		assert.equal(normalizedLegacyUser?.role, "user");
		assert.equal(normalizedLegacyUser?.authVersion, 0);

		const manager = await createAccount("admin", {
			name: "Primary Manager",
			email: "manager@example.test",
			password: "manager-password-123",
			editAdmins: true
		});
		managerId = manager._id.toString();

		store = MongoStore.create({
			client: mongoose.connection.getClient(),
			collectionName: "sessions",
			ttl: 120,
			autoRemove: "native",
			touchAfter: 1
		});
		app = createApp(config, store);
	});

	after(async () => {
		if (mongoose.connection.readyState !== 0) {
			await mongoose.connection.dropDatabase();
		}
		if (store) await store.close();
		if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
	});

	type Agent = ReturnType<typeof request.agent>;

	async function csrf(agent: Agent): Promise<string> {
		const response = await agent.get("/accounts/csrf").expect(200);
		assert.equal(typeof response.body.csrfToken, "string");
		return response.body.csrfToken as string;
	}

	async function login(
		agent: Agent,
		email: string,
		password: string
	): Promise<{ csrfToken: string; body: Record<string, unknown> }> {
		const token = await csrf(agent);
		const response = await agent
			.post("/accounts/login")
			.set("Origin", origin)
			.set("X-CSRF-Token", token)
			.send({ email, password, remember: false })
			.expect(200);
		assert.equal(typeof response.body.csrfToken, "string");
		return {
			csrfToken: response.body.csrfToken as string,
			body: response.body as Record<string, unknown>
		};
	}

	it("enforces signup, promotion, demotion, isolation, and revocation end to end", async () => {
		const legacyAgent = request.agent(app);
		const legacyLogin = await login(
			legacyAgent,
			"legacy.user@example.test",
			"legacy-user-password-123"
		);
		assert.ok("currentUser" in legacyLogin.body);

		const anonymous = request.agent(app);
		const anonymousToken = await csrf(anonymous);
		await anonymous
			.post("/admins")
			.set("Origin", origin)
			.set("X-CSRF-Token", anonymousToken)
			.send({
				name: "Attacker",
				email: "attacker@example.test",
				password: "attacker-password-123",
				editAdmins: true
			})
			.expect(401);

		const tutorAgent = request.agent(app);
		const tutorSignupToken = await csrf(tutorAgent);
		const tutorSignup = await tutorAgent
			.post("/tutors")
			.set("Origin", origin)
			.set("X-CSRF-Token", tutorSignupToken)
			.send({
				name: "Pending Tutor",
				email: "tutor@example.test",
				password: "tutor-password-123",
				age: "30",
				state: "Utah"
			})
			.expect(201);
		const tutorId = tutorSignup.body.currentTutor._id as string;
		let tutorToken = tutorSignup.body.csrfToken as string;
		assert.equal(tutorSignup.body.currentTutor.status, "pending");
		await tutorAgent.get(`/users/oftutor/${tutorId}`).expect(403);

		const managerAgent = request.agent(app);
		const managerToken = (await login(
			managerAgent,
			"manager@example.test",
			"manager-password-123"
		)).csrfToken;

		const adminCreate = await managerAgent
			.post("/admins")
			.set("Origin", origin)
			.set("X-CSRF-Token", managerToken)
			.send({
				name: "Ordinary Admin",
				email: "ordinary-admin@example.test",
				password: "ordinary-password-123",
				editAdmins: false
			})
			.expect(201);
		const ordinaryAdminId = adminCreate.body.admin._id as string;

		const ordinaryAgent = request.agent(app);
		const ordinaryToken = (await login(
			ordinaryAgent,
			"ordinary-admin@example.test",
			"ordinary-password-123"
		)).csrfToken;
		await ordinaryAgent
			.post("/admins")
			.set("Origin", origin)
			.set("X-CSRF-Token", ordinaryToken)
			.send({
				name: "Unauthorized Admin",
				email: "unauthorized@example.test",
				password: "unauthorized-password-123",
				editAdmins: false
			})
			.expect(403);
		await ordinaryAgent
			.patch(`/tutors/${tutorId}/status`)
			.set("Origin", origin)
			.set("X-CSRF-Token", ordinaryToken)
			.send({ status: "active" })
			.expect(403);

		const duplicateIdentity = request.agent(app);
		const duplicateIdentityToken = await csrf(duplicateIdentity);
		await duplicateIdentity
			.post("/users")
			.set("Origin", origin)
			.set("X-CSRF-Token", duplicateIdentityToken)
			.send({
				name: "Duplicate Identity",
				email: "ordinary-admin@example.test",
				password: "duplicate-password-123",
				age: "18",
				state: "Utah"
			})
			.expect(409);

		await managerAgent
			.patch(`/tutors/${tutorId}/status`)
			.set("Origin", origin)
			.set("X-CSRF-Token", managerToken)
			.send({ status: "active" })
			.expect(200);
		const revokedAfterPromotion = await tutorAgent.get("/accounts/me").expect(200);
		assert.equal(revokedAfterPromotion.body.role, null);
		tutorToken = (await login(
			tutorAgent,
			"tutor@example.test",
			"tutor-password-123"
		)).csrfToken;

		const publicDirectory = await request(app).get("/tutors").expect(200);
		assert.equal(publicDirectory.body.length, 1);
		assert.deepEqual(
			Object.keys(publicDirectory.body[0]).sort(),
			["_id", "name", "state"]
		);

		const userAgent = request.agent(app);
		const userSignupToken = await csrf(userAgent);
		const userSignup = await userAgent
			.post("/users")
			.set("Origin", origin)
			.set("X-CSRF-Token", userSignupToken)
			.send({
				name: "Assigned User",
				email: "user@example.test",
				password: "user-password-123",
				age: "17",
				state: "Utah"
			})
			.expect(201);
		const userId = userSignup.body.currentUser._id as string;
		let userToken = userSignup.body.csrfToken as string;

		const otherUserAgent = request.agent(app);
		const otherUserSignupToken = await csrf(otherUserAgent);
		const otherUserSignup = await otherUserAgent
			.post("/users")
			.set("Origin", origin)
			.set("X-CSRF-Token", otherUserSignupToken)
			.send({
				name: "Other User",
				email: "other-user@example.test",
				password: "other-user-password-123",
				age: "16",
				state: "Nevada"
			})
			.expect(201);
		const otherUserId = otherUserSignup.body.currentUser._id as string;

		await userAgent
			.put(`/users/user/${otherUserId}`)
			.set("Origin", origin)
			.set("X-CSRF-Token", userToken)
			.send({ name: "Cross-account update" })
			.expect(403);
		await userAgent
			.delete(`/users/user/${otherUserId}`)
			.set("Origin", origin)
			.set("X-CSRF-Token", userToken)
			.expect(403);

		await userAgent
			.put(`/users/tutor/${userId}/${tutorId}`)
			.set("Origin", origin)
			.set("X-CSRF-Token", userToken)
			.send({})
			.expect(200);
		const assignedUsers = await tutorAgent
			.get(`/users/oftutor/${tutorId}`)
			.expect(200);
		assert.deepEqual(assignedUsers.body.map((user: { _id: string }) => user._id), [userId]);

		await tutorAgent
			.put(`/users/tutor/${userId}`)
			.set("Origin", origin)
			.set("X-CSRF-Token", tutorToken)
			.send({ email: "forbidden-change@example.test" })
			.expect(400);
		await tutorAgent
			.put(`/users/tutor/${otherUserId}`)
			.set("Origin", origin)
			.set("X-CSRF-Token", tutorToken)
			.send({ name: "Forbidden cross-assignment" })
			.expect(403);

		const concurrentUserAgent = request.agent(app);
		await login(
			concurrentUserAgent,
			"user@example.test",
			"user-password-123"
		);
		await userAgent
			.put(`/users/user/${userId}`)
			.set("Origin", origin)
			.set("X-CSRF-Token", userToken)
			.send({
				password: "new-user-password-123",
				currentPassword: "wrong-current-password"
			})
			.expect(403);
		const sessionBeforeCredentialChange = await userAgent.get("/accounts/me").expect(200);
		const originalUserCookie = (
			sessionBeforeCredentialChange.headers["set-cookie"] as unknown as string[]
		)[0]!.split(";")[0]!;
		const credentialUpdate = await userAgent
			.put(`/users/user/${userId}`)
			.set("Origin", origin)
			.set("X-CSRF-Token", userToken)
			.send({
				password: "new-user-password-123",
				currentPassword: "user-password-123"
			})
			.expect(200);
		const rotatedUserCookie = (credentialUpdate.headers["set-cookie"] as unknown as string[])[0]!
			.split(";")[0]!;
		assert.notEqual(rotatedUserCookie, originalUserCookie);
		assert.equal(typeof credentialUpdate.headers["x-csrf-token"], "string");
		await userAgent.get("/users/loggedin").expect(200);
		await concurrentUserAgent.get("/users/loggedin").expect(401);
		await request(app)
			.get("/users/loggedin")
			.set("Cookie", originalUserCookie)
			.expect(401);

		const oldPasswordAgent = request.agent(app);
		const oldPasswordToken = await csrf(oldPasswordAgent);
		await oldPasswordAgent
			.post("/accounts/login")
			.set("Origin", origin)
			.set("X-CSRF-Token", oldPasswordToken)
			.send({
				email: "user@example.test",
				password: "user-password-123"
			})
			.expect(401);
		const rotatedUserAgent = request.agent(app);
		userToken = (await login(
			rotatedUserAgent,
			"user@example.test",
			"new-user-password-123"
		)).csrfToken;
		assert.ok(userToken);

		await managerAgent
			.patch(`/tutors/${tutorId}/status`)
			.set("Origin", origin)
			.set("X-CSRF-Token", managerToken)
			.send({ status: "suspended" })
			.expect(200);
		const revokedAfterSuspension = await tutorAgent.get("/accounts/me").expect(200);
		assert.equal(revokedAfterSuspension.body.role, null);
		const privateUsers = await managerAgent.get("/users/all").expect(200);
		const suspendedTutorUser = privateUsers.body.find(
			(user: { _id: string }) => user._id === userId
		);
		assert.equal(suspendedTutorUser.tutor, null);

		await managerAgent
			.put(`/admins/${managerId}`)
			.set("Origin", origin)
			.set("X-CSRF-Token", managerToken)
			.send({ editAdmins: false })
			.expect(409);
		await managerAgent
			.put(`/admins/${ordinaryAdminId}`)
			.set("Origin", origin)
			.set("X-CSRF-Token", managerToken)
			.send({ editAdmins: true })
			.expect(200);
		await managerAgent
			.put(`/admins/${managerId}`)
			.set("Origin", origin)
			.set("X-CSRF-Token", managerToken)
			.send({ editAdmins: false })
			.expect(200);
		await managerAgent
			.post("/admins")
			.set("Origin", origin)
			.set("X-CSRF-Token", managerToken)
			.send({
				name: "Post-demotion Admin",
				email: "post-demotion@example.test",
				password: "post-demotion-password-123",
				editAdmins: false
			})
			.expect(403);

		await ordinaryAgent
			.delete(`/admins/remove/${managerId}`)
			.set("Origin", origin)
			.set("X-CSRF-Token", ordinaryToken)
			.expect(204);
		await ordinaryAgent
			.put(`/admins/${ordinaryAdminId}`)
			.set("Origin", origin)
			.set("X-CSRF-Token", ordinaryToken)
			.send({ editAdmins: false })
			.expect(409);
		await ordinaryAgent
			.delete(`/admins/remove/${ordinaryAdminId}`)
			.set("Origin", origin)
			.set("X-CSRF-Token", ordinaryToken)
			.expect(409);
	});
});
