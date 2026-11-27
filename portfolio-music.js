const player = document.querySelector('.profile-player');
const audio = player.querySelector('audio');
const playback = player.querySelector('.profile-music-toggle');
const mute = player.querySelector('.profile-music-mute');
const pageMute = document.querySelector('.page-music-mute');
const screenMuteButtons = document.querySelectorAll('.screen-music-mute');
const volume = player.querySelector('.profile-music-volume');
const title = player.querySelector('.profile-track-meta strong');
const artistMarquee = player.querySelector('.profile-track-marquee');
const artists = player.querySelectorAll('.profile-track-ticker span');
let tracks = [];
let trackIndex = 0;
let shouldPlay = true;

audio.volume = Number(volume.value) / 100;
audio.muted = true;

const artistResizeObserver = new ResizeObserver(() => {
  artistMarquee.toggleAttribute('data-overflow', artists[0].scrollWidth > artistMarquee.clientWidth);
});
artistResizeObserver.observe(artistMarquee);
artistResizeObserver.observe(artists[0]);

function playTrack() {
  shouldPlay = true;
  audio.play().catch(() => {});
}

function selectTrack(index) {
  trackIndex = index;
  const track = tracks[trackIndex];
  title.textContent = track.title;
  for (const artist of artists) artist.textContent = track.artist;
  audio.src = track.src;
}

function advanceTrack() {
  if (!tracks.length) return;
  selectTrack((trackIndex + 1) % tracks.length);
  playTrack();
}

fetch('music/tracks.json')
  .then(response => response.ok ? response.json() : [])
  .then(playlist => {
    tracks = playlist;
    if (tracks.length) selectTrack(Math.floor(Math.random() * tracks.length));
  })
  .catch(() => {})
  .then(() => window.portfolioReady)
  .then(() => {
    if (!audio.hasAttribute('src')) audio.src = 'music/track-01.mp3';
    if (shouldPlay) playTrack();
    // Retry on the first interaction if the browser blocks muted autoplay.
    document.addEventListener('click', event => {
      if (shouldPlay && audio.paused &&
          !event.target.closest?.('.profile-music-toggle, .profile-music-mute')) {
        playTrack();
      }
    }, { once: true });
  });

playback.addEventListener('click', () => {
  if (audio.paused) playTrack();
  else {
    shouldPlay = false;
    audio.autoplay = false;
    audio.pause();
  }
});

function toggleMute() {
  audio.muted = !audio.muted;
  if (!audio.muted && audio.paused) playTrack();
}

mute.addEventListener('click', toggleMute);
for (const button of screenMuteButtons) {
  button.append(mute.firstElementChild.cloneNode(true));
  button.addEventListener('click', toggleMute);
}
new IntersectionObserver(([entry]) => {
  pageMute.hidden = entry.intersectionRatio >= 1;
}, { threshold: 1 }).observe(mute);

volume.addEventListener('input', () => {
  audio.volume = Number(volume.value) / 100;
  volume.style.setProperty('--volume-fill', `${volume.value}%`);
});
audio.addEventListener('ended', advanceTrack);
audio.addEventListener('volumechange', () => {
  const pressed = String(!audio.muted);
  mute.setAttribute('aria-pressed', pressed);
  for (const button of screenMuteButtons) button.setAttribute('aria-pressed', pressed);
});
for (const event of ['play', 'pause', 'ended']) {
  audio.addEventListener(event, () => {
    const isPlaying = !audio.paused && !audio.ended;
    playback.toggleAttribute('data-playing', isPlaying);
    playback.setAttribute('aria-label', isPlaying ? 'Пауза / Pause' : 'Воспроизвести / Play');
  });
}
