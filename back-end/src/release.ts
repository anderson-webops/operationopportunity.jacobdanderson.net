import { env } from "node:process";

export const RELEASE_VERSION = "v2.3.0";

const COMMIT_PATTERN = /^[0-9a-f]{7,64}$/i;
const ISO_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;

export interface DeploymentIdentity {
	release: string;
	commit: string | null;
	deployedAt: string | null;
}

export function getDeploymentIdentity(): DeploymentIdentity {
	const commit = env.OPPORTUNITY_COMMIT_SHA?.trim() || null;
	const deployedAt = env.OPPORTUNITY_DEPLOYED_AT?.trim() || null;

	return {
		release: RELEASE_VERSION,
		commit: commit && COMMIT_PATTERN.test(commit) ? commit : null,
		deployedAt: deployedAt && ISO_TIMESTAMP_PATTERN.test(deployedAt) ? deployedAt : null
	};
}
