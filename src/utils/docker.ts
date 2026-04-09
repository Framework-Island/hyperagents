import Dockerode from "dockerode";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

export interface DockerConfig {
  imageName: string;
  rootDir: string;
  env?: Record<string, string>;
}

export class DockerManager {
  private client: Dockerode;

  constructor() {
    this.client = new Dockerode();
  }

  /**
   * Build a Docker image from a directory containing a Dockerfile.
   * 
   * @param contextDir - The path of the context directory.
   * @param imageName - The name of the image.
   * @return {Promise<void>}
   * 
   * @since v1.0.0
   * @author Muhammad Umer Farooq<umer@lablnet.com>
   */
  async buildImage(contextDir: string, imageName: string): Promise<void> {
    const stream = await this.client.buildImage(
      { context: contextDir, src: ["."] },
      { t: imageName }
    );

    // Follow the progress of the build image.
    await new Promise<void>((resolve, reject) => {
      this.client.modem.followProgress(
        stream,
        (err) => (err ? reject(err) : resolve()),
        () => {}
      );
    });
  }

  /**
   * Create and start a container.
   * 
   * @param config - The configuration of the container.
   * @param containerName - The name of the container.
   * @return {Promise<Dockerode.Container>} The container.
   * 
   * @since v1.0.0
   * @author Muhammad Umer Farooq<umer@lablnet.com>
   */
  async createContainer(
    config: DockerConfig,
    containerName: string
  ): Promise<Dockerode.Container> {
    const envArray = config.env
      ? Object.entries(config.env).map(([k, v]) => `${k}=${v}`)
      : [];

    const container = await this.client.createContainer({
      Image: config.imageName,
      name: containerName,
      Env: envArray,
      HostConfig: {
        Binds: [`${path.resolve(config.rootDir)}:/${path.basename(config.rootDir)}`],
      },
      Cmd: ["tail", "-f", "/dev/null"],
    });

    // Start the container.
    await container.start();
    return container;
  }

  /**
   * Execute a command inside a running container.
   * 
   * @param container - The container to execute the command in.
   * @param command - The command to execute.
   * @param workdir - The working directory to execute the command in.
   * @return {Promise<{ exitCode: number; output: string }>} The exit code and output of the command.
   * 
   * @since v1.0.0
   * @author Muhammad Umer Farooq<umer@lablnet.com>
   */
  async exec(
    container: Dockerode.Container,
    command: string[],
    workdir?: string
  ): Promise<{ exitCode: number; output: string }> {
    const exec = await container.exec({
      Cmd: command,
      AttachStdout: true,
      AttachStderr: true,
      WorkingDir: workdir,
    });

    const stream = await exec.start({ hijack: true, stdin: false });

    const output = await new Promise<string>((resolve) => {
      let data = "";
      stream.on("data", (chunk: Buffer) => {
        data += chunk.toString();
      });
      stream.on("end", () => resolve(data));
    });

    const inspect = await exec.inspect();
    return { exitCode: inspect.ExitCode ?? -1, output };
  }

  /**
   * Copy a file from the host into a container.
   * 
   * @param container - The container to copy the file to.
   * @param sourcePath - The path of the file to copy from the host.
   * @param destPath - The path of the file to copy to the container.
   * @return {Promise<void>}
   * 
   * @since v1.0.0
   * @author Muhammad Umer Farooq<umer@lablnet.com>
   */
  async copyToContainer(
    container: Dockerode.Container,
    sourcePath: string,
    destPath: string
  ): Promise<void> {
    const { execSync } = await import("child_process");
    const tmpTar = path.join(os.tmpdir(), `hyperagents-copy-${Date.now()}.tar`);

    try {
      const sourceDir = path.dirname(sourcePath);
      const sourceFile = path.basename(sourcePath);
      execSync(`tar cf "${tmpTar}" -C "${sourceDir}" "${sourceFile}"`);

      const tarStream = fs.createReadStream(tmpTar);
      await container.putArchive(tarStream, { path: path.dirname(destPath) });
    } finally {
      if (fs.existsSync(tmpTar)) fs.unlinkSync(tmpTar);
    }
  }

  /**
   * Copy a file from a container to the host.
   * 
   * @param container - The container to copy the file from.
   * @param sourcePath - The path of the file to copy from the container.
   * @param destPath - The path of the file to copy to the host.
   * @return {Promise<void>}
   * 
   * @since v1.0.0
   * @author Muhammad Umer Farooq<umer@lablnet.com>
   */
  async copyFromContainer(
    container: Dockerode.Container,
    sourcePath: string,
    destPath: string
  ): Promise<void> {
    const stream = await container.getArchive({ path: sourcePath });

    const { execSync } = await import("child_process");
    const tmpTar = path.join(os.tmpdir(), `hyperagents-get-${Date.now()}.tar`);

    try {
      const writeStream = fs.createWriteStream(tmpTar);
      await new Promise<void>((resolve, reject) => {
        (stream as NodeJS.ReadableStream).pipe(writeStream);
        writeStream.on("finish", resolve);
        writeStream.on("error", reject);
      });

      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      execSync(`tar xf "${tmpTar}" -C "${path.dirname(destPath)}"`);
    } finally {
      if (fs.existsSync(tmpTar)) fs.unlinkSync(tmpTar);
    }
  }

  /**
   * Stop and remove a container.
   * 
   * @param container - The container to stop and remove.
   * @return {Promise<void>}
   * 
   * @since v1.0.0
   * @author Muhammad Umer Farooq<umer@lablnet.com>
   */
  async cleanup(container: Dockerode.Container): Promise<void> {
    try {
      await container.stop();
    } catch {
      // already stopped
    }
    try {
      await container.remove();
    } catch {
      // already removed
    }
  }
}
