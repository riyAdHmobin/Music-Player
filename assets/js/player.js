// assets/js/player.js

let player;
let currentTrack = 0;
let progressInterval;
let tracks = [];

const SHEETDB_API_URL = 'https://sheetdb.io/api/v1/uvpm2f3oq7b9g';

const circle = document.querySelector('circle');
const radius = 100;
const circumference = 2 * Math.PI * radius;
circle.style.strokeDasharray = circumference;

function sheetdbToTracks(data) {
    return data.map(row => ({
        id: row.id,
        title: row.title,
        duration: null
    }));
}

let tracksLoaded = false;
let ytReady = false;

fetch(SHEETDB_API_URL)
    .then(res => res.json())
    .then(data => {
        tracks = sheetdbToTracks(data);
        tracksLoaded = true;
        renderPlaylist();
        tryInitPlayer();
    });

window.onYouTubeIframeAPIReady = function() {
    ytReady = true;
    tryInitPlayer();
};

function tryInitPlayer() {
    if (tracksLoaded && ytReady && tracks.length > 0 && !player) {
        player = new YT.Player('player', {
            height: '0',
            width: '0',
            videoId: tracks[currentTrack].id,
            events: {
                'onReady': onPlayerReady,
                'onStateChange': onPlayerStateChange
            }
        });
    }
}

function onPlayerReady(event) {
    event.target.playVideo();
    updateTrackUI(currentTrack);
    updateDurationsInPlaylist();
    startProgressUpdater();
}

function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.PLAYING) {
        startProgressUpdater();
    } else {
        stopProgressUpdater();
    }
    updatePlayPauseIcon();

    if (event.data === YT.PlayerState.ENDED) {
        nextTrack();
    }
}

function updatePlayPauseIcon() {
    const icon = document.getElementById('playPauseIcon');
    if (player && typeof player.getPlayerState === 'function' && player.getPlayerState() === YT.PlayerState.PLAYING) {
        icon.className = 'fa fa-pause';
    } else {
        icon.className = 'fa fa-play';
    }
}

function togglePlay() {
    if (player && typeof player.getPlayerState === 'function') {
        const state = player.getPlayerState();
        if (state === YT.PlayerState.PLAYING) {
            player.pauseVideo();
        } else {
            player.playVideo();
        }
        setTimeout(updatePlayPauseIcon, 100);
    }
}

function nextTrack() {
    currentTrack = (currentTrack + 1) % tracks.length;
    loadTrack(currentTrack);
}

function prevTrack() {
    currentTrack = (currentTrack - 1 + tracks.length) % tracks.length;
    loadTrack(currentTrack);
}

function loadTrack(index) {
    currentTrack = index;
    if (player && typeof player.loadVideoById === 'function') {
        player.loadVideoById(tracks[currentTrack].id);
        updateTrackUI(currentTrack);
    }
}

function updateTrackUI(index) {
    const videoId = tracks[index].id;
    fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`)
        .then(res => res.json())
        .then(data => {
            document.getElementById('title').textContent = data.title;
            document.getElementById('artist').textContent = "YouTube Music";
            document.getElementById('albumArt').src = data.thumbnail_url;
        });

    updateTrackHighlight(index);
}

function updateTrackHighlight(index) {
    document.querySelectorAll(".track").forEach((el, i) => {
        el.classList.toggle("active", i === index);
    });
}

function formatDuration(seconds) {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return mins + ":" + (secs < 10 ? "0" : "") + secs;
}

const trackListEl = document.getElementById('trackList');
function renderPlaylist() {
    trackListEl.innerHTML = '';
    tracks.forEach((track, i) => {
        const el = document.createElement('div');
        el.className = 'track';
        el.innerHTML = `
      <span>${track.title}</span>
      <span class="duration">${track.duration ? formatDuration(track.duration) : '...'}</span>
    `;
        el.addEventListener('click', () => loadTrack(i));
        trackListEl.appendChild(el);
    });
    updateTrackHighlight(currentTrack);
}

function updateDurationsInPlaylist() {
    const currentIndex = currentTrack;
    const currentTime = player ? player.getCurrentTime() : 0;
    const playerState = player ? player.getPlayerState() : -1;

    if (tracks.every(t => t.duration !== null)) {
        renderPlaylist();
        return;
    }

    let i = 0;

    function loadNextDuration() {
        if (i >= tracks.length) {
            player.loadVideoById(tracks[currentIndex].id);
            updateTrackUI(currentIndex);
            if (player && player.seekTo) {
                player.seekTo(currentTime, true);
                if (playerState === YT.PlayerState.PLAYING) {
                    player.playVideo();
                } else {
                    player.pauseVideo();
                }
            }
            renderPlaylist();
            return;
        }
        if (tracks[i].duration !== null) {
            i++;
            loadNextDuration();
            return;
        }
        player.loadVideoById(tracks[i].id);
        let tries = 0;
        const interval = setInterval(() => {
            let dur = player.getDuration();
            if (dur && dur > 0) {
                tracks[i].duration = dur;
                clearInterval(interval);
                i++;
                loadNextDuration();
            }
            tries++;
            if (tries > 50) {
                clearInterval(interval);
                i++;
                loadNextDuration();
            }
        }, 100);
    }

    loadNextDuration();
}

function updateProgress() {
    const duration = player.getDuration();
    const currentTime = player.getCurrentTime();

    if (!duration || duration === 0) return;

    const progress = currentTime / duration;
    const offset = circumference * (1 - progress);
    circle.style.strokeDashoffset = offset;

    const timeDisplay = document.getElementById('timeDisplay');
    timeDisplay.textContent = `${formatDuration(currentTime)} / ${formatDuration(duration)}`;
}

function startProgressUpdater() {
    stopProgressUpdater();
    updateProgress();
    progressInterval = setInterval(() => {
        if (player.getPlayerState() !== YT.PlayerState.PLAYING) {
            stopProgressUpdater();
            return;
        }
        updateProgress();
    }, 1000);
}

function stopProgressUpdater() {
    if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
    }
}

renderPlaylist();
document.addEventListener('DOMContentLoaded', updatePlayPauseIcon);