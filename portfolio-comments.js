const commentsDialog = document.querySelector('#comments-dialog');
const commentsEndpoint = commentsDialog.dataset.endpoint;
const commentsFeed = commentsDialog.querySelector('.comments-feed');
const isChatOpen = () => commentsDialog.matches(':popover-open');
const commentsForm = commentsDialog.querySelector('.comments-form');
const commentsStatus = commentsDialog.querySelector('.comments-status');
const commentsList = commentsDialog.querySelector('.comments-list');
const commentsSubmit = commentsForm.querySelector('button[type="submit"]');
let commentsRefresh;
let commentsRequest;
let commentsRevision;
let scrollChatToLatest = false;
let latestComments = [];
let pendingNote;
const ownNotesKey = 'portfolio-own-notes';
const ownNotes = new Set();
try {
  const saved = JSON.parse(localStorage.getItem(ownNotesKey));
  if (Array.isArray(saved)) saved.filter(id => typeof id === 'string').forEach(id => ownNotes.add(id));
} catch {}

function rememberOwnNote(id) {
  ownNotes.add(id);
  try {
    localStorage.setItem(ownNotesKey, JSON.stringify([...ownNotes].slice(-100)));
  } catch {}
}

addViewerTilt(document.querySelector('#comments-open'));

const commentCopy = (ru, en) => document.documentElement.lang === 'en' ? en : ru;

function fitNotesViewport() {
  const viewport = window.visualViewport;
  const keyboardInset = viewport && viewport.scale === 1
    ? Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)
    : 0;
  commentsDialog.style.setProperty('--notes-keyboard-inset', `${keyboardInset}px`);
}

window.visualViewport?.addEventListener('resize', fitNotesViewport);
window.visualViewport?.addEventListener('scroll', fitNotesViewport);

function syncCommentsFade() {
  commentsFeed.classList.toggle('has-older-comments', commentsFeed.scrollTop > 1);
}

commentsFeed.addEventListener('scroll', syncCommentsFade, { passive: true });

function renderComments(comments) {
  const revision = comments.map(comment => comment.id).join(',');
  if (revision === commentsRevision) return;
  commentsRevision = revision;
  latestComments = comments;
  const formatter = new Intl.DateTimeFormat(document.documentElement.lang, {
    dateStyle: 'medium', timeStyle: 'short'
  });
  const nearLatest = commentsFeed.scrollHeight - commentsFeed.scrollTop - commentsFeed.clientHeight < 36;
  commentsList.replaceChildren();
  for (const comment of [...comments].reverse()) {
    const item = document.createElement('li');
    item.classList.toggle('note-outgoing', ownNotes.has(comment.id));
    const body = document.createElement('p');
    body.textContent = comment.body;
    const date = document.createElement('time');
    date.dateTime = new Date(comment.created_at).toISOString();
    date.textContent = formatter.format(comment.created_at);
    if (comment.name) {
      const author = document.createElement('strong');
      author.className = 'note-author';
      author.textContent = comment.name;
      item.append(author);
    }
    item.append(body, date);
    commentsList.append(item);
  }
  if (nearLatest || scrollChatToLatest) commentsFeed.scrollTop = commentsFeed.scrollHeight;
  scrollChatToLatest = false;
  syncCommentsFade();
}

async function loadComments() {
  if (commentsRequest) return;
  const controller = new AbortController();
  commentsRequest = controller;
  try {
    const response = await fetch(commentsEndpoint, { signal: controller.signal, cache: 'no-store' });
    if (!response.ok) throw new Error();
    const { comments } = await response.json();
    if (!Array.isArray(comments)) throw new Error();
    if (!isChatOpen() || controller.signal.aborted) return;
    renderComments(comments);
    if (!commentsStatus.dataset.sendError) {
      commentsStatus.textContent = comments.length ? '' : commentCopy('Записок пока нет.', 'No notes yet.');
    }
  } catch (error) {
    if (error.name !== 'AbortError' && isChatOpen() && !commentsStatus.dataset.sendError) {
      commentsStatus.textContent = commentCopy('Не удалось обновить записки.', 'Could not refresh notes.');
    }
  } finally {
    if (commentsRequest === controller) commentsRequest = undefined;
  }
}

commentsDialog.addEventListener('toggle', event => {
  if (event.newState === 'closed') {
    clearInterval(commentsRefresh);
    commentsRequest?.abort();
    commentsRequest = undefined;
    return;
  }

  fitNotesViewport();
  commentsRevision = undefined;
  scrollChatToLatest = true;
  delete commentsStatus.dataset.sendError;
  commentsStatus.textContent = commentCopy('Загружаю записки…', 'Loading notes…');
  loadComments();
  commentsRefresh = setInterval(() => {
    if (!commentsSubmit.disabled && !document.hidden) loadComments();
  }, 10000);
});

commentsForm.elements.body.addEventListener('keydown', event => {
  if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return;
  event.preventDefault();
  if (!event.repeat && !commentsSubmit.disabled) commentsForm.requestSubmit();
});

commentsForm.addEventListener('submit', async event => {
  event.preventDefault();
  const body = commentsForm.elements.body.value.trim();
  if (!body || commentsSubmit.disabled) return;

  if (pendingNote?.body !== body) pendingNote = { id: crypto.randomUUID(), body };
  commentsSubmit.disabled = true;
  delete commentsStatus.dataset.sendError;
  commentsRequest?.abort();
  commentsRequest = undefined;
  try {
    const response = await fetch(commentsEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify(pendingNote),
      signal: AbortSignal.timeout(25000)
    });
    if (!response.ok) throw new Error();
    const note = await response.json();
    if (note.id !== pendingNote.id || typeof note.created_at !== 'number') throw new Error();
    pendingNote = undefined;
    rememberOwnNote(note.id);
    commentsForm.elements.body.value = '';
    scrollChatToLatest = true;
    if (isChatOpen()) {
      commentsStatus.textContent = '';
      renderComments([note, ...latestComments.filter(comment => comment.id !== note.id)].slice(0, 100));
      await loadComments();
    }
  } catch {
    commentsStatus.dataset.sendError = 'true';
    commentsStatus.textContent = commentCopy('Не удалось отправить. Попробуй ещё раз.', 'Could not send. Try again.');
  } finally {
    commentsSubmit.disabled = false;
  }
});
