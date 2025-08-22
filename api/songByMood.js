import axios from "axios";

export default async function handler(req, res) {
  try {
    const { mood } = req.query;
    if (!mood) return res.status(400).json({ error: "Mood is required" });

    const searchUrl = `https://jiosaavn-api-ruddy.vercel.app/search/songs?query=${encodeURIComponent(mood)}`;
    const searchRes = await axios.get(searchUrl);
    const songsList = searchRes.data?.data || [];

    if (songsList.length === 0) {
      console.warn("No songs found for mood:", mood);
      return res.status(404).json({ error: "No songs found for this mood" });
    }

    // Pick random song
    const song = songsList[Math.floor(Math.random() * songsList.length)];

    if (!song?.id) {
      console.warn("Song ID missing for mood:", mood);
      return res.status(500).json({ error: "Song ID missing" });
    }

    const songDetailsUrl = `https://jiosaavn-api-ruddy.vercel.app/songs?id=${song.id}`;
    const songDetailsRes = await axios.get(songDetailsUrl);
    const songDetails = songDetailsRes.data?.data?.[0];

    if (!songDetails) {
      console.warn("Song details missing for ID:", song.id);
      return res.status(500).json({ error: "Song details missing" });
    }

    const audioUrl = songDetails.downloadUrl?.slice(-1)[0]?.link;
    if (!audioUrl) {
      console.warn("Playable link not found for song ID:", song.id);
      return res.status(500).json({ error: "Playable link not found" });
    }

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
    console.error("songByMood error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
}
