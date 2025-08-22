import { SEARCH_ENDPOINT, SONG_BY_MOOD_ENDPOINT } from "./config.js";

const startBtn = document.getElementById("startBtn");
const video = document.getElementById("video");
const overlay = document.getElementById("overlay");
const emotionDisplay = document.getElementById("emotion-display");
const musicPlayer = document.getElementById("musicPlayer");
const visualizerCanvas = document.getElementById("visualizer");
const changeSongBtn = document.getElementById("changeSongBtn");
const testMoodEl = document.getElementById("testMood");
const vctx = visualizerCanvas.getContext("2d");

let audioCtx, analyser, sourceNode;
let currentEmotion = null;
let currentTrackId = null;
let useTinyFace = true;
let modelsLoaded = false;
let isVisualizerStarting = false; // Flag to prevent concurrent visualizer starts

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

// UI helpers
function setStatus(text) {
  emotionDisplay.textContent = text;
}

// Stop camera stream
function stopCamera() {
  if (video.srcObject) {
    video.srcObject.getTracks().forEach((track) => track.stop());
    video.srcObject = null;
  }
}

// Audio visualizer
function startVisualizer() {
  if (isVisualizerStarting) return; // Prevent concurrent calls
  isVisualizerStarting = true;

  try {
    // Initialize AudioContext if not already created
    if (!audioCtx || audioCtx.state === "closed") {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }

    // Clean up previous analyser and sourceNode
    if (sourceNode) {
      sourceNode.disconnect();
      sourceNode = null;
    }
    if (analyser) {
      analyser.disconnect();
      analyser = null;
    }

    analyser = audioCtx.createAnalyser();
    sourceNode = audioCtx.createMediaElementSource(musicPlayer);
    sourceNode.connect(analyser);
    analyser.connect(audioCtx.destination);

    analyser.fftSize = 256;
    const bufLen = analyser.frequencyBinCount;
    const data = new Uint8Array(bufLen);

    const draw = () => {
      requestAnimationFrame(draw);
      analyser.getByteFrequencyData(data);

      vctx.fillStyle = "#000";
      vctx.fillRect(0, 0, visualizerCanvas.width, visualizerCanvas.height);

      const barW = (visualizerCanvas.width / bufLen) * 2.4;
      let x = 0;
      for (let i = 0; i < bufLen; i++) {
        const h = data[i];
        vctx.fillStyle = `rgb(${h + 80}, 60, 170)`;
        vctx.fillRect(x, visualizerCanvas.height - h / 1.8, barW, h / 1.8);
        x += barW + 1;
      }
    };
    draw();
  } catch (err) {
    console.error("Visualizer error:", err);
    setStatus(`Visualizer error: ${err.message}`);
  } finally {
    isVisualizerStarting = false; // Reset flag
  }
}

// Play track helper
async function playTrack(track) {
  if (!track?.url) {
    setStatus("No playable URL. Try again.");
    return;
  }
  if (track.id && track.id === currentTrackId && !musicPlayer.paused) {
    return; // Skip if the same track is already playing
  }

  // Fully reset musicPlayer state
  musicPlayer.pause();
  musicPlayer.src = "";
  musicPlayer.load(); // Reset the media element
  currentTrackId = track.id || track.url;
  musicPlayer.src = track.url;

  try {
    await musicPlayer.play();
    if (audioCtx?.state === "suspended") {
      await audioCtx.resume();
    }
    startVisualizer();
  } catch (err) {
    console.warn("Autoplay blocked, waiting for user gesture.", err.message);
    setStatus("Tap the Play button to start audio.");
  }
}

// Resolve mood → track via backend
async function fetchTrackForMood(mood) {
  try {
    const res = await fetch(
      `${SONG_BY_MOOD_ENDPOINT}?mood=${encodeURIComponent(mood)}`
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.track;
  } catch (err) {
    console.error("songByMood fetch error:", err);
    return null;
  }
}

async function changeSongForEmotion(emotion) {
  const mapped = emotionMap[emotion] || "pop";
  setStatus(`Emotion: ${emotion} → mood: ${mapped} (fetching song)`);
  const track = await fetchTrackForMood(mapped);

  if (!track || !track.url) {
    // Fallback list if none playable
    const fallback = {
      party: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
      romantic: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
      rock: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
      pop: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
      upbeat: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
      instrumental:
        "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3",
      calm: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3",
    };
    await playTrack({ id: mapped, url: fallback[mapped] || fallback.pop });
  } else {
    await playTrack(track);
  }
  // Stop camera after playing the track
  stopCamera();
}

// Single face detection over 4 seconds
async function detectOnce() {
  if (!modelsLoaded || !video.srcObject) return false;

  try {
    const emotions = [];
    const startTime = Date.now();
    const duration = 4000; // 4 seconds

    while (Date.now() - startTime < duration) {
      let detections;
      if (useTinyFace) {
        detections = await faceapi
          .detectAllFaces(
            video,
            new faceapi.TinyFaceDetectorOptions({
              inputSize: 320,
              scoreThreshold: 0.2,
            })
          )
          .withFaceExpressions();
      } else {
        detections = await faceapi
          .detectAllFaces(
            video,
            new faceapi.SsdMobilenetv1Options({ minConfidence: 0.1 })
          )
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

        // Pick top probability expression
        const expr = detections[0].expressions;
        const top = Object.entries(expr).sort((a, b) => b[1] - a[1])[0][0];
        emotions.push(top);
        setStatus(`Detecting emotion... (${top})`);
      } else {
        emotions.push("neutral");
        setStatus("No face detected");
      }

      // Short delay to prevent overwhelming the CPU
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Find the most frequent emotion or use the last one
    const emotionCounts = emotions.reduce((acc, emo) => {
      acc[emo] = (acc[emo] || 0) + 1;
      return acc;
    }, {});
    const finalEmotion =
      Object.entries(emotionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ||
      emotions[emotions.length - 1] ||
      "neutral";
    currentEmotion = finalEmotion;
    setStatus(`Emotion: ${finalEmotion}`);
    return finalEmotion;
  } catch (err) {
    console.error("Detection error:", err);
    setStatus("Detection error. You can still select a test mood.");
    return false;
  }
}

// Init camera & models, detect once, and play song
async function startAll() {
  try {
    setStatus("Loading models...");
    // backend = CPU is fine for browser build
    await faceapi.tf.setBackend("cpu");
    await faceapi.tf.ready();

    // Load models from /models
    try {
      await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
      useTinyFace = true;
    } catch (e) {
      console.warn("tinyFace load failed, trying ssd:", e.message);
      await faceapi.nets.ssdMobilenetv1.loadFromUri("/models");
      useTinyFace = false;
    }
    await faceapi.nets.faceExpressionNet.loadFromUri("/models");
    modelsLoaded = true;

    setStatus("Requesting camera...");
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
      audio: false,
    });
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
    console.error("Init error:", err);
    setStatus("Camera or models failed. Use Test Mood to play music.");
    stopCamera();
  }
}

// Events
startBtn.addEventListener("click", async () => {
  await startAll();
});

changeSongBtn.addEventListener("click", async () => {
  const mode = testMoodEl.value;
  if (mode && mode !== "auto") {
    await changeSongForEmotion(mode);
  } else {
    // Restart camera for a single detection
    setStatus("Requesting camera...");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
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
      console.error("Camera error:", err);
      setStatus("Camera failed. Use Test Mood to play music.");
      stopCamera();
    }
  }
});

musicPlayer.addEventListener("play", () => {
  if (audioCtx?.state === "suspended") {
    audioCtx.resume();
  }
  // Removed startVisualizer call to avoid redundant initialization
});

musicPlayer.addEventListener("ended", () => {
  setStatus("Song ended. Click Change Song or select a mood.");
});
