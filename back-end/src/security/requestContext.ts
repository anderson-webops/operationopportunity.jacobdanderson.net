import type { RequestHandler } from "express";
import { randomUUID } from "node:crypto";

export const requestContext: RequestHandler = (req, res, next) => {
	const requestId = randomUUID();
	req.requestId = requestId;
	res.setHeader("X-Request-ID", requestId);
	next();
};
