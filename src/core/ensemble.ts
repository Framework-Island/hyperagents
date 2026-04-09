import * as fs from "fs";
import * as path from "path";
import { loadArchive, getScore } from "../utils/archive";

/**
 * Best-of-archive ensemble: find the best-scoring generation
 * 
 * @param domain - The domain to ensemble.
 * @param questionId - The ID of the question to ensemble.
 * @param outputDir - The path of the output directory.
 * @param split - The split to ensemble.
 * @return {string | null} The prediction.
 * 
 * @since v1.0.0
 * @author Muhammad Umer Farooq<umer@lablnet.com>
 */
export function ensemble(
  domain: string,
  questionId: string,
  outputDir: string,
  split: string = "train"
): string | null {
  // Load the archive data.
  const archiveData = loadArchive(outputDir);

  // Get the list of generation IDs.
  const genIds = archiveData.archive;

  // Find the best-scoring generation.
  let bestScore = -1;
  let bestGenId: string | number | null = null;

  for (const genId of genIds) {
    // Get the score for the generation.
    const score = getScore(domain, outputDir, genId, split);
    // Update the best score and generation ID if the score is better.
    if (score != null && score > bestScore) {
      bestScore = score;
      bestGenId = genId;
    }
  }

  // If no best generation was found, return null.
  if (bestGenId == null) return null;

  // Get the path to the predictions file.
  const evalDir = split === "train" ? `${domain}_eval` : `${domain}_eval_${split}`;
  const predictionsPath = path.join(outputDir, `gen_${bestGenId}`, evalDir, "predictions.json");

  // If the predictions file does not exist, return null.
  if (!fs.existsSync(predictionsPath)) return null;

  try {
    // Load the predictions from the file.
    const predictions = JSON.parse(fs.readFileSync(predictionsPath, "utf-8")) as Array<{
      questionId: string;
      prediction: string;
    }>;

    // Find the prediction for the question ID.
    const match = predictions.find((p) => p.questionId === questionId);
    // Return the prediction if found, otherwise return null.
    return match?.prediction ?? null;
  } catch {
    // If there is an error, return null.
    return null;
  }
}
