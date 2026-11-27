
const translations = Array.from(document.querySelectorAll('[data-en]'), element => ({
  element,
  ru: element.textContent,
  en: element.dataset.en
}));
const languageButtons = document.querySelectorAll('[data-lang]');
for (const button of languageButtons) {
  button.addEventListener('click', () => {
    const language = button.dataset.lang;
    document.documentElement.lang = language;
    document.title = language === 'en' ? 'Valya Vasilyeva · Portfolio' : 'Валя Васильева · Портфолио';
    for (const translation of translations) {
      translation.element.textContent = translation[language];
    }
    for (const option of languageButtons) {
      option.setAttribute('aria-pressed', String(option === button));
    }
  });
}


const homeSpace = document.querySelector('.home-space');
const homeCanvas = homeSpace.querySelector('.home-canvas');
const homeCanvasPosition = homeSpace.querySelector('.home-canvas-position');
const homeZoom = document.querySelector('.home-zoom');
const shelf = document.querySelector('.shelf');
const aboutSpace = document.querySelector('.about-space');
const homeSwitch = document.querySelector('.home-switch');
const homeSwitchButtons = [...homeSwitch.querySelectorAll('[data-home]')];
const space = document.querySelector('.space');
const reading = document.querySelector('.reading');
const camera = document.querySelector('.camera');
const world = document.querySelector('.world');
const folderTitle = document.querySelector('#folder-title');
const foldersButton = document.querySelector('#folders');
const folderButtons = [...document.querySelectorAll('[data-folder]')];
const casePanels = [...reading.querySelectorAll('.case-panel:not(#panel-projects)')];
const caseNavigation = document.querySelector('.case-navigation');
const previousCase = document.querySelector('#previous-case');
const nextCase = document.querySelector('#next-case');
let caseIndex = -1;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const stackedHome = matchMedia('(max-width: 1020px)');
const layouts = [
  { x: 130, y: 178, width: 240, height: 175, angle: -11, depth: -125, yaw: 15 },
  { x: 465, y: 88, width: 245, height: 170, angle: 8, depth: 1190, yaw: -19 },
  { x: 853, y: 188, width: 237, height: 246, angle: -8, depth: 330, yaw: -21 },
  { x: 171, y: 470, width: 256, height: 171, angle: 6, depth: 710, yaw: 21 },
  { x: 460, y: 342, width: 210, height: 245, angle: 3, depth: 0, yaw: -9 },
  { x: 820, y: 505, width: 245, height: 148, angle: 9, depth: -95, yaw: -18 }
];
const lockedCaseLayouts = [
  { x: 425, y: 345, width: 280, height: 170, angle: 0, depth: -70, yaw: 0 },
  { x: 575, y: 295, width: 280, height: 170, angle: 0, depth: 270, yaw: 0 },
  { x: 455, y: 218, width: 280, height: 170, angle: 0, depth: 610, yaw: 0 }
];
const focalLength = 820;
let folder;
let fragment;
let drag;
let moved = false;
const nearClip = 210;
let travel = 0;
let folderScale = 1;
let foregroundCard;
let track;
let x = 0;
let y = 0;

function fitScale() {
  return Math.min(camera.clientWidth / 1000, camera.clientHeight / 740);
}

function distance(depth) {
  return focalLength / fitScale() + depth - travel;
}

function project(layout) {
  const depth = distance(layout.depth);
  const size = focalLength * folderScale / Math.max(depth, nearClip);
  return {
    left: camera.clientWidth / 2 + (x + layout.x - 500) * size,
    top: camera.clientHeight / 2 + (y + layout.y - 320) * size,
    size,
    opacity: Math.min(1, Math.max(0, (depth - nearClip) / 280))
  };
}

function render() {
  const gridDepth = Math.max(0, Math.min(1, travel * fitScale() / focalLength));
  camera.style.setProperty('--folder-grid-opacity', String(.07 + gridDepth * .18));
  for (const tile of world.children) {
    const position = project(tile.layout);
    tile.style.left = position.left + 'px';
    tile.style.top = position.top + 'px';
    tile.style.setProperty('--size', position.size);
    tile.style.opacity = position.opacity;
    tile.hidden = position.opacity === 0;
  }
}

function fit(reference = foregroundCard) {
  foregroundCard = reference;
  travel = 0;
  cancelAnimationFrame(panFrame);
  panFrame = 0;
  panX = panY = pinchDepth = 0;
  folderTouches.clear();
  if (reference) {
    const initialDepth = Math.max(distance(reference.depth), nearClip);
    const referenceWidth = reference.width * focalLength / initialDepth;
    const targetWidth = Math.min(camera.clientWidth * .44, camera.clientHeight * .82);
    folderScale = targetWidth / referenceWidth;
  }
  x = 0;
  y = 0;
  track = undefined;
  render();
}

function fly(amount, anchorX = camera.clientWidth / 2, anchorY = camera.clientHeight / 2, depth = 0) {
  const before = distance(depth);
  const maxDepth = world.classList.contains('concept-world') ? Math.max(...conceptLayouts.map(layout => layout.depth)) : 640;
  travel = Math.min(focalLength / fitScale() + maxDepth, Math.max(-550, travel + amount));
  const delta = (Math.max(distance(depth), nearClip) - Math.max(before, nearClip)) / (focalLength * folderScale);
  x += (anchorX - camera.clientWidth / 2) * delta;
  y += (anchorY - camera.clientHeight / 2) * delta;
  render();
}

function openFragment(button, panel, heading) {
  fragment = button;
  caseIndex = casePanels.indexOf(panel);
  caseNavigation.hidden = caseIndex < 0;
  previousCase.disabled = caseIndex <= 0;
  nextCase.disabled = caseIndex >= casePanels.length - 1;
  space.hidden = true;
  reading.hidden = false;
  for (const entry of reading.querySelectorAll('.panel')) entry.hidden = entry !== panel;
  heading.tabIndex = -1;
  document.body.classList.toggle('case-mode', panel.classList.contains('case-panel'));
  const images = panel.querySelector('.case-images');
  if (images) {
    images.scrollTop = 0;
    window.scrollTo(0, 0);
    panel.querySelector('h2').focus({ preventScroll: true });
    return;
  }
  heading.focus();
}

function translateSpace() {
  if (!folder) return;
  const isEnglish = document.documentElement.lang === 'en';
  const returnLabels = {
    concepts: { ru: 'К концептам', en: 'Back to concepts' },
    personal: { ru: 'К личным проектам', en: 'Back to personal projects' },
    projects: { ru: 'К кейсам', en: 'Back to cases' }
  };
  const returnLabel = returnLabels[folder.dataset.folder][isEnglish ? 'en' : 'ru'];
  conceptViewer.querySelector('.concept-return').textContent = returnLabel;
  document.querySelector('#back').textContent = returnLabel;
  const relatedTitle = folder.dataset.folder === 'personal'
    ? { ru: 'Другие', en: 'Other' }
    : { ru: 'Похожие', en: 'Related' };
  document.querySelector('#concept-related-title').textContent = relatedTitle[isEnglish ? 'en' : 'ru'];
  folderTitle.textContent = folder.querySelector('strong').textContent.trim().replace(/\s+/g, ' ');
  for (const button of world.querySelectorAll('.fragment')) {
    if (button.classList.contains('locked-case')) {
      button.querySelector('.case-lock-content span').textContent = document.documentElement.lang === 'en' ? 'Coming soon' : 'Скоро в портфолио';
    } else if (button.heading) button.lastElementChild.textContent = button.heading.textContent;
    else button.setAttribute('aria-label', conceptLabel(Number(button.dataset.conceptIndex)));
  }
}

function openFolder(button) {
  const origin = button.querySelector('.folder-art').getBoundingClientRect();
  folder = button;
  const id = button.dataset.folder;
  const panel = document.getElementById('panel-' + id);
  const isMediaFolder = id === 'concepts' || id === 'personal';
  if (isMediaFolder) selectMediaFolder(id);
  const isLocked = id === 'projects';
  const headings = panel ? [...panel.querySelectorAll('h2, h3, summary')] : [];
  const folderLayouts = isMediaFolder ? conceptLayouts : isLocked ? lockedCaseLayouts : layouts;
  homeSpace.hidden = true;
  homeZoom.hidden = true;
  shelf.hidden = true;
  aboutSpace.hidden = true;
  homeSwitch.hidden = true;
  space.hidden = false;
  window.scrollTo(0, 0);
  world.replaceChildren();
  world.classList.toggle('concept-world', isMediaFolder);
  resetConceptParallax();
  fit(folderLayouts[0]);
  const view = camera.getBoundingClientRect();

  folderLayouts.forEach((layout, index) => {
    const tile = document.createElement(isLocked ? 'article' : 'button');
    if (!isLocked) tile.type = 'button';
    tile.className = 'fragment ' + id;
    tile.layout = layout;
    if (!isMediaFolder) tile.heading = headings[index % headings.length];
    for (const key of ['width', 'height']) tile.style.setProperty('--' + key, layout[key] + 'px');
    tile.style.setProperty('--angle', layout.angle + 'deg');
    tile.style.setProperty('--yaw', layout.yaw + 'deg');
    tile.style.setProperty('--shade', 1 - Math.max(0, layout.depth) / 1050);
    tile.style.zIndex = 500 - layout.depth;
    tile.style.setProperty('--filter', `grayscale(1)`);
    if (isLocked) {
      tile.classList.add('locked-case');
      tile.append(document.querySelector('#case-lock').content.cloneNode(true));
    } else if (isMediaFolder) {
      tile.classList.add('concepts');
      tile.dataset.conceptIndex = index;
      tile.setAttribute('aria-haspopup', 'dialog');
      tile.append(makeConceptMedia(index, true));
      tile.style.setProperty('--sway-delay', `-${index * .83}s`);
      tile.addEventListener('pointermove', event => {
        if (event.pointerType !== 'mouse' || event.buttons || reducedMotion.matches) return;
        const rect = tile.getBoundingClientRect();
        tile.style.setProperty('--pitch', `${(0.5 - (event.clientY - rect.top) / rect.height) * 12}deg`);
        tile.style.setProperty('--turn', `${((event.clientX - rect.left) / rect.width - 0.5) * 12}deg`);
      });
      tile.addEventListener('pointerleave', () => {
        tile.style.removeProperty('--pitch');
        tile.style.removeProperty('--turn');
      });
    } else {
      const artwork = document.createElement('span');
      artwork.className = 'art';
      artwork.setAttribute('aria-hidden', 'true');
      tile.append(artwork, document.createElement('span'));
    }
    tile.addEventListener('click', event => {
      if (isLocked || (event.detail && moved)) return;
      if (isMediaFolder) {
        conceptTrigger = tile;
        const card = viewerCardFrame(tile);
        conceptViewer.showModal();
        showConcept(index);
        animateViewerCard(conceptViewer, card, conceptMedia.firstElementChild);
      } else {
        openFragment(tile, panel, tile.heading);
      }
    });
    tile.addEventListener('focus', () => {
      if (!tile.matches(':focus-visible')) return;
      const tileRect = tile.getBoundingClientRect();
      const cameraRect = camera.getBoundingClientRect();
      if (tileRect.left < cameraRect.left || tileRect.right > cameraRect.right ||
          tileRect.top < cameraRect.top || tileRect.bottom > cameraRect.bottom) {
        x = 500 - layout.x;
        y = 320 - layout.y;
        camera.scrollLeft = 0;
        camera.scrollTop = 0;
        render();
      }
    });
    world.append(tile);
    if (reducedMotion.matches) return;
    const end = project(layout);
    const dx = origin.left + origin.width / 2 - view.left - end.left;
    const dy = origin.top + origin.height / 2 - view.top - end.top;
    tile.animate([
      { translate: `${dx}px ${dy}px`, scale: .2, opacity: 0 },
      { translate: '0 0', scale: 1, opacity: 1 }
    ], { duration: 640, delay: index * 35, easing: 'cubic-bezier(.18,.75,.24,1)', fill: 'backwards' });
  });
  render();
  translateSpace();
  foldersButton.focus({ preventScroll: true });
}

function backToSpace() {
  document.body.classList.remove('case-mode');
  reading.hidden = true;
  const caseFolder = casePanels[caseIndex]?.id.replace('panel-', '');
  if (caseFolder && caseFolder !== folder.dataset.folder) {
    openFolder(folderButtons.find(button => button.dataset.folder === caseFolder));
    return;
  }
  space.hidden = false;
  window.scrollTo(0, 0);
  if (fragment.hidden) fit();
  fragment.focus({ preventScroll: true });
}

for (const button of folderButtons) {
  button.addEventListener('click', event => {
    if (event.detail && button.dataset.dragged === 'true') return;
    openFolder(button);
  });

  makeMovable(button, button.querySelector('.folder-art'), shelf);
}

function makeMovable(button, art, area) {
  function resetTilt() {
    for (const property of ['--tilt-x', '--tilt-y', '--rock']) art.style.removeProperty(property);
  }

  button.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse' || event.buttons || reducedMotion.matches) return;
    const box = button.getBoundingClientRect();
    const horizontal = (event.clientX - box.left) / box.width - .5;
    const vertical = (event.clientY - box.top) / box.height - .5;
    const amplitude = art.classList.contains('about-story') ? .55 : 1;
    art.style.setProperty('--tilt-x', `${vertical * -19 * amplitude}deg`);
    art.style.setProperty('--tilt-y', `${horizontal * 23 * amplitude}deg`);
    art.style.setProperty('--rock', `${horizontal * 10 * amplitude}deg`);
  });
  button.addEventListener('pointerleave', resetTilt);
  button.addEventListener('pointerdown', resetTilt);

  let position = { x: 0, y: 0 };
  let gesture;
  let scrollFrame;

  function moveItem() {
    const dx = gesture.pointerX - gesture.x + homeSpace.scrollLeft - gesture.scrollLeft;
    const dy = gesture.pointerY - gesture.y + homeSpace.scrollTop - gesture.scrollTop;
    const frame = homeSpace.getBoundingClientRect();
    const bounds = gesture.bounds;
    const scale = homeScale;
    const originX = bounds.left - frame.left + gesture.scrollLeft;
    const originY = bounds.top - frame.top + gesture.scrollTop;
    gesture.dx = Math.max(-originX, Math.min(homeSpace.scrollWidth - originX - bounds.width, dx)) / scale;
    gesture.dy = Math.max(-originY, Math.min(homeSpace.scrollHeight - originY - bounds.height, dy)) / scale;
    button.style.translate = `${position.x + gesture.dx}px ${position.y + gesture.dy}px`;
  }

  function scrollDuringDrag() {
    const { left, right } = homeSpace.getBoundingClientRect();
    const edge = 64;
    const pointer = gesture.pointerX;
    const amount = pointer < left + edge ? -10 : pointer > right - edge ? 10 : 0;
    if (amount) {
      homeSpace.scrollLeft += amount;
      moveItem();
    }
    scrollFrame = requestAnimationFrame(scrollDuringDrag);
  }

  button.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0 || (stackedHome.matches && area !== shelf)) return;
    button.dataset.dragged = 'false';
    gesture = {
      id: event.pointerId, x: event.clientX, y: event.clientY,
      scrollLeft: homeSpace.scrollLeft, scrollTop: homeSpace.scrollTop,
      bounds: button.getBoundingClientRect()
    };
    button.setPointerCapture(event.pointerId);
  });
  button.addEventListener('pointermove', event => {
    if (gesture?.id !== event.pointerId) return;
    if (button.dataset.dragged !== 'true' && Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) < 6) return;
    button.dataset.dragged = 'true';
    area.classList.add('home-item-dragging');
    gesture.pointerX = event.clientX;
    gesture.pointerY = event.clientY;
    moveItem();
    if (!stackedHome.matches && !scrollFrame) scrollFrame = requestAnimationFrame(scrollDuringDrag);
    if (area === shelf) button.classList.add('folder-moved');
  });
  button.addEventListener('lostpointercapture', () => {
    if (!gesture) return;
    cancelAnimationFrame(scrollFrame);
    scrollFrame = undefined;
    area.classList.remove('home-item-dragging');
    position.x += gesture.dx ?? 0;
    position.y += gesture.dy ?? 0;
    gesture = undefined;
  });
  window.addEventListener('resize', () => {
    position = { x: 0, y: 0 };
    button.style.translate = '';
    button.classList.remove('folder-moved');
  });
}
for (const item of aboutSpace.querySelectorAll('.about-movable')) {
  makeMovable(item, item, aboutSpace);
}

const homePanMargin = .5;
let homeScale = 1;
let homeNavigationX;

function homeTravel() {
  const distance = aboutSpace.getBoundingClientRect().left - shelf.getBoundingClientRect().left;
  if (aboutSpace.getBoundingClientRect().right - shelf.getBoundingClientRect().left <= homeSpace.clientWidth) return 0;
  return Math.min(distance, homeSpace.scrollWidth - homeSpace.clientWidth);
}

function homeStart() {
  if (!homeTravel()) return homeSpace.clientWidth * homePanMargin;
  return Math.max(0, (parseFloat(homeCanvasPosition.style.paddingLeft) || 0) - homeSpace.clientWidth * .08);
}

function homeSectionPosition(view) {
  return homeStart() + (view === 'about' ? homeTravel() : 0);
}

function setHomeNavigation(view) {
  homeSpace.dataset.activeView = view;
  for (const button of homeSwitchButtons) button.setAttribute('aria-pressed', String(button.dataset.home === view));
}

function updateHomeNavigation() {
  if (stackedHome.matches) {
    if (!homeSpace.hidden) setHomeNavigation(aboutSpace.getBoundingClientRect().top <= window.innerHeight / 2 ? 'about' : 'projects');
    return;
  }
  const left = homeSpace.scrollLeft;
  if (left === homeNavigationX) return;
  homeNavigationX = left;
  const travel = homeTravel();
  if (travel > 0) setHomeNavigation(left >= homeStart() + travel / 2 ? 'about' : 'projects');
}

function showHome(view, animate = false) {
  closeAboutDetails();
  homeSpace.hidden = false;
  homeZoom.hidden = false;
  shelf.hidden = false;
  aboutSpace.hidden = false;
  homeSwitch.hidden = false;
  sizeHomeCanvas();
  if (stackedHome.matches) {
    const behavior = animate && !reducedMotion.matches ? 'smooth' : 'instant';
    if (view === 'about') aboutSpace.scrollIntoView({ behavior, block: 'start' });
    else window.scrollTo({ top: 0, behavior });
    setHomeNavigation(view);
    return;
  }
  homeSpace.scrollTo({
    top: homeTop(),
    left: homeSectionPosition(view),
    behavior: animate && !reducedMotion.matches ? 'smooth' : 'instant'
  });
  setHomeNavigation(view);
  window.scrollTo(0, 0);
}

for (const button of homeSwitchButtons) {
  button.addEventListener('click', () => showHome(button.dataset.home, true));
}

homeSpace.addEventListener('scroll', updateHomeNavigation);
window.addEventListener('scroll', () => { if (stackedHome.matches) updateHomeNavigation(); }, { passive: true });
homeSpace.addEventListener('keydown', event => {
  if (event.target !== homeSpace || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
  event.preventDefault();
  showHome(event.key === 'ArrowLeft' ? 'projects' : 'about', true);
});
window.addEventListener('resize', () => {
  if (!homeSpace.hidden) {
    sizeHomeCanvas();
    if (!stackedHome.matches) homeSpace.scrollTo({ left: homeSectionPosition(homeSpace.dataset.activeView), top: homeTop() });
  }
});

let homeDrag;
homeSpace.addEventListener('pointerdown', event => {
  if (stackedHome.matches || event.pointerType !== 'mouse' || event.button !== 0 ||
      event.target.closest('button, a, input, .about-movable')) return;
  homeDrag = { id: event.pointerId, x: event.clientX, y: event.clientY, left: homeSpace.scrollLeft, top: homeSpace.scrollTop };
  homeSpace.setPointerCapture(event.pointerId);
  homeSpace.setAttribute('data-panning', '');
});
homeSpace.addEventListener('pointermove', event => {
  if (event.pointerId !== homeDrag?.id) return;
  homeSpace.scrollLeft = homeDrag.left + (homeDrag.x - event.clientX) * 1.65;
  homeSpace.scrollTop = homeDrag.top + homeDrag.y - event.clientY;
});
homeSpace.addEventListener('lostpointercapture', () => {
  homeDrag = undefined;
  homeSpace.removeAttribute('data-panning');
});

function sizeHomeCanvas() {
  if (stackedHome.matches) {
    homeScale = 1;
    homeCanvas.style.removeProperty('width');
    homeCanvas.style.removeProperty('zoom');
    homeCanvasPosition.removeAttribute('style');
    return;
  }
  homeCanvas.style.width = `${homeSpace.clientWidth}px`;
  positionHomeCanvas();
}

function homeTop() {
  if (homeCanvas.getBoundingClientRect().height < homeSpace.clientHeight) return homeSpace.clientHeight * homePanMargin;
  const gutter = parseFloat(homeCanvasPosition.style.paddingTop) || 0;
  const visibleTop = Math.max(32, Math.min(72, homeSpace.clientHeight * .085));
  return Math.max(0, gutter - visibleTop);
}

function positionHomeCanvas(left, top) {
  const contentWidth = aboutSpace.getBoundingClientRect().right - shelf.getBoundingClientRect().left;
  const canvas = homeCanvas.getBoundingClientRect();
  const viewportWidth = homeSpace.clientWidth;
  const viewportHeight = homeSpace.clientHeight;
  const roomX = viewportWidth - contentWidth;
  const roomY = viewportHeight - canvas.height;
  const panX = viewportWidth * homePanMargin;
  const panY = viewportHeight * homePanMargin;
  const edgeX = Math.max(panX, canvas.width * 3.3 - contentWidth);
  const edgeY = Math.max(panY, canvas.height * 2);
  const leftGutter = left === undefined && roomX >= 0 ? roomX / 2 + panX : Math.max(edgeX, panX - (left ?? 0));
  const topGutter = top === undefined && roomY > 0 ? roomY / 2 + panY : Math.max(edgeY, panY - (top ?? 0));
  homeCanvasPosition.style.paddingLeft = `${leftGutter}px`;
  homeCanvasPosition.style.paddingTop = `${topGutter}px`;
  const scrollLeft = left === undefined ? homeStart() : left + leftGutter;
  const scrollTop = top === undefined ? homeTop() : top + topGutter;
  homeCanvasPosition.style.minWidth = `${Math.ceil(scrollLeft + viewportWidth + panX)}px`;
  homeCanvasPosition.style.minHeight = `${Math.ceil(scrollTop + viewportHeight + panY)}px`;
  return { left: scrollLeft, top: scrollTop };
}

sizeHomeCanvas();
if (!stackedHome.matches) homeSpace.scrollTo({ left: homeSectionPosition('projects'), top: homeTop() });

function zoomHomeScene(factor, clientX, clientY) {
  const viewport = homeSpace.getBoundingClientRect();
  const canvas = homeCanvas.getBoundingClientRect();
  const anchorX = clientX ?? viewport.left + viewport.width / 2;
  const anchorY = clientY ?? viewport.top + viewport.height / 2;
  const scale = Math.max(.01, Math.min(2.4, homeScale * factor));
  if (scale === homeScale) return;
  const ratio = scale / homeScale;
  const left = (anchorX - canvas.left) * ratio - (anchorX - viewport.left);
  const top = (anchorY - canvas.top) * ratio - (anchorY - viewport.top);
  homeScale = scale;
  homeCanvas.style.zoom = scale;
  homeSpace.scrollTo({ ...positionHomeCanvas(left, top), behavior: 'instant' });
  homeNavigationX = homeSpace.scrollLeft;
}

for (const button of homeZoom.querySelectorAll('[data-home-zoom]')) {
  button.addEventListener('click', () => zoomHomeScene(1.2 ** Number(button.dataset.homeZoom)));
}

homeSpace.addEventListener('wheel', event => {
  if (stackedHome.matches || event.metaKey || activeAboutDetails) return;
  event.preventDefault();
  if (event.ctrlKey) {
    const delta = Math.max(-120, Math.min(120, wheelDelta(event)));
    zoomHomeScene(Math.exp(-delta * .012), event.clientX, event.clientY);
    return;
  }
  const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? homeSpace.clientWidth : 1;
  const horizontal = event.shiftKey && !event.deltaX ? event.deltaY : event.deltaX;
  homeSpace.scrollLeft += horizontal * unit * 1.45;
  if (!event.shiftKey) homeSpace.scrollTop += wheelDelta(event);
}, { passive: false });

const viewerTransitions = new WeakMap();

function viewerCardFrame(element) {
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  const visibleWidth = Math.min(window.innerWidth, rect.right) - Math.max(0, rect.left);
  const visibleHeight = Math.min(window.innerHeight, rect.bottom) - Math.max(0, rect.top);
  return visibleWidth >= 8 && visibleHeight >= 8 ? rect : null;
}

function viewerMediaCopy(media) {
  if (media instanceof HTMLVideoElement && media.readyState >= 2) {
    const frame = document.createElement('canvas');
    frame.width = media.videoWidth;
    frame.height = media.videoHeight;
    frame.getContext('2d').drawImage(media, 0, 0);
    return frame;
  }
  const image = new Image();
  image.alt = '';
  image.src = media instanceof HTMLVideoElement ? media.poster : media.currentSrc || media.src;
  return image;
}

function animateViewerCard(dialog, card, media, closing = false) {
  const current = viewerTransitions.get(dialog);
  if (current) {
    if (closing && !current.closing) {
      current.closing = true;
      dialog.classList.add('viewer-closing');
      for (const animation of current.animations) animation.reverse();
    }
    return;
  }
  if (reducedMotion.matches) {
    if (closing) dialog.close();
    return;
  }

  const enlarged = viewerCardFrame(media);
  const duration = 440;
  const options = { duration, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'both',
    direction: closing ? 'reverse' : 'normal' };
  const animations = [];
  const layout = dialog.firstElementChild;
  let overlay;
  let playingVideo;
  if (card && enlarged) {
    // A fixed layer can move without changing the dialog's scrollable bounds.
    overlay = document.createElement('div');
    overlay.className = 'viewer-morph';
    overlay.setAttribute('aria-hidden', 'true');
    const copy = viewerMediaCopy(media);
    copy.style.objectFit = getComputedStyle(media).objectFit;
    overlay.append(copy);
    const surface = document.createElement('div');
    surface.className = 'viewer-morph-surface';
    dialog.append(surface);
    surface.append(overlay);
    const fullWidth = enlarged.width;
    const fullHeight = enlarged.height;
    overlay.style.width = `${fullWidth}px`;
    overlay.style.height = `${fullHeight}px`;
    const scale = Math.max(card.width / fullWidth, card.height / fullHeight);
    const cropX = Math.max(0, 100 * (1 - card.width / (fullWidth * scale)));
    const cropY = Math.max(0, 100 * (1 - card.height / (fullHeight * scale)));
    const resume = media.classList.contains('resume-page');
    const xInset = resume ? 0 : cropX / 2;
    const yInset = resume ? 0 : cropY / 2;
    const x = card.left - fullWidth * scale * xInset / 100;
    const y = card.top - fullHeight * scale * yInset / 100;
    if (media instanceof HTMLVideoElement && !media.paused) {
      playingVideo = media;
      media.pause();
    }
    animations.push(overlay.animate([
      { transform: `translate(${x}px, ${y}px) scale(${scale})`, clipPath: `inset(${yInset}% ${cropX - xInset}% ${cropY - yInset}% ${xInset}% round 14px)` },
      { transform: `translate(${enlarged.left}px, ${enlarged.top}px) scale(1)`, clipPath: 'inset(0 0 0 0 round 14px)' }
    ], options));
    // Fade the frozen frame into the real media only when their geometry matches.
    animations.push(overlay.animate([{ opacity: 1 }, { opacity: 1, offset: .82 }, { opacity: 0 }], options));
    animations.push(media.animate([{ opacity: 0 }, { opacity: 0, offset: .82 }, { opacity: 1 }], options));
  }
  const chrome = overlay
    ? dialog.querySelectorAll('.concept-viewer-header, .personal-project-info, .concept-actions, .resume-tools, .screen-music-mute')
    : [layout];
  for (const element of chrome) {
    animations.push(element.animate([{ opacity: 0 }, { opacity: 1 }], options));
  }
  dialog.classList.toggle('viewer-closing', closing);
  const transition = { closing, animations };
  viewerTransitions.set(dialog, transition);
  Promise.all(animations.map(animation => animation.finished)).then(() => {
    if (transition.closing) dialog.close();
    overlay?.parentElement.remove();
    for (const animation of animations) animation.cancel();
    dialog.classList.remove('viewer-closing');
    viewerTransitions.delete(dialog);
    if (!transition.closing && playingVideo?.isConnected) playingVideo.play().catch(() => {});
  });
}

const resumeViewer = document.querySelector('.resume-viewer');
const resumeButton = document.querySelector('.about-resume');
resumeButton.addEventListener('click', event => {
  if (event.detail && resumeButton.dataset.dragged === 'true') return;
  const card = viewerCardFrame(resumeButton);
  resumeViewer.showModal();
  positionResumeAtTop();
  animateViewerCard(resumeViewer, card, resumePage);
});
const resumeCanvas = resumeViewer.querySelector('.resume-canvas');
const resumePage = resumeViewer.querySelector('.resume-page');
const resumeTools = resumeViewer.querySelector('.resume-tools');
let resumeView;
let resumeDrag;

function positionResumeAtTop() {
  const canvas = resumeCanvas.getBoundingClientRect();
  const fitWidth = (canvas.width - 24) / resumePage.offsetWidth;
  const scale = stackedHome.matches ? fitWidth : 2 * Math.min(2.2, fitWidth);
  const centeredTop = canvas.top + (canvas.height - resumePage.offsetHeight * scale) / 2;
  const top = resumeTools.getBoundingClientRect().bottom + 16;
  resumeView = { x: 0, y: top - centeredTop, scale, atTop: true };
  renderResume();
}

function renderResume() {
  const maxX = resumeCanvas.clientWidth / 2 + resumePage.offsetWidth * resumeView.scale / 2 - 40;
  const maxY = resumeCanvas.clientHeight / 2 + resumePage.offsetHeight * resumeView.scale / 2 - 40;
  resumeView.x = Math.max(-maxX, Math.min(maxX, resumeView.x));
  resumeView.y = Math.max(-maxY, Math.min(maxY, resumeView.y));
  resumePage.style.transform = `translate(${resumeView.x}px, ${resumeView.y}px) scale(${resumeView.scale})`;
}

function zoomResume(factor, anchorX = 0, anchorY = 0) {
  resumeView.atTop = false;
  const scale = Math.max(.5, Math.min(5, resumeView.scale * factor));
  const ratio = scale / resumeView.scale;
  resumeView.x = anchorX - (anchorX - resumeView.x) * ratio;
  resumeView.y = anchorY - (anchorY - resumeView.y) * ratio;
  resumeView.scale = scale;
  renderResume();
}

for (const button of resumeViewer.querySelectorAll('[data-resume-zoom]')) {
  button.addEventListener('click', () => zoomResume(1.25 ** Number(button.dataset.resumeZoom)));
}
let resumeGestureScale;

function zoomResumeAtPointer(factor, event) {
  const rect = resumeCanvas.getBoundingClientRect();
  zoomResume(factor, event.clientX - rect.left - rect.width / 2, event.clientY - rect.top - rect.height / 2);
}

resumeCanvas.addEventListener('wheel', event => {
  event.preventDefault();
  if (resumeGestureScale !== undefined) return;
  const delta = wheelDelta(event);
  if (event.ctrlKey) {
    zoomResumeAtPointer(Math.exp(-Math.max(-140, Math.min(140, delta)) * .006), event);
    return;
  }
  const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? resumeCanvas.clientWidth : 1;
  resumeView.atTop = false;
  resumeView.x -= event.deltaX * unit;
  resumeView.y -= delta;
  renderResume();
}, { passive: false });

resumeCanvas.addEventListener('gesturestart', event => {
  event.preventDefault();
  resumeGestureScale = event.scale || 1;
}, { passive: false });
resumeCanvas.addEventListener('gesturechange', event => {
  if (resumeGestureScale === undefined || !(event.scale > 0)) return;
  event.preventDefault();
  zoomResumeAtPointer(event.scale / resumeGestureScale, event);
  resumeGestureScale = event.scale;
}, { passive: false });
resumeCanvas.addEventListener('gestureend', () => { resumeGestureScale = undefined; });

resumeCanvas.addEventListener('pointerdown', event => {
  if (!event.isPrimary || event.button !== 0) return;
  resumeDrag = { id: event.pointerId, x: event.clientX - resumeView.x, y: event.clientY - resumeView.y };
  resumeCanvas.setPointerCapture(event.pointerId);
});
resumeCanvas.addEventListener('pointermove', event => {
  if (event.pointerId !== resumeDrag?.id) return;
  resumeView.atTop = false;
  resumeView.x = event.clientX - resumeDrag.x;
  resumeView.y = event.clientY - resumeDrag.y;
  renderResume();
});
resumeCanvas.addEventListener('lostpointercapture', () => { resumeDrag = undefined; });
function closeResume() {
  animateViewerCard(resumeViewer, viewerCardFrame(resumeButton), resumePage, true);
}
resumeViewer.querySelector('form[method="dialog"]').addEventListener('submit', event => {
  event.preventDefault();
  closeResume();
});
resumeViewer.addEventListener('cancel', event => {
  event.preventDefault();
  closeResume();
});
resumeViewer.addEventListener('close', () => {
  resumeGestureScale = undefined;
  resumePage.style.removeProperty('transform');
  resumeButton.focus({ preventScroll: true });
});
window.addEventListener('resize', () => {
  if (resumeViewer.open && resumeView.atTop) positionResumeAtTop();
});

for (const button of languageButtons) button.addEventListener('click', translateSpace);
foldersButton.addEventListener('click', () => {
  space.hidden = true;
  world.replaceChildren();
  showHome('projects');
  folder.focus({ preventScroll: true });
});
document.querySelector('#back').addEventListener('click', backToSpace);
document.querySelector('#zoom-out').addEventListener('click', () => fly(-260));
document.querySelector('#zoom-in').addEventListener('click', () => fly(260));

function wheelDelta(event) {
  return event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 440 : 1);
}

camera.addEventListener('wheel', event => {
  if (event.ctrlKey || event.metaKey) return;
  event.preventDefault();
  const bounds = camera.getBoundingClientRect();
  const now = event.timeStamp;
  if (!track || now - track.time > 160) {
    track = { depth: event.target.closest('.fragment')?.layout.depth ?? 0 };
  }
  track.time = now;
  const amount = Math.max(-260, Math.min(260, wheelDelta(event))) * 2.3;
  fly(amount, event.clientX - bounds.left, event.clientY - bounds.top, track.depth);
}, { passive: false });

camera.addEventListener('pointerdown', event => {
  if (event.pointerType === 'touch' || !event.isPrimary || event.button !== 0) return;
  moved = false;
  drag = { id: event.pointerId, left: event.clientX, top: event.clientY, x, y };
});
camera.addEventListener('pointermove', event => {
  if (!drag || event.pointerId !== drag.id) return;
  const dx = event.clientX - drag.left;
  const dy = event.clientY - drag.top;
  if (!moved && Math.hypot(dx, dy) < 6) return;
  if (!moved) camera.setPointerCapture(event.pointerId);
  moved = true;
  camera.classList.add('dragging');
  const panScale = project({ x: 500, y: 320, depth: 0 }).size;
  x = drag.x + dx / panScale;
  y = drag.y + dy / panScale;
  render();
});
function stopDragging() {
  drag = undefined;
  camera.classList.remove('dragging');
}
window.addEventListener('pointerup', stopDragging);
camera.addEventListener('pointercancel', stopDragging);
camera.addEventListener('lostpointercapture', stopDragging);
const folderTouches = new Map();
let touchStart;
let panFrame;
let panX = 0;
let panY = 0;
let pinchDepth = 0;
let pinchAnchor;

function animateFolderMovement() {
  panFrame = 0;
  if (space.hidden) {
    panX = panY = pinchDepth = 0;
    return;
  }
  const fraction = reducedMotion.matches ? 1 : .26;
  const dx = Math.abs(panX) < .2 ? panX : panX * fraction;
  const dy = Math.abs(panY) < .2 ? panY : panY * fraction;
  const depth = Math.abs(pinchDepth) < .2 ? pinchDepth : pinchDepth * fraction;
  panX -= dx;
  panY -= dy;
  pinchDepth -= depth;
  const scale = project({ x: 500, y: 320, depth: 0 }).size;
  x += dx / scale;
  y += dy / scale;
  if (depth) fly(depth, pinchAnchor.x, pinchAnchor.y);
  else render();
  if (panX || panY || pinchDepth) panFrame = requestAnimationFrame(animateFolderMovement);
}

function panFolder(dx, dy) {
  panX += dx;
  panY += dy;
  if (!panFrame) panFrame = requestAnimationFrame(animateFolderMovement);
}

const folderStick = space.querySelector('.space-stick');
let stickPointer;
let stickFrame;
let stickTime;
let stickX = 0;
let stickY = 0;

function setStickPosition(event) {
  const bounds = folderStick.getBoundingClientRect();
  const radius = bounds.width * .35;
  const dx = (event.clientX - bounds.left - bounds.width / 2) / radius;
  const dy = (event.clientY - bounds.top - bounds.height / 2) / radius;
  const length = Math.max(1, Math.hypot(dx, dy));
  stickX = dx / length;
  stickY = dy / length;
  folderStick.style.setProperty('--stick-x', `${stickX * radius}px`);
  folderStick.style.setProperty('--stick-y', `${stickY * radius}px`);
}

function animateFolderStick(time) {
  if (space.hidden) {
    resetFolderStick();
    return;
  }
  const elapsed = Math.min(32, time - (stickTime ?? time));
  stickTime = time;
  const input = value => Math.sign(value) * Math.max(0, Math.abs(value) - .12) / .88;
  const scale = project({ x: 500, y: 320, depth: 0 }).size;
  x -= input(stickX) * elapsed * .45 / scale;
  fly(-input(stickY) * elapsed * .85);
  stickFrame = requestAnimationFrame(animateFolderStick);
}

function resetFolderStick() {
  stickPointer = stickTime = undefined;
  cancelAnimationFrame(stickFrame);
  folderStick.removeAttribute('data-active');
  folderStick.style.removeProperty('--stick-x');
  folderStick.style.removeProperty('--stick-y');
}

folderStick.addEventListener('pointerdown', event => {
  if (event.button !== 0 || stickPointer !== undefined) return;
  stickPointer = event.pointerId;
  folderStick.setPointerCapture(event.pointerId);
  folderStick.setAttribute('data-active', '');
  setStickPosition(event);
  stickFrame = requestAnimationFrame(animateFolderStick);
});
folderStick.addEventListener('pointermove', event => {
  if (event.pointerId === stickPointer) setStickPosition(event);
});
for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
  folderStick.addEventListener(type, event => {
    if (event.pointerId === stickPointer) resetFolderStick();
  });
}
folderStick.addEventListener('keydown', event => {
  const moves = { ArrowUp: [0, 180], ArrowDown: [0, -180], ArrowLeft: [90, 0], ArrowRight: [-90, 0] };
  const input = moves[event.key];
  if (!input) return;
  event.preventDefault();
  pinchAnchor = { x: camera.clientWidth / 2, y: camera.clientHeight / 2 };
  pinchDepth += input[1];
  panFolder(input[0], 0);
});

function touchPair() {
  const [first, second] = folderTouches.values();
  return {
    x: (first.x + second.x) / 2,
    y: (first.y + second.y) / 2,
    distance: Math.hypot(first.x - second.x, first.y - second.y)
  };
}

camera.addEventListener('pointerdown', event => {
  if (event.pointerType !== 'touch' || folderTouches.size >= 2) return;
  folderTouches.set(event.pointerId, { x: event.clientX, y: event.clientY });
  if (folderTouches.size === 1) {
    moved = false;
    touchStart = { x: event.clientX, y: event.clientY, card: event.target.closest('.fragment') };
  } else {
    moved = true;
  }
});

camera.addEventListener('pointermove', event => {
  const previous = folderTouches.get(event.pointerId);
  if (!previous) return;
  const pair = folderTouches.size === 2 ? touchPair() : null;
  folderTouches.set(event.pointerId, { x: event.clientX, y: event.clientY });
  if (!moved && Math.hypot(event.clientX - touchStart.x, event.clientY - touchStart.y) < 6) return;
  const from = moved ? previous : touchStart;
  moved = true;
  if (!pair) {
    panFolder(event.clientX - from.x, event.clientY - from.y);
    return;
  }
  const next = touchPair();
  const bounds = camera.getBoundingClientRect();
  pinchAnchor = { x: next.x - bounds.left, y: next.y - bounds.top };
  if (pair.distance > 0 && next.distance > 0) {
    pinchDepth += Math.max(nearClip, distance(0)) * (1 - pair.distance / next.distance);
  }
  panFolder(next.x - pair.x, next.y - pair.y);
});

function endFolderTouch(event) {
  if (!folderTouches.delete(event.pointerId)) return;
  if (!folderTouches.size && !moved && !touchStart.card && event.type === 'pointerup') {
    const bounds = camera.getBoundingClientRect();
    panFolder((bounds.left + bounds.width / 2 - event.clientX) * .55,
      (bounds.top + bounds.height / 2 - event.clientY) * .55);
  }
}

camera.addEventListener('pointerup', endFolderTouch);
camera.addEventListener('pointercancel', endFolderTouch);
camera.addEventListener('lostpointercapture', endFolderTouch);

camera.addEventListener('keydown', event => {
  const directions = { ArrowLeft: [70, 0], ArrowRight: [-70, 0], ArrowUp: [0, 70], ArrowDown: [0, -70] };
  const direction = directions[event.key];
  if (!direction) return;
  event.preventDefault();
  x += direction[0];
  y += direction[1];
  render();
});
document.addEventListener('keydown', event => {
  if (event.key !== 'Escape' || document.querySelector('dialog[open], #comments-dialog:popover-open')) return;
  if (activeAboutDetails) closeAboutDetails();
  else if (!homeSpace.hidden && homeSpace.dataset.activeView === 'about') {
    showHome('projects');
    homeSwitch.querySelector('[data-home=projects]').focus({ preventScroll: true });
  }
  else if (!reading.hidden) backToSpace();
  else if (!space.hidden) foldersButton.click();
});
window.addEventListener('resize', () => { if (!space.hidden) fit(); });

function turnCase(direction) {
  const next = casePanels[caseIndex + direction];
  if (next) openFragment(fragment, next, next.querySelector('h2'));
}

previousCase.addEventListener('click', () => turnCase(-1));
nextCase.addEventListener('click', () => turnCase(1));


let activeAboutDetails;
let activeAboutTrigger;
let followsAboutPointer = false;

function closeAboutDetails() {
  if (!activeAboutDetails) return;
  const restoreFocus = activeAboutDetails.contains(document.activeElement);
  activeAboutDetails.hidden = true;
  activeAboutTrigger.setAttribute('aria-expanded', 'false');
  if (restoreFocus) activeAboutTrigger.focus({ preventScroll: true });
  activeAboutDetails = undefined;
  activeAboutTrigger = undefined;
  followsAboutPointer = false;
  document.documentElement.classList.remove('about-details-open');
}

function positionAboutDetails(x, y) {
  const { width, height } = activeAboutDetails.getBoundingClientRect();
  const maxX = document.documentElement.clientWidth - width - 12;
  const maxY = window.innerHeight - height - 12;
  const left = x + 16 <= maxX ? x + 16 : x - width - 16;
  const top = y + 16 <= maxY ? y + 16 : y - height - 16;
  activeAboutDetails.style.left = `${Math.max(12, Math.min(maxX, left))}px`;
  activeAboutDetails.style.top = `${Math.max(12, Math.min(maxY, top))}px`;
}

const aboutTriggers = aboutSpace.querySelectorAll('.logo-trigger');
for (const trigger of aboutTriggers) {
  const details = document.getElementById(trigger.getAttribute('aria-controls'));
  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'about-details-close';
  closeButton.setAttribute('aria-label', 'Закрыть / Close');
  closeButton.addEventListener('click', closeAboutDetails);
  details.append(closeButton);
  document.body.append(details);
  let pointerType;
  trigger.addEventListener('pointerdown', event => { pointerType = event.pointerType; });
  trigger.addEventListener('click', event => {
    if (event.detail && trigger.dataset.dragged === 'true') return;
    followsAboutPointer = Boolean(event.detail && (event.pointerType || pointerType) === 'mouse');
    activeAboutTrigger = trigger;
    activeAboutDetails = details;
    details.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    document.documentElement.classList.toggle('about-details-open', followsAboutPointer);
    const anchor = trigger.getBoundingClientRect();
    positionAboutDetails(event.detail ? event.clientX : anchor.right, event.detail ? event.clientY : anchor.top);
    if (!followsAboutPointer) closeButton.focus({ preventScroll: true });
  });
}

document.addEventListener('pointermove', event => {
  if (followsAboutPointer && event.pointerType === 'mouse') positionAboutDetails(event.clientX, event.clientY);
});
document.addEventListener('pointerdown', event => {
  if (!followsAboutPointer) return;
  event.preventDefault();
  event.stopPropagation();
}, true);
document.addEventListener('click', event => {
  if (!followsAboutPointer) return;
  event.preventDefault();
  event.stopPropagation();
  closeAboutDetails();
}, true);

homeSpace.addEventListener('pointerdown', event => {
  if (activeAboutDetails) event.stopPropagation();
}, true);
homeSpace.addEventListener('click', event => {
  if (!activeAboutDetails) return;
  event.preventDefault();
  event.stopPropagation();
  closeAboutDetails();
}, true);

const photoToggle = document.querySelector('.photo-toggle');
const photoCard = document.querySelector('#profile-card');

photoToggle.addEventListener('click', () => {
  const expanded = photoToggle.getAttribute('aria-expanded') === 'true';
  photoToggle.setAttribute('aria-expanded', String(!expanded));
  photoToggle.setAttribute('aria-label', expanded ? 'Показать профиль / Show profile' : 'Свернуть профиль / Collapse profile');
  photoCard.inert = expanded;
});

const garlandToggle = document.querySelector('.garland-toggle');
const holidaySnow = document.querySelector('#holiday-snow');
const flakes = document.createDocumentFragment();
const snowLayers = [
  { count: 36, size: 2, blur: .2, speed: 28, opacity: .65 },
  { count: 24, size: 4, blur: .8, speed: 22, opacity: .75 },
  { count: 14, size: 6, blur: 1.8, speed: 16, opacity: .8 }
];
for (const layer of snowLayers) {
  for (let index = 0; index < layer.count; index++) {
    const flake = document.createElement('i');
    const duration = layer.speed + Math.random() * 9;
    flake.style.left = `${Math.random() * 100}%`;
    flake.style.setProperty('--flake-size', `${layer.size + Math.random() * 2}px`);
    flake.style.setProperty('--flake-blur', `${layer.blur}px`);
    flake.style.setProperty('--flake-opacity', layer.opacity);
    flake.style.setProperty('--flake-duration', `${duration}s`);
    const progress = Math.random();
    flake.style.setProperty('--flake-delay', `${-progress * duration}s`);
    flake.style.setProperty('--flake-static-top', `${progress * 100}%`);
    flake.style.setProperty('--flake-drift', `${(Math.random() - .5) * 120}px`);
    flakes.append(flake);
  }
}
holidaySnow.querySelector('.snowflakes').append(flakes);

function setGarland(visible) {
  document.querySelector('#holiday-garland').classList.toggle('lights-off', !visible);
  garlandToggle.setAttribute('aria-pressed', String(visible));
}

try {
  setGarland(localStorage.getItem('portfolio-garland') !== 'off');
} catch {
  setGarland(true);
}

garlandToggle.addEventListener('click', () => {
  const visible = garlandToggle.getAttribute('aria-pressed') !== 'true';
  setGarland(visible);
  try { localStorage.setItem('portfolio-garland', visible ? 'on' : 'off'); } catch {}
});

const conceptViewer = document.querySelector('.concept-viewer');
const conceptMedia = document.querySelector('.concept-media');
const conceptProject = conceptViewer.querySelector('.concept-project');
let conceptFiles;
let conceptLayouts;
const mediaLayouts = { concepts: [
  ...layouts,
  { x: 250, y: 290, width: 230, height: 148, angle: -5, depth: 435, yaw: 15 },
  { x: 660, y: 440, width: 210, height: 182, angle: 7, depth: 900, yaw: -11 },
  { x: 667, y: 160, width: 145, height: 222, angle: -4, depth: 620, yaw: -14 }
], personal: [
  { x: 340, y: 330, width: 280, height: 210, angle: -5, depth: 0, yaw: 12 },
  { x: 710, y: 295, width: 160, height: 235, angle: 6, depth: 160, yaw: -12 }
] };

function selectMediaFolder(id) {
  conceptFiles = [...document.querySelector(`#${id}-files`).content.children];
  conceptLayouts = mediaLayouts[id].map((layout, index) => {
    const { width, height } = conceptFiles[index].dataset;
    const scale = Math.min(layout.width / width, layout.height / height);
    const isConcept = id === 'concepts';
    const size = scale * (isConcept ? 1.52 : 1);
    return {
      ...layout, x: 500 + (layout.x - 500) * (isConcept ? .59 : .74),
      y: isConcept ? 320 + (layout.y - 320) * .92 : layout.y,
      width: width * size, height: height * size
    };
  });
  conceptViewer.classList.toggle('personal-viewer', id === 'personal');
  conceptViewer.setAttribute('aria-label', id === 'personal' ? 'Для себя / Personal projects' : 'Концепты / Concepts');
}
let conceptIndex = 0;
let conceptTrigger;
let swipeStart;

function conceptLabel(index) {
  return document.documentElement.lang === 'en' ? `Open file ${index + 1}` : `Открыть файл ${index + 1}`;
}

function makeConceptMedia(index, preview = false) {
  const { media: source, poster } = conceptFiles[index].dataset;
  const video = source.endsWith('.mp4');
  const media = document.createElement(video ? 'video' : 'img');
  if (video) {
    media.defaultMuted = true;
    media.muted = true;
    media.autoplay = true;
    media.loop = true;
    media.playsInline = true;
    media.poster = poster;
    if (!preview) media.setAttribute('aria-label', conceptLabel(index));
  } else {
    media.alt = preview ? '' : conceptLabel(index);
  }
  if (preview) media.setAttribute('aria-hidden', 'true');
  media.src = source;
  return media;
}

const conceptRelated = conceptViewer.querySelector('.concept-related-grid');
const personalInfo = conceptViewer.querySelector('.personal-project-info');

function addViewerTilt(button) {
  button.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse' || reducedMotion.matches || event.buttons) return;
    const rect = button.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - .5;
    const y = (event.clientY - rect.top) / rect.height - .5;
    button.style.setProperty('--viewer-pitch', `${-y * 24}deg`);
    button.style.setProperty('--viewer-turn', `${x * 24}deg`);
  });
  button.addEventListener('pointerleave', () => {
    for (const property of ['--viewer-pitch', '--viewer-turn']) button.style.removeProperty(property);
  });
}

function closeConcept() {
  const tile = world.children[conceptIndex];
  const trigger = viewerCardFrame(tile) ? tile : conceptTrigger;
  animateViewerCard(conceptViewer, viewerCardFrame(trigger), conceptMedia.firstElementChild, true);
}
conceptViewer.querySelector('.concept-return').addEventListener('click', closeConcept);
conceptViewer.addEventListener('cancel', event => {
  event.preventDefault();
  closeConcept();
});

function resetConceptParallax() {
  world.style.removeProperty('--cursor-x');
  world.style.removeProperty('--cursor-y');
}

camera.addEventListener('pointermove', event => {
  if (!world.classList.contains('concept-world') || event.pointerType !== 'mouse' || reducedMotion.matches) return;
  if (event.buttons) {
    resetConceptParallax();
    return;
  }
  const bounds = camera.getBoundingClientRect();
  world.style.setProperty('--cursor-x', `${(0.5 - (event.clientX - bounds.left) / bounds.width) * 30}px`);
  world.style.setProperty('--cursor-y', `${(0.5 - (event.clientY - bounds.top) / bounds.height) * 22}px`);
});
camera.addEventListener('pointerleave', resetConceptParallax);
camera.addEventListener('pointerdown', resetConceptParallax);

let conceptZoom = 1;
const conceptZoomButtons = [...conceptViewer.querySelectorAll('[data-concept-zoom]')];

function setConceptZoom(scale) {
  conceptZoom = Math.max(.4, Math.min(1, scale));
  conceptMedia.style.setProperty('--concept-zoom', conceptZoom);
  for (const button of conceptZoomButtons) {
    button.disabled = Number(button.dataset.conceptZoom) < 0 ? conceptZoom === .4 : conceptZoom === 1;
  }
}

for (const button of conceptZoomButtons) {
  button.addEventListener('click', () => setConceptZoom(conceptZoom * 1.25 ** Number(button.dataset.conceptZoom)));
}

function showConcept(index) {
  setConceptZoom(1);
  conceptIndex = (index + conceptFiles.length) % conceptFiles.length;
  const current = conceptFiles[conceptIndex].dataset;
  conceptMedia.style.setProperty('--media-ratio', Number(current.width) / Number(current.height));
  conceptMedia.querySelector('video')?.pause();
  conceptMedia.replaceChildren(makeConceptMedia(conceptIndex));
  conceptProject.style.removeProperty('transform');
  personalInfo.replaceChildren();
  personalInfo.hidden = !current.info;
  if (current.info) {
    personalInfo.append(document.getElementById(current.info).content.cloneNode(true));
    if (document.documentElement.lang === 'en') {
      for (const element of personalInfo.querySelectorAll('[data-en]')) {
        element.textContent = element.dataset.en;
      }
    }
    conceptViewer.scrollTop = 0;
  }

  conceptRelated.replaceChildren();
  conceptFiles.forEach(({ dataset: file }, position) => {
    if (position === conceptIndex || file.media.endsWith('.mp4') !== current.media.endsWith('.mp4')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('aria-label', conceptLabel(position));
    const image = new Image();
    image.src = file.poster;
    image.alt = '';
    button.append(image);
    addViewerTilt(button);
    button.addEventListener('click', () => {
      showConcept(position);
      conceptViewer.querySelector('.concept-prev').focus({ preventScroll: true });
    });
    conceptRelated.append(button);
  });
}

conceptViewer.querySelector('.concept-prev').addEventListener('click', () => showConcept(conceptIndex - 1));
conceptViewer.querySelector('.concept-next').addEventListener('click', () => showConcept(conceptIndex + 1));
conceptViewer.addEventListener('keydown', event => {
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
  event.preventDefault();
  showConcept(conceptIndex + (event.key === 'ArrowLeft' ? -1 : 1));
});
conceptViewer.addEventListener('close', () => {
  conceptMedia.querySelector('video')?.pause();
  conceptMedia.replaceChildren();
  swipeStart = undefined;
  conceptViewer.classList.remove('dragging');
  if (!space.hidden) conceptTrigger?.focus({ preventScroll: true });
});

function conceptOffset(target) {
  const transform = new DOMMatrix(getComputedStyle(target).transform);
  return { x: transform.m41, y: transform.m42 };
}

function moveConcept(target, x, y) {
  const viewer = conceptViewer.getBoundingClientRect();
  const left = Math.max(-viewer.width * .4, Math.min(viewer.width * .4, x));
  const top = Math.max(-viewer.height * .34, Math.min(viewer.height * .34, y));
  target.style.transform = `translate(${left}px, ${top}px)`;
}

conceptViewer.addEventListener('click', event => {
  if (!event.target.closest('button, img, video, .personal-project-info')) closeConcept();
});
conceptViewer.addEventListener('wheel', event => {
  if (event.defaultPrevented || event.ctrlKey || event.metaKey || !conceptMedia.firstElementChild) return;
  if (Math.abs(event.deltaY) >= Math.abs(event.deltaX)) return;
  event.preventDefault();
  const target = conceptProject;
  const offset = conceptOffset(target);
  const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? conceptViewer.clientHeight : 1;
  moveConcept(target, offset.x - event.deltaX * unit, offset.y - event.deltaY * unit);
}, { passive: false });
conceptMedia.addEventListener('pointerdown', event => {
  if (event.pointerType !== 'touch') return;
  swipeStart = { x: event.clientX, y: event.clientY, id: event.pointerId };
});
conceptMedia.addEventListener('pointerup', event => {
  if (event.pointerId !== swipeStart?.id) return;
  const x = event.clientX - swipeStart.x;
  const y = event.clientY - swipeStart.y;
  swipeStart = undefined;
  if (Math.abs(x) > 45 && Math.abs(x) > Math.abs(y)) showConcept(conceptIndex + (x < 0 ? 1 : -1));
});
conceptMedia.addEventListener('pointercancel', () => { swipeStart = undefined; });

function setupCursorTrail() {
  const canShowTrail = matchMedia('(any-pointer: fine) and (prefers-reduced-motion: no-preference)');
  const trail = document.createElement('canvas');
  const ink = trail.getContext('2d');
  if (!ink) return;
  trail.className = 'cursor-trail';
  trail.setAttribute('aria-hidden', 'true');

  const lifetime = 180;
  let points = [];
  let frame = 0;

  function clear() {
    cancelAnimationFrame(frame);
    frame = 0;
    points = [];
    ink.clearRect(0, 0, trail.width, trail.height);
  }

  function draw(now) {
    points = points.filter(point => now - point.time < lifetime);
    ink.clearRect(0, 0, trail.width, trail.height);
    if (points.length < 2) {
      frame = 0;
      return;
    }

    const start = points[0];
    const tip = points.at(-1);
    const fade = Math.max(0, 1 - (now - tip.time) / lifetime);
    const color = ink.createLinearGradient(start.x, start.y, tip.x, tip.y);
    color.addColorStop(0, '#47b7f220');
    color.addColorStop(.65, '#66cafa');
    color.addColorStop(1, '#b0e7ff');

    ink.beginPath();
    ink.moveTo(start.x, start.y);
    for (let index = 1; index < points.length - 1; index++) {
      const point = points[index];
      const next = points[index + 1];
      ink.quadraticCurveTo(point.x, point.y, (point.x + next.x) / 2, (point.y + next.y) / 2);
    }
    ink.lineTo(tip.x, tip.y);
    ink.lineJoin = 'round';
    ink.lineCap = 'butt';
    ink.globalAlpha = .8 * fade * fade;
    ink.strokeStyle = start.x === tip.x && start.y === tip.y ? '#66cafa' : color;
    ink.shadowBlur = 8;
    ink.shadowColor = '#47b7f2';
    ink.lineWidth = 2;
    ink.stroke();
    frame = requestAnimationFrame(draw);
  }

  document.addEventListener('pointermove', event => {
    if (!canShowTrail.matches || event.pointerType !== 'mouse') return;
    const cursor = getComputedStyle(event.target).cursor;
    if (event.buttons || !cursor.startsWith('url(') || !/\)\s+8\s+6,\s*(?:auto|pointer)$/.test(cursor)) {
      if (frame) clear();
      return;
    }

    const layer = event.target.closest('dialog[open], [popover]:popover-open') || document.body;
    if (trail.parentElement !== layer || trail.width !== innerWidth || trail.height !== innerHeight) {
      clear();
      trail.width = innerWidth;
      trail.height = innerHeight;
      layer.append(trail);
    }

    const now = performance.now();
    const last = points.at(-1);
    if (last && (now - last.time > 65 || Math.hypot(event.clientX - last.x, event.clientY - last.y) > 80)) {
      points = [];
    }
    points.push({ x: event.clientX, y: event.clientY, time: now });
    if (points.length > 28) points.shift();
    if (!frame) frame = requestAnimationFrame(draw);
  }, { passive: true });

  document.addEventListener('pointerdown', () => { if (frame) clear(); }, true);
  document.addEventListener('pointerout', event => { if (!event.relatedTarget && frame) clear(); });
  window.addEventListener('blur', clear);
  canShowTrail.addEventListener('change', clear);
}

setupCursorTrail();
