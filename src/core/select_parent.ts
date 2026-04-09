import type { ArchiveData } from "../utils/archive";
import { isStartingNode, getGenMetadataKey, getAvgScore } from "../utils/archive";

export type SelectionStrategy = "random" | "latest" | "best" | "score_prop" | "score_child_prop";

/**
 * Select a parent generation from the archive using the given strategy.
 * 
 * @param archive - The archive data.
 * @param outputDir - The path of the output directory.
 * @param domains - The names of the domains.
 * @param method - The selection strategy.
 * @return {string | number} The selected parent generation ID.
 * 
 * @since v1.0.0
 * @author Muhammad Umer Farooq<umer@lablnet.com>
 */
export function selectParent(
  archive: ArchiveData,
  outputDir: string,
  domains: string[],
  method: SelectionStrategy = "score_child_prop"
): string | number {
  // Get the valid candidates.
  const candidates = getValidCandidates(archive, outputDir, domains);

  // If no valid candidates were found, throw an error.
  if (candidates.length === 0) {
    throw new Error("No valid parent candidates found in the archive.");
  }

  switch (method) {
    case "random":
      // Select a random parent.
      return randomSelect(candidates);
    case "latest":
      // Select the latest parent.
      return latestSelect(candidates);
    case "best":
      // Select the best parent.
      return bestSelect(candidates);
    case "score_prop":
      // Select a parent based on the score.
      return scorePropSelect(candidates);
    case "score_child_prop":
      // Select a parent based on the score and child count.
      return scoreChildPropSelect(candidates, archive, outputDir);
    default:
      throw new Error(`Unknown selection strategy: ${method}`);
  }
}

interface Candidate {
  genId: string | number;
  score: number;
}

/**
 * Get the valid candidates from the archive.
 * 
 * @param archive - The archive data.
 * @param outputDir - The path of the output directory.
 * @param domains - The names of the domains.
 * @return {Candidate[]} The valid candidates.
 * 
 * @since v1.0.0
 * @author Muhammad Umer Farooq<umer@lablnet.com>
 */
function getValidCandidates(
  archive: ArchiveData,
  outputDir: string,
  domains: string[]
): Candidate[] {
  // Initialize the candidates array.
  const candidates: Candidate[] = [];

  // Loop through the archive.
  for (const genId of archive.archive) {
    // Check if the generation is a starting node.
    const validParent = isStartingNode(genId)
      ? true
      : (getGenMetadataKey(outputDir, genId, "valid_parent") as boolean | undefined) !== false;
    // If the generation is not a valid parent, continue.
    if (!validParent) continue;

    const avgScore = getAvgScore(outputDir, genId, domains);
    if (avgScore != null) {
      candidates.push({ genId, score: avgScore });
    } else if (isStartingNode(genId)) {
      candidates.push({ genId, score: 0 });
    }
  }

  return candidates;
}

/**
 * Select a random parent from the candidates.
 * 
 * @param candidates - The candidates.
 * @return {string | number} The selected parent generation ID.
 * 
 * @since v1.0.0
 * @author Muhammad Umer Farooq<umer@lablnet.com>
 */
function randomSelect(candidates: Candidate[]): string | number {
  // Select a random parent from the candidates.
  return candidates[Math.floor(Math.random() * candidates.length)].genId;
}

/**
 * Select the latest parent from the candidates.
 * 
 * @param candidates - The candidates.
 * @return {string | number} The selected parent generation ID.
 * 
 * @since v1.0.0
 * @author Muhammad Umer Farooq<umer@lablnet.com>
 */
function latestSelect(candidates: Candidate[]): string | number {
  return candidates[candidates.length - 1].genId;
}


function bestSelect(candidates: Candidate[]): string | number {
  let best = candidates[0];
  for (const c of candidates) {
    if (c.score > best.score) best = c;
  }
  return best.genId;
}

/**
 * Select a parent based on the score.
 * 
 * @param candidates - The candidates.
 * @return {string | number} The selected parent generation ID.
 * 
 * @since v1.0.0
 * @author Muhammad Umer Farooq<umer@lablnet.com>
 */
function scorePropSelect(candidates: Candidate[]): string | number {
  // Calculate the minimum score.
  const minScore = Math.min(...candidates.map((c) => c.score));
  // Shift the scores to be positive.
  const shifted = candidates.map((c) => ({
    ...c,
    weight: c.score - minScore + 0.01,
  }));

  // Calculate the total weight.
  const totalWeight = shifted.reduce((sum, c) => sum + c.weight, 0);
  // Generate a random number between 0 and the total weight.
  let rand = Math.random() * totalWeight;
  // Loop through the shifted candidates.

  // Return the candidate ID if the random number is less than or equal to the weight.
  for (const c of shifted) {
    rand -= c.weight;
    if (rand <= 0) return c.genId;
  }

  // Return the last candidate ID.
  return shifted[shifted.length - 1].genId;
}

/**
 * Select a parent based on the score and child count.
 * 
 * @param candidates - The candidates.
 * @param archive - The archive data.
 * @param outputDir - The path of the output directory.
 * @return {string | number} The selected parent generation ID.
 * 
 * @since v1.0.0
 * @author Muhammad Umer Farooq<umer@lablnet.com>
 */
function scoreChildPropSelect(
  candidates: Candidate[],
  archive: ArchiveData,
  outputDir: string
): string | number {
  // Initialize the child counts object.
  const childCounts: Record<string, number> = {};
  // Loop through the candidates.
  for (const c of candidates) {
    childCounts[String(c.genId)] = 0;
  }

  // Loop through the archive.
  for (const genId of archive.archive) {
    // Get the entry for the generation.
    const entry = archive.entries[String(genId)];
    // If the entry has a parent ID and the parent ID is in the child counts, increment the child count.
    if (entry?.parentId != null && String(entry.parentId) in childCounts) {
      childCounts[String(entry.parentId)]++;
    }
  }

  // Calculate the weighted scores.
  const weighted = candidates.map((c) => {
    // Get the number of children for the candidate.
    const children = childCounts[String(c.genId)] ?? 0;
    // Calculate the child penalty.
    const childPenalty = 1 / (1 + children);
    return { ...c, weight: (c.score + 0.01) * childPenalty };
  });

  // Calculate the total weight.
  const totalWeight = weighted.reduce((sum, c) => sum + c.weight, 0);
  // Generate a random number between 0 and the total weight.
  let rand = Math.random() * totalWeight;
  // Loop through the weighted candidates.

  // Return the candidate ID if the random number is less than or equal to the weight.
  for (const c of weighted) {
    rand -= c.weight;
    if (rand <= 0) return c.genId;
  }

  // Return the last candidate ID.
  return weighted[weighted.length - 1].genId;
}
