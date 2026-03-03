(function () {
  'use strict';

  const section = document.getElementById('lyrics');
  if (!section) return;

  const lineEl = section.querySelector('[data-lyric-line]');
  const counterEl = section.querySelector('[data-lyric-count]');
  const playBtn = section.querySelector('[data-lyrics-play]');
  const nextBtn = section.querySelector('[data-lyrics-next]');

  const lines = [
    { text: "There's honey in the wound", mood: 'tender' },
    { text: 'sweetness where the sting used to live', mood: 'heavy' },
    { text: "I didn't know that healing", mood: 'hopeful' },
    { text: 'could taste like this', mood: 'tender' },
    { text: 'dripping gold from broken places', mood: 'heavy' },
    { text: 'every scar a hive', mood: 'hopeful' }
  ];

  let index = 0;
  let playing = true;
  let timer = null;

  function render() {
    const item = lines[index];
    lineEl.classList.remove('is-dripping');
    void lineEl.offsetWidth;
    lineEl.textContent = item.text;
    lineEl.classList.add('is-dripping');

    section.dataset.temperature = item.mood;
    counterEl.textContent = `${index + 1} / ${lines.length}`;
  }

  function step() {
    index = (index + 1) % lines.length;
    render();
  }

  function start() {
    if (timer) clearInterval(timer);
    timer = setInterval(step, 4000);
    playBtn.textContent = 'Pause Flow';
    playBtn.setAttribute('aria-pressed', 'true');
  }

  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
    playBtn.textContent = 'Play Flow';
    playBtn.setAttribute('aria-pressed', 'false');
  }

  playBtn.addEventListener('click', () => {
    playing = !playing;
    if (playing) start();
    else stop();
  });

  nextBtn.addEventListener('click', () => {
    step();
    if (playing) {
      start();
    }
  });

  render();
  start();
})();
