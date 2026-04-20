import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import { getConfig, log } from "@cookunity-seo-agent/shared";

const config = getConfig();
const connection = new IORedis(config.REDIS_URL, {
  maxRetriesPerRequest: null,
});

export const workflowQueue = new Queue("seo-workflow", { connection });

export function createWorkflowWorker(
  processor: (job: { name: string; data: Record<string, unknown> }) => Promise<unknown>,
): Worker {
  return new Worker("seo-workflow", async (job) => processor(job as { name: string; data: Record<string, unknown> }), {
    connection,
  });
}

export function attachQueueEvents(worker: Worker): void {
  worker.on("completed", (job) => {
    log("info", "Job completed", { service: "worker", jobId: job.id, name: job.name });
  });

  worker.on("failed", (job, error) => {
    log("error", "Job failed", {
      service: "worker",
      jobId: job?.id,
      name: job?.name,
      error: error.message,
    });
  });
}
