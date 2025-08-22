import axios from "axios";

export default async function handler(req, res) {
  try {
    const { mood } = req.query;
    if (!mood) return res.status(400).json({ error: "Mood is required" });

    const searchUrl = `https://jiosaavn-api-ruddy.vercel.app/search/songs?query=${encodeURIComponent(mood)}`;
    const searchRes = await axios.get(searchUrl);
    const songsList = searchRes.data?.data;

    if (!songsList || songsList.length === 0) {
      return res.status(404).json({ error: "No songs found for this mood" });
    }

   let previousSongId = null; // Store the last played song ID
let song = songsList[Math.floor(Math.random() * songsList.length)];
// Try to avoid the last song
if (previousSongId && songsList.length > 1) {
  const filteredSongs = songsList.filter(s => s.id !== previousSongId);
  if (filteredSongs.length > 0) {
    song = filteredSongs[Math.floor(Math.random() * filteredSongs.length)];
  }
}
previousSongId = song.id; // Update the last played song ID
    if (!song?.id) return res.status(500).json({ error: "Song ID not found" });

    const songDetailsUrl = `https://jiosaavn-api-ruddy.vercel.app/songs?id=${song.id}`;
    const songDetailsRes = await axios.get(songDetailsUrl);
    const songDetails = songDetailsRes.data?.data?.[0];

    if (!songDetails) return res.status(500).json({ error: "Song details missing" });

    const audioUrl = songDetails.downloadUrl?.slice(-1)[0]?.link;
    if (!audioUrl) return res.status(500).json({ error: "Playable link not found" });

    res.status(200).json({
      id: songDetails.id,
      title: songDetails.name,
      artist: songDetails.primaryArtists,
      image: songDetails.image?.slice(-1)[0]?.link,
      audioUrl,
    });
  } catch (error) {
    console.error("songByMood error:", error.message);
    res.status(500).json({ error: "Error fetching song" });
  }
}
