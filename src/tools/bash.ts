import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { execSync } from "child_process";

/**
 * Create a new Bash tool.
 * 
 * @param options - The options for the Bash tool.
 * @return {DynamicStructuredTool} The Bash tool.
 * 
 * @since v1.0.0
 * @author Muhammad Umer Farooq<umer@lablnet.com>
 */
export function createBashTool(options?: { timeout?: number }): DynamicStructuredTool {
  const timeout = options?.timeout ?? 120_000; // 120 seconds

  return new DynamicStructuredTool({
    name: "bash",
    description:
      "Run commands in a bash shell. State is NOT persistent across calls. " +
      "Avoid commands that produce very large output. " +
      "Run long-lived commands in the background with &.",
    schema: z.object({
      command: z.string().describe("The bash command to run."),
    }),
    func: async ({ command }) => {
      try {
        const output = execSync(command, {
          encoding: "utf-8",
          timeout,
          stdio: ["pipe", "pipe", "pipe"],
          shell: "/bin/bash",
        });
        return output.trim() || "(no output)";
      } catch (err: unknown) {
        const e = err as { stdout?: string; stderr?: string; status?: number };
        const stdout = (e.stdout ?? "").trim();
        const stderr = (e.stderr ?? "").trim();
        let result = "";
        if (stdout) result += stdout;
        if (stderr) result += (result ? "\n" : "") + "Error:\n" + stderr;
        return result || `Command failed with exit code ${e.status ?? 1}`;
      }
    },
  });
}
