import { simpleGit, type SimpleGit } from "simple-git";
import * as fs from "fs";

export interface GitOps {
  git: SimpleGit;
  repoPath: string;
}

/**
 * Create a new GitOps object.
 * 
 * @param repoPath - The path of the repository.
 * @return {GitOps} The GitOps object.
 * 
 * @since v1.0.0
 * @author Muhammad Umer Farooq<umer@lablnet.com>
 */
export function createGitOps(repoPath: string): GitOps {
  return {
    git: simpleGit(repoPath),
    repoPath,
  };
}

/**
 * Apply a diff/patch file to the repository.
 * 
 * @param ops - The GitOps object.
 * @param patchFile - The path of the patch file.
 * @return {Promise<void>}
 * 
 * @since v1.0.0
 * @author Muhammad Umer Farooq<umer@lablnet.com>
 */
export async function applyPatch(ops: GitOps, patchFile: string): Promise<void> {
  if (!fs.existsSync(patchFile)) {
    throw new Error(`Patch file not found: ${patchFile}`);
  }
  await ops.git.raw(["apply", "--allow-empty", patchFile]);
}

/**
 * Apply multiple patch files in order.
 * 
 * @param ops - The GitOps object.
 * @param patchFiles - The paths of the patch files.
 * @return {Promise<void>}
 * 
 * @since v1.0.0
 * @author Muhammad Umer Farooq<umer@lablnet.com>
 */
export async function applyPatches(ops: GitOps, patchFiles: string[]): Promise<void> {
  for (const patch of patchFiles) {
    await applyPatch(ops, patch);
  }
}

/**
 * Get the diff between the current state and a base commit.
 * 
 * @param ops - The GitOps object.
 * @param baseCommit - The commit to diff against.
 * @return {Promise<string>} The diff.
 * 
 * @since v1.0.0
 * @author Muhammad Umer Farooq<umer@lablnet.com>
 */
export async function diffVersusCommit(ops: GitOps, baseCommit: string): Promise<string> {
  return ops.git.diff([baseCommit]);
}

/**
 * Reset specific paths to a given commit.
 * 
 * @param ops - The GitOps object.
 * @param commit - The commit to reset to.
 * @param paths - The paths to reset.
 * @return {Promise<void>}
 * 
 * @since v1.0.0
 * @author Muhammad Umer Farooq<umer@lablnet.com>
 */
export async function resetPathsToCommit(
  ops: GitOps,
  commit: string,
  paths: string[]
): Promise<void> {
  await ops.git.raw(["checkout", commit, "--", ...paths]);
}

/**
 * Hard reset the repo to a commit.
 * 
 * @param ops - The GitOps object.
 * @param commit - The commit to reset to.
 * @return {Promise<void>}
 * 
 * @since v1.0.0
 * @author Muhammad Umer Farooq<umer@lablnet.com>
 */
export async function hardReset(ops: GitOps, commit: string): Promise<void> {
  await ops.git.reset(["--hard", commit]);
  await ops.git.clean("f", ["-d"]);
}

/**
 * Get the current HEAD commit hash.
 * 
 * @param ops - The GitOps object.
 * @return {Promise<string>} The current HEAD commit hash.
 * 
 * @since v1.0.0
 * @author Muhammad Umer Farooq<umer@lablnet.com>
 */
export async function getHeadCommit(ops: GitOps): Promise<string> {
  const log = await ops.git.log({ maxCount: 1 });
  return log.latest?.hash ?? "HEAD";
}
