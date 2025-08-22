import axios from "axios";

// Keep track of last song returned for each mood
let lastSongByMood = {};

export default async function handler(req, res) {
  try {
    const { mood } = req.query;
    if (!mood) return res.status(400).json({ error: "Mood is required" });

    // Search songs by mood
    const searchUrl = `https://jiosaavn-api-ruddy.vercel.app/search/songs?query=${encodeURIComponent(mood)}`;
    const searchRes = await axios.get(searchUrl);

    const songsList = searchRes.data?.data;
    if (!songsList || songsList.length === 0) {
      return res.status(404).json({ error: "No songs found for this mood" });
    }

    // Pick a random song different from last one
    let song;
    if (songsList.length === 1) {
      song = songsList[0];
    } else {
      let attempts = 0;
      do {
        const randomIndex = Math.floor(Math.random() * songsList.length);
        song = songsList[randomIndex];
        attempts++;
      } while (song.id === lastSongByMood[mood] && attempts < 10);
    }

    lastSongByMood[mood] = song.id;

    // Fetch detailed info
    const songDetailsUrl = `https://jiosaavn-api-ruddy.vercel.app/songs?id=${song.id}`;
    const songDetailsRes = await axios.get(songDetailsUrl);
    const songDetails = songDetailsRes.data?.data?.[0];

    if (!songDetails) return res.status(500).json({ error: "Song details not found" });

    // Get audio URL
    const audioUrl = songDetails.downloadUrl?.slice(-1)[0]?.link;
    if (!audioUrl) return res.status(500).json({ error: "Playable link not found" });

    // Send response
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
