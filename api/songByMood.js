import axios from "axios";

// Keep track of last song returned for each mood
let lastSongByMood = {};

export default async function handler(req, res) {
  try {
    const { mood } = req.query;
    if (!mood) {
      return res.status(400).json({ error: "Mood is required" });
    }

    // Step 1 – Search songs by mood
    const searchUrl = `https://jiosaavn-api-ruddy.vercel.app/search/songs?query=${encodeURIComponent(mood)}`;
    const searchRes = await axios.get(searchUrl);
    const songsList = searchRes.data.data;

    if (!songsList || songsList.length === 0) {
      return res.status(404).json({ error: "No songs found for this mood" });
    }

    // Step 2 – Pick a random song different from last one
    let randomIndex;
    do {
      randomIndex = Math.floor(Math.random() * songsList.length);
    } while (songsList.length > 1 && songsList[randomIndex].id === lastSongByMood[mood]);

    const song = songsList[randomIndex];
    lastSongByMood[mood] = song.id;

    // Step 3 – Fetch detailed info
    const songDetailsUrl = `https://jiosaavn-api-ruddy.vercel.app/songs?id=${song.id}`;
    const songDetailsRes = await axios.get(songDetailsUrl);
    const songDetails = songDetailsRes.data.data[0];

    // Step 4 – Always use the highest quality download URL
    const audioUrl = songDetails.downloadUrl?.slice(-1)[0]?.link || null;

    if (!audioUrl) {
      return res.status(500).json({ error: "Playable link not found" });
    }

    // Step 5 – Send response
    res.status(200).json({
      id: songDetails.id,
      title: songDetails.name,
      artist: songDetails.primaryArtists,
      image: songDetails.image?.slice(-1)[0]?.link,
      audioUrl
    });

  } catch (error) {
    console.error("Error fetching song:", error.message);
    res.status(500).json({ error: "Error fetching song" });
  }
}
