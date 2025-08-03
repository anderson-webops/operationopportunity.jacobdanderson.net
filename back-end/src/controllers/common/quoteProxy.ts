// src/controllers/quoteProxy.ts
import { Router } from "express";

const router = Router();

router.get("/", async (req, res) => {
	try {
		const tags = encodeURIComponent(req.query.tags?.toString() || "success");
		const limit = encodeURIComponent(req.query.limit?.toString() || "1");
		const response = await fetch(`https://api.quotable.io/quotes/random?tags=${tags}&limit=${limit}`);
		const data = await response.json();
		res.json(data);
	}
	catch (err) {
		console.error(err);
		res.sendStatus(500);
	}
});

/*
router.get("/", async (req, res) => {
  const { tags = "success", limit = 1 } = req.query;
  const r = await fetch(
      `https://api.quotable.io/quotes/random?tags=${encodeURIComponent(tags)}&limit=${limit}`);
  res.json(await r.json());
});
 */

export const quoteProxy = router;
