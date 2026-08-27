import type { VercelRequest, VercelResponse } from "@vercel/node";
import { processQueuedReview } from "../server/routers";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET" && req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
  const expected = process.env.CRON_SECRET || process.env.QUEUE_WORKER_SECRET;
  const provided = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!expected || provided !== expected) return res.status(401).json({ error: "unauthorized" });
  try { return res.status(200).json(await processQueuedReview()); }
  catch (error) { return res.status(500).json({ error: error instanceof Error ? error.message : "worker_failed" }); }
}
