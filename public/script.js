const startBtn = document.getElementById('startBtn');
const changeSongBtn = document.getElementById('changeSongBtn');
const video = document.getElementById('video');
const statusDiv = document.getElementById('status');
const songPlayer = document.getElementById('songPlayer');
// const canvas = document.getElementById('visualizer'); // Visualizer canvas
// const ctx = canvas.getContext('2d'); // Visualizer context

let currentMood = '';
let playlist = [];
let currentSongIndex = 0;
let stream;
let isDetecting = false;
// let audioContext, analyser, source, dataArray; // Visualizer vars

async function startEmotionDetection() {
    if (isDetecting) return;
    isDetecting = true;
    statusDiv.innerText = 'Starting camera...';

    try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;

        statusDiv.innerText = 'Detecting emotion...';

        const interval = setInterval(async () => {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            const imageData = canvas.toDataURL('image/jpeg');

            try {
                const response = await fetch('http://localhost:5000/detect_emotion', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ image: imageData })
                });
                const data = await response.json();

                if (data.emotion && data.emotion !== currentMood) {
                    currentMood = data.emotion;
                    statusDiv.innerText = `Detected mood: ${currentMood}`;
                    fetchSongs(currentMood);
                }
            } catch (error) {
                console.error('Error detecting emotion:', error);
            }
        }, 5000);

    } catch (error) {
        console.error('Camera error:', error);
        statusDiv.innerText = 'Failed to start camera';
        isDetecting = false;
    }
}

async function fetchSongs(mood) {
    statusDiv.innerText = `Fetching songs for ${mood}...`;

    try {
        const response = await fetch(`http://localhost:5000/get_songs?mood=${mood}`);
        const data = await response.json();

        if (data.songs && data.songs.length > 0) {
            playlist = data.songs;
            currentSongIndex = 0;
            playSong();
        } else {
            statusDiv.innerText = `No songs found for ${mood}`;
        }
    } catch (error) {
        console.error('Error fetching songs:', error);
        statusDiv.innerText = 'Failed to fetch songs';
    }
}

function playSong() {
    if (playlist.length === 0) return;

    songPlayer.src = playlist[currentSongIndex];
    songPlayer.play()
        .then(() => {
            statusDiv.innerText = `Now playing: ${playlist[currentSongIndex]}`;
            // startVisualizer(); // removed visualizer
        })
        .catch(error => console.error('Playback error:', error));
}

function changeSong() {
    if (playlist.length === 0) return;
    currentSongIndex = (currentSongIndex + 1) % playlist.length;
    playSong();
}

/*
// Visualizer removed
function startVisualizer() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        source = audioContext.createMediaElementSource(songPlayer);
        analyser = audioContext.createAnalyser();
        source.connect(analyser);
        analyser.connect(audioContext.destination);
        analyser.fftSize = 256;
        const bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);
    }

    function draw() {
        requestAnimationFrame(draw);
        analyser.getByteFrequencyData(dataArray);
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const barWidth = (canvas.width / dataArray.length) * 2.5;
        let x = 0;
        for (let i = 0; i < dataArray.length; i++) {
            const barHeight = dataArray[i];
            ctx.fillStyle = 'rgb(' + (barHeight + 100) + ',50,50)';
            ctx.fillRect(x, canvas.height - barHeight / 2, barWidth, barHeight / 2);
            x += barWidth + 1;
        }
    }
    draw();
}
*/

startBtn.addEventListener('click', startEmotionDetection);
changeSongBtn.addEventListener('click', changeSong);
