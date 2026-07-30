import type { AccountRole } from "../types/account.js";

export function canMutateAdmin(actorId: string, actorCanManageAdmins: boolean, targetId: string): boolean {
	return actorId === targetId || actorCanManageAdmins;
}

export function adminRemovalBlockReason(
	adminCount: number,
	adminManagerCount: number,
	targetIsManager: boolean
): "last_admin" | "last_admin_manager" | null {
	if (adminCount <= 1) return "last_admin";
	if (targetIsManager && adminManagerCount <= 1) return "last_admin_manager";
	return null;
}

export function canUserMutateSelf(role: AccountRole, actorId: string, targetId: string): boolean {
	return role === "user" && actorId === targetId;
}

export function canStaffUpdateUser(role: AccountRole, actorId: string, assignedTutorId: string | null): boolean {
	return role === "admin" || (role === "tutor" && actorId === assignedTutorId);
}

export function canAssignTutor(role: AccountRole, actorId: string, targetUserId: string): boolean {
	return role === "admin" || canUserMutateSelf(role, actorId, targetUserId);
}
