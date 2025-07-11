// assets/music-list/tracks.js

const sheetUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRCnhwlHIX1j4BNB3wCMezCDPu67ZnCY3sXVsRnrJTaD2IAimKgExqQiNW1CwYOLlV8p4NAeR4jzqfV/pub?output=csv';

window.tracks = []; // global for player.js

function loadTracksFromSheet(callback) {
    fetch(sheetUrl)
        .then(response => response.text())
        .then(csv => {
            const lines = csv.trim().split('\n');
            // Assuming first line is header: id,title
            for (let i = 1; i < lines.length; i++) {
                const [id, title] = lines[i].split(',');
                if (id && title) {
                    window.tracks.push({ id: id.trim(), title: title.trim(), duration: null });
                }
            }
            callback();
        });
}