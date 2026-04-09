import * as fs from "fs";
import * as path from "path";
import { ARCHIVE_FILENAME, METADATA_FILENAME } from "./constants";

export interface ArchiveEntry {
  genId: string | number;
  parentId: string | number | null;
  patchFiles: string[];
  scores: Record<string, number>;
  metadata: Record<string, unknown>;
  validParent: boolean;
  timestamp: string;
}

export interface ArchiveData {
  archive: (string | number)[];
  entries: Record<string, ArchiveEntry>;
}

/**
 * Load the archive from a JSONL file.
 * Each line is a JSON object representing a snapshot of the archive state.
 * 
 * @param outputDir - The path of the output directory.
 * @return {ArchiveData} The archive data.
 * 
 * @since v1.0.0
 * @author Muhammad Umer Farooq<umer@lablnet.com>
 */
export function loadArchive(outputDir: string): ArchiveData {
  const archivePath = path.join(outputDir, ARCHIVE_FILENAME);

  if (!fs.existsSync(archivePath)) {
    return { archive: [], entries: {} };
  }

  const lines = fs.readFileSync(archivePath, "utf-8").trim().split("\n").filter(Boolean);

  if (lines.length === 0) {
    return { archive: [], entries: {} };
  }

  const lastLine = lines[lines.length - 1];
  return JSON.parse(lastLine) as ArchiveData;
}

/**
 * Append a new archive snapshot to the JSONL file.
 * 
 * @param outputDir - The path of the output directory.
 * @param data - The archive data to save.
 * @return {void}
 * 
 * @since v1.0.0
 * @author Muhammad Umer Farooq<umer@lablnet.com>
 */
export function saveArchive(outputDir: string, data: ArchiveData): void {
  const archivePath = path.join(outputDir, ARCHIVE_FILENAME);
  fs.appendFileSync(archivePath, JSON.stringify(data) + "\n");
}

/**
 * Add a new generation to the archive and persist.
 * 
 * @param outputDir - The path of the output directory.
 * @param currentArchive - The current archive data.
 * @param newEntry - The new entry to add to the archive.
 * @return {ArchiveData} The updated archive data.
 * 
 * @since v1.0.0
 * @author Muhammad Umer Farooq<umer@lablnet.com>
 */
export function updateArchive(
  outputDir: string,
  currentArchive: ArchiveData,
  newEntry: ArchiveEntry
): ArchiveData {
  const updated: ArchiveData = {
    archive: [...currentArchive.archive, newEntry.genId],
    entries: {
      ...currentArchive.entries,
      [String(newEntry.genId)]: newEntry,
    },
  };

  saveArchive(outputDir, updated);
  return updated;
}

/**
 * Load metadata for a specific generation.
 * 
 * @param outputDir - The path of the output directory.
 * @param genId - The ID of the generation.
 * @return {Record<string, unknown>} The metadata.
 * 
 * @since v1.0.0
 * @author Muhammad Umer Farooq<umer@lablnet.com>
 */
export function loadGenMetadata(
  outputDir: string,
  genId: string | number
): Record<string, unknown> {
  const metaPath = path.join(outputDir, `gen_${genId}`, METADATA_FILENAME);

  if (!fs.existsSync(metaPath)) {
    return {};
  }

  return JSON.parse(fs.readFileSync(metaPath, "utf-8"));
}

/**
 * Save metadata for a specific generation.
 * 
 * @param outputDir - The path of the output directory.
 * @param genId - The ID of the generation.
 * @param metadata - The metadata to save.
 * @return {void}
 * 
 * @since v1.0.0
 * @author Muhammad Umer Farooq<umer@lablnet.com>
 */
export function saveGenMetadata(
  outputDir: string,
  genId: string | number,
  metadata: Record<string, unknown>
): void {
  const genDir = path.join(outputDir, `gen_${genId}`);
  fs.mkdirSync(genDir, { recursive: true });

  const metaPath = path.join(genDir, METADATA_FILENAME);
  fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2));
}

/**
 * Update specific keys in a generation's metadata.
 * 
 * @param outputDir - The path of the output directory.
 * @param genId - The ID of the generation.
 * @param updates - The updates to apply to the metadata.
 * @return {void}
 * 
 * @since v1.0.0
 * @author Muhammad Umer Farooq<umer@lablnet.com>
 */
export function updateGenMetadata(
  outputDir: string,
  genId: string | number,
  updates: Record<string, unknown>
): void {
  const existing = loadGenMetadata(outputDir, genId);
  saveGenMetadata(outputDir, genId, { ...existing, ...updates });
}

/**
 * Get a specific metadata key for a generation.
 * 
 * @param outputDir - The path of the output directory.
 * @param genId - The ID of the generation.
 * @param key - The key to get the metadata for.
 * @return {unknown} The metadata.
 * 
 * @since v1.0.0
 * @author Muhammad Umer Farooq<umer@lablnet.com>
 */
export function getGenMetadataKey(
  outputDir: string,
  genId: string | number,
  key: string
): unknown {
  const meta = loadGenMetadata(outputDir, genId);
  return meta[key];
}

/**
 * Get patch files for a generation from its metadata.
 * 
 * @param outputDir - The path of the output directory.
 * @param genId - The ID of the generation.
 * @return {string[]} The patch files.
 * 
 * @since v1.0.0
 * @author Muhammad Umer Farooq<umer@lablnet.com>
 */
export function getPatchFiles(outputDir: string, genId: string | number): string[] {
  const meta = loadGenMetadata(outputDir, genId);
  const prevPatches = (meta.prev_patch_files as string[]) ?? [];
  const currPatches = (meta.curr_patch_files as string[]) ?? [];
  return [...prevPatches, ...currPatches];
}

/**
 * Get the score for a domain/generation combination.
 * 
 * @param domain - The domain to get the score for.
 * @param outputDir - The path of the output directory.
 * @param genId - The ID of the generation.
 * @param split - The split to get the score for.
 * @return {number | null} The score.
 * 
 * @since v1.0.0
 * @author Muhammad Umer Farooq<umer@lablnet.com>
 */
export function getScore(
  domain: string,
  outputDir: string,
  genId: string | number,
  split: string = "train"
): number | null {
  const evalDir =
    split === "train"
      ? `${domain}_eval`
      : `${domain}_eval_${split}`;

  const reportPath = path.join(outputDir, `gen_${genId}`, evalDir, "report.json");

  if (!fs.existsSync(reportPath)) {
    return null;
  }

  try {
    const report = JSON.parse(fs.readFileSync(reportPath, "utf-8"));
    return report.averageScore ?? null;
  } catch {
    return null;
  }
}

/**
 * Check if a generation is a starting node.
 * 
 * @param genId - The ID of the generation.
 * @return {boolean} True if the generation is a starting node, false otherwise.
 * 
 * @since v1.0.0
 * @author Muhammad Umer Farooq<umer@lablnet.com>
 */
export function isStartingNode(genId: string | number): boolean {
  return genId === "initial" || genId === 0;
}

/**
 * Compute the average score for a single generation across all domains.
 * 
 * @param outputDir - The path of the output directory.
 * @param genId - The ID of the generation.
 * @param domains - The names of the domains.
 * @param split - The split to get the score for.
 * @return {number | null} The average score.
 * 
 * @since v1.0.0
 * @author Muhammad Umer Farooq<umer@lablnet.com>
 * 
 */
export function getAvgScore(
  outputDir: string,
  genId: string | number,
  domains: string[],
  split: string = "train"
): number | null {
  const scores: number[] = [];
  for (const domain of domains) {
    const s = getScore(domain, outputDir, genId, split);
    if (s != null) scores.push(s);
  }

  if (scores.length === domains.length) {
    return scores.reduce((a, b) => a + b, 0) / scores.length;
  }
  if (isStartingNode(genId) && scores.length > 0) {
    return scores.reduce((a, b) => a + b, 0) / scores.length;
  }
  return null;
}

/**
 * Find the best (highest) average score across all generations in the archive.
 * 
 * @param archive - The archive data.
 * @param outputDir - The path of the output directory.
 * @param domains - The names of the domains.
 * @param split - The split to get the score for.
 * @return {number} The best score.
 * 
 * @since v1.0.0
 * @author Muhammad Umer Farooq<umer@lablnet.com>
 * 
 */
export function getBestScore(
  archive: ArchiveData,
  outputDir: string,
  domains: string[],
  split: string = "train"
): number {
  let best = -1;
  for (const genId of archive.archive) {
    const avg = getAvgScore(outputDir, genId, domains, split);
    if (avg != null && avg > best) best = avg;
  }
  return best;
}
