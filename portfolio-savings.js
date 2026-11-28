(() => {
  const savings = document.querySelector('#panel-savings');
  const carousel = savings.querySelector('.savings-carousel');
  const screenButtons = [...savings.querySelectorAll('.savings-screen')];
  const viewer = savings.querySelector('.savings-viewer');
  const enlarged = viewer.querySelector('img');
  const caption = viewer.querySelector('figcaption');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const featuredScreens = ['05', '13', '23', '24', '25']
    .map(id => screenButtons.findIndex(screen => screen.dataset.screen === id));
  const count = featuredScreens.length;

  let position = 0;
  let target = position;
  let spacing = 180;
  let visible = false;
  let frame = 0;
  let lastFrame = 0;
  let activeScreen = 0;
  let opener;

  const wrap = value => ((value % count) + count) % count;
  const screenName = index => screenButtons[index].querySelector('span').textContent.trim();

  const cards = featuredScreens.map(index => {
    const screen = screenButtons[index];
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'savings-carousel-button';
    button.setAttribute('aria-haspopup', 'dialog');
    const image = screen.querySelector('img').cloneNode();
    button.append(image);
    button.addEventListener('click', () => showViewer(index, button));
    button.addEventListener('keydown', event => {
      const direction = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
      if (!direction) return;
      event.preventDefault();
      position = target = Math.round(position) + direction;
      render();
      cards[wrap(position)].focus({ preventScroll: true });
    });
    carousel.append(button);
    return button;
  });

  function render() {
    const center = wrap(Math.round(position));
    const width = carousel.clientWidth;
    const phoneWidth = spacing / 1.28;
    const range = (width + phoneWidth) / (2 * spacing);
    cards.forEach((card, index) => {
      const offset = wrap(index - position + count / 2) - count / 2;
      const distance = Math.abs(offset);
      const isOnstage = distance <= range + .2;
      card.hidden = !isOnstage;
      card.tabIndex = index === center || card === document.activeElement ? 0 : -1;
      if (!isOnstage) return;

      const scale = Math.max(.71, 1 - distance * .105);
      const drop = 12 * Math.min(distance, 4);
      const tilt = Math.max(-16, Math.min(16, -offset * 8));
      card.style.transform = `translate(${offset * spacing}px, ${drop}px) rotate(${tilt}deg) scale(${scale})`;
      card.style.opacity = String(Math.max(.08, 1 - (distance / range) ** 1.7 * .84));
      card.style.zIndex = String(12 - Math.round(distance * 2));
    });
  }

  function animate(time) {
    frame = 0;
    const elapsed = Math.min(32, lastFrame ? time - lastFrame : 16);
    lastFrame = time;
    const keyboardFocus = carousel.contains(document.activeElement) && document.activeElement.matches(':focus-visible');
    if (!motion.matches && !keyboardFocus) target += .00046 * elapsed;
    position += (target - position) * Math.min(1, elapsed / 90);
    render();
    requestFrame();
  }

  function requestFrame() {
    if (!visible || viewer.open || frame) return;
    if (motion.matches && Math.abs(target - position) < .004) {
      lastFrame = 0;
      return;
    }
    frame = requestAnimationFrame(animate);
  }

  function updateLabels() {
    cards.forEach((card, index) => card.setAttribute('aria-label', screenName(featuredScreens[index])));
    if (viewer.open) caption.textContent = screenName(activeScreen);
  }

  function updateViewer(index) {
    activeScreen = (index + screenButtons.length) % screenButtons.length;
    const image = screenButtons[activeScreen].querySelector('img');
    enlarged.src = image.src;
    caption.textContent = screenName(activeScreen);
  }

  function showViewer(index, button) {
    opener = button;
    const from = button.querySelector('img').getBoundingClientRect();
    cancelAnimationFrame(frame);
    frame = 0;
    lastFrame = 0;
    updateViewer(index);
    viewer.showModal();
    if (motion.matches) return;
    const to = enlarged.getBoundingClientRect();
    const dx = from.left + from.width / 2 - (to.left + to.width / 2);
    const dy = from.top + from.height / 2 - (to.top + to.height / 2);
    const scale = from.width / to.width;
    enlarged.animate([
      { transform: `translate(${dx}px, ${dy}px) scale(${scale})`, opacity: .65 },
      { transform: 'none', opacity: 1 }
    ], { duration: 310, easing: 'cubic-bezier(.2,.75,.2,1)' });
  }

  viewer.querySelector('.savings-view-close').addEventListener('click', () => viewer.close());
  viewer.querySelector('.savings-view-previous').addEventListener('click', () => updateViewer(activeScreen - 1));
  viewer.querySelector('.savings-view-next').addEventListener('click', () => updateViewer(activeScreen + 1));
  viewer.addEventListener('click', event => {
    if (event.target === viewer) viewer.close();
  });
  viewer.addEventListener('keydown', event => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    updateViewer(activeScreen + (event.key === 'ArrowLeft' ? -1 : 1));
  });
  viewer.addEventListener('close', () => {
    opener?.focus({ preventScroll: true });
    render();
    requestFrame();
  });

  carousel.addEventListener('wheel', event => {
    if (event.ctrlKey || event.metaKey || event.shiftKey ||
        event.deltaMode !== WheelEvent.DOM_DELTA_PIXEL ||
        Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
    event.preventDefault();
    target += event.deltaX / spacing;
    requestFrame();
  }, { passive: false });

  new ResizeObserver(() => {
    if (!carousel.clientWidth) return;
    const visibleCard = cards.find(card => !card.hidden);
    spacing = Math.max(111, visibleCard.offsetWidth * 1.28);
    render();
  }).observe(carousel);

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (!visible) {
      cancelAnimationFrame(frame);
      frame = 0;
      lastFrame = 0;
      return;
    }
    render();
    requestFrame();
  }).observe(carousel);

  motion.addEventListener('change', requestFrame);
  new MutationObserver(updateLabels).observe(document.documentElement, { attributeFilter: ['lang'] });
  updateLabels();

  const reelObserver = new ResizeObserver(entries => {
    for (const { target: reel } of entries) updateReelFade(reel);
  });

  function updateReelFade(reel) {
    reel.toggleAttribute('data-fade-left', reel.scrollLeft > 2);
    reel.toggleAttribute('data-fade-right', reel.scrollLeft < reel.scrollWidth - reel.clientWidth - 2);
  }

  for (const reel of savings.querySelectorAll('.savings-reel')) {
    let swipe;
    let movedAt = -Infinity;
    reelObserver.observe(reel);
    reel.addEventListener('scroll', () => updateReelFade(reel), { passive: true });
    reel.addEventListener('pointerdown', event => {
      if (event.button !== 0 || event.pointerType !== 'mouse' || reel.scrollWidth <= reel.clientWidth) return;
      swipe = { start: event.clientX, position: reel.scrollLeft, moved: false };
    });
    reel.addEventListener('pointermove', event => {
      if (!swipe || !event.buttons) return;
      const dx = event.clientX - swipe.start;
      if (!swipe.moved && Math.abs(dx) < 6) return;
      if (!swipe.moved) {
        swipe.moved = true;
        reel.classList.add('is-dragging');
        reel.setPointerCapture(event.pointerId);
      }
      reel.scrollLeft = swipe.position - dx;
    });
    function endSwipe() {
      if (swipe?.moved) movedAt = performance.now();
      swipe = undefined;
      reel.classList.remove('is-dragging');
    }
    reel.addEventListener('lostpointercapture', endSwipe);
    window.addEventListener('pointerup', endSwipe);
    window.addEventListener('pointercancel', endSwipe);
    reel.addEventListener('click', event => {
      const button = event.target.closest('.savings-screen');
      if (button && performance.now() - movedAt >= 180) showViewer(screenButtons.indexOf(button), button);
    });
  }
})();
