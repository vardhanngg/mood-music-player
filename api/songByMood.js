import axios from "axios";

export default async function handler(req, res) {
  try {
    const { mood } = req.query;
    if (!mood) {
      console.error("[songByMood] Mood is required");
      return res.status(400).json({ error: "Mood is required" });
    }

    console.log("[songByMood] Fetching songs for mood:", mood);
    const searchUrl = `https://jiosaavn-api-ruddy.vercel.app/search/songs?query=${encodeURIComponent(mood)}`;
    const searchRes = await axios.get(searchUrl);
    const songsList = searchRes.data?.data || [];

    if (songsList.length === 0) {
      console.warn("[songByMood] No songs found for mood:", mood);
      return res.status(404).json({ error: "No songs found for this mood" });
    }

    // Pick random song, avoid repeats
    let previousSongId = req.session?.previousSongId || null;
    let song = songsList[Math.floor(Math.random() * songsList.length)];
    if (previousSongId && songsList.length > 1) {
      const filteredSongs = songsList.filter(s => s.id !== previousSongId);
      if (filteredSongs.length > 0) {
        song = filteredSongs[Math.floor(Math.random() * filteredSongs.length)];
      }
    }
    req.session = req.session || {};
    req.session.previousSongId = song.id; // Store for next call

    if (!song?.id) {
      console.warn("[songByMood] Song ID missing for mood:", mood);
      return res.status(500).json({ error: "Song ID missing" });
    }

    console.log("[songByMood] Fetching details for song ID:", song.id);
    const songDetailsUrl = `https://jiosaavn-api-ruddy.vercel.app/songs?id=${song.id}`;
    const songDetailsRes = await axios.get(songDetailsUrl);
    const songDetails = songDetailsRes.data?.data?.[0];

    if (!songDetails) {
      console.warn("[songByMood] Song details missing for ID:", song.id);
      return res.status(500).json({ error: "Song details missing" });
    }

    const audioUrl = songDetails.downloadUrl?.slice(-1)[0]?.link;
    if (!audioUrl) {
      console.warn("[songByMood] Playable link not found for song ID:", song.id);
      return res.status(500).json({ error: "Playable link not found" });
    }

    console.log("[songByMood] Success - Track:", songDetails.name);
    res.status(200).json({
      track: {
        id: songDetails.id,
        title: songDetails.name,
        artist: songDetails.primaryArtists,
        image: songDetails.image?.slice(-1)[0]?.link,
        url: audioUrl,
      },
    });
  } catch (err) {
    console.error("[songByMood] Error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
}
