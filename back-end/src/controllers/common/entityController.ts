// src/controllers/common/entityController.ts
import { RequestHandler } from "express";
import { Document, Model } from "mongoose";

export interface EntityOpts<T extends Document> {
	model: Model<T>;
	idParam: string;               // e.g. "adminID", "tutorID", "userID"
	sessionKey: "adminID" | "tutorID" | "userID";
	responseKey: "currentAdmin" | "currentTutor" | "currentUser";
}

export function makeEntityController<T extends Document & { comparePassword?(pw: string): Promise<boolean> }>(
	{ model, idParam, sessionKey, responseKey }: EntityOpts<T>
) {
	// Create
	const create: RequestHandler = async (req, res) => {
		const data = req.body;
		const entity = new model(data);
		try {
			await entity.save();
			// sign them in right away:
			(req.session as any)[sessionKey] = (entity as any)._id.toString();
			res.status(201).json({ [responseKey]: entity });
		} catch (err: any) {
			console.error(err);
			res.status(500).json({ message: err.message });
		}
	};

	// Read all
	const getAll: RequestHandler = async (_req, res) => {
		try {
			const list = await model.find();
			res.json(list);
		} catch (err) {
			console.error(err);
			res.sendStatus(500);
		}
	};

	// Update
	const update: RequestHandler = async (req, res) => {
		const id = req.params[idParam];
		try {
			const doc = await model.findById(id);
			if (!doc) return res.sendStatus(404);
			Object.assign(doc, req.body);
			await doc.save();
			res.sendStatus(200);
		} catch (err) {
			console.error(err);
			res.sendStatus(500);
		}
	};

	// Delete
	const remove: RequestHandler = async (req, res) => {
		const id = req.params[idParam];
		try {
			const result = await model.deleteOne({ _id: id });
			if (result.deletedCount === 0) return res.sendStatus(404);
			res.sendStatus(200);
		} catch (err) {
			console.error(err);
			res.sendStatus(500);
		}
	};

	// Get the one in session
	const getLoggedIn: RequestHandler = async (req, res) => {
		const id = (req.session as any)[sessionKey];
		if (!id) return res.sendStatus(404);
		try {
			const doc = await model.findById(id);
			if (!doc) return res.sendStatus(404);
			res.json({ [responseKey]: doc });
		} catch (err) {
			console.error(err);
			res.sendStatus(500);
		}
	};

	return { create, getAll, update, remove, getLoggedIn };
}
