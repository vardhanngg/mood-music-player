const { search } = require("jiosaavn-api");

export default async function handler(req, res) {
  const mood = req.query.mood || "pop";
  try {
    console.log(`[server] Fetching song for mood: ${mood}`);
    const results = await search(mood);

    if (!results || !results.length) {
      return res.status(200).json({ track: null });
    }

    const first = results.find(
      s => Array.isArray(s.downloadUrl) && s.downloadUrl.length
    ) || results[0];

    let streamUrl = null;
    if (Array.isArray(first.downloadUrl) && first.downloadUrl.length) {
      const sorted = [...first.downloadUrl].sort((a, b) =>
        parseInt(b.quality || b.bitrate || 0, 10) -
        parseInt(a.quality || a.bitrate || 0, 10)
      );
      streamUrl = sorted[0]?.link || sorted[0]?.url || null;
    }

    const track = {
      id: first.id || String(Date.now()),
      title: first.name || "Unknown",
      artists: first.primaryArtists || "",
      image: first.image?.[2]?.link || first.image?.[0]?.link || null,
      url: streamUrl,
    };

    console.log(`[server] Returning track: ${track.title}, url: ${track.url}`);
    res.status(200).json({ track });
  } catch (err) {
    console.error(`[server] songByMood error: ${err.message}`);
    res.status(500).json({ error: "songByMood failed" });
  }
}
