import { Router } from "express";

export const quoteProxy = Router().get("/", async (req, res) => {
	const { tags = "success", limit = "1" } = req.query;

	const url =
		`https://api.quotable.io/quotes/random` +
		`?tags=${encodeURIComponent(String(tags))}` +
		`&limit=${encodeURIComponent(String(limit))}`;

	try {
		const r = await fetch(url);

		/* forward the real status code if quotable.io is unhappy */
		if (!r.ok) {
			const msg = await r.text();
			return res.status(r.status).json({ error: msg });
		}

		res.json(await r.json()); // ← an *array* (even when limit=1)
	} catch (err) {
		console.error("quotable proxy failed:", err);
		res.status(502).json({ error: "Unable to reach quotes service" });
	}
});
