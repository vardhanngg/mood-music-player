import { SEARCH_ENDPOINT, SONG_BY_MOOD_ENDPOINT } from "./config.js";

const startBtn = document.getElementById("startBtn");
const video = document.getElementById("video");
const overlay = document.getElementById("overlay");
const emotionDisplay = document.getElementById("emotion-display");
const musicPlayer = document.getElementById("musicPlayer");
const changeSongBtn = document.getElementById("changeSongBtn");
const testMoodEl = document.getElementById("testMood");

let audioCtx;
let currentEmotion = null;
let modelsLoaded = false;

// Map face emotion → mood for music search
const emotionMap = {
  happy: "party",
  sad: "romantic",
  angry: "rock",
  neutral: "pop",
  surprised: "upbeat",
  disgusted: "instrumental",
  fearful: "calm",
};

function log(...args) {
  console.log("[app]", ...args);
}

function setStatus(text) {
  emotionDisplay.textContent = text;
}

function stopCamera() {
  if (video.srcObject) {
    video.srcObject.getTracks().forEach((track) => track.stop());
    video.srcObject = null;
  }
}

async function playTrack(track) {
  if (!track?.url) {
    setStatus("No playable song. Try again.");
    log("No playable URL for track:", track);
    return;
  }
  log("Playing track:", track.title, track.url);
  musicPlayer.src = track.url; // Always set new song
  musicPlayer.load(); // Force reload
  try {
    await musicPlayer.play();
    setStatus(`Playing: ${track.title || 'Song'}`);
  } catch (err) {
    log("Autoplay error:", err.message);
    setStatus("Click the Play button to start audio.");
  }
}

async function fetchTrackForMood(mood) {
  try {
    log("Fetching song for mood:", mood);
    const res = await fetch(`${SONG_BY_MOOD_ENDPOINT}?mood=${encodeURIComponent(mood)}`);
    if (!res.ok) {
      log("API error, status:", res.status);
      throw new Error(`HTTP ${res.status}`);
    }
    const data = await res.json();
    log("API response:", data);
    return data.track;
  } catch (err) {
    log("fetchTrackForMood error:", err.message);
    return null;
  }
}

async function changeSongForEmotion(emotion) {
  const mapped = emotionMap[emotion] || "pop";
  setStatus(`Emotion: ${emotion} → mood: ${mapped} (fetching song)`);
  log("Changing song for emotion:", emotion, "mapped to:", mapped);

  const track = await fetchTrackForMood(mapped);

  if (!track || !track.url) {
    log("API failed, using fallback for mood:", mapped);
    const fallback = {
      party: { id: "party", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", title: "Party Song" },
      romantic: { id: "romantic", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3", title: "Romantic Song" },
      rock: { id: "rock", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3", title: "Rock Song" },
      pop: { id: "pop", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3", title: "Pop Song" },
      upbeat: { id: "upbeat", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3", title: "Upbeat Song" },
      instrumental: { id: "instrumental", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3", title: "Instrumental Song" },
      calm: { id: "calm", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3", title: "Calm Song" },
    };
    await playTrack(fallback[mapped] || fallback.pop);
  } else {
    await playTrack(track);
  }

  stopCamera();
}

async function detectOnce() {
  if (!modelsLoaded || !video.srcObject) {
    log("Models or video not ready");
    return false;
  }

  try {
    const emotions = [];
    const startTime = Date.now();
    const duration = 10000; // 10 seconds for better detection

    while (Date.now() - startTime < duration) {
      let detections;
      if (useTinyFace) {
        detections = await faceapi
          .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.3 }))
          .withFaceExpressions();
      } else {
        detections = await faceapi
          .detectAllFaces(video, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.1 }))
          .withFaceExpressions();
      }

      const ctx = overlay.getContext("2d");
      ctx.clearRect(0, 0, overlay.width, overlay.height);

      if (detections.length) {
        const displaySize = { width: video.width, height: video.height };
        faceapi.matchDimensions(overlay, displaySize);
        const resized = faceapi.resizeResults(detections, displaySize);
        faceapi.draw.drawDetections(overlay, resized);
        faceapi.draw.drawFaceExpressions(overlay, resized);

        const expr = detections[0].expressions;
        const top = Object.entries(expr).sort((a, b) => b[1] - a[1])[0][0];
        emotions.push(top);
        setStatus(`Detecting emotion... (${top})`);
      } else {
        emotions.push("neutral");
        setStatus("No face detected");
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    log("Detected emotions:", emotions);
    const emotionCounts = emotions.reduce((acc, emo) => {
      acc[emo] = (acc[emo] || 0) + 1;
      return acc;
    }, {});
    const finalEmotion = Object.entries(emotionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ||
                         emotions[emotions.length - 1] || "neutral";
    currentEmotion = finalEmotion;
    setStatus(`Emotion: ${finalEmotion}`);
    log("Final emotion:", finalEmotion);
    return finalEmotion;
  } catch (err) {
    log("Detection error:", err.message);
    setStatus("Detection error. You can still select a test mood.");
    return false;
  }
}

async function startAll() {
  try {
    setStatus("Loading models...");
    await faceapi.tf.setBackend("cpu");
    await faceapi.tf.ready();

    try {
      await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
      useTinyFace = true;
    } catch (e) {
      log("tinyFace load failed, trying ssd:", e.message);
      await faceapi.nets.ssdMobilenetv1.loadFromUri("/models");
      useTinyFace = false;
    }
    await faceapi.nets.faceExpressionNet.loadFromUri("/models");
    modelsLoaded = true;

    setStatus("Requesting camera...");
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
    video.srcObject = stream;

    await new Promise((r) => (video.onloadedmetadata = r));
    await video.play();

    setStatus("Detecting emotion...");
    const emotion = await detectOnce();
    if (emotion) {
      await changeSongForEmotion(emotion);
    } else {
      setStatus("Failed to detect emotion. Use Test Mood to play music.");
      stopCamera();
    }
  } catch (err) {
    log("Init error:", err.message);
    setStatus("Camera or models failed. Use Test Mood to play music.");
    stopCamera();
  }
}

startBtn.addEventListener("click", async () => {
  await startAll();
});

changeSongBtn.addEventListener("click", async () => {
  const mode = testMoodEl.value;
  if (mode && mode !== "auto") {
    await changeSongForEmotion(mode);
  } else {
    setStatus("Requesting camera...");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      video.srcObject = stream;

      await new Promise((r) => (video.onloadedmetadata = r));
      await video.play();

      setStatus("Detecting emotion...");
      const emotion = await detectOnce();
      if (emotion) {
        await changeSongForEmotion(emotion);
      } else {
        setStatus("Failed to detect emotion. Use Test Mood to play music.");
        stopCamera();
      }
    } catch (err) {
      log("Camera error:", err.message);
      setStatus("Camera failed. Use Test Mood to play music.");
      stopCamera();
    }
  }
});

musicPlayer.addEventListener("play", () => {
  if (audioCtx?.state === "suspended") {
    audioCtx.resume();
  }
});

musicPlayer.addEventListener("ended", () => {
  setStatus("Song ended. Click Change Song or select a mood.");
});
