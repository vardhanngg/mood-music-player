import axios from "axios";

export default async function handler(req, res) {
  try {
    const { mood } = req.query;

    // Step 1 – Search songs by mood using JioSaavn API
    const searchUrl = `https://jiosaavn-api-ruddy.vercel.app/search/songs?query=${encodeURIComponent(mood)}`;
    const searchRes = await axios.get(searchUrl);

    if (!searchRes.data.data || searchRes.data.data.length === 0) {
      return res.status(404).json({ error: "No songs found for this mood" });
    }

    // Step 2 – Pick the first song
    const song = searchRes.data.data[0];

    // Step 3 – Fetch detailed info to get playable link
    const songDetailsUrl = `https://jiosaavn-api-ruddy.vercel.app/songs?id=${song.id}`;
    const songDetailsRes = await axios.get(songDetailsUrl);
    const songDetails = songDetailsRes.data.data[0];

    // Step 4 – Get highest quality link
    const audioUrl =
      songDetails.downloadUrl?.[songDetails.downloadUrl.length - 1]?.link || null;

    if (!audioUrl) {
      return res.status(500).json({ error: "Failed to fetch playable link" });
    }

    res.status(200).json({
      id: songDetails.id,
      title: songDetails.name,
      artist: songDetails.primaryArtists,
      image: songDetails.image?.[2]?.link,
      audioUrl: audioUrl
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error fetching song" });
  }
}
