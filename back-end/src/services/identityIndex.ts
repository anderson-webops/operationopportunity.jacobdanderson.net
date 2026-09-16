import type { AccountRole } from "../types/account.js";
import { closeSync, openSync } from "node:fs";
import { mkdtemp, rm, statfs } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import process from "node:process";
import { DatabaseSync } from "node:sqlite";

export interface IndexedIdentity {
	email: string;
	role: AccountRole;
	accountId: string;
	previousEmail: string;
}

/** Private, disposable index. Only two MiB of SQLite pages are cached in RAM. */
export async function createIdentityIndex() {
	const parent = process.env.TMPDIR || (process.platform === "linux" ? "/var/tmp" : tmpdir());
	if (process.platform === "linux") {
		const kind = (await statfs(parent)).type >>> 0;
		if (kind === 0x01021994 || kind === 2240043254) {
			throw new Error("Startup identity verification requires disk-backed temporary storage");
		}
	}
	const directory = await mkdtemp(join(parent, "operation-identities-"));
	let database: DatabaseSync | undefined;
	try {
		const file = join(directory, "index.sqlite");
		closeSync(openSync(file, "wx", 0o600));
		database = new DatabaseSync(file, { allowExtension: false });
		// This is rebuildable scratch, never an authoritative or durable database.
		database.exec(`
      PRAGMA journal_mode = OFF;
      PRAGMA synchronous = OFF;
      PRAGMA cache_size = -2048;
      PRAGMA mmap_size = 0;
      PRAGMA temp_store = FILE;
      CREATE TABLE identities (
        email TEXT PRIMARY KEY COLLATE BINARY,
        role TEXT NOT NULL,
        accountId TEXT NOT NULL,
        previousEmail TEXT NOT NULL,
        verified INTEGER NOT NULL DEFAULT 0
      ) WITHOUT ROWID;
      BEGIN;
    `);
		const insert = database.prepare(
			"INSERT INTO identities (email,role,accountId,previousEmail) VALUES (?,?,?,?) ON CONFLICT(email) DO NOTHING"
		);
		const find = database.prepare("SELECT email,role,accountId,previousEmail FROM identities WHERE email = ?");
		const verify = database.prepare("UPDATE identities SET verified = 1 WHERE email = ?");
		const normalized = database.prepare(
			"SELECT email,role,accountId,previousEmail FROM identities WHERE previousEmail != email"
		);
		const missing = database.prepare(
			"SELECT email,role,accountId,previousEmail FROM identities WHERE verified = 0"
		);
		return {
			add(identity: IndexedIdentity) {
				const result = insert.run(identity.email, identity.role, identity.accountId, identity.previousEmail);
				if (result.changes !== 1)
					throw new Error("Duplicate normalized login identity detected during startup");
			},
			get(email: string): IndexedIdentity | undefined {
				return find.get(email) as IndexedIdentity | undefined;
			},
			markVerified(email: string) {
				verify.run(email);
			},
			normalizations() {
				return normalized.iterate() as Iterator<IndexedIdentity> & Iterable<IndexedIdentity>;
			},
			missing() {
				return missing.iterate() as Iterator<IndexedIdentity> & Iterable<IndexedIdentity>;
			},
			async dispose() {
				try {
					database!.close();
				} finally {
					await rm(directory, { recursive: true, force: true });
				}
			}
		};
	} catch (error) {
		try {
			database?.close();
		} finally {
			await rm(directory, { recursive: true, force: true });
		}
		throw error;
	}
}
