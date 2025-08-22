const musicPlayer = document.getElementById("musicPlayer");
const playPauseBtn = document.getElementById("playPauseBtn");
const nextBtn = document.getElementById("nextBtn");
const prevBtn = document.getElementById("prevBtn");
const moodButtons = document.querySelectorAll(".mood-btn");
// const visualizerCanvas = document.getElementById("visualizer");
// const vctx = visualizerCanvas.getContext("2d");

let audioCtx, analyser, sourceNode, dataArray;
let isPlaying = false;
let currentTrackIndex = 0;
let currentPlaylist = [];

// Start Visualizer (Disabled)
// function startVisualizer() {
//   if (!audioCtx) {
//     audioCtx = new (window.AudioContext || window.webkitAudioContext)();
//     analyser = audioCtx.createAnalyser();
//     sourceNode = audioCtx.createMediaElementSource(musicPlayer);
//     sourceNode.connect(analyser);
//     analyser.connect(audioCtx.destination);
//     analyser.fftSize = 256;
//     const bufferLength = analyser.frequencyBinCount;
//     dataArray = new Uint8Array(bufferLength);
//   }
//
//   function draw() {
//     requestAnimationFrame(draw);
//     analyser.getByteFrequencyData(dataArray);
//     vctx.clearRect(0, 0, visualizerCanvas.width, visualizerCanvas.height);
//     const barWidth = (visualizerCanvas.width / dataArray.length) * 2.5;
//     let x = 0;
//     for (let i = 0; i < dataArray.length; i++) {
//       const barHeight = dataArray[i];
//       vctx.fillStyle = `rgb(${barHeight + 100},50,50)`;
//       vctx.fillRect(x, visualizerCanvas.height - barHeight / 2, barWidth, barHeight / 2);
//       x += barWidth + 1;
//     }
//   }
//   draw();
// }

// Play Track
function playTrack(index) {
  currentTrackIndex = index;
  musicPlayer.src = currentPlaylist[currentTrackIndex];
  musicPlayer.play();
  isPlaying = true;
  playPauseBtn.textContent = "Pause";

  // startVisualizer(); // Disabled
}

// Mood Detection (dummy)
moodButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const mood = btn.dataset.mood;
    fetchPlaylist(mood);
  });
});

// Fetch Playlist
function fetchPlaylist(mood) {
  // Example static playlists
  const playlists = {
    happy: ["song1.mp3", "song2.mp3"],
    sad: ["song3.mp3", "song4.mp3"],
    energetic: ["song5.mp3", "song6.mp3"]
  };
  currentPlaylist = playlists[mood] || [];
  if (currentPlaylist.length > 0) {
    playTrack(0);
  }
}

// Play/Pause
playPauseBtn.addEventListener("click", () => {
  if (isPlaying) {
    musicPlayer.pause();
    playPauseBtn.textContent = "Play";
  } else {
    musicPlayer.play();
    playPauseBtn.textContent = "Pause";
  }
  isPlaying = !isPlaying;
});

// Next/Previous
nextBtn.addEventListener("click", () => {
  currentTrackIndex = (currentTrackIndex + 1) % currentPlaylist.length;
  playTrack(currentTrackIndex);
});

prevBtn.addEventListener("click", () => {
  currentTrackIndex = (currentTrackIndex - 1 + currentPlaylist.length) % currentPlaylist.length;
  playTrack(currentTrackIndex);
});

// Optional Audio Context Resume
musicPlayer.addEventListener("play", () => {
  // if (audioCtx && audioCtx.state === "suspended") {
  //   audioCtx.resume();
  // }
});
