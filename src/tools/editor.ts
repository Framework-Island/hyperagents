import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

// The history of the file edits.
const fileHistory: Map<string, string[]> = new Map();

/**
 * Truncate the content of the file.
 * 
 * @param content - The content of the file.
 * @param max - The maximum length of the content.
 * @return {string} The truncated content.
 * 
 * @since v1.0.0
 * @author Muhammad Umer Farooq<umer@lablnet.com>
 */
function truncate(content: string, max = 10000): string {
  if (content.length <= max) return content;
  const half = Math.floor(max / 2);
  return content.slice(0, half) + "\n<response clipped>\n" + content.slice(-half);
}

/**
 * Format the content of the file with line numbers.
 * 
 * @param content - The content of the file.
 * @param filePath - The path of the file.
 * @param startLine - The starting line number.
 * @return {string} The formatted content.
 * 
 * @since v1.0.0
 * @author Muhammad Umer Farooq<umer@lablnet.com>
 */
function formatWithLineNumbers(content: string, filePath: string, startLine = 1): string {
  const numbered = content
    .split("\n")
    .map((line, i) => `${String(i + startLine).padStart(6)}\t${line}`)
    .join("\n");
  return `Result of cat -n on ${filePath}:\n${numbered}\n`;
}

/**
 * Create a new Editor tool.
 * 
 * @param options - The options for the Editor tool.
 * @return {DynamicStructuredTool} The Editor tool.
 * 
 * @since v1.0.0
 * @author Muhammad Umer Farooq<umer@lablnet.com>
 */
export function createEditorTool(options?: { timeout?: number }): DynamicStructuredTool {
  const timeout = options?.timeout ?? 120_000; // 120 seconds

  return new DynamicStructuredTool({
    name: "editor",
    description:
      "File viewing and editing tool. Commands: view, create, str_replace, insert, undo_edit. " +
      "For str_replace, old_str must match EXACTLY and be unique in the file.",
    schema: z.object({
      command: z
        .enum(["view", "create", "str_replace", "insert", "undo_edit"])
        .describe("The operation to perform."),
      path: z.string().describe("Absolute path to file or directory."),
      file_text: z.string().optional().describe("Content for create command."),
      old_str: z.string().optional().describe("String to find for str_replace."),
      new_str: z.string().optional().describe("Replacement string for str_replace or insert."),
      insert_line: z.number().optional().describe("Line number for insert (0-indexed, inserts after this line)."),
      view_range: z
        .array(z.number())
        .optional()
        .describe("Line range [start, end] for view (1-indexed, use -1 for end of file)."),
    }),
    func: async ({ command, path: filePath, file_text, old_str, new_str, insert_line, view_range }) => {
      try {
        if (command === "view") {
          return viewFile(filePath, view_range as [number, number] | undefined);
        }
        if (command === "create") {
          if (!file_text) return "Error: file_text is required for create.";
          if (fs.existsSync(filePath)) return `Error: File already exists at ${filePath}. Use str_replace to edit.`;
          fs.mkdirSync(path.dirname(filePath), { recursive: true });
          fs.writeFileSync(filePath, file_text);
          return `File created at: ${filePath}`;
        }
        if (command === "str_replace") {
          if (!old_str) return "Error: old_str is required for str_replace.";
          return replaceText(filePath, old_str, new_str ?? "");
        }
        if (command === "insert") {
          if (insert_line == null) return "Error: insert_line is required for insert.";
          if (new_str == null) return "Error: new_str is required for insert.";
          return insertText(filePath, insert_line, new_str);
        }
        if (command === "undo_edit") {
          return undoEdit(filePath);
        }
        return `Error: Unknown command ${command}`;
      } catch (err) {
        return `Error: ${err}`;
      }
    },
  });
}

/**
 * View the content of the file.
 * 
 * @param filePath - The path of the file.
 * @param viewRange - The range of the lines to view.
 * @return {string} The content of the file.
 * 
 * @since v1.0.0
 * @author Muhammad Umer Farooq<umer@lablnet.com>
 */
function viewFile(filePath: string, viewRange?: [number, number]): string {
  if (fs.statSync(filePath).isDirectory()) {
    try {
      const result = execSync(
        `find "${filePath}" -maxdepth 2 -not -path '*/\\.*'`,
        { encoding: "utf-8" }
      );
      return `Files in ${filePath}:\n${truncate(result, 5000)}`;
    } catch {
      return `Error listing directory ${filePath}`;
    }
  }

  const content = fs.readFileSync(filePath, "utf-8");

  if (!viewRange) {
    return formatWithLineNumbers(truncate(content), filePath);
  }

  const lines = content.split("\n");
  const [start, end] = viewRange;
  const sliced = lines.slice(start - 1, end === -1 ? undefined : end);
  return formatWithLineNumbers(sliced.join("\n"), filePath, start);
}

/**
 * Replace the text in the file.
 * 
 * @param filePath - The path of the file.
 * @param oldStr - The old text to replace.
 * @param newStr - The new text to replace with.
 * @return {string} The content of the file.
 * 
 * @since v1.0.0
 * @author Muhammad Umer Farooq<umer@lablnet.com>
 */
function replaceText(filePath: string, oldStr: string, newStr: string): string {
  const content = fs.readFileSync(filePath, "utf-8");
  const count = content.split(oldStr).length - 1;

  if (count === 0) return `Error: old_str not found in ${filePath}.`;
  if (count > 1) return `Error: old_str appears ${count} times. Make it unique.`;

  const history = fileHistory.get(filePath) ?? [];
  history.push(content);
  fileHistory.set(filePath, history);

  const newContent = content.replace(oldStr, newStr);
  fs.writeFileSync(filePath, newContent);

  const replaceLine = content.split(oldStr)[0].split("\n").length - 1;
  const start = Math.max(0, replaceLine - 3);
  const end = replaceLine + 4 + newStr.split("\n").length;
  const snippet = newContent.split("\n").slice(start, end).join("\n");

  return `File ${filePath} edited. ${formatWithLineNumbers(snippet, filePath, start + 1)}`;
}

/**
 * Insert the text into the file.
 * 
 * @param filePath - The path of the file.
 * @param insertLine - The line number to insert the text at.
 * @param newStr - The text to insert.
 * @return {string} The content of the file.
 * 
 * @since v1.0.0
 * @author Muhammad Umer Farooq<umer@lablnet.com>
 */
function insertText(filePath: string, insertLine: number, newStr: string): string {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  if (insertLine < 0 || insertLine > lines.length) {
    return `Error: insert_line ${insertLine} out of range [0, ${lines.length}].`;
  }

  const history = fileHistory.get(filePath) ?? [];
  history.push(content);
  fileHistory.set(filePath, history);

  const newLines = [...lines.slice(0, insertLine), ...newStr.split("\n"), ...lines.slice(insertLine)];
  fs.writeFileSync(filePath, newLines.join("\n"));

  return `File ${filePath} edited. Inserted at line ${insertLine}.`;
}

/**
 * Undo the last edit to the file.
 * 
 * @param filePath - The path of the file.
 * @return {string} The content of the file.
 * 
 * @since v1.0.0
 * @author Muhammad Umer Farooq<umer@lablnet.com>
 */
function undoEdit(filePath: string): string {
  const history = fileHistory.get(filePath);
  if (!history || history.length === 0) return `No edit history for ${filePath}.`;

  const prev = history.pop()!;
  fs.writeFileSync(filePath, prev);
  return `Reverted last edit to ${filePath}.`;
}
