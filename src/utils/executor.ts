import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { execSync } from "child_process";
import { DockerManager, type DockerConfig } from "./docker";
import { createGitOps, applyPatches, hardReset, type GitOps } from "./git";

/**
 * Execution strategy interface.
 * Abstracts whether generations run locally or inside Docker containers.
 */
export interface Executor {
  setup(patchFiles: string[]): Promise<void>;
  run(command: string, workdir?: string): Promise<{ exitCode: number; output: string }>;
  copyIn(src: string, dest: string): Promise<void>;
  copyOut(src: string, dest: string): Promise<void>;
  diff(): Promise<string>;
  getWorkdir(): string;
  cleanup(): Promise<void>;
}

/**
 * LocalExecutor -- runs generations in a temporary directory.
 * Fast for development and testing. No sandboxing.
 */
export class LocalExecutor implements Executor {
  private workdir: string;
  private gitOps: GitOps | null = null;
  private baseCommit: string;

  /**
   * Create a new LocalExecutor.
   * 
   * @param repoPath - The path of the repository.
   * @param baseCommit - The commit to reset to.
   * @return {void}
   * 
   * @since v1.0.0
   * @author Muhammad Umer Farooq<umer@lablnet.com>
   */
  constructor(
    private repoPath: string,
    baseCommit: string = "HEAD"
  ) {
    this.baseCommit = baseCommit;
    this.workdir = fs.mkdtempSync(path.join(os.tmpdir(), "hyperagents-"));
  }

  /**
   * Setup the LocalExecutor.
   * 
   * @param patchFiles - The paths of the patch files.
   * @return {Promise<void>}
   * 
   * @since v1.0.0
   * @author Muhammad Umer Farooq<umer@lablnet.com>
   */
  async setup(patchFiles: string[]): Promise<void> {
    execSync(`cp -r "${this.repoPath}/." "${this.workdir}/"`, { stdio: "pipe" });

    if (fs.existsSync(path.join(this.workdir, ".git"))) {
      this.gitOps = createGitOps(this.workdir);
      if (patchFiles.length > 0) {
        await applyPatches(this.gitOps, patchFiles);
      }
    } else if (patchFiles.length > 0) {
      console.warn("[LocalExecutor] No .git directory found; skipping patch application");
    }
  }

  /**
   * Run a command in the LocalExecutor.
   * 
   * @param command - The command to run.
   * @param workdir - The working directory to run the command in.
   * @return {Promise<{ exitCode: number; output: string }>} The exit code and output of the command.
   * 
   * @since v1.0.0
   * @author Muhammad Umer Farooq<umer@lablnet.com>
   */
  async run(command: string, workdir?: string): Promise<{ exitCode: number; output: string }> {
    const cwd = workdir ?? this.workdir;
    try {
      const output = execSync(command, {
        cwd,
        encoding: "utf-8",
        timeout: 6 * 60 * 60 * 1000,
        stdio: ["pipe", "pipe", "pipe"],
      });
      return { exitCode: 0, output };
    } catch (err: unknown) {
      const e = err as { status?: number; stdout?: string; stderr?: string };
      return {
        exitCode: e.status ?? 1,
        output: `${e.stdout ?? ""}\n${e.stderr ?? ""}`.trim(),
      };
    }
  }

  /**
   * Copy a file into the LocalExecutor.
   * 
   * @param src - The path of the file to copy.
   * @param dest - The path of the file to copy to.
   * @return {Promise<void>}
   * 
   * @since v1.0.0
   * @author Muhammad Umer Farooq<umer@lablnet.com>
   */
  async copyIn(src: string, dest: string): Promise<void> {
    const fullDest = path.isAbsolute(dest) ? dest : path.join(this.workdir, dest);
    fs.mkdirSync(path.dirname(fullDest), { recursive: true });
    execSync(`cp -r "${src}" "${fullDest}"`, { stdio: "pipe" });
  }


  /**
   * Copy a file out of the LocalExecutor.
   * 
   * @param src - The path of the file to copy.
   * @param dest - The path of the file to copy to.
   * @return {Promise<void>}
   * 
   * @since v1.0.0
   * @author Muhammad Umer Farooq<umer@lablnet.com>
   */
  async copyOut(src: string, dest: string): Promise<void> {
    const fullSrc = path.isAbsolute(src) ? src : path.join(this.workdir, src);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    execSync(`cp -r "${fullSrc}" "${dest}"`, { stdio: "pipe" });
  }


  /**
   * Get the working directory of the LocalExecutor.
   * 
   * @return {string} The working directory.
   * 
   * @since v1.0.0
   * @author Muhammad Umer Farooq<umer@lablnet.com>
   */
  getWorkdir(): string {
    return this.workdir;
  }

  async diff(): Promise<string> {
    if (this.gitOps) {
      return this.gitOps.git.diff();
    }
    return "";
  }

  async cleanup(): Promise<void> {
    if (this.gitOps) {
      try {
        await hardReset(this.gitOps, this.baseCommit);
      } catch {
        // best effort
      }
    }
    try {
      fs.rmSync(this.workdir, { recursive: true, force: true });
    } catch {
      // best effort
    }
  }
}

/**
 * DockerExecutor -- runs generations inside Docker containers.
 * Safe for untrusted LLM-generated code.
 */
export class DockerExecutor implements Executor {
  private docker: DockerManager;
  private container: import("dockerode").Container | null = null;
  private containerWorkdir: string;

  /**
   * Create a new DockerExecutor.
   * 
   * @param config - The configuration of the DockerExecutor.
   * @return {void}
   * 
   * @since v1.0.0
   * @author Muhammad Umer Farooq<umer@lablnet.com>
   */
  constructor(private config: DockerConfig & { containerName: string }) {
    this.docker = new DockerManager();
    this.containerWorkdir = `/${path.basename(config.rootDir)}`;
  }

  /**
   * Setup the DockerExecutor.
   * 
   * @param patchFiles - The paths of the patch files.
   * @return {Promise<void>}
   * 
   * @since v1.0.0
   * @author Muhammad Umer Farooq<umer@lablnet.com>
   */
  async setup(patchFiles: string[]): Promise<void> {
    this.container = await this.docker.createContainer(
      this.config,
      this.config.containerName
    );

    if (patchFiles.length > 0) {
      for (const patch of patchFiles) {
        await this.docker.copyToContainer(this.container, patch, `/tmp/${path.basename(patch)}`);
        await this.docker.exec(
          this.container,
          ["git", "apply", "--allow-empty", `/tmp/${path.basename(patch)}`],
          this.containerWorkdir
        );
      }
    }
  }

  /**
   * Run a command in the DockerExecutor.
   * 
   * @param command - The command to run.
   * @param workdir - The working directory to run the command in.
   * @return {Promise<{ exitCode: number; output: string }>} The exit code and output of the command.
   * 
   * @since v1.0.0
   * @author Muhammad Umer Farooq<umer@lablnet.com>
   */
  async run(command: string, workdir?: string): Promise<{ exitCode: number; output: string }> {
    if (!this.container) throw new Error("Container not initialized. Call setup() first.");
    return this.docker.exec(
      this.container,
      ["bash", "-lc", command],
      workdir ?? this.containerWorkdir
    );
  }

  /**
   * Copy a file into the DockerExecutor.
   * 
   * @param src - The path of the file to copy.
   * @param dest - The path of the file to copy to.
   * @return {Promise<void>}
   * 
   * @since v1.0.0
   * @author Muhammad Umer Farooq<umer@lablnet.com>
   */
  async copyIn(src: string, dest: string): Promise<void> {
    if (!this.container) throw new Error("Container not initialized.");
    await this.docker.copyToContainer(this.container, src, dest);
  }

  /**
   * Copy a file out of the DockerExecutor.
   * 
   * @param src - The path of the file to copy.
   * @param dest - The path of the file to copy to.
   * @return {Promise<void>}
   * 
   * @since v1.0.0
   * @author Muhammad Umer Farooq<umer@lablnet.com>
   */
  async copyOut(src: string, dest: string): Promise<void> {
    if (!this.container) throw new Error("Container not initialized.");
    await this.docker.copyFromContainer(this.container, src, dest);
  }


  /**
   * Get the working directory of the DockerExecutor.
   * 
   * @return {string} The working directory.
   * 
   * @since v1.0.0
   * @author Muhammad Umer Farooq<umer@lablnet.com>
   */
  getWorkdir(): string {
    return this.containerWorkdir;
  }

  async diff(): Promise<string> {
    if (!this.container) return "";
    const { output } = await this.docker.exec(this.container, ["git", "diff"], this.containerWorkdir);
    return output;
  }

  async cleanup(): Promise<void> {
    if (this.container) {
      await this.docker.cleanup(this.container);
      this.container = null;
    }
  }
}

/**
 * Create a new Executor.
 * 
 * @param mode - The mode of the Executor.
 * @param options - The options of the Executor.
 * @return {Executor} The Executor.
 * 
 * @since v1.0.0
 * @author Muhammad Umer Farooq<umer@lablnet.com>
 */
export function createExecutor(
  mode: "local" | "docker",
  options: {
    repoPath: string;
    baseCommit?: string;
    imageName?: string;
    containerName?: string;
    env?: Record<string, string>;
  }
): Executor {
  if (mode === "docker") {
    return new DockerExecutor({
      imageName: options.imageName ?? "hyperagents",
      rootDir: options.repoPath,
      containerName: options.containerName ?? `hyperagents-${Date.now()}`,
      env: options.env,
    });
  }

  return new LocalExecutor(options.repoPath, options.baseCommit);
}
