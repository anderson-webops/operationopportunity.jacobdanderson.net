import type { Request } from "express";
import { serviceLog } from "../serviceLog.js";

type AuditStatus = "success" | "rejected" | "failed";

interface AuditDetails {
	status: AuditStatus;
	targetRole?: string;
	targetId?: string;
	reason?: string;
}

export function auditSecurityEvent(req: Request, event: string, details: AuditDetails) {
	const actor = req.currentPrincipal;
	serviceLog.write({
		level: details.status === "success" ? "info" : "warning",
		type: "security-audit",
		event: event.slice(0, 120),
		status: details.status,
		requestId: req.requestId || "unknown",
		actorRole: actor?.role || "anonymous",
		actorId: actor?.id || null,
		targetRole: details.targetRole?.slice(0, 32) || null,
		targetId: details.targetId?.slice(0, 128) || null,
		reason: details.reason?.slice(0, 128) || null,
		responseDisconnected: Boolean(req.res?.destroyed && !req.res.writableFinished)
	});
}
