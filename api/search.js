const { search } = require("jiosaavn-api");

export default async function handler(req, res) {
  const q = req.query.q || "";
  try {
    console.log(`[server] Searching JioSaavn for: ${q}`);
    const results = await search(q);
    res.status(200).json({ songs: results });
  } catch (err) {
    console.error(`[server] JioSaavn search error: ${err.message}`);
    res.status(500).json({ error: "JioSaavn search failed" });
  }
}
