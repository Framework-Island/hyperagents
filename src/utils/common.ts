import * as fs from "fs";
import * as path from "path";

/**
 * Extract JSON objects from a string that may contain mixed text and JSON.
 * Handles nested braces correctly.
 * 
 * @param text - The text to extract JSON objects from.
 * @return {Record<string, unknown>[]} The JSON objects.
 * 
 * @since v1.0.0
 * @author Muhammad Umer Farooq<umer@lablnet.com>
 */
export function extractJsons(text: string): Record<string, unknown>[] {
  const results: Record<string, unknown>[] = [];
  let depth = 0;
  let start = -1;

  for (let i = 0; i < text.length; i++) {
    if (text[i] === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (text[i] === "}") {
      depth--;
      if (depth === 0 && start !== -1) {
        try {
          const parsed = JSON.parse(text.slice(start, i + 1));
          if (typeof parsed === "object" && parsed !== null) {
            results.push(parsed as Record<string, unknown>);
          }
        } catch {
          // not valid JSON, skip
        }
        start = -1;
      }
    }
  }

  return results;
}

/**
 * Check if a file exists and is not empty.
 * 
 * @param filePath - The path of the file.
 * @return {boolean} True if the file exists and is not empty, false otherwise.
 * 
 * @since v1.0.0
 * @author Muhammad Umer Farooq<umer@lablnet.com>
 */
export function fileExistsAndNotEmpty(filePath: string): boolean {
  try {
    const stat = fs.statSync(filePath);
    return stat.isFile() && stat.size > 0;
  } catch {
    return false;
  }
}

/**
 * Load a JSON file.
 * 
 * @param filePath - The path of the JSON file.
 * @return {T} The JSON object.
 * 
 * @since v1.0.0
 * @author Muhammad Umer Farooq<umer@lablnet.com>
 */
export function loadJsonFile<T = unknown>(filePath: string): T {
  const content = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(content) as T;
}

/**
 * Ensure a directory exists.
 * 
 * @param dirPath - The path of the directory.
 * @return {void}
 * 
 * @since v1.0.0
 * @author Muhammad Umer Farooq<umer@lablnet.com>
 */
export function ensureDir(dirPath: string): void {
  fs.mkdirSync(dirPath, { recursive: true });
}

/**
 * Generate the output directory for a specific generation.
 * 
 * @param outputDir - The path of the output directory.
 * @param genId - The ID of the generation.
 * @return {string} The path of the output directory.
 * 
 * @since v1.0.0
 * @author Muhammad Umer Farooq<umer@lablnet.com>
 */
export function genOutputDir(outputDir: string, genId: string | number): string {
  return path.join(outputDir, `gen_${genId}`);
}
