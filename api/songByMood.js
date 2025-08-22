// ✅ Do this
const axios = require('axios'); // or `import axios from 'axios';` if using ES modules

export default async function handler(req, res) {
  try {
    const { mood } = req.query;
    if (!mood) return res.status(400).json({ error: "Mood is required" });

    // Search songs by mood
    const searchRes = await axios.get(`https://jiosaavn-api.vercel.app/search?query=${encodeURIComponent(mood)}`);
    const songsList = searchRes.data || [];

    if (!songsList.length) {
      return res.status(404).json({ error: "No songs found for this mood" });
    }

    // Pick a random song
    const song = songsList[Math.floor(Math.random() * songsList.length)];

    if (!song?.more_info?.vlink) {
      return res.status(404).json({ error: "Playable link not found" });
    }

    res.status(200).json({
      track: {
        id: song.id,
        title: song.title,
        artist: song.more_info.primary_artists,
        image: song.image || null,
        audioUrl: song.more_info.vlink, // <-- matches what your script.js expects
      },
    });
  } catch (err) {
    console.error("songByMood error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
}
