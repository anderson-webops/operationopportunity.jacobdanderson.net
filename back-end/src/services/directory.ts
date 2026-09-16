import type { Request, Response } from "express";
import type { Model } from "mongoose";
import { Buffer } from "node:buffer";
import { once } from "node:events";
import { Types } from "mongoose";
import { HttpError } from "../errors.js";
import { readRequestSignal } from "../runtimeCapacity.js";
import { serializeAccount, serializeTutorDirectory } from "./accountService.js";

const FIELDS = "_id name email age state tutor status editAdmins createdAt updatedAt __v role";
const PUBLIC_FIELDS = "_id name state";
export const DIRECTORY_PAGE_MAX = 50;
export const DIRECTORY_DEADLINE_MS = 20000;

function invalid(): never {
	throw new HttpError(400, "invalid_directory_query", "Use a page size from 1 to 50 and a valid directory cursor.");
}
function anchor(value: unknown): { name: string; id: Types.ObjectId } {
	if (typeof value !== "string" || value.length > 1024 || !/^[\w-]+$/.test(value)) invalid();
	try {
		const decoded = Buffer.from(value, "base64url");
		if (decoded.toString("base64url") !== value) invalid();
		const data: unknown = JSON.parse(decoded.toString());
		if (
			!Array.isArray(data) ||
			data.length !== 2 ||
			typeof data[0] !== "string" ||
			data[0].length > 100 ||
			typeof data[1] !== "string" ||
			!/^[a-f\d]{24}$/i.test(data[1])
		) {
			invalid();
		}
		return { name: data[0], id: new Types.ObjectId(data[1]) };
	} catch {
		return invalid();
	}
}
function cursor(row: { name: string; _id: Types.ObjectId }): string {
	return Buffer.from(JSON.stringify([row.name, row._id.toString()])).toString("base64url");
}

/** Bounded pages for current clients; complete, backpressured arrays for old clients. */
export async function sendDirectory(
	req: Request,
	res: Response,
	options: {
		model: Model<any>;
		filter?: Record<string, unknown>;
		public?: boolean;
		legacySort?: Record<string, 1 | -1>;
	}
) {
	const query = req.query;
	const paged = query.pageSize !== undefined;
	let size = DIRECTORY_PAGE_MAX;
	if (paged) {
		if (typeof query.pageSize !== "string" || !/^(?:[1-9]|[1-4]\d|50)$/.test(query.pageSize)) invalid();
		size = Number(query.pageSize);
	}
	if (
		Object.keys(query).some((key) => !["pageSize", "after", "before", "q", "id"].includes(key)) ||
		(!paged && Object.keys(query).length > 0) ||
		(query.after !== undefined && query.before !== undefined)
	) {
		invalid();
	}
	const clauses: Record<string, unknown>[] = [options.filter ?? {}];
	if (query.q !== undefined) {
		if (typeof query.q !== "string" || query.q.length > 80) invalid();
		const text = query.q.trim();
		if (text) {
			const literal = text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
			clauses.push({
				$or: (options.public ? ["name", "state"] : ["name", "email", "state"]).map((field) => ({
					[field]: { $regex: literal, $options: "i" }
				}))
			});
		}
	}
	if (query.id !== undefined) {
		if (typeof query.id !== "string" || !/^[a-f\d]{24}$/i.test(query.id)) invalid();
		clauses.push({ _id: new Types.ObjectId(query.id) });
	}
	const backwards = query.before !== undefined;
	const token = query.before ?? query.after;
	if (token !== undefined) {
		const key = anchor(token);
		const comparison = backwards ? "$lt" : "$gt";
		clauses.push({
			$or: [{ name: { [comparison]: key.name } }, { name: key.name, _id: { [comparison]: key.id } }]
		});
	}
	res.setHeader("Cache-Control", "no-store");
	if (req.method === "HEAD") {
		res.status(200).end();
		return;
	}
	const deadline = new AbortController();
	const timer = setTimeout(
		() => deadline.abort(new Error("Directory request deadline exceeded")),
		DIRECTORY_DEADLINE_MS
	);
	const request = readRequestSignal();
	const signal = request ? AbortSignal.any([request, deadline.signal]) : deadline.signal;
	const serialize = options.public ? serializeTutorDirectory : serializeAccount;
	try {
		const find = options.model
			.find({ $and: clauses })
			.select(options.public ? PUBLIC_FIELDS : FIELDS)
			.setOptions({ signal, timeoutMS: 5000, timeoutMode: "iteration", maxTimeMS: 5000 });
		if (paged) {
			const direction = backwards ? -1 : 1;
			const rows = await find
				.sort({ name: direction, _id: direction })
				.limit(size + 1)
				.exec();
			const more = rows.length > size;
			const selected = rows.slice(0, size);
			if (backwards) selected.reverse();
			res.json({
				items: selected.map(serialize),
				next:
					(backwards ? token !== undefined : more) && selected.length
						? cursor(selected[selected.length - 1])
						: null,
				previous:
					(backwards ? more : token !== undefined) && selected.length
						? cursor(selected[0])
						: selected.length
							? null
							: (token ?? null)
			});
			return;
		}
		const rows = find.sort(options.legacySort ?? { createdAt: 1, _id: 1 }).cursor({ batchSize: 128 });
		try {
			res.type("json");
			let first = true;
			for await (const row of rows) {
				signal.throwIfAborted();
				const part = (first ? "[" : ",") + JSON.stringify(serialize(row));
				first = false;
				if (!res.write(part)) await once(res, "drain", { signal });
			}
			res.end(first ? "[]" : "]");
		} finally {
			await rows.close();
		}
	} catch (error) {
		if (res.headersSent) {
			res.destroy();
			return;
		}
		throw error;
	} finally {
		clearTimeout(timer);
	}
}
