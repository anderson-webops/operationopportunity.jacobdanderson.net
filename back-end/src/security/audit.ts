import type { Request } from "express";

type AuditStatus = "success" | "rejected" | "failed";

interface AuditDetails {
	status: AuditStatus;
	targetRole?: string;
	targetId?: string;
	reason?: string;
}

export function auditSecurityEvent(req: Request, event: string, details: AuditDetails) {
	const actor = req.currentPrincipal;
	console.log(JSON.stringify({
		level: details.status === "success" ? "info" : "warning",
		type: "security-audit",
		event,
		status: details.status,
		requestId: req.requestId || "unknown",
		actorRole: actor?.role || "anonymous",
		actorId: actor?.id || null,
		targetRole: details.targetRole || null,
		targetId: details.targetId || null,
		reason: details.reason || null
	}));
}
