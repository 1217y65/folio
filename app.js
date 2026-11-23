/* Folio — paper library + notes + Claude */
'use strict';

/* ───────── helpers ───────── */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtDate = (t) => { const d = new Date(t); return `${MON[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`; };
const relTime = (t) => { const s = (Date.now() - t) / 1000; if (s < 60) return 'just now'; if (s < 3600) return `${Math.floor(s / 60)} min ago`; if (s < 86400) return `${Math.floor(s / 3600)} h ago`; return fmtDate(t); };
const fmtSize = (b) => b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`;
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

const KEY = 'folio-data-v1';
const PREF = 'folio-prefs';
const STATUS = {
  toread: { label: 'To read', cls: 'st-toread' },
  reading: { label: 'Reading', cls: 'st-reading' },
  done: { label: 'Done', cls: 'st-done' },
};
const EMOJIS = ['📄', '📑', '📘', '📗', '📙', '📕', '📓', '🧪', '⚗️', '🔬', '🧬', '💎', '🔆', '💡', '🌈', '🧲', '⚛️', '🔋', '🌡️', '📈', '📊', '🤖', '🧠', '🖥️', '🧮', '📐', '🔭', '🌱', '🔥', '⭐', '❓', '✅', '📌', '🎯', '🗂️', '🧾', '✏️', '🔖', '🌊', '❄️'];
const TAG_COLORS = [['#e3ecf7', '#2f5687'], ['#f6e6d8', '#8a4e20'], ['#e4f1e6', '#2f6b40'], ['#efe4f4', '#6b3e86'], ['#f8e1e1', '#943434'], ['#f6efd5', '#7a6213'], ['#e0f0f1', '#2b6a70'], ['#ecebe6', '#4f4b42']];
const tagColor = (t) => { let h = 0; for (const c of t) h = (h * 31 + c.charCodeAt(0)) >>> 0; return TAG_COLORS[h % TAG_COLORS.length]; };
const tagHTML = (t, x = '') => { const [bg, fg] = tagColor(t); return `<span class="tag" style="--tg:${bg};--tc:${fg}">${esc(t)}${x}</span>`; };
const starsHTML = (n) => n ? `<span class="stars">${'★'.repeat(n)}<span class="off">${'★'.repeat(5 - n)}</span></span>` : '';
const pillHTML = (st) => `<span class="pill ${STATUS[st]?.cls || ''}">${STATUS[st]?.label || st}</span>`;
const authorsShort = (a) => { a = (a || []).filter(Boolean); if (!a.length) return ''; if (a.length === 1) return a[0]; if (a.length === 2) return `${a[0]}, ${a[1]}`; return `${a[0]} et al.`; };
const plainText = (html) => { const d = document.createElement('div'); d.innerHTML = html || ''; return d.textContent || ''; };

const IC = {
  logo: '<svg viewBox="0 0 24 24" width="17" height="17"><rect x="6.5" y="5" width="11" height="14" rx="1.4" fill="#FBFAF7"/><path d="M8.8 9h6.4M8.8 11.6h6.4M8.8 14.2h4" stroke="#BEB8AA" stroke-width="1.2" stroke-linecap="round"/><path d="M13.3 3.8h2.4v5.6l-1.2-1-1.2 1z" fill="#E2AB48"/></svg>',
  people: '<svg viewBox="0 0 24 24" width="15" height="15"><circle cx="9" cy="8" r="3.2" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5M15.5 5.3a3 3 0 010 5.6M17.5 14.4c1.6.7 2.6 2.3 3 4.6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
  cal: '<svg viewBox="0 0 24 24" width="15" height="15"><rect x="4" y="5.5" width="16" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
  book: '<svg viewBox="0 0 24 24" width="15" height="15"><path d="M5 5.5A1.5 1.5 0 016.5 4H19v14H6.5A1.5 1.5 0 005 19.5zM5 19.5A1.5 1.5 0 006.5 21H19" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>',
  status: '<svg viewBox="0 0 24 24" width="15" height="15"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M12 4a8 8 0 010 16z" fill="currentColor"/></svg>',
  tag: '<svg viewBox="0 0 24 24" width="15" height="15"><path d="M4 12.5V5a1 1 0 011-1h7.5l7.5 7.5-8.5 8.5z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><circle cx="8.5" cy="8.5" r="1.4" fill="currentColor"/></svg>',
  star: '<svg viewBox="0 0 24 24" width="15" height="15"><path d="M12 4l2.4 5 5.4.6-4 3.7 1.1 5.4L12 16l-4.9 2.7 1.1-5.4-4-3.7 5.4-.6z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>',
  link: '<svg viewBox="0 0 24 24" width="15" height="15"><path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1.2 1.2M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1.2-1.2" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
  file: '<svg viewBox="0 0 24 24" width="15" height="15"><path d="M7 3.5h7l4 4V20a.5.5 0 01-.5.5h-10.5A.5.5 0 016.5 20V4a.5.5 0 01.5-.5zM14 3.5V8h4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>',
  clock: '<svg viewBox="0 0 24 24" width="15" height="15"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M12 7.5V12l3 2" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
  spark: '<svg viewBox="0 0 24 24" width="15" height="15"><path d="M12 3l1.8 5.4L19 10l-5.2 1.6L12 17l-1.8-5.4L5 10l5.2-1.6zM18.5 15l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" fill="currentColor"/></svg>',
  pdf: '<svg viewBox="0 0 24 24" width="16" height="16"><path d="M7 3.5h7l4 4V20a.5.5 0 01-.5.5h-10.5A.5.5 0 016.5 20V4a.5.5 0 01.5-.5zM14 3.5V8h4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M9 13.5h6M9 16.5h4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  close: '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  trash: '<svg viewBox="0 0 24 24" width="17" height="17"><path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  send: '<svg viewBox="0 0 24 24" width="16" height="16"><path d="M12 19V5M6 11l6-6 6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  table: '<svg viewBox="0 0 24 24" width="15" height="15"><rect x="4" y="5" width="16" height="14" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M4 10h16M4 14.5h16M10 10v9" stroke="currentColor" stroke-width="1.7"/></svg>',
  board: '<svg viewBox="0 0 24 24" width="15" height="15"><rect x="4" y="5" width="4.5" height="14" rx="1" fill="none" stroke="currentColor" stroke-width="1.7"/><rect x="10" y="5" width="4.5" height="9" rx="1" fill="none" stroke="currentColor" stroke-width="1.7"/><rect x="16" y="5" width="4.5" height="11" rx="1" fill="none" stroke="currentColor" stroke-width="1.7"/></svg>',
  gear: '<svg viewBox="0 0 24 24" width="15" height="15"><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M6 6l1.6 1.6M16.4 16.4L18 18M6 18l1.6-1.6M16.4 7.6L18 6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
  plus: '<svg viewBox="0 0 24 24" width="15" height="15"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
};

/* ───────── state ───────── */
let S = load();
let P = loadPrefs();
let view = { name: 'library' };
const ui = { q: '', tag: null, sort: P.sort || 'added', dir: P.dir || -1, panel: null, aiBusy: false };

function newPaper(o = {}) {
  const now = Date.now();
  return Object.assign({
    id: uid(), title: '', authors: [], year: '', venue: '', doi: '', url: '',
    status: 'toread', tags: [], rating: 0, emoji: '📄', added: now, updated: now, opened: 0,
    pdf: null, // { name, size, pages, chars }
    blocks: templateBlocks(), chat: [],
  }, o);
}
const LEVEL = {
  learning: { label: 'Learning', cls: 'st-reading' },
  review: { label: 'Needs review', cls: 'st-toread' },
  solid: { label: 'Got it', cls: 'st-done' },
};
const levelHTML = (l) => `<span class="pill ${LEVEL[l]?.cls || ''}">${LEVEL[l]?.label || l}</span>`;
function newConcept(o = {}) {
  const now = Date.now();
  return Object.assign({
    id: uid(), kind: 'concept', title: '', emoji: '💡', field: '', tags: [], level: 'learning', sources: '', related: [],
    added: now, updated: now, opened: 0, blocks: conceptTemplate(), chat: [],
  }, o);
}
function conceptTemplate() {
  const b = (t, x = '') => ({ id: uid(), t, x });
  return [b('h2', 'In one line'), b('p'), b('h2', 'Key ideas'), b('ul'), b('h2', 'Equations & numbers'), b('p'), b('h2', 'Examples · where I saw it'), b('ul'), b('h2', 'Still confusing'), b('ul')];
}
function templateBlocks() {
  const b = (t, x = '') => ({ id: uid(), t, x });
  return [b('h2', 'TL;DR'), b('p'), b('h2', 'Key findings'), b('ul'), b('h2', 'Methods'), b('p'), b('h2', 'My thoughts'), b('p')];
}
function seed() {
  const p = newPaper({
    title: 'Welcome to Folio 👋', emoji: '🔖', status: 'reading', tags: ['guide'], rating: 5, year: String(new Date().getFullYear()), venue: 'Folio Handbook', authors: ['Folio'],
  });
  const b = (t, x = '', c) => ({ id: uid(), t, x, ...(c != null ? { c } : {}) });
  p.blocks = [
    b('callout', 'Every paper is a page. Properties up top, your notes below — like Notion.'),
    b('h2', 'Getting started'),
    b('todo', 'Drop a <b>PDF</b> anywhere (or press <b>+ New paper</b>)', false),
    b('todo', 'Hit <b>✨ Summarize</b> — Claude reads the paper and drafts your notes', false),
    b('todo', 'Open <b>Ask Claude</b> and ask anything about the paper', false),
    b('h2', 'Writing notes'),
    b('ul', 'Type <code>/</code> for blocks — headings, lists, to-dos, quotes, callouts, code'),
    b('ul', 'Markdown shortcuts: <code>#</code> <code>##</code> <code>-</code> <code>1.</code> <code>[]</code> <code>&gt;</code> <code>---</code>'),
    b('ul', '<b>Cmd/Ctrl + B / I / U</b> for bold, italic, underline · <b>Cmd/Ctrl + Shift + H</b> to highlight'),
    b('ul', 'Drag <b>⋮⋮</b> to reorder blocks'),
    b('h2', 'Claude can edit your notes'),
    b('p', 'Ask things like <i>"정리한 노트를 한국어로 바꿔줘"</i> or <i>"Add a section comparing this to CsPbBr₃ LARP synthesis"</i>. Claude proposes the change — you choose whether to apply it.'),
    b('quote', 'Feel free to delete this page.'),
  ];
  return { v: 1, _pristine: true, papers: [p], concepts: [] };
}
function load() {
  let raw = null;
  try { raw = localStorage.getItem(KEY); if (raw) return normalize(JSON.parse(raw)); } catch (e) { try { if (raw) localStorage.setItem(`${KEY}-rescue-${Date.now()}`, raw); } catch (_) {} }
  return seed();
}
function normalize(d) {
  d.papers ||= []; d.concepts ||= [];
  d.concepts.forEach((c) => { c.kind = 'concept'; c.blocks ||= []; c.tags ||= []; c.related ||= []; c.chat ||= []; c.level ||= 'learning'; });
  d.papers.forEach((p) => { p.blocks ||= []; p.tags ||= []; p.authors ||= []; p.chat ||= []; p.status ||= 'toread'; });
  return d;
}
function loadPrefs() { try { return Object.assign({ model: 'claude-sonnet-5-5', code: '', layout: 'table', sort: 'added', dir: -1, canEdit: true }, JSON.parse(localStorage.getItem(PREF) || '{}')); } catch (_) { return { model: 'claude-sonnet-5-5', code: '', layout: 'table', canEdit: true }; } }
const savePrefs = () => { try { localStorage.setItem(PREF, JSON.stringify(P)); } catch (_) {} };

function save(quiet) {
  const changed = stampChanges();
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('Storage is full'); }
  if (changed) schedulePush();
  if (!quiet) renderSidebar();
}
const saveSoon = debounce(() => save(true), 500);
const paper = (id) => S.papers.find((p) => p.id === id);
const concept = (id) => S.concepts.find((c) => c.id === id);
const docOf = (id) => paper(id) || concept(id);
const isDoc = (v = view) => v.name === 'paper' || v.name === 'concept';
const isConcept = (d) => d?.kind === 'concept';

/* ───────── IndexedDB (PDFs + extracted text) ───────── */
let dbP = null;
function db() {
  return dbP ||= new Promise((res, rej) => {
    const r = indexedDB.open('folio', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('files');
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
}
async function fileOp(mode, fn) { const d = await db(); return new Promise((res, rej) => { const tx = d.transaction('files', mode); const r = fn(tx.objectStore('files')); tx.oncomplete = () => res(r?.result); tx.onerror = () => rej(tx.error); }); }
const fileGet = (k) => fileOp('readonly', (s) => s.get(k));
const filePut = (k, v) => fileOp('readwrite', (s) => s.put(v, k));
const fileDel = (k) => fileOp('readwrite', (s) => s.delete(k));
const textCache = new Map();
async function paperText(id) {
  if (textCache.has(id)) return textCache.get(id);
  const t = await fileGet(`txt-${id}`).catch(() => null);
  if (t) textCache.set(id, t);
  return t || '';
}

/* ───────── PDF import ───────── */
let pdfjsP = null;
const PDFJS = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/';
function pdfjs() {
  return pdfjsP ||= import(PDFJS + 'pdf.min.mjs').then((m) => { m.GlobalWorkerOptions.workerSrc = PDFJS + 'pdf.worker.min.mjs'; return m; });
}
async function extractPdf(buf) {
  const lib = await pdfjs();
  const doc = await lib.getDocument({ data: new Uint8Array(buf.slice(0)) }).promise;
  const pages = [];
  let meta = {};
  try { meta = (await doc.getMetadata())?.info || {}; } catch (_) {}
  for (let i = 1; i <= doc.numPages; i++) {
    const pg = await doc.getPage(i);
    const tc = await pg.getTextContent();
    let s = ''; let lastY = null;
    for (const it of tc.items) {
      const y = it.transform?.[5];
      if (lastY != null && Math.abs(y - lastY) > 2) s += '\n'; else if (s && !s.endsWith(' ') && !s.endsWith('-')) s += ' ';
      s += it.str; lastY = y;
    }
    pages.push(s.replace(/[ \t]+/g, ' ').replace(/-\n(?=[a-z])/g, '').trim());
  }
  return { pages: doc.numPages, text: pages.map((t, i) => `[Page ${i + 1}]\n${t}`).join('\n\n'), meta };
}
const MAX_TEXT = 400000;
async function importPdfs(files, intoId) {
  files = [...files].filter((f) => f.type === 'application/pdf' || /\.pdf$/i.test(f.name));
  if (!files.length) return toast('Choose a PDF file');
  closeModal();
  let last = null;
  for (const f of files) {
    const p = intoId ? paper(intoId) : newPaper({ title: f.name.replace(/\.pdf$/i, '').replace(/[_]+/g, ' '), status: 'toread' });
    if (!intoId) S.papers.unshift(p);
    p._busy = 'Reading PDF…';
    save(); last = p;
    if (!intoId && files.length === 1) go(`#p-${p.id}`); else render();
    try {
      const buf = await f.arrayBuffer();
      await filePut(`pdf-${p.id}`, new Blob([buf], { type: 'application/pdf' }));
      const ex = await extractPdf(buf);
      const text = ex.text.slice(0, MAX_TEXT);
      await filePut(`txt-${p.id}`, text); textCache.set(p.id, text);
      p.pdf = { name: f.name, size: f.size, pages: ex.pages, chars: text.length };
      if (ex.meta?.Title && ex.meta.Title.length > 12 && !/untitled|microsoft|\.docx?$/i.test(ex.meta.Title) && !intoId) p.title = ex.meta.Title.trim();
      delete p._busy; p.updated = Date.now(); save();
      if (pdfUrls.has(p.id)) { URL.revokeObjectURL(pdfUrls.get(p.id)); pdfUrls.delete(p.id); }
      rerenderIf(p.id);
      if (text.replace(/\[Page \d+\]|\s/g, '').length < 200) toast('This PDF looks scanned — Claude can only use text PDFs');
      else if (await aiReady()) autoMetadata(p);
    } catch (e) {
      console.error(e); delete p._busy; save(); rerenderIf(p.id);
      toast(`Couldn't read ${f.name}`);
    }
  }
  if (files.length > 1) toast(`Added ${files.length} papers`);
  return last;
}
function rerenderIf(id) {
  if (view.name === 'paper' && view.id === id) { renderPaperHeadOnly(); if (ui.panel === 'pdf') { $('#panel').dataset.k = ''; renderPanel(); } }
  else if (view.name !== 'paper') render();
}

/* DOI → Crossref */
async function fromDoi(raw) {
  const doi = raw.trim().replace(/^https?:\/\/(dx\.)?doi\.org\//i, '').replace(/^doi:\s*/i, '');
  if (!/^10\.\d{4,}\//.test(doi)) throw new Error('That doesn\'t look like a DOI');
  const r = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`);
  if (!r.ok) throw new Error('DOI not found');
  const m = (await r.json()).message;
  const strip = (s) => plainText(String(s || '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
  return newPaper({
    title: strip(m.title?.[0]) || doi,
    authors: (m.author || []).map((a) => [a.given, a.family].filter(Boolean).join(' ') || a.name).filter(Boolean),
    year: String((m.issued?.['date-parts']?.[0]?.[0]) || ''),
    venue: strip(m['container-title']?.[0] || m.publisher || ''),
    doi, url: `https://doi.org/${doi}`,
  });
}

/* ───────── routing ───────── */
function parseHash() {
  const h = location.hash.slice(1);
  if (h.startsWith('p-')) return { name: 'paper', id: h.slice(2) };
  if (h.startsWith('st-')) return { name: 'library', status: h.slice(3) };
  if (h.startsWith('tag-')) return { name: 'library', tag: decodeURIComponent(h.slice(4)) };
  if (h.startsWith('c-')) return { name: 'concept', id: h.slice(2) };
  if (h === 'concepts') return { name: 'concepts' };
  if (h.startsWith('field-')) return { name: 'concepts', field: decodeURIComponent(h.slice(6)) };
  if (h === 'settings') return { name: 'settings' };
  return { name: 'library' };
}
function go(hash) { if (location.hash === hash) { view = parseHash(); render(); } else location.hash = hash; }
window.addEventListener('hashchange', () => {
  const prev = view; view = parseHash();
  if (isDoc() && !(isDoc(prev) && prev.id === view.id)) { ui.panel = window.innerWidth > 860 ? ui.panel : null; }
  if (!isDoc()) ui.panel = null;
  if (isConcept(docOf(view.id)) && ui.panel === 'pdf') ui.panel = 'ai';
  if (view.name !== prev.name || view.field !== prev.field) ui.cq = '';
  closeDrawer(); closePop(); render(); $('#main').scrollTop = 0;
});

/* ───────── render ───────── */
function render() {
  renderSidebar();
  const main = $('#main');
  if (view.name === 'paper') {
    const p = paper(view.id);
    if (!p) { view = { name: 'library' }; return go('#library'); }
    p.opened = Date.now(); saveSoon();
    renderPaper(p);
  } else if (view.name === 'concept') {
    const c = concept(view.id);
    if (!c) { view = { name: 'concepts' }; return go('#concepts'); }
    c.opened = Date.now(); saveSoon();
    renderPaper(c);
  } else if (view.name === 'concepts') {
    main.innerHTML = renderConcepts(); bindConcepts();
  } else if (view.name === 'settings') {
    main.innerHTML = renderSettings(); setCrumbs('<b>Settings</b>'); $('#topActions').innerHTML = '';
    document.title = 'Settings · Folio';
  } else {
    main.innerHTML = renderLibrary(); bindLibrary();
  }
  renderPanel();
}
function setCrumbs(html) { $('#crumbs').innerHTML = html; }

function renderSidebar() {
  const n = (st) => S.papers.filter((p) => p.status === st).length;
  const tags = {}; S.papers.forEach((p) => p.tags.forEach((t) => { tags[t] = (tags[t] || 0) + 1; }));
  const fields = {}; S.concepts.forEach((c) => { const f = c.field || 'Unsorted'; fields[f] = (fields[f] || 0) + 1; });
  const recent = [...S.papers, ...S.concepts].filter((p) => p.opened).sort((a, b) => b.opened - a.opened).slice(0, 6);
  const act = (cond) => cond ? ' active' : '';
  const libActive = view.name === 'library' && !view.status && !view.tag;
  $('#sidebar').innerHTML = `
    <div class="brand"><div class="brand-mark">${IC.logo}</div><div class="brand-name">Folio</div><span class="brand-sync ${SY ? (SY.state || '') : ''}" id="syncDot" title="${SY ? 'Cloud sync on' : 'Only on this device'}"></span></div>
    <button class="side-btn side-new" data-act="new-paper"><span class="si">＋</span><span class="sl">New paper</span></button>
    <button class="side-btn side-new" style="margin-top:-4px" data-act="new-concept"><span class="si">＋</span><span class="sl">New concept</span></button>
    <button class="side-btn${act(libActive)}" data-act="go" data-to="#library"><span class="si">📚</span><span class="sl">Library</span><span class="sc">${S.papers.length}</span></button>
    <div class="side-head">Papers</div>
    ${Object.entries(STATUS).map(([k, s]) => `<button class="side-btn${act(view.name === 'library' && view.status === k)}" data-act="go" data-to="#st-${k}"><span class="si"><span class="dot" style="background:var(--${s.cls.replace('st-', 'st-')})"></span></span><span class="sl">${s.label}</span><span class="sc">${n(k)}</span></button>`).join('')}
    ${Object.keys(tags).length ? `<div class="side-head">Tags</div>${Object.entries(tags).sort((a, b) => b[1] - a[1]).slice(0, 14).map(([t, c]) => `<button class="side-btn${act(view.name === 'library' && view.tag === t)}" data-act="go" data-to="#tag-${encodeURIComponent(t)}"><span class="si" style="color:${tagColor(t)[1]}">#</span><span class="sl">${esc(t)}</span><span class="sc">${c}</span></button>`).join('')}` : ''}
    <div class="side-head">Concepts</div>
    <button class="side-btn${act(view.name === 'concepts' && !view.field)}" data-act="go" data-to="#concepts"><span class="si">🧠</span><span class="sl">All concepts</span><span class="sc">${S.concepts.length}</span></button>
    ${Object.entries(fields).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([f, c]) => `<button class="side-btn${act(view.name === 'concepts' && view.field === f)}" data-act="go" data-to="#field-${encodeURIComponent(f)}"><span class="si" style="color:${tagColor(f)[1]}">◆</span><span class="sl">${esc(f)}</span><span class="sc">${c}</span></button>`).join('')}
    ${recent.length ? `<div class="side-head">Recent</div>${recent.map((p) => `<button class="side-btn${act(isDoc() && view.id === p.id)}" data-act="go" data-to="#${isConcept(p) ? 'c' : 'p'}-${p.id}"><span class="si">${p.emoji || (isConcept(p) ? '💡' : '📄')}</span><span class="sl">${esc(p.title || 'Untitled')}</span></button>`).join('')}` : ''}
    <div class="side-foot"><button class="side-btn${act(view.name === 'settings')}" data-act="go" data-to="#settings"><span class="si">${IC.gear}</span><span class="sl">Settings</span></button></div>`;
}

/* ───────── Library (table / board) ───────── */
function libPapers() {
  let list = S.papers;
  if (view.status) list = list.filter((p) => p.status === view.status);
  if (view.tag) list = list.filter((p) => p.tags.includes(view.tag));
  if (ui.tag) list = list.filter((p) => p.tags.includes(ui.tag));
  const q = ui.q.trim().toLowerCase();
  if (q) list = list.filter((p) => [p.title, p.authors.join(' '), p.venue, p.year, p.tags.join(' '), p.doi, ...p.blocks.map((b) => plainText(b.x))].join(' ').toLowerCase().includes(q));
  const k = ui.sort, d = ui.dir;
  const val = (p) => k === 'title' ? (p.title || '').toLowerCase() : k === 'authors' ? (p.authors[0] || '').toLowerCase() : k === 'year' ? Number(p.year) || 0 : k === 'rating' ? p.rating || 0 : k === 'status' ? Object.keys(STATUS).indexOf(p.status) : k === 'venue' ? (p.venue || '').toLowerCase() : p.added;
  return [...list].sort((a, b) => { const x = val(a), y = val(b); return (x < y ? -1 : x > y ? 1 : 0) * d || b.added - a.added; });
}
function renderLibrary() {
  const title = view.status ? STATUS[view.status]?.label : view.tag ? `#${view.tag}` : 'Library';
  const icon = view.status ? '' : view.tag ? '' : '📚 ';
  setCrumbs(`<b>${esc(title)}</b>`);
  document.title = `${title} · Folio`;
  $('#topActions').innerHTML = `<button class="tbtn" data-act="new-paper">${IC.plus}<span class="lbl">New</span></button>`;
  const list = libPapers();
  const allTags = [...new Set(S.papers.flatMap((p) => p.tags))].filter((t) => t !== view.tag).sort();
  const layout = P.layout === 'board' && !view.status ? 'board' : 'table';
  const sub = view.status ? `${list.length} paper${list.length === 1 ? '' : 's'}` : view.tag ? `${list.length} paper${list.length === 1 ? '' : 's'} tagged ${esc(view.tag)}` : `${S.papers.length} paper${S.papers.length === 1 ? '' : 's'} · ${S.papers.filter((p) => p.status === 'done').length} read`;
  const th = (k, label, cls = '') => `<th class="${cls}" data-act="sort" data-k="${k}">${label}${ui.sort === k ? (ui.dir > 0 ? ' ↑' : ' ↓') : ''}</th>`;
  let body;
  if (!S.papers.length) {
    body = `<div class="empty"><div class="big">📄</div><b>Your library is empty</b>Drop a PDF here, or add one with a DOI.<div style="margin-top:16px"><button class="btn btn-primary" data-act="new-paper">${IC.plus} Add a paper</button></div></div>`;
  } else if (layout === 'board') {
    body = `<div class="board">${Object.entries(STATUS).map(([k, s]) => {
      const items = list.filter((p) => p.status === k);
      return `<div><div class="col-head">${pillHTML(k)}<span>${items.length}</span></div><div class="col" data-col="${k}">${items.map((p) => `
        <div class="card" draggable="true" data-id="${p.id}" data-act="go" data-to="#p-${p.id}">
          <div class="ct">${p.emoji || '📄'} ${esc(p.title || 'Untitled')}</div>
          <div class="cm">${esc([authorsShort(p.authors), p.year].filter(Boolean).join(' · '))}</div>
          <div>${p.tags.map((t) => tagHTML(t)).join('')}${starsHTML(p.rating)}</div>
        </div>`).join('')}<button class="addrow" style="border:0;border-radius:6px" data-act="new-paper" data-status="${k}">＋ New</button></div></div>`;
    }).join('')}</div>`;
  } else {
    body = `<table class="db"><thead><tr>${th('title', 'Title')}${th('authors', 'Authors')}${th('year', 'Year')}${th('venue', 'Venue', 'h-venue')}${th('status', 'Status')}<th class="h-tags">Tags</th>${th('rating', 'Rating', 'h-rating')}</tr></thead><tbody>
      ${list.map((p) => `<tr class="row" data-act="go" data-to="#p-${p.id}">
        <td><div class="t-title"><span class="em">${p.emoji || '📄'}</span><span>${esc(p.title || 'Untitled')}${p.pdf ? '<span class="pdf-ic" title="PDF attached"> · PDF</span>' : ''}${p._busy ? ' <span class="spin" style="width:11px;height:11px;color:var(--accent)"></span>' : ''}</span></div></td>
        <td class="t-auth">${esc(authorsShort(p.authors))}</td>
        <td class="t-num">${esc(p.year)}</td>
        <td class="t-venue">${esc(p.venue)}</td>
        <td>${pillHTML(p.status)}</td>
        <td class="t-tags">${p.tags.map((t) => tagHTML(t)).join('')}</td>
        <td class="t-rating">${starsHTML(p.rating)}</td></tr>`).join('')}
      </tbody></table>
      ${!list.length ? '<div class="empty" style="padding:40px"><b>No papers match</b>Try a different search or filter.</div>' : ''}
      <button class="addrow" data-act="new-paper"${view.status ? ` data-status="${view.status}"` : ''}>＋ New</button>`;
  }
  return `<div class="lib">
    <div class="page-title">${icon}${esc(title)}</div>
    <div class="page-sub">${sub}</div>
    <div class="viewbar">
      ${!view.status ? `<button class="tbtn${layout === 'table' ? ' on' : ''}" data-act="layout" data-l="table">${IC.table} Table</button><button class="tbtn${layout === 'board' ? ' on' : ''}" data-act="layout" data-l="board">${IC.board} Board</button>` : ''}
      <span class="grow"></span>
      <input class="search" id="libSearch" placeholder="Search papers & notes" value="${esc(ui.q)}" />
      <select class="sel" id="libSort" title="Sort">
        ${[['added', 'Recently added'], ['title', 'Title'], ['year', 'Year'], ['authors', 'First author'], ['rating', 'Rating'], ['status', 'Status']].map(([k, l]) => `<option value="${k}"${ui.sort === k ? ' selected' : ''}>${l}</option>`).join('')}
      </select>
    </div>
    ${allTags.length ? `<div class="chips">${allTags.map((t) => `<button class="chip${ui.tag === t ? ' on' : ''}" data-act="filter-tag" data-t="${esc(t)}">#${esc(t)}</button>`).join('')}</div>` : ''}
    ${body}
  </div>`;
}
function bindLibrary() {
  const s = $('#libSearch');
  s?.addEventListener('input', debounce(() => { ui.q = s.value; const pos = s.selectionStart; $('#main').innerHTML = renderLibrary(); bindLibrary(); const n = $('#libSearch'); n.focus(); n.setSelectionRange(pos, pos); }, 180));
  $('#libSort')?.addEventListener('change', (e) => { ui.sort = e.target.value; ui.dir = ['title', 'authors', 'venue', 'status'].includes(ui.sort) ? 1 : -1; P.sort = ui.sort; P.dir = ui.dir; savePrefs(); render(); });
  // board drag & drop between status columns
  let dragId = null;
  $$('.card').forEach((c) => {
    c.addEventListener('dragstart', (e) => { dragId = c.dataset.id; c.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/folio-card', dragId); });
    c.addEventListener('dragend', () => c.classList.remove('dragging'));
  });
  $$('.col').forEach((col) => {
    col.addEventListener('dragover', (e) => { if (!dragId) return; e.preventDefault(); col.classList.add('over'); });
    col.addEventListener('dragleave', () => col.classList.remove('over'));
    col.addEventListener('drop', (e) => { if (!dragId) return; e.preventDefault(); e.stopPropagation(); col.classList.remove('over'); const p = paper(dragId); if (p && p.status !== col.dataset.col) { p.status = col.dataset.col; p.updated = Date.now(); save(); } dragId = null; render(); });
  });
}

/* ───────── Concepts (gallery) ───────── */
function newConcept_(field) {
  const c = newConcept({ field: field && field !== 'Unsorted' ? field : '' });
  S.concepts.unshift(c); save(); go(`#c-${c.id}`); setTimeout(() => $('#titleIn')?.focus(), 50);
}
function conceptPreview(c) {
  const first = c.blocks.find((b) => b.t !== 'h1' && b.t !== 'h2' && b.t !== 'h3' && b.t !== 'hr' && plainText(b.x).trim());
  return first ? plainText(first.x).slice(0, 140) : '';
}
function renderConcepts() {
  const title = view.field || 'Concepts';
  setCrumbs(`<b>${esc(title)}</b>`); document.title = `${title} · Folio`;
  $('#topActions').innerHTML = `<button class="tbtn" data-act="new-concept"${view.field ? ` data-field="${esc(view.field)}"` : ''}>${IC.plus}<span class="lbl">New</span></button>`;
  let list = S.concepts;
  if (view.field) list = list.filter((c) => (c.field || 'Unsorted') === view.field);
  if (ui.clevel) list = list.filter((c) => c.level === ui.clevel);
  const q = (ui.cq || '').trim().toLowerCase();
  if (q) list = list.filter((c) => [c.title, c.field, c.tags.join(' '), c.sources, ...c.blocks.map((b) => plainText(b.x))].join(' ').toLowerCase().includes(q));
  list = [...list].sort((a, b) => (b.updated || 0) - (a.updated || 0));
  const groups = {};
  list.forEach((c) => { (groups[c.field || 'Unsorted'] ||= []).push(c); });
  const card = (c) => `<div class="ccard" data-act="go" data-to="#c-${c.id}">
      <div class="cc-top"><span class="cc-em">${c.emoji || '💡'}</span>${levelHTML(c.level)}</div>
      <div class="cc-t">${esc(c.title || 'Untitled')}</div>
      <div class="cc-p">${esc(conceptPreview(c)) || '<span style="color:var(--ink-3)">No notes yet</span>'}</div>
      <div>${c.tags.map((t) => tagHTML(t)).join('')}${c.related.length ? `<span class="cc-rel">📄 ${c.related.length}</span>` : ''}</div>
    </div>`;
  const body = !S.concepts.length
    ? `<div class="empty"><div class="big">🧠</div><b>Collect what you learn</b>Concepts you study — PLQY, Stokes shift, Bayesian optimization… — each get their own page, separate from papers.<div style="margin-top:16px"><button class="btn btn-primary" data-act="new-concept">${IC.plus} New concept</button></div></div>`
    : !list.length ? '<div class="empty" style="padding:40px"><b>Nothing matches</b>Try a different search or filter.</div>'
    : (view.field ? `<div class="cgrid">${list.map(card).join('')}<button class="ccard cc-new" data-act="new-concept" data-field="${esc(view.field)}">＋ New concept</button></div>`
      : Object.entries(groups).sort((a, b) => (a[0] === 'Unsorted') - (b[0] === 'Unsorted') || b[1].length - a[1].length).map(([f, cs]) => `
        <div class="cgroup"><button class="cg-h" data-act="go" data-to="#field-${encodeURIComponent(f)}"><span style="color:${tagColor(f)[1]}">◆</span> ${esc(f)} <span class="sc">${cs.length}</span></button>
        <div class="cgrid">${cs.map(card).join('')}</div></div>`).join(''));
  return `<div class="lib">
    <div class="page-title">${view.field ? '' : '🧠 '}${esc(title)}</div>
    <div class="page-sub">${view.field ? `${list.length} concept${list.length === 1 ? '' : 's'}` : `${S.concepts.length} concept${S.concepts.length === 1 ? '' : 's'} · ${S.concepts.filter((c) => c.level === 'solid').length} solid`} — kept separately from your papers</div>
    <div class="viewbar">
      <button class="tbtn${!ui.clevel ? ' on' : ''}" data-act="filter-level" data-l="">All</button>
      ${Object.entries(LEVEL).map(([k, l]) => `<button class="tbtn${ui.clevel === k ? ' on' : ''}" data-act="filter-level" data-l="${k}">${l.label}</button>`).join('')}
      <span class="grow"></span>
      <input class="search" id="conSearch" placeholder="Search concepts" value="${esc(ui.cq || '')}" />
    </div>
    ${body}
  </div>`;
}
function bindConcepts() {
  const s = $('#conSearch');
  s?.addEventListener('input', debounce(() => { ui.cq = s.value; const pos = s.selectionStart; $('#main').innerHTML = renderConcepts(); bindConcepts(); const n = $('#conSearch'); n.focus(); n.setSelectionRange(pos, pos); }, 180));
}

/* ───────── Paper page ───────── */
const crumbHTML = (p) => isConcept(p)
  ? `<a href="#concepts" style="color:inherit;text-decoration:none">Concepts</a> <span style="color:var(--ink-3)">/</span> <b>${esc(p.title || 'Untitled')}</b>`
  : `<a href="#library" style="color:inherit;text-decoration:none">Library</a> <span style="color:var(--ink-3)">/</span> <b>${esc(p.title || 'Untitled')}</b>`;
function renderPaper(p) {
  setCrumbs(crumbHTML(p));
  document.title = `${p.title || 'Untitled'} · Folio`;
  renderTopActions(p);
  $('#main').innerHTML = `<div class="page" id="page">
    <div id="pageHead">${isConcept(p) ? conceptHeadHTML(p) : paperHeadHTML(p)}</div>
    <div class="blocks" id="blocks"></div>
    <div class="blocks-tail" data-act="tail"></div>
  </div>`;
  bindPaperHead(p);
  renderBlocks(p);
}
function renderTopActions(p) {
  $('#topActions').innerHTML = `
    ${isConcept(p) ? '' : `<button class="tbtn${ui.panel === 'pdf' ? ' on' : ''}" data-act="panel" data-p="pdf" title="PDF">${IC.pdf}<span class="lbl">PDF</span></button>`}
    <button class="tbtn ai${ui.panel === 'ai' ? ' on' : ''}" data-act="panel" data-p="ai" title="Ask Claude">${IC.spark}<span class="lbl">Ask Claude</span></button>
    <button class="icon-btn" data-act="paper-menu" title="More"><svg viewBox="0 0 24 24" width="18" height="18"><circle cx="5" cy="12" r="1.7" fill="currentColor"/><circle cx="12" cy="12" r="1.7" fill="currentColor"/><circle cx="19" cy="12" r="1.7" fill="currentColor"/></svg></button>`;
}
function paperHeadHTML(p) {
  const st = Object.entries(STATUS).map(([k]) => `<button data-act="set-status" data-s="${k}" style="opacity:${p.status === k ? 1 : .45}">${pillHTML(k)}</button>`).join('');
  return `
    <button class="page-emoji" data-act="emoji">${p.emoji || '📄'}</button>
    <textarea class="title-in" id="titleIn" rows="1" placeholder="Untitled paper">${esc(p.title)}</textarea>
    <div class="props">
      <div class="pk">${IC.people} Authors</div><div class="pv"><input id="pAuthors" value="${esc(p.authors.join(', '))}" placeholder="Empty — comma separated" /></div>
      <div class="pk">${IC.cal} Year</div><div class="pv"><input id="pYear" value="${esc(p.year)}" placeholder="Empty" inputmode="numeric" /></div>
      <div class="pk">${IC.book} Venue</div><div class="pv"><input id="pVenue" value="${esc(p.venue)}" placeholder="Journal / conference" /></div>
      <div class="pk">${IC.status} Status</div><div class="pv" style="gap:6px">${st}</div>
      <div class="pk">${IC.tag} Tags</div><div class="pv" id="pTags">${p.tags.map((t, i) => tagHTML(t, `<span class="tag-x" data-act="del-tag" data-i="${i}">✕</span>`)).join('')}<input class="tag-add" id="tagIn" placeholder="${p.tags.length ? '' : 'Add a tag'}" list="tagList" /><datalist id="tagList">${[...new Set(S.papers.flatMap((x) => x.tags))].filter((t) => !p.tags.includes(t)).map((t) => `<option value="${esc(t)}">`).join('')}</datalist></div>
      <div class="pk">${IC.star} Rating</div><div class="pv">${[1, 2, 3, 4, 5].map((n) => `<button class="star-btn${n <= p.rating ? ' on' : ''}" data-act="rate" data-n="${n}">★</button>`).join('')}</div>
      <div class="pk">${IC.link} DOI / URL</div><div class="pv" style="flex-wrap:nowrap"><input id="pLink" value="${esc(p.doi || p.url)}" placeholder="10.xxxx/… or https://…" />${p.doi || p.url ? `<a class="tbtn" style="flex-shrink:0" href="${esc(p.url || `https://doi.org/${p.doi}`)}" target="_blank" rel="noopener">Open ↗</a>` : ''}</div>
      <div class="pk">${IC.file} PDF</div><div class="pv">${p._busy ? `<span class="busy-row" style="margin:0"><span class="spin"></span>${esc(p._busy)}</span>` : p.pdf ? `<button class="filechip" data-act="panel" data-p="pdf">${IC.pdf}<span>${esc(p.pdf.name)}</span><span style="color:var(--ink-3)">· ${p.pdf.pages}p · ${fmtSize(p.pdf.size)}</span></button>` : `<button class="tbtn" data-act="attach-pdf">${IC.plus} Attach PDF</button>`}</div>
      ${(() => { const cs = S.concepts.filter((c) => c.related.includes(p.id)); return `<div class="pk">🧠 Concepts</div><div class="pv">${cs.map((c) => `<button class="filechip" data-act="go" data-to="#c-${c.id}">${c.emoji || '💡'} <span>${esc(c.title || 'Untitled')}</span></button>`).join('')}<button class="tbtn" data-act="concept-from-paper">${IC.plus} New concept</button></div>`; })()}
      <div class="pk">${IC.clock} Added</div><div class="pv" style="color:var(--ink-2)">${fmtDate(p.added)}</div>
    </div>
    <div class="aibar">
      <button class="aibtn primary" data-act="ai-quick" data-q="summarize">${IC.spark} Summarize into notes</button>
      <button class="aibtn" data-act="ai-quick" data-q="meta">Fill in details</button>
      <button class="aibtn" data-act="ai-quick" data-q="explain">Explain simply</button>
      <button class="aibtn" data-act="panel" data-p="ai">Ask anything…</button>
    </div>`;
}
function conceptHeadHTML(c) {
  const lv = Object.keys(LEVEL).map((k) => `<button data-act="set-level" data-l="${k}" style="opacity:${c.level === k ? 1 : .45}">${levelHTML(k)}</button>`).join('');
  const fields = [...new Set(S.concepts.map((x) => x.field).filter(Boolean))];
  const rel = c.related.map(paper).filter(Boolean);
  return `
    <button class="page-emoji" data-act="emoji">${c.emoji || '💡'}</button>
    <textarea class="title-in" id="titleIn" rows="1" placeholder="Untitled concept">${esc(c.title)}</textarea>
    <div class="props">
      <div class="pk">${IC.book} Field</div><div class="pv"><input id="cField" value="${esc(c.field)}" placeholder="e.g. Spectroscopy, Photophysics, ML" list="fieldList" /><datalist id="fieldList">${fields.map((f) => `<option value="${esc(f)}">`).join('')}</datalist></div>
      <div class="pk">${IC.status} Understanding</div><div class="pv" style="gap:6px">${lv}</div>
      <div class="pk">${IC.tag} Tags</div><div class="pv" id="pTags">${c.tags.map((t, i) => tagHTML(t, `<span class="tag-x" data-act="del-tag" data-i="${i}">✕</span>`)).join('')}<input class="tag-add" id="tagIn" placeholder="${c.tags.length ? '' : 'Add a tag'}" list="tagList" /><datalist id="tagList">${[...new Set(S.concepts.flatMap((x) => x.tags))].filter((t) => !c.tags.includes(t)).map((t) => `<option value="${esc(t)}">`).join('')}</datalist></div>
      <div class="pk">${IC.file} Papers</div><div class="pv">${rel.map((p) => `<button class="filechip" data-act="go" data-to="#p-${p.id}">${p.emoji || '📄'} <span>${esc(p.title || 'Untitled')}</span><span class="tag-x" data-act="unlink-paper" data-id="${p.id}">✕</span></button>`).join('')}<input class="tag-add" id="relIn" placeholder="${rel.length ? 'Link another…' : 'Link a paper from your library'}" list="paperList" /><datalist id="paperList">${S.papers.filter((p) => !c.related.includes(p.id)).map((p) => `<option value="${esc(p.title || 'Untitled')}">`).join('')}</datalist></div>
      <div class="pk">${IC.link} Sources</div><div class="pv"><input id="cSources" value="${esc(c.sources)}" placeholder="Textbook, lecture, URL…" /></div>
      <div class="pk">${IC.clock} Added</div><div class="pv" style="color:var(--ink-2)">${fmtDate(c.added)}</div>
    </div>
    <div class="aibar">
      <button class="aibtn primary" data-act="ai-quick" data-q="c-notes">${IC.spark} Write my study notes</button>
      <button class="aibtn" data-act="ai-quick" data-q="c-intuition">Intuition</button>
      <button class="aibtn" data-act="ai-quick" data-q="c-quiz">Quiz me</button>
      <button class="aibtn" data-act="panel" data-p="ai">Ask anything…</button>
    </div>`;
}
function renderPaperHeadOnly() {
  const p = curPaper(); if (!p) return;
  const head = $('#pageHead'); if (!head) return render();
  head.innerHTML = isConcept(p) ? conceptHeadHTML(p) : paperHeadHTML(p); bindPaperHead(p);
  setCrumbs(crumbHTML(p));
}
function autosize(el) { el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px`; }
function bindPaperHead(p) {
  const t = $('#titleIn'); autosize(t);
  t.addEventListener('input', () => { autosize(t); p.title = t.value.replace(/\n/g, ' '); p.updated = Date.now(); saveSoon(); $('#crumbs b').textContent = p.title || 'Untitled'; });
  t.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); focusBlock(p.blocks[0]?.id, 0); } });
  t.addEventListener('blur', () => renderSidebar());
  const bind = (id, fn) => $(id)?.addEventListener('input', (e) => { fn(e.target.value); p.updated = Date.now(); saveSoon(); });
  bind('#pAuthors', (v) => { p.authors = v.split(/\s*[,;]\s*/).map((s) => s.trim()).filter(Boolean); });
  bind('#pYear', (v) => { p.year = v.trim(); });
  bind('#pVenue', (v) => { p.venue = v; });
  bind('#cSources', (v) => { p.sources = v; });
  const cf = $('#cField'); cf?.addEventListener('input', () => { p.field = cf.value.trim(); p.updated = Date.now(); saveSoon(); });
  cf?.addEventListener('change', () => save());
  const ri = $('#relIn');
  ri?.addEventListener('change', () => { const hit = S.papers.find((x) => (x.title || 'Untitled') === ri.value.trim()); if (hit && !p.related.includes(hit.id)) { p.related.push(hit.id); save(); renderPaperHeadOnly(); } else if (!hit) toast('Pick a paper from the list'); });
  bind('#pLink', (v) => { v = v.trim(); const doi = v.replace(/^https?:\/\/(dx\.)?doi\.org\//i, ''); if (/^10\.\d{4,}\//.test(doi)) { p.doi = doi; p.url = ''; } else { p.url = v; p.doi = ''; } });
  const ti = $('#tagIn');
  const addTag = () => { const v = ti.value.trim().replace(/^#/, ''); if (!v) return; if (!p.tags.includes(v)) p.tags.push(v); ti.value = ''; p.updated = Date.now(); save(); renderPaperHeadOnly(); $('#tagIn')?.focus(); };
  ti.addEventListener('keydown', (e) => { if (e.isComposing) return; if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(); } else if (e.key === 'Backspace' && !ti.value && p.tags.length) { p.tags.pop(); save(); renderPaperHeadOnly(); $('#tagIn')?.focus(); } });
  ti.addEventListener('change', () => { if ([...$('#tagList').options].some((o) => o.value === ti.value)) addTag(); });
  ti.addEventListener('blur', () => { if (ti.value.trim()) addTag(); });
}

/* ───────── Block editor ───────── */
const BTYPES = [
  { t: 'p', label: 'Text', icon: 'Aa', desc: 'Plain text', keys: 'text paragraph' },
  { t: 'h1', label: 'Heading 1', icon: 'H1', desc: 'Big section heading', keys: 'h1 heading title' },
  { t: 'h2', label: 'Heading 2', icon: 'H2', desc: 'Medium heading', keys: 'h2 heading subtitle' },
  { t: 'h3', label: 'Heading 3', icon: 'H3', desc: 'Small heading', keys: 'h3 heading' },
  { t: 'ul', label: 'Bulleted list', icon: '•', desc: 'Simple list', keys: 'bullet list ul' },
  { t: 'ol', label: 'Numbered list', icon: '1.', desc: 'Ordered list', keys: 'number ordered list ol' },
  { t: 'todo', label: 'To-do', icon: '☑', desc: 'Track things to check', keys: 'todo task check' },
  { t: 'quote', label: 'Quote', icon: '❝', desc: 'Capture a quote', keys: 'quote citation' },
  { t: 'callout', label: 'Callout', icon: '💡', desc: 'Make it stand out', keys: 'callout note info' },
  { t: 'code', label: 'Code', icon: '</>', desc: 'Code or equations', keys: 'code mono equation' },
  { t: 'hr', label: 'Divider', icon: '—', desc: 'Separate sections', keys: 'divider line hr' },
];
const PH = { p: "Type '/' for commands", h1: 'Heading 1', h2: 'Heading 2', h3: 'Heading 3', ul: 'List', ol: 'List', todo: 'To-do', quote: 'Quote', callout: 'Callout', code: 'Code' };

function blockHTML(b, num) {
  if (b.t === 'hr') return `<div class="blk t-hr" data-id="${b.id}"><div class="blk-h"><button data-act="blk-add" title="Add below">＋</button><button class="drag" draggable="true" data-act="blk-menu" title="Drag to move · click for options">⋮⋮</button></div><div class="hrline"></div></div>`;
  let mk = '';
  if (b.t === 'ul') mk = '<div class="mk"></div>';
  else if (b.t === 'ol') mk = `<div class="mk">${num}.</div>`;
  else if (b.t === 'todo') mk = '<div class="mk"><button class="chk" data-act="blk-check" aria-label="Toggle"></button></div>';
  else if (b.t === 'callout') mk = `<div class="mk" data-act="callout-emoji">${b.e || '💡'}</div>`;
  const ph = b.t === 'p' ? ' ph-focus' : '';
  return `<div class="blk t-${b.t}${b.t === 'todo' && b.c ? ' checked' : ''}" data-id="${b.id}"><div class="blk-h"><button data-act="blk-add" title="Add below">＋</button><button class="drag" draggable="true" data-act="blk-menu" title="Drag to move · click for options">⋮⋮</button></div>${mk}<div class="bx${ph}" contenteditable="true" spellcheck="false" data-ph="${PH[b.t] || ''}">${b.x || ''}</div></div>`;
}
function renderBlocks(p, focusId, offset) {
  if (!p.blocks.length) p.blocks.push({ id: uid(), t: 'p', x: '' });
  let n = 0;
  $('#blocks').innerHTML = p.blocks.map((b) => { n = b.t === 'ol' ? n + 1 : 0; return blockHTML(b, n); }).join('');
  if (focusId) focusBlock(focusId, offset);
}
const curPaper = () => (view.name === 'paper' ? paper(view.id) : view.name === 'concept' ? concept(view.id) : null);
const blockEl = (id) => $(`.blk[data-id="${id}"]`);
function focusBlock(id, offset = 0) {
  const el = id && blockEl(id); const bx = el && $('.bx', el);
  if (!bx) return;
  bx.focus();
  setCaret(bx, offset === -1 ? textLen(bx) : offset);
}
const textLen = (el) => (el.textContent || '').length;
function caretOffset(el) {
  const sel = getSelection(); if (!sel.rangeCount) return 0;
  const r = sel.getRangeAt(0); const pre = r.cloneRange(); pre.selectNodeContents(el); pre.setEnd(r.startContainer, r.startOffset);
  return pre.toString().length;
}
function setCaret(el, off) {
  const sel = getSelection(); const r = document.createRange();
  let node, rem = off; const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  while ((node = w.nextNode())) { if (rem <= node.length) { r.setStart(node, rem); r.collapse(true); sel.removeAllRanges(); sel.addRange(r); return; } rem -= node.length; }
  r.selectNodeContents(el); r.collapse(false); sel.removeAllRanges(); sel.addRange(r);
}
const ALLOWED = { B: 'b', STRONG: 'b', I: 'i', EM: 'i', U: 'u', S: 's', STRIKE: 's', CODE: 'code', MARK: 'mark', A: 'a', BR: 'br', SUB: 'sub', SUP: 'sup' };
function clean(html) {
  const src = document.createElement('div'); src.innerHTML = html;
  const walk = (node) => {
    let out = '';
    for (const n of node.childNodes) {
      if (n.nodeType === 3) out += esc(n.nodeValue);
      else if (n.nodeType === 1) {
        const tag = ALLOWED[n.tagName];
        const inner = walk(n);
        if (tag === 'br') out += '<br>';
        else if (tag === 'a') { const h = n.getAttribute('href') || ''; out += /^(https?:|mailto:)/i.test(h) ? `<a href="${esc(h)}" target="_blank" rel="noopener">${inner}</a>` : inner; }
        else if (tag) out += inner ? `<${tag}>${inner}</${tag}>` : '';
        else if (n.tagName === 'SPAN' && /font-weight:\s*(bold|[6-9]00)/.test(n.getAttribute('style') || '')) out += `<b>${inner}</b>`;
        else if (/^(DIV|P|LI|H\d)$/.test(n.tagName)) out += (out && !out.endsWith('<br>') ? '<br>' : '') + inner;
        else out += inner;
      }
    }
    return out;
  };
  return walk(src).replace(/(<br>)+$/, '');
}
function htmlAfterCaret(bx) {
  const sel = getSelection(); const r = sel.getRangeAt(0).cloneRange();
  r.deleteContents();
  const tail = document.createRange(); tail.setStart(r.startContainer, r.startOffset); tail.setEnd(bx, bx.childNodes.length);
  const frag = tail.extractContents(); const d = document.createElement('div'); d.appendChild(frag);
  return clean(d.innerHTML);
}

let undoBlocks = null;
function snapshotBlocks(p) { undoBlocks = { id: p.id, blocks: JSON.parse(JSON.stringify(p.blocks)) }; }

document.addEventListener('input', (e) => {
  const bx = e.target.closest?.('.bx'); if (!bx) return;
  const p = curPaper(); if (!p) return;
  const el = bx.closest('.blk'); const b = p.blocks.find((x) => x.id === el.dataset.id); if (!b) return;
  if (e.isComposing) { b.x = clean(bx.innerHTML); saveSoon(); return; }
  // markdown shortcuts at the start of a text block
  if (b.t === 'p') {
    const txt = bx.textContent;
    const m = txt.match(/^(#{1,3}|[-*•]|1[.)]|\[\s?\]|>|```)[\s ]/);
    if (m) {
      const map = { '#': 'h1', '##': 'h2', '###': 'h3', '-': 'ul', '*': 'ul', '•': 'ul', '1.': 'ol', '1)': 'ol', '[]': 'todo', '[ ]': 'todo', '>': 'quote', '```': 'code' };
      const t = map[m[1]];
      if (t) { b.t = t; bx.innerHTML = bx.innerHTML.replace(/^(#{1,3}|[-*•]|1[.)]|\[\s?\]|&gt;|```)(\s|&nbsp;| )/, ''); b.x = clean(bx.innerHTML); if (t === 'todo') b.c = false; renderBlocks(p, b.id, 0); saveSoon(); return; }
    }
    if (txt === '---') { b.t = 'hr'; b.x = ''; const nb = { id: uid(), t: 'p', x: '' }; p.blocks.splice(p.blocks.indexOf(b) + 1, 0, nb); renderBlocks(p, nb.id); saveSoon(); return; }
  }
  b.x = clean(bx.innerHTML);
  saveSoon();
  // slash menu
  const t = bx.textContent;
  if (t.startsWith('/') && !t.includes('\n') && t.length < 24) openSlash(bx, b, t.slice(1)); else if (slash) closePop();
});

document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !e.shiftKey && undoBlocks && !e.target.closest?.('.bx, input, textarea')) {
    const p = docOf(undoBlocks.id); if (p) { e.preventDefault(); applyUndo(); }
    return;
  }
  const bx = e.target.closest?.('.bx');
  if (!bx) { if (e.key === 'Escape') { closePop(); closeModal(); } return; }
  if (e.isComposing || e.keyCode === 229) return;
  const p = curPaper(); if (!p) return;
  const el = bx.closest('.blk'); const i = p.blocks.findIndex((x) => x.id === el.dataset.id); const b = p.blocks[i];
  if (slash) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); slash.sel = (slash.sel + (e.key === 'ArrowDown' ? 1 : -1) + slash.items.length) % slash.items.length; drawSlash(); return; }
    if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); if (slash.items.length) pickSlash(slash.items[slash.sel].t); else closePop(); return; }
    if (e.key === 'Escape') { e.preventDefault(); closePop(); return; }
  }
  if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'h') { e.preventDefault(); toggleMark(); b.x = clean(bx.innerHTML); saveSoon(); return; }
  if ((e.metaKey || e.ctrlKey) && e.key === 'e') { e.preventDefault(); wrapSel('code'); b.x = clean(bx.innerHTML); saveSoon(); return; }
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    if (b.t === 'code') { document.execCommand('insertLineBreak'); b.x = clean(bx.innerHTML); return; }
    if (['ul', 'ol', 'todo', 'quote', 'callout'].includes(b.t) && !bx.textContent.trim()) { b.t = 'p'; b.x = ''; renderBlocks(p, b.id, 0); saveSoon(); return; }
    const after = htmlAfterCaret(bx); b.x = clean(bx.innerHTML);
    const nt = ['ul', 'ol', 'todo'].includes(b.t) ? b.t : 'p';
    const nb = { id: uid(), t: nt, x: after, ...(nt === 'todo' ? { c: false } : {}) };
    // Enter at the very start of a non-empty block: push it down instead
    p.blocks.splice(i + 1, 0, nb);
    renderBlocks(p, nb.id, 0); saveSoon(); return;
  }
  if (e.key === 'Enter' && e.shiftKey) { e.preventDefault(); document.execCommand('insertLineBreak'); return; }
  if (e.key === 'Backspace') {
    const sel = getSelection();
    if (!sel.isCollapsed || caretOffset(bx) !== 0) return;
    e.preventDefault();
    if (b.t !== 'p') { b.t = 'p'; delete b.c; renderBlocks(p, b.id, 0); saveSoon(); return; }
    if (i === 0) return;
    const prev = p.blocks[i - 1];
    if (prev.t === 'hr') { p.blocks.splice(i - 1, 1); renderBlocks(p, b.id, 0); saveSoon(); return; }
    const len = plainText(prev.x).length;
    prev.x = (prev.x || '') + (b.x || ''); p.blocks.splice(i, 1);
    renderBlocks(p, prev.id, len); saveSoon(); return;
  }
  if (e.key === 'Tab') { e.preventDefault(); return; }
  if (e.key === 'ArrowUp' && caretOffset(bx) === 0) { const prev = [...p.blocks.slice(0, i)].reverse().find((x) => x.t !== 'hr'); if (prev) { e.preventDefault(); focusBlock(prev.id, -1); } else { e.preventDefault(); $('#titleIn')?.focus(); } return; }
  if (e.key === 'ArrowDown' && caretOffset(bx) >= textLen(bx)) { const next = p.blocks.slice(i + 1).find((x) => x.t !== 'hr'); if (next) { e.preventDefault(); focusBlock(next.id, 0); } }
});
document.addEventListener('focusin', (e) => { const el = e.target.closest?.('.blk'); $$('.blk.focus').forEach((x) => x !== el && x.classList.remove('focus')); if (el) el.classList.add('focus'); });
document.addEventListener('paste', (e) => {
  const bx = e.target.closest?.('.bx'); if (!bx) return;
  e.preventDefault();
  const p = curPaper(); const text = e.clipboardData.getData('text/plain') || '';
  const lines = text.replace(/\r/g, '').split('\n');
  if (lines.length > 1 && p) {
    // multi-line paste → markdown → blocks
    const el = bx.closest('.blk'); const i = p.blocks.findIndex((x) => x.id === el.dataset.id);
    const nbs = mdToBlocks(text);
    const cur = p.blocks[i];
    if (!bx.textContent.trim() && cur.t === 'p') p.blocks.splice(i, 1, ...nbs); else p.blocks.splice(i + 1, 0, ...nbs);
    renderBlocks(p, nbs[nbs.length - 1]?.id, -1); save(true);
  } else document.execCommand('insertText', false, text);
});
function wrapSel(tag) {
  const sel = getSelection(); if (!sel.rangeCount || sel.isCollapsed) return;
  const r = sel.getRangeAt(0); const anc = r.commonAncestorContainer.parentElement?.closest(tag);
  if (anc) { anc.replaceWith(...anc.childNodes); return; }
  const w = document.createElement(tag); w.appendChild(r.extractContents()); r.insertNode(w); sel.removeAllRanges();
}
const toggleMark = () => wrapSel('mark');
function applyUndo() {
  if (!undoBlocks) return; const p = docOf(undoBlocks.id); if (!p) return;
  p.blocks = undoBlocks.blocks; undoBlocks = null; save(true);
  if (isDoc() && view.id === p.id) renderBlocks(p);
  toast('Notes restored');
}

/* block drag & drop */
let dragBlk = null;
document.addEventListener('dragstart', (e) => {
  const h = e.target.closest?.('.blk-h .drag'); if (!h) return;
  const el = h.closest('.blk'); dragBlk = el.dataset.id;
  e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/folio-block', dragBlk);
  try { e.dataTransfer.setDragImage(el, 20, 14); } catch (_) {}
  el.style.opacity = '.4';
});
document.addEventListener('dragover', (e) => {
  if (!dragBlk) return;
  const el = e.target.closest?.('.blk'); $$('.drop-before,.drop-after').forEach((x) => x.classList.remove('drop-before', 'drop-after'));
  if (!el) return; e.preventDefault();
  const r = el.getBoundingClientRect(); el.classList.add(e.clientY < r.top + r.height / 2 ? 'drop-before' : 'drop-after');
});
document.addEventListener('drop', (e) => {
  if (!dragBlk) return;
  e.preventDefault();
  const el = $('.drop-before,.drop-after'); const p = curPaper();
  if (el && p && el.dataset.id !== dragBlk) {
    const from = p.blocks.findIndex((x) => x.id === dragBlk); const [b] = p.blocks.splice(from, 1);
    let to = p.blocks.findIndex((x) => x.id === el.dataset.id); if (el.classList.contains('drop-after')) to++;
    p.blocks.splice(to, 0, b); save(true);
  }
  dragBlk = null; if (p) renderBlocks(p);
});
document.addEventListener('dragend', () => { if (dragBlk) { dragBlk = null; const p = curPaper(); if (p) renderBlocks(p); } });

/* ───────── popovers ───────── */
let slash = null;
function placePop(anchor, below = true) {
  const pop = $('#pop'); pop.classList.add('open');
  const r = anchor.getBoundingClientRect(); const ph = pop.offsetHeight; const pw = pop.offsetWidth;
  let top = below ? r.bottom + 4 : r.top; if (top + ph > innerHeight - 10) top = Math.max(10, r.top - ph - 4);
  let left = Math.min(r.left, innerWidth - pw - 10);
  pop.style.top = `${top}px`; pop.style.left = `${Math.max(10, left)}px`;
}
function closePop() { $('#pop').classList.remove('open'); $('#pop').innerHTML = ''; slash = null; }
function openSlash(bx, b, q) {
  const ql = q.toLowerCase();
  const items = BTYPES.filter((x) => !ql || x.label.toLowerCase().includes(ql) || x.keys.includes(ql));
  slash = { bx, b, items, sel: 0 };
  drawSlash(); placePop(bx);
}
function drawSlash() {
  if (!slash) return;
  $('#pop').innerHTML = `<div class="pop-h">Basic blocks</div>${slash.items.map((x, i) => `<button class="pop-i${i === slash.sel ? ' sel' : ''}" data-act="slash-pick" data-t="${x.t}"><span class="pi">${x.icon}</span><span><div>${x.label}</div><div class="pd">${x.desc}</div></span></button>`).join('') || '<div class="pop-h">No results</div>'}`;
  $('#pop .pop-i.sel')?.scrollIntoView({ block: 'nearest' });
}
function pickSlash(t) {
  const p = curPaper(); if (!slash || !p) return;
  const b = slash.b; closePop();
  turnInto(p, b, t, true);
}
function turnInto(p, b, t, clearText) {
  if (clearText) b.x = '';
  if (t === 'hr') {
    b.t = 'hr'; b.x = '';
    const i = p.blocks.indexOf(b); let nb = p.blocks[i + 1];
    if (!nb || nb.t === 'hr') { nb = { id: uid(), t: 'p', x: '' }; p.blocks.splice(i + 1, 0, nb); }
    renderBlocks(p, nb.id, 0);
  } else { b.t = t; if (t === 'todo') b.c ||= false; renderBlocks(p, b.id, -1); }
  save(true);
}
function blockMenu(btn) {
  const p = curPaper(); const el = btn.closest('.blk'); const b = p.blocks.find((x) => x.id === el.dataset.id);
  $('#pop').innerHTML = `<div class="pop-h">Turn into</div>${BTYPES.filter((x) => x.t !== 'hr').map((x) => `<button class="pop-i${x.t === b.t ? ' sel' : ''}" data-act="blk-turn" data-id="${b.id}" data-t="${x.t}"><span class="pi">${x.icon}</span>${x.label}</button>`).join('')}
    <div class="pop-h">Actions</div>
    <button class="pop-i" data-act="blk-dup" data-id="${b.id}"><span class="pi">⧉</span>Duplicate</button>
    <button class="pop-i" data-act="blk-move" data-id="${b.id}" data-d="-1"><span class="pi">↑</span>Move up</button>
    <button class="pop-i" data-act="blk-move" data-id="${b.id}" data-d="1"><span class="pi">↓</span>Move down</button>
    <button class="pop-i danger" data-act="blk-del" data-id="${b.id}"><span class="pi">✕</span>Delete</button>`;
  placePop(btn);
}
function emojiPop(anchor, onPick) {
  $('#pop').innerHTML = `<div class="emoji-grid">${EMOJIS.map((e) => `<button data-act="emoji-pick" data-e="${e}">${e}</button>`).join('')}</div>`;
  emojiCb = onPick; placePop(anchor);
}
let emojiCb = null;

/* ───────── Markdown ↔ blocks ───────── */
function inlineMd(s) {
  let h = esc(s);
  h = h.replace(/`([^`]+)`/g, '<code>$1</code>');
  h = h.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/__([^_]+)__/g, '<b>$1</b>');
  h = h.replace(/(^|[^*\w])\*([^*\n]+)\*(?!\w)/g, '$1<i>$2</i>').replace(/(^|[^_\w])_([^_\n]+)_(?!\w)/g, '$1<i>$2</i>');
  h = h.replace(/==([^=]+)==/g, '<mark>$1</mark>');
  h = h.replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  return h;
}
function mdToBlocks(md) {
  const out = []; const lines = md.replace(/\r/g, '').split('\n');
  const B = (t, x = '', extra = {}) => out.push({ id: uid(), t, x, ...extra });
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]; const l = raw.trim();
    if (!l) continue;
    if (l.startsWith('```')) { const buf = []; i++; while (i < lines.length && !lines[i].trim().startsWith('```')) buf.push(lines[i++]); B('code', esc(buf.join('\n')).replace(/\n/g, '<br>')); continue; }
    let m;
    if ((m = l.match(/^(#{1,6})\s+(.*)$/))) { B(m[1].length === 1 ? 'h1' : m[1].length === 2 ? 'h2' : 'h3', inlineMd(m[2].replace(/\*\*/g, ''))); continue; }
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(l)) { B('hr'); continue; }
    if ((m = l.match(/^[-*+]\s+\[([ xX])\]\s+(.*)$/))) { B('todo', inlineMd(m[2]), { c: m[1] !== ' ' }); continue; }
    if ((m = l.match(/^[-*+•]\s+(.*)$/))) { B('ul', inlineMd(m[1])); continue; }
    if ((m = l.match(/^\d+[.)]\s+(.*)$/))) { B('ol', inlineMd(m[1])); continue; }
    if ((m = l.match(/^>\s?\[!(\w+)\]\s*(.*)$/))) { B('callout', inlineMd(m[2])); continue; }
    if ((m = l.match(/^>\s?(.*)$/))) {
      const q = [m[1]]; while (i + 1 < lines.length && /^>\s?/.test(lines[i + 1].trim())) q.push(lines[++i].trim().replace(/^>\s?/, ''));
      const txt = q.join('\n'); const cm = txt.match(/^(💡|📌|⚠️|❗|✅|🔑|ℹ️)\s*(.*)$/s);
      if (cm) B('callout', inlineMd(cm[2]).replace(/\n/g, '<br>'), { e: cm[1] }); else B('quote', inlineMd(txt).replace(/\n/g, '<br>'));
      continue;
    }
    if (l.startsWith('|')) { // tables → rows as bullets
      if (/^\|[\s:|-]+\|$/.test(l)) continue;
      B('ul', inlineMd(l.replace(/^\||\|$/g, '').split('|').map((c) => c.trim()).join(' · '))); continue;
    }
    B('p', inlineMd(l));
  }
  return out.length ? out : [{ id: uid(), t: 'p', x: '' }];
}
function htmlToMd(h) {
  const d = document.createElement('div'); d.innerHTML = h || '';
  const walk = (n) => [...n.childNodes].map((c) => {
    if (c.nodeType === 3) return c.nodeValue;
    const inner = walk(c);
    switch (c.tagName) { case 'B': return `**${inner}**`; case 'I': return `*${inner}*`; case 'CODE': return `\`${inner}\``; case 'MARK': return `==${inner}==`; case 'BR': return '\n'; case 'A': return `[${inner}](${c.getAttribute('href')})`; default: return inner; }
  }).join('');
  return walk(d);
}
function blocksToMd(blocks) {
  let n = 0;
  return blocks.map((b) => {
    n = b.t === 'ol' ? n + 1 : 0;
    const x = htmlToMd(b.x);
    switch (b.t) {
      case 'h1': return `# ${x}`; case 'h2': return `## ${x}`; case 'h3': return `### ${x}`;
      case 'ul': return `- ${x}`; case 'ol': return `${n}. ${x}`; case 'todo': return `- [${b.c ? 'x' : ' '}] ${x}`;
      case 'quote': return `> ${x.replace(/\n/g, '\n> ')}`; case 'callout': return `> ${b.e || '💡'} ${x.replace(/\n/g, '\n> ')}`;
      case 'code': return `\`\`\`\n${plainText(b.x.replace(/<br>/g, '\n'))}\n\`\`\``; case 'hr': return '---';
      default: return x;
    }
  }).filter((s, i, a) => !(s === '' && a[i - 1] === '')).join('\n');
}
function mdToHTML(md) { // chat rendering (read-only)
  const bl = mdToBlocks(md); let html = ''; let list = null;
  const close = () => { if (list) { html += `</${list}>`; list = null; } };
  for (const b of bl) {
    const lt = b.t === 'ul' || b.t === 'todo' ? 'ul' : b.t === 'ol' ? 'ol' : null;
    if (lt !== list) { close(); if (lt) { html += `<${lt}>`; list = lt; } }
    if (lt) html += `<li>${b.t === 'todo' ? (b.c ? '☑ ' : '☐ ') : ''}${b.x}</li>`;
    else if (b.t === 'h1' || b.t === 'h2' || b.t === 'h3') html += `<${b.t}>${b.x}</${b.t}>`;
    else if (b.t === 'quote' || b.t === 'callout') html += `<blockquote>${b.e ? b.e + ' ' : ''}${b.x}</blockquote>`;
    else if (b.t === 'code') html += `<pre><code>${b.x}</code></pre>`;
    else if (b.t === 'hr') html += '<hr style="border:0;border-top:1px solid var(--line)">';
    else html += `<p>${b.x}</p>`;
  }
  close(); return html;
}

/* ───────── Side panel (PDF / Claude) ───────── */
const pdfUrls = new Map();
async function pdfUrl(id) {
  if (pdfUrls.has(id)) return pdfUrls.get(id);
  const blob = await fileGet(`pdf-${id}`).catch(() => null);
  if (!blob) return null;
  const u = URL.createObjectURL(blob); pdfUrls.set(id, u); return u;
}
async function renderPanel() {
  const panel = $('#panel'); const p = curPaper();
  const open = !!(ui.panel && p);
  panel.classList.toggle('open', open); panel.setAttribute('aria-hidden', String(!open));
  if (!open) { panel.innerHTML = ''; panel.dataset.k = ''; return; }
  const tabs = `<div class="ptabs">
    ${isConcept(p) ? '' : `<button class="tbtn${ui.panel === 'pdf' ? ' on' : ''}" data-act="panel" data-p="pdf">${IC.pdf} PDF</button>`}
    <button class="tbtn ai${ui.panel === 'ai' ? ' on' : ''}" data-act="panel" data-p="ai">${IC.spark} Claude</button>
    <span class="grow"></span>
    ${ui.panel === 'ai' && p.chat.length ? '<button class="tbtn" data-act="chat-clear" title="Clear chat">Clear</button>' : ''}
    ${ui.panel === 'pdf' && p.pdf ? '<button class="tbtn" data-act="pdf-newtab" title="Open in new tab">↗</button>' : ''}
    <button class="icon-btn" data-act="panel-close" aria-label="Close">${IC.close}</button></div>`;
  if (ui.panel === 'pdf') {
    const key = `pdf-${p.id}-${p.pdf?.name || ''}`;
    if (panel.dataset.k === key) return; // keep the viewer (and its scroll position)
    panel.dataset.k = key;
    const url = p.pdf ? await pdfUrl(p.id) : null;
    panel.innerHTML = tabs + (url ? `<iframe class="pdf-frame" src="${url}#view=FitH" title="PDF"></iframe>`
      : `<div class="pdf-empty"><div><div style="font-size:34px">📄</div>${p.pdf ? '<b style="color:var(--ink)">The PDF is on another device</b><br/>It was too large to sync — the text still syncs, so Claude works here.' : '<b style="color:var(--ink)">No PDF yet</b><br/>Attach one to read it side by side.'}<div style="margin-top:14px"><button class="btn btn-ghost btn-sm" data-act="attach-pdf">${p.pdf ? 'Attach it here' : 'Attach PDF'}</button></div></div></div>`);
  } else {
    panel.dataset.k = 'ai';
    panel.innerHTML = tabs + `<div class="chat" id="chat"></div>
      <div class="composer"><div class="composer-box">
        <textarea id="chatIn" rows="1" placeholder="Ask about this ${isConcept(p) ? 'concept' : 'paper'}…"></textarea>
        <div class="composer-row">
          <label class="toggle-sm" title="When on, Claude can propose edits to your notes"><input type="checkbox" id="canEdit"${P.canEdit ? ' checked' : ''}/> Can edit notes</label>
          <span class="grow"></span>
          <select class="sel" id="modelSel" style="height:26px;font-size:12px">${MODEL_OPTS.map(([v, l]) => `<option value="${v}"${P.model === v ? ' selected' : ''}>${l}</option>`).join('')}</select>
          <button class="send" id="sendBtn" aria-label="Send">${IC.send}</button>
        </div></div></div>`;
    drawChat(p);
    const ti = $('#chatIn');
    ti.addEventListener('input', () => autosize(ti));
    ti.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && e.keyCode !== 229) { e.preventDefault(); sendChat(); } });
    $('#sendBtn').onclick = sendChat;
    $('#canEdit').onchange = (e) => { P.canEdit = e.target.checked; savePrefs(); };
    $('#modelSel').onchange = (e) => { P.model = e.target.value; savePrefs(); };
    if (window.innerWidth > 860) setTimeout(() => ti.focus(), 30);
  }
}
const MODEL_OPTS = [['claude-sonnet-5-5', 'Sonnet 5.5'], ['claude-opus-5-5', 'Opus 5.5'], ['claude-haiku-5-5', 'Haiku 5.5 · fast']];

let aiState = null; // { ok, needsCode, codeOk }
async function aiReady(force) {
  if (aiState && !force) return aiState.ok;
  try {
    const r = await fetch('/api/ai', { headers: { 'x-folio-code': P.code || '' }, cache: 'no-store' });
    const j = await r.json(); aiState = { ok: j.ready && j.codeOk, ...j };
  } catch (_) { aiState = { ok: false, offline: true }; }
  return aiState.ok;
}
function aiWarnHTML() {
  if (!aiState || aiState.ok) return '';
  if (aiState.offline) return '<div class="ai-warn">Claude isn\'t reachable right now. On the deployed site, add <b>ANTHROPIC_API_KEY</b> in Vercel → Settings → Environment Variables.</div>';
  if (!aiState.ready) return '<div class="ai-warn">Claude isn\'t set up yet — add <b>ANTHROPIC_API_KEY</b> in Vercel → Settings → Environment Variables, then redeploy.</div>';
  if (!aiState.codeOk) return '<div class="ai-warn">Enter your <b>access code</b> in <a href="#settings">Settings</a> to use Claude on this device.</div>';
  return '';
}
function drawChat(p) {
  const el = $('#chat'); if (!el) return;
  const intro = isConcept(p)
    ? `<div class="chat-intro"><b>Study this concept with Claude</b>Claude sees your notes${p.related.length ? ` and the ${p.related.length} linked paper${p.related.length === 1 ? '' : 's'}` : ''}. Ask in Korean or English.
    <div class="quick">${QUICK_C.map((q) => `<button data-act="ai-quick" data-q="${q[0]}">${q[1]}</button>`).join('')}</div></div>`
    : `<div class="chat-intro"><b>Ask Claude about this paper</b>${p.pdf ? `Claude has read all ${p.pdf.pages} pages.` : 'No PDF attached — Claude only sees the details and your notes.'} Ask in Korean or English.
    <div class="quick">${QUICK.map((q) => `<button data-act="ai-quick" data-q="${q[0]}">${q[1]}</button>`).join('')}</div></div>`;
  el.innerHTML = aiWarnHTML() + (p.chat.length ? '' : intro) + p.chat.map((m, i) => msgHTML(p, m, i)).join('');
  el.scrollTop = el.scrollHeight;
  if (!aiState) aiReady().then(() => { if ($('#chat') && aiState && !aiState.ok) drawChat(p); });
}
const QUICK = [
  ['summarize', '✨ Summarize into notes'], ['meta', 'Fill in details'], ['findings', 'Key findings & numbers'], ['methods', 'Explain the methods'],
  ['limits', 'Limitations & open questions'], ['explain', 'Explain simply'], ['ko', '노트 한국어로'], ['ideas', 'Ideas for my research'],
];
const QUICK_C = [
  ['c-notes', '✨ Write my study notes'], ['c-intuition', 'Intuition & analogy'], ['c-math', 'Key equations, explained'], ['c-quiz', 'Quiz me'],
  ['c-papers', 'Connect to my papers'], ['c-confuse', 'Common misconceptions'], ['ko', '노트 한국어로'],
];
const EDIT_KEYS = new Set(['summarize', 'ko', 'c-notes']);
const QUICK_PROMPTS = {
  'c-notes': 'Write clear study notes on this concept into my notes. Keep anything I already wrote and fill in the gaps. Sections: In one line, Key ideas, Equations & numbers (explain every symbol and typical values), Examples · where I saw it (use my linked papers if relevant), Still confusing (common pitfalls). Put the full updated notes in <notes>.',
  'c-intuition': 'Give me the physical intuition behind this concept — an analogy or mental picture first, then why it works. Keep it short.',
  'c-math': 'Walk me through the key equations for this concept. Define every symbol, give units and typical values for my field, and say when each equation breaks down.',
  'c-quiz': 'Quiz me on this concept: ask me 3 questions, one at a time, from basic to hard. Wait for my answer before giving feedback and the next question.',
  'c-papers': 'How does this concept show up in the papers linked here? Point to specifics (measurements, figures, claims) and what I should look for when reading.',
  'c-confuse': 'What are the most common misconceptions or easy-to-confuse neighboring concepts? Contrast them clearly.',
  summarize: 'Read the whole paper and write structured reading notes into my notes. Keep anything I already wrote. Use these sections: TL;DR (2–3 sentences), Key findings (bullets with the important numbers), Methods (synthesis / experimental / computational details that matter for reproducing it), Results, Limitations, Questions & ideas. Put the full updated notes in <notes>.',
  findings: 'What are the key findings? List them with the specific numbers (yields, PLQY, efficiencies, sizes, wavelengths, conditions…) and which figure or table each comes from.',
  methods: 'Explain the methods step by step, in enough detail that I could reproduce the key experiment. Call out precursor amounts, temperatures, times, and characterization techniques.',
  limits: 'What are the limitations, weak points, and open questions of this paper? Be critical and specific.',
  explain: 'Explain this paper simply, as if to a first-year grad student: the problem, the idea, and why it matters. Keep it short.',
  ko: '내 노트 전체를 자연스러운 한국어로 바꿔줘. 전문 용어는 영어를 괄호로 남겨줘. 전체 결과를 <notes>에 넣어줘.',
  ideas: 'Based on this paper, suggest concrete follow-up experiments or ideas I could try in my own research, and what I should watch out for.',
};
function msgHTML(p, m, i) {
  if (m.r === 'user') return `<div class="msg user">${esc(m.shown || m.c)}</div>`;
  const { text, notes } = splitNotes(m.c);
  const busy = m.streaming;
  return `<div class="msg assistant" data-i="${i}"><div class="who">${IC.spark} Claude${busy ? ' <span class="spin" style="width:11px;height:11px"></span>' : ''}</div>
    <div class="md${busy && !notes ? ' typing' : ''}">${mdToHTML(text) || (busy ? '' : '<p style="color:var(--ink-3)">(no reply)</p>')}</div>
    ${notes != null ? `<div class="proposal${m.applied ? ' applied' : ''}"><div class="proposal-h">📝 Proposed notes<span class="grow"></span>${busy ? '<span class="spin" style="width:11px;height:11px"></span> writing…' : m.applied ? '✓ Applied' : `<button class="btn btn-ghost btn-sm" data-act="notes-append" data-i="${i}">Append</button><button class="btn btn-primary btn-sm" data-act="notes-apply" data-i="${i}">Replace notes</button>`}</div><div class="proposal-b md">${mdToHTML(notes)}</div></div>` : ''}
    ${!busy && text.trim() ? `<div class="msg-actions"><button data-act="msg-insert" data-i="${i}">＋ Add to notes</button><button data-act="msg-copy" data-i="${i}">Copy</button></div>` : ''}
    ${m.err ? `<div class="ai-warn">${esc(m.err)}</div>` : ''}</div>`;
}
function splitNotes(c) {
  const s = c.indexOf('<notes>'); if (s < 0) return { text: c, notes: null };
  const e = c.indexOf('</notes>', s);
  const notes = c.slice(s + 7, e < 0 ? undefined : e).trim();
  const text = (c.slice(0, s) + (e < 0 ? '' : c.slice(e + 8))).trim();
  return { text, notes };
}

async function buildConceptSystem(c, canEdit) {
  const rules = `You are Claude, a patient tutor inside Folio — a Notion-style app where a graduate researcher (materials chemistry, e.g. halide perovskite nanocrystals, spectroscopy, ML for synthesis) keeps study notes on scientific concepts.
- Answer in the language the user writes in (Korean or English). Build intuition first, then rigor. Be correct and concrete: give units, typical values and a worked example when useful. Say when something is approximate or debated.
- Format with Markdown: short paragraphs, ## headings, bullet lists, **bold** for key terms. Don't use tables. Write equations and formulas with Unicode (E = hν, τ, ΔG, CsPbBr₃) rather than LaTeX.
${canEdit ? `- You can edit the user's notes. When the user asks you to write, change, reorganize, translate, add to or summarize into their notes, first say in one or two sentences what you changed, then output the COMPLETE updated notes (not just the changed part) as Markdown inside <notes>...</notes>. Preserve what the user wrote unless asked to change it. Only use <notes> when the user wants their notes changed.` : '- Note editing is turned off: never output <notes> tags; just answer.'}`;
  const rel = c.related.map(paper).filter(Boolean).map((p) => {
    const notes = blocksToMd(p.blocks).slice(0, 2500);
    return `<linked_paper title="${(p.title || '').replace(/"/g, "'")}" year="${p.year}" venue="${(p.venue || '').replace(/"/g, "'")}">\n${notes}\n</linked_paper>`;
  }).join('\n');
  const meta = [`Concept: ${c.title || '(untitled)'}`, c.field && `Field: ${c.field}`, c.tags.length && `Tags: ${c.tags.join(', ')}`, `Understanding: ${LEVEL[c.level]?.label || c.level}`, c.sources && `Sources: ${c.sources}`].filter(Boolean).join('\n');
  return [{ type: 'text', text: rules }, { type: 'text', text: `<concept>\n${meta}\n</concept>\n\n${rel ? `<linked_papers note="the user's notes on papers related to this concept">\n${rel}\n</linked_papers>\n\n` : ''}<current_notes>\n${blocksToMd(c.blocks) || '(empty)'}\n</current_notes>` }];
}
async function buildSystem(p, canEdit) {
  if (isConcept(p)) return buildConceptSystem(p, canEdit);
  const text = await paperText(p.id);
  const meta = [`Title: ${p.title || '(untitled)'}`, p.authors.length && `Authors: ${p.authors.join(', ')}`, p.year && `Year: ${p.year}`, p.venue && `Venue: ${p.venue}`, p.doi && `DOI: ${p.doi}`, p.tags.length && `Tags: ${p.tags.join(', ')}`].filter(Boolean).join('\n');
  const rules = `You are Claude, a research assistant inside Folio — a Notion-style app where a graduate researcher keeps reading notes on scientific papers (often materials chemistry, e.g. halide perovskite nanocrystals).
- Answer in the language the user writes in (Korean or English). Be precise and concrete; quote numbers and point to figures/tables/pages when you can. If the paper doesn't say something, say so instead of guessing.
- Format with Markdown: short paragraphs, ## headings, bullet lists, **bold** for key terms. Don't use tables. Write chemical formulas and equations with Unicode (CsPbBr₃, λ = 520 nm, ΔG) rather than LaTeX.
${canEdit ? `- You can edit the user's notes. When the user asks you to write, change, reorganize, translate, add to or summarize into their notes, first say in one or two sentences what you changed, then output the COMPLETE updated notes (not just the changed part) as Markdown inside <notes>...</notes>. Preserve what the user wrote unless asked to change it. Only use <notes> when the user wants their notes changed.` : '- Note editing is turned off: never output <notes> tags; just answer.'}`;
  const sys = [{ type: 'text', text: rules }];
  if (text) sys.push({ type: 'text', text: `<paper_full_text pages="${p.pdf?.pages || '?'}">\n${text}\n</paper_full_text>`, cache_control: { type: 'ephemeral' } });
  sys.push({ type: 'text', text: `<paper_details>\n${meta}\n</paper_details>\n\n<current_notes>\n${blocksToMd(p.blocks) || '(empty)'}\n</current_notes>${text ? '' : '\n\n(No PDF text is available for this paper.)'}` });
  return sys;
}
async function streamClaude(body, onText) {
  const r = await fetch('/api/ai', { method: 'POST', headers: { 'content-type': 'application/json', 'x-folio-code': P.code || '' }, body: JSON.stringify({ ...body, stream: true }) });
  if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error(aiErr(j, r.status)); }
  const reader = r.body.getReader(); const dec = new TextDecoder(); let buf = ''; let out = '';
  for (;;) {
    const { done, value } = await reader.read(); if (done) break;
    buf += dec.decode(value, { stream: true });
    let k;
    while ((k = buf.indexOf('\n\n')) >= 0) {
      const chunk = buf.slice(0, k); buf = buf.slice(k + 2);
      for (const line of chunk.split('\n')) {
        if (!line.startsWith('data:')) continue;
        let ev; try { ev = JSON.parse(line.slice(5)); } catch (_) { continue; }
        if (ev.type === 'content_block_delta' && ev.delta?.type === 'text_delta') { out += ev.delta.text; onText(out); }
        else if (ev.type === 'error') throw new Error(ev.error?.message || 'Claude error');
      }
    }
  }
  return out;
}
function aiErr(j, status) {
  if (j.error === 'no-api-key') return 'Claude isn\'t set up yet — add ANTHROPIC_API_KEY in Vercel.';
  if (j.error === 'bad-access-code') return 'Wrong access code — check Settings.';
  if (status === 429) return 'Rate limited — wait a moment and try again.';
  if (j.detail && /credit|balance|billing/i.test(j.detail)) return 'Your Claude API credit is used up — top up at console.anthropic.com.';
  return j.detail || j.error || `Request failed (${status})`;
}
async function sendChat(preset, shown) {
  const p = curPaper(); if (!p || ui.aiBusy) return;
  const ti = $('#chatIn');
  const q = (typeof preset === 'string' ? preset : ti?.value || '').trim();
  if (!q) return;
  if (!(await aiReady(true))) { drawChat(p); toast('Claude isn\'t set up yet'); return; }
  if (ti && typeof preset !== 'string') { ti.value = ''; autosize(ti); }
  const canEdit = P.canEdit || [...EDIT_KEYS].some((k) => preset === QUICK_PROMPTS[k]);
  p.chat.push({ r: 'user', c: q, ...(shown ? { shown } : {}), t: Date.now() });
  const msg = { r: 'assistant', c: '', t: Date.now(), streaming: true };
  p.chat.push(msg); ui.aiBusy = true; drawChat(p); $('#sendBtn') && ($('#sendBtn').disabled = true);
  const history = p.chat.slice(0, -1).slice(-16).filter((m) => m.c).map((m) => ({ role: m.r, content: m.c }));
  while (history.length && history[0].role !== 'user') history.shift();
  for (let k = history.length - 1; k > 0; k--) if (history[k].role === history[k - 1].role) { history[k - 1].content += '\n\n' + history[k].content; history.splice(k, 1); }
  let last = 0;
  try {
    const system = await buildSystem(p, canEdit);
    await streamClaude({ model: P.model, max_tokens: 8000, system, messages: history }, (txt) => {
      msg.c = txt;
      if (Date.now() - last > 60) { last = Date.now(); patchLastMsg(p); }
    });
  } catch (e) { msg.err = e.message || String(e); }
  msg.streaming = false; ui.aiBusy = false; save(true);
  if (curPaper() === p) { drawChat(p); $('#sendBtn') && ($('#sendBtn').disabled = false); }
}
function patchLastMsg(p) {
  const el = $('#chat'); if (!el || curPaper() !== p) return;
  const i = p.chat.length - 1; const node = $(`.msg[data-i="${i}"]`, el);
  const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  if (node) node.outerHTML = msgHTML(p, p.chat[i], i);
  if (nearBottom) el.scrollTop = el.scrollHeight;
}
async function quick(k) {
  const p = curPaper(); if (!p) return;
  if (k === 'meta') return autoMetadata(p, true);
  if (k === 'c-notes' && !p.title.trim()) { toast('Give the concept a title first'); $('#titleIn')?.focus(); return; }
  if (ui.panel !== 'ai') { ui.panel = 'ai'; renderTopActions(p); await renderPanel(); }
  const label = [...QUICK, ...QUICK_C].find((x) => x[0] === k)?.[1] || k;
  sendChat(QUICK_PROMPTS[k], label.replace(/^✨\s*/, ''));
}
function applyNotes(i, mode) {
  const p = curPaper(); const m = p?.chat[i]; if (!m) return;
  const { notes } = splitNotes(m.c); if (notes == null) return;
  snapshotBlocks(p);
  const nb = mdToBlocks(notes);
  p.blocks = mode === 'append' ? [...p.blocks.filter((b) => b.t !== 'p' || plainText(b.x).trim() || p.blocks.length === 1), ...nb] : nb;
  m.applied = true; p.updated = Date.now(); save(true);
  renderBlocks(p); drawChat(p);
  toast(mode === 'append' ? 'Added to notes' : 'Notes updated', 'Undo', applyUndo);
}

/* metadata extraction (non-streaming JSON) */
async function autoMetadata(p, manual) {
  const text = await paperText(p.id);
  if (!text) { if (manual) toast('Attach a PDF first'); return; }
  if (!(await aiReady(manual))) { if (manual) { toast('Claude isn\'t set up yet'); ui.panel = 'ai'; render(); } return; }
  p._busy = 'Claude is filling in details…'; rerenderIf(p.id);
  try {
    const r = await fetch('/api/ai', {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-folio-code': P.code || '' },
      body: JSON.stringify({
        model: 'claude-haiku-5-5', max_tokens: 600,
        system: 'You extract bibliographic metadata from the first pages of a scientific paper. Reply with ONLY a JSON object, no prose.',
        messages: [{ role: 'user', content: `Return JSON with keys: "title" (string), "authors" (array of full names, in order), "year" (string), "venue" (journal or conference, full name), "doi" (string or ""), "tags" (2-4 short lowercase topic tags, e.g. "perovskite", "nanocrystals", "LARP"), "emoji" (one emoji that fits the topic).\n\n${text.slice(0, 9000)}` }],
      }),
    });
    const j = await r.json(); if (!r.ok) throw new Error(aiErr(j, r.status));
    const raw = j.content?.map((c) => c.text || '').join('') || '';
    const m = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1));
    if (m.title) p.title = String(m.title).trim();
    if (Array.isArray(m.authors) && m.authors.length) p.authors = m.authors.map(String);
    if (m.year) p.year = String(m.year);
    if (m.venue) p.venue = String(m.venue);
    if (m.doi && /^10\./.test(m.doi)) p.doi = String(m.doi).trim();
    if (Array.isArray(m.tags)) m.tags.forEach((t) => { t = String(t).trim().toLowerCase(); if (t && !p.tags.includes(t)) p.tags.push(t); });
    if (m.emoji && (p.emoji === '📄' || !p.emoji)) { try { p.emoji = [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(String(m.emoji).trim())][0].segment; } catch (_) { p.emoji = [...String(m.emoji)][0]; } }
    p.updated = Date.now();
    if (manual) toast('Details filled in ✓');
  } catch (e) { if (manual) toast(e.message || 'Couldn\'t read the details'); }
  delete p._busy; save(); rerenderIf(p.id);
}

/* ───────── Settings ───────── */
function renderSettings() {
  return `<div class="settings">
    <div class="page-title">Settings</div>
    <div class="s-group">Claude</div>
    <div class="s-card">
      <div class="s-row"><div class="s-text"><div class="s-title">Status</div><div class="s-desc" id="aiStatus">Checking…</div></div><button class="btn btn-ghost btn-sm" data-act="ai-check">Check</button></div>
      <div class="s-row"><div class="s-text"><div class="s-title">Access code</div><div class="s-desc">The FOLIO_ACCESS_CODE you set in Vercel. Saved only on this device.</div><input class="input" id="codeIn" type="password" value="${esc(P.code)}" placeholder="Access code" style="margin-top:8px" autocomplete="off" /></div></div>
      <div class="s-row"><div class="s-text"><div class="s-title">Default model</div><div class="s-desc">Sonnet is a good balance · Opus for hard papers · Haiku is cheapest</div></div>
        <select class="sel" id="setModel" style="border:1px solid var(--line-2)">${MODEL_OPTS.map(([v, l]) => `<option value="${v}"${P.model === v ? ' selected' : ''}>${l}</option>`).join('')}</select></div>
    </div>
    <div class="s-group">Sync</div>
    <div class="s-card">
      <div class="s-row"><div class="s-text"><div class="s-title">${SY ? 'Cloud · signed in' : 'Cloud sync'}</div><div class="s-desc" id="syncStatus">${syncStatusText()}</div></div>
        ${SY ? '<button class="btn btn-ghost btn-sm" data-act="sync-now">Sync now</button><button class="btn btn-ghost btn-sm" data-act="sync-off">Turn off</button>' : '<button class="btn btn-primary btn-sm" data-act="sync-setup">Sign in</button>'}</div>
    </div>
    <div class="note">☁️ Your library, notes and paper text are encrypted on your device with your Folio password before they're uploaded. PDFs up to ~4 MB sync too; bigger ones stay on the device you added them on.</div>
    <div class="s-group">Data</div>
    <div class="s-card">
      <div class="s-row"><div class="s-text"><div class="s-title">Export library</div><div class="s-desc">Papers + notes as JSON, or all notes as Markdown</div></div><button class="btn btn-ghost btn-sm" data-act="export-json">JSON</button><button class="btn btn-ghost btn-sm" data-act="export-md">Markdown</button></div>
      <div class="s-row"><div class="s-text"><div class="s-title">Import JSON backup</div><div class="s-desc">Merges into your library</div></div><label class="btn btn-ghost btn-sm">Choose…<input type="file" id="importIn" accept=".json,application/json" hidden /></label></div>
    </div>
    <div class="note" style="text-align:center;margin-top:30px">Folio · v1.1</div>
  </div>`;
}
async function refreshAiStatus() {
  const el = $('#aiStatus'); if (!el) return;
  await aiReady(true);
  el.innerHTML = aiState.ok ? '✅ Connected' : aiState.offline ? '⚠️ Can\'t reach /api/ai' : !aiState.ready ? '⚠️ No API key on the server (ANTHROPIC_API_KEY)' : '🔒 Enter the access code below';
}

/* ───────── modal / toast ───────── */
function openModal(html) { const m = $('#modal'); m.innerHTML = `<div class="modal">${html}</div>`; m.classList.add('open'); m.setAttribute('aria-hidden', 'false'); }
function closeModal() { const m = $('#modal'); m.classList.remove('open'); m.setAttribute('aria-hidden', 'true'); m.innerHTML = ''; }
$('#modal').addEventListener('pointerdown', (e) => { if (e.target.id === 'modal') closeModal(); });
function ask(title, desc, okLabel = 'OK', danger) {
  return new Promise((res) => {
    openModal(`<h3>${esc(title)}</h3><p class="desc">${esc(desc)}</p><div class="modal-actions"><button class="btn btn-ghost" id="mNo">Cancel</button><button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="mOk">${esc(okLabel)}</button></div>`);
    $('#mNo').onclick = () => { closeModal(); res(false); }; $('#mOk').onclick = () => { closeModal(); res(true); };
  });
}
let toastTm;
function toast(msg, action, fn) {
  const t = $('#toast'); t.innerHTML = `<span>${esc(msg)}</span>${action ? `<button id="toastAct">${esc(action)}</button>` : ''}`; t.classList.add('show');
  if (action) $('#toastAct').onclick = () => { t.classList.remove('show'); fn(); };
  clearTimeout(toastTm); toastTm = setTimeout(() => t.classList.remove('show'), action ? 6000 : 2400);
}
function newPaperModal(status) {
  openModal(`<h3>Add a paper</h3><p class="desc">Drop a PDF — Folio reads it, and Claude fills in the title, authors and tags.</p>
    <div class="dropzone" id="mDrop"><div class="big">📄</div><b>Choose PDF</b> or drag it here<div style="font-size:12.5px;color:var(--ink-3);margin-top:2px">You can add several at once</div></div>
    <div class="or">or</div>
    <div class="field"><label>DOI</label><div style="display:flex;gap:8px"><input class="input" id="mDoi" placeholder="10.1021/acs.nanolett.…" /><button class="btn btn-ghost" id="mDoiGo">Add</button></div></div>
    <div class="modal-actions" style="justify-content:space-between"><button class="btn btn-ghost" id="mBlank">Blank page</button><button class="btn btn-ghost" id="mCancel">Cancel</button></div>`);
  pendingStatus = status || null;
  $('#mDrop').onclick = () => { pdfTarget = null; $('#pdfInput').click(); };
  $('#mCancel').onclick = closeModal;
  $('#mBlank').onclick = () => { const p = newPaper({ status: status || 'toread' }); S.papers.unshift(p); save(); closeModal(); go(`#p-${p.id}`); setTimeout(() => $('#titleIn')?.focus(), 50); };
  const goDoi = async () => {
    const btn = $('#mDoiGo'); btn.disabled = true; btn.innerHTML = '<span class="spin"></span>';
    try { const p = await fromDoi($('#mDoi').value); if (status) p.status = status; S.papers.unshift(p); save(); closeModal(); go(`#p-${p.id}`); toast('Added from Crossref ✓'); }
    catch (e) { btn.disabled = false; btn.textContent = 'Add'; toast(e.message); }
  };
  $('#mDoiGo').onclick = goDoi;
  $('#mDoi').onkeydown = (e) => { if (e.key === 'Enter') goDoi(); };
}
let pdfTarget = null, pendingStatus = null;
$('#pdfInput').addEventListener('change', async (e) => {
  const files = [...e.target.files]; e.target.value = '';
  const last = await importPdfs(files, pdfTarget);
  if (pendingStatus && last && !pdfTarget) { last.status = pendingStatus; save(); }
  pdfTarget = null; pendingStatus = null;
});

/* drag files anywhere */
let dragDepth = 0;
const hasFiles = (e) => [...(e.dataTransfer?.types || [])].includes('Files');
window.addEventListener('dragenter', (e) => { if (!hasFiles(e)) return; dragDepth++; document.body.classList.add('dragover'); });
window.addEventListener('dragleave', (e) => { if (!hasFiles(e)) return; if (--dragDepth <= 0) { dragDepth = 0; document.body.classList.remove('dragover'); } });
window.addEventListener('dragover', (e) => { if (hasFiles(e)) e.preventDefault(); });
window.addEventListener('drop', (e) => {
  if (!hasFiles(e)) return; e.preventDefault(); dragDepth = 0; document.body.classList.remove('dragover');
  const p = curPaper();
  if (p && !p.pdf && e.dataTransfer.files.length === 1) importPdfs(e.dataTransfer.files, p.id);
  else importPdfs(e.dataTransfer.files);
});

/* ───────── actions ───────── */
const A = {
  go: (el) => go(el.dataset.to),
  'open-drawer': () => { $('#sidebar').classList.add('open'); $('#scrim').classList.add('open'); },
  'close-drawer': () => closeDrawer(),
  'new-paper': (el) => newPaperModal(el.dataset.status),
  layout: (el) => { P.layout = el.dataset.l; savePrefs(); render(); },
  sort: (el) => { const k = el.dataset.k; if (ui.sort === k) ui.dir *= -1; else { ui.sort = k; ui.dir = ['title', 'authors', 'venue', 'status'].includes(k) ? 1 : -1; } P.sort = ui.sort; P.dir = ui.dir; savePrefs(); render(); },
  'filter-level': (el) => { ui.clevel = el.dataset.l || null; render(); },
  'filter-tag': (el) => { ui.tag = ui.tag === el.dataset.t ? null : el.dataset.t; render(); },
  panel: async (el) => { const p = curPaper(); ui.panel = ui.panel === el.dataset.p && !el.closest('.ptabs') && !el.closest('.pv') && !el.closest('.aibar') ? null : el.dataset.p; if (p) renderTopActions(p); await renderPanel(); },
  'panel-close': () => { ui.panel = null; const p = curPaper(); if (p) renderTopActions(p); renderPanel(); },
  'attach-pdf': () => { closePop(); pdfTarget = view.id; $('#pdfInput').removeAttribute('multiple'); $('#pdfInput').click(); setTimeout(() => $('#pdfInput').setAttribute('multiple', ''), 500); },
  'pdf-newtab': async () => { const u = await pdfUrl(view.id); if (u) window.open(u, '_blank'); },
  'set-level': (el) => { const c = curPaper(); c.level = el.dataset.l; c.updated = Date.now(); save(); renderPaperHeadOnly(); },
  'unlink-paper': (el) => { const c = curPaper(); c.related = c.related.filter((x) => x !== el.dataset.id); save(); renderPaperHeadOnly(); },
  'new-concept': (el) => newConcept_(el.dataset.field),
  'concept-from-paper': () => { const p = curPaper(); const c = newConcept({ related: [p.id], field: '' }); S.concepts.unshift(c); save(); go(`#c-${c.id}`); setTimeout(() => $('#titleIn')?.focus(), 50); },
  'set-status': (el) => { const p = curPaper(); p.status = el.dataset.s; p.updated = Date.now(); save(); renderPaperHeadOnly(); },
  rate: (el) => { const p = curPaper(); const n = Number(el.dataset.n); p.rating = p.rating === n ? 0 : n; save(true); renderPaperHeadOnly(); },
  'del-tag': (el) => { const p = curPaper(); p.tags.splice(Number(el.dataset.i), 1); save(); renderPaperHeadOnly(); },
  emoji: (el) => emojiPop(el, (e) => { const p = curPaper(); p.emoji = e; save(); renderPaperHeadOnly(); }),
  'callout-emoji': (el) => { const p = curPaper(); const b = p.blocks.find((x) => x.id === el.closest('.blk').dataset.id); emojiPop(el, (e) => { b.e = e; save(true); renderBlocks(p); }); },
  'emoji-pick': (el) => { const cb = emojiCb; closePop(); cb?.(el.dataset.e); },
  'paper-menu': (el) => {
    const p = curPaper();
    $('#pop').innerHTML = isConcept(p) ? `<button class="pop-i" data-act="copy-md"><span class="pi">⧉</span>Copy notes as Markdown</button>
      <button class="pop-i" data-act="reset-template"><span class="pi">▤</span>Insert note template</button>
      <button class="pop-i danger" data-act="del-paper"><span class="pi">✕</span>Delete concept</button>` : `<button class="pop-i" data-act="copy-md"><span class="pi">⧉</span>Copy notes as Markdown</button>
      <button class="pop-i" data-act="copy-cite"><span class="pi">❝</span>Copy citation</button>
      ${p.pdf ? '<button class="pop-i" data-act="attach-pdf"><span class="pi">↻</span>Replace PDF</button>' : ''}
      <button class="pop-i" data-act="reset-template"><span class="pi">▤</span>Insert note template</button>
      <button class="pop-i danger" data-act="del-paper"><span class="pi">✕</span>Delete paper</button>`;
    placePop(el); const pop = $('#pop'); pop.style.left = `${Math.max(10, el.getBoundingClientRect().right - pop.offsetWidth)}px`;
  },
  'copy-md': async () => { closePop(); const p = curPaper(); await navigator.clipboard.writeText(`# ${p.title}\n\n${blocksToMd(p.blocks)}`); toast('Copied'); },
  'copy-cite': async () => { closePop(); const p = curPaper(); const c = `${p.authors.join(', ')}${p.authors.length ? '. ' : ''}${p.title}. ${p.venue ? `${p.venue} ` : ''}${p.year ? `(${p.year})` : ''}${p.doi ? `. https://doi.org/${p.doi}` : ''}`; await navigator.clipboard.writeText(c.trim()); toast('Citation copied'); },
  'reset-template': () => { closePop(); const p = curPaper(); snapshotBlocks(p); p.blocks.push(...(isConcept(p) ? conceptTemplate() : templateBlocks())); save(true); renderBlocks(p); },
  'del-paper': async () => {
    closePop(); const p = curPaper();
    if (isConcept(p)) {
      if (!(await ask('Delete this concept?', `"${p.title || 'Untitled'}" and its notes will be removed.`, 'Delete', true))) return;
      S.concepts = S.concepts.filter((x) => x.id !== p.id); save(); go('#concepts'); toast('Deleted'); return;
    }
    if (!(await ask('Delete this paper?', `"${p.title || 'Untitled'}" and its notes and PDF will be removed.`, 'Delete', true))) return;
    S.papers = S.papers.filter((x) => x.id !== p.id); fileDel(`pdf-${p.id}`).catch(() => {}); fileDel(`txt-${p.id}`).catch(() => {});
    save(); go('#library'); toast('Deleted');
  },
  tail: () => { const p = curPaper(); if (!p) return; const last = p.blocks[p.blocks.length - 1]; if (last && last.t === 'p' && !plainText(last.x).trim()) return focusBlock(last.id); const nb = { id: uid(), t: 'p', x: '' }; p.blocks.push(nb); renderBlocks(p, nb.id); },
  'blk-add': (el) => { const p = curPaper(); const i = p.blocks.findIndex((x) => x.id === el.closest('.blk').dataset.id); const nb = { id: uid(), t: 'p', x: '' }; p.blocks.splice(i + 1, 0, nb); renderBlocks(p, nb.id); const bx = $('.bx', blockEl(nb.id)); bx.textContent = '/'; setCaret(bx, 1); openSlash(bx, nb, ''); },
  'blk-menu': (el) => blockMenu(el),
  'blk-check': (el) => { const p = curPaper(); const b = p.blocks.find((x) => x.id === el.closest('.blk').dataset.id); b.c = !b.c; el.closest('.blk').classList.toggle('checked', b.c); save(true); },
  'blk-turn': (el) => { closePop(); const p = curPaper(); const b = p.blocks.find((x) => x.id === el.dataset.id); turnInto(p, b, el.dataset.t, false); },
  'blk-dup': (el) => { closePop(); const p = curPaper(); const i = p.blocks.findIndex((x) => x.id === el.dataset.id); const nb = { ...p.blocks[i], id: uid() }; p.blocks.splice(i + 1, 0, nb); save(true); renderBlocks(p, nb.id, -1); },
  'blk-move': (el) => { closePop(); const p = curPaper(); const i = p.blocks.findIndex((x) => x.id === el.dataset.id); const j = i + Number(el.dataset.d); if (j < 0 || j >= p.blocks.length) return; const [b] = p.blocks.splice(i, 1); p.blocks.splice(j, 0, b); save(true); renderBlocks(p, b.id, -1); },
  'blk-del': (el) => { closePop(); const p = curPaper(); snapshotBlocks(p); p.blocks = p.blocks.filter((x) => x.id !== el.dataset.id); save(true); renderBlocks(p); toast('Block deleted', 'Undo', applyUndo); },
  'slash-pick': (el) => pickSlash(el.dataset.t),
  'ai-quick': (el) => quick(el.dataset.q),
  'chat-clear': async () => { const p = curPaper(); if (!(await ask('Clear this chat?', 'Your notes stay as they are.', 'Clear'))) return; p.chat = []; save(true); drawChat(p); renderPanel(); },
  'notes-apply': (el) => applyNotes(Number(el.dataset.i), 'replace'),
  'notes-append': (el) => applyNotes(Number(el.dataset.i), 'append'),
  'msg-insert': (el) => { const p = curPaper(); const { text } = splitNotes(p.chat[Number(el.dataset.i)].c); snapshotBlocks(p); const nb = mdToBlocks(text); p.blocks.push(...nb); save(true); renderBlocks(p); toast('Added to notes', 'Undo', applyUndo); },
  'msg-copy': async (el) => { const p = curPaper(); await navigator.clipboard.writeText(p.chat[Number(el.dataset.i)].c.replace(/<\/?notes>/g, '')); toast('Copied'); },
  'ai-check': () => refreshAiStatus(),
  'sync-setup': () => { try { localStorage.removeItem('folio-gate-skip'); } catch (_) {} showGate(); },
  'sync-now': () => syncNow(),
  'sync-off': async () => { if (!(await ask('Turn off sync here?', 'Your library stays on this device and in the cloud.', 'Turn off'))) return; SY = null; syncCK = null; saveSY(); render(); toast('Sync off on this device'); },
  'export-json': async () => {
    const out = { ...S, files: {} };
    for (const p of S.papers) { const t = await paperText(p.id); if (t) out.files[p.id] = t; }
    download(`folio-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(out), 'application/json');
  },
  'export-md': () => download(`folio-notes-${new Date().toISOString().slice(0, 10)}.md`, ['# Papers', ...S.papers.map((p) => `## ${p.title}\n${[authorsShort(p.authors), p.year, p.venue].filter(Boolean).join(' · ')}${p.doi ? `\nhttps://doi.org/${p.doi}` : ''}\n\n${blocksToMd(p.blocks)}`), '# Concepts', ...S.concepts.map((c) => `## ${c.title}\n${[c.field, LEVEL[c.level]?.label].filter(Boolean).join(' · ')}\n\n${blocksToMd(c.blocks)}`)].join('\n\n---\n\n'), 'text/markdown'),
};
function download(name, data, type) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([data], { type })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!e.target.closest('#pop') && !(el && ['blk-menu', 'paper-menu', 'emoji', 'callout-emoji'].includes(el.dataset.act))) { if ($('#pop').classList.contains('open')) closePop(); }
  if (!el) return;
  if (el.tagName === 'A' && el.getAttribute('href')) return;
  if (el.dataset.act === 'go' && (e.target.closest('input, .tag-x, a'))) return;
  e.preventDefault();
  A[el.dataset.act]?.(el, e);
});
document.addEventListener('change', async (e) => {
  if (e.target.id === 'codeIn') { P.code = e.target.value.trim(); savePrefs(); aiState = null; refreshAiStatus(); }
  if (e.target.id === 'setModel') { P.model = e.target.value; savePrefs(); toast('Saved'); }
  if (e.target.id === 'importIn') {
    const f = e.target.files[0]; if (!f) return;
    try {
      const d = JSON.parse(await f.text()); let n = 0;
      for (const p of d.papers || []) { if (paper(p.id)) continue; S.papers.push(normalize({ papers: [p] }).papers[0]); if (d.files?.[p.id]) await filePut(`txt-${p.id}`, d.files[p.id]); n++; }
      for (const c of d.concepts || []) { if (concept(c.id)) continue; S.concepts.push(normalize({ concepts: [c] }).concepts[0]); n++; }
      save(); render(); toast(`Imported ${n} page${n === 1 ? '' : 's'}`);
    } catch (_) { toast('That file isn\'t a Folio backup'); }
  }
});
function closeDrawer() { $('#sidebar').classList.remove('open'); $('#scrim').classList.remove('open'); }

/* ───────── Cloud sync (end-to-end encrypted, via /api/sync + Vercel Blob) ───────── */
const SYNC_KEY = 'folio-sync';
let SY = (() => { try { return JSON.parse(localStorage.getItem(SYNC_KEY)); } catch (_) { return null; } })();
const saveSY = () => { try { if (SY) localStorage.setItem(SYNC_KEY, JSON.stringify(SY)); else localStorage.removeItem(SYNC_KEY); } catch (_) {} };
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const toB64 = (buf) => { let s = ''; new Uint8Array(buf).forEach((b) => { s += String.fromCharCode(b); }); return btoa(s); };
const fromB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
async function syncDerive(pass) {
  const enc = new TextEncoder();
  const id = hex(await crypto.subtle.digest('SHA-256', enc.encode('folio-sync-id:' + pass)));
  const base = await crypto.subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: enc.encode('folio-sync-salt:' + id), iterations: 250000, hash: 'SHA-256' }, base, 256);
  return { id, k: toB64(bits) };
}
let syncCK = null;
const sKey = async () => (syncCK ||= await crypto.subtle.importKey('raw', fromB64(SY.k), 'AES-GCM', false, ['encrypt', 'decrypt']));
async function seal(bytes) { const iv = crypto.getRandomValues(new Uint8Array(12)); const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await sKey(), bytes)); const out = new Uint8Array(12 + ct.length); out.set(iv); out.set(ct, 12); return out; }
async function unseal(buf) { const u = new Uint8Array(buf); return crypto.subtle.decrypt({ name: 'AES-GCM', iv: u.slice(0, 12) }, await sKey(), u.slice(12)); }
async function gz(str) { if (!window.CompressionStream) return new TextEncoder().encode('R' + str); const s = new Blob([str]).stream().pipeThrough(new CompressionStream('gzip')); const b = new Uint8Array(await new Response(s).arrayBuffer()); const o = new Uint8Array(b.length + 1); o[0] = 71; o.set(b, 1); return o; }
async function ungz(buf) { const u = new Uint8Array(buf); if (u[0] === 82) return new TextDecoder().decode(u.slice(1)); const s = new Blob([u.slice(1)]).stream().pipeThrough(new DecompressionStream('gzip')); return new Response(s).text(); }

/* change tracking: every paper gets _u (last change); deletions leave tombstones in S._t */
let seen = null;
const LOCAL_KEYS = ['_u', '_busy', 'opened'];
const itemJSON = (it) => JSON.stringify(it, (k, v) => (LOCAL_KEYS.includes(k) ? undefined : v));
const allDocs = (st = S) => [...(st.papers || []), ...(st.concepts || [])];
function snapshotSeen() { seen = new Map(allDocs().map((p) => [p.id, itemJSON(p)])); }
function initStamps() { S._t ||= {}; allDocs().forEach((p) => { p._u ||= p.updated || p.added || 1; }); const old = Date.now() - 200 * 864e5; for (const [k, t] of Object.entries(S._t)) if (t < old) delete S._t[k]; snapshotSeen(); }
function stampChanges() {
  if (!seen) { initStamps(); return false; }
  const now = Date.now(); let changed = false; const cur = new Set();
  for (const p of allDocs()) { cur.add(p.id); const js = itemJSON(p); if (seen.get(p.id) !== js) { p._u = now; changed = true; seen.set(p.id, js); } }
  for (const id of [...seen.keys()]) if (!cur.has(id)) { S._t[id] = now; seen.delete(id); changed = true; }
  if (changed) { S._at = now; delete S._pristine; }
  return changed;
}
function mergeState(L, R) {
  const tomb = { ...(R._t || {}) }; for (const [id, t] of Object.entries(L._t || {})) tomb[id] = Math.max(tomb[id] || 0, t);
  const col = (name) => {
    const map = new Map(); for (const p of L[name] || []) map.set(p.id, p);
    for (const p of R[name] || []) { const o = map.get(p.id); if (!o) map.set(p.id, p); else if ((p._u || 0) > (o._u || 0)) { const keep = { opened: o.opened, _busy: o._busy }; for (const k of Object.keys(o)) if (!(k in p)) delete o[k]; Object.assign(o, p, keep); } }
    return [...map.values()].filter((p) => !((tomb[p.id] || 0) >= (p._u || 0)));
  };
  return { ...L, papers: col('papers'), concepts: col('concepts'), _t: tomb, _at: Math.max(L._at || 0, R._at || 0), v: Math.max(L.v || 1, R.v || 1) };
}
const strip = (p) => JSON.parse(JSON.stringify(p, (k, v) => (k === '_busy' || k === 'opened' ? undefined : v)));
const syncPayload = () => ({ v: S.v, _t: S._t, _at: S._at || 0, papers: S.papers.map(strip), concepts: S.concepts.map(strip) });
let syncBusy = false, syncAgain = false, pushTimer = null;
function setSyncStatus(st) { if (SY) SY.state = st; const el = $('#syncStatus'); if (el) el.innerHTML = syncStatusText(); const dot = $('#syncDot'); if (dot) dot.className = `brand-sync ${st || ''}`; }
function syncStatusText() {
  if (!SY) return 'Only on this device';
  if (SY.state === 'syncing') return 'Syncing…';
  if (SY.err === 'storage-not-connected') return '⚠️ Cloud storage isn\'t connected yet';
  if (SY.err) return `⚠️ Couldn't sync (${esc(SY.err)}) — will retry`;
  return SY.last ? `Synced ${relTime(SY.last)}` : 'Waiting for first sync';
}
async function syncNow() {
  if (!SY || !navigator.onLine) return;
  if (syncBusy) { syncAgain = true; return; }
  syncBusy = true; setSyncStatus('syncing');
  try {
    const url = `/api/sync?id=${SY.id}`;
    const r = await fetch(url, { cache: 'no-store' });
    let etag = null;
    if (r.status === 503) throw new Error('storage-not-connected');
    if (r.status === 200) {
      etag = r.headers.get('x-folio-etag') || r.headers.get('etag');
      let remote;
      try { remote = JSON.parse(await ungz(await unseal(await r.arrayBuffer()))); } catch (_) { throw new Error('wrong-password'); }
      stampChanges();
      const before = JSON.stringify(allDocs().map(itemJSON));
      if (S._pristine) { S = normalize(remote); initStamps(); }
      else { S = mergeState(S, remote); snapshotSeen(); }
      try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (_) {}
      if (before !== JSON.stringify(allDocs().map(itemJSON))) softRender();
    } else if (r.status !== 404) throw new Error(`HTTP ${r.status}`);
    const body = await seal(await gz(JSON.stringify(syncPayload())));
    const put = await fetch(url, { method: 'PUT', body, headers: etag ? { 'if-match': etag } : {} });
    if (put.status === 412) syncAgain = true;
    else if (put.status === 503) throw new Error('storage-not-connected');
    else if (put.status === 413) throw new Error('library too large');
    else if (!put.ok) throw new Error(`HTTP ${put.status}`);
    await syncFiles();
    SY.last = Date.now(); SY.err = '';
  } catch (e) { SY.err = e.message || String(e); }
  finally {
    syncBusy = false; pushTimer = null; saveSY(); setSyncStatus(SY?.err ? 'error' : 'ok');
    if (syncAgain && SY) { syncAgain = false; setTimeout(syncNow, 800); }
  }
}
function softRender() {
  // don't yank the page out from under someone who is typing
  const a = document.activeElement;
  if (a && (a.isContentEditable || /INPUT|TEXTAREA/.test(a.tagName)) && isDoc()) { renderSidebar(); return; }
  if ($('#modal').classList.contains('open') || ui.aiBusy) { renderSidebar(); return; }
  render();
}
async function syncFiles() {
  SY.up ||= []; SY.big ||= [];
  for (const p of S.papers) {
    if (!p.pdf) continue;
    for (const kind of ['txt', 'pdf']) {
      const k = `${kind}-${p.id}`; const tag = `${k}:${p.pdf.size}`;
      const local = await fileGet(k).catch(() => null);
      if (local && !SY.up.includes(tag) && !SY.big.includes(tag)) {
        const bytes = kind === 'txt' ? await gz(local) : new Uint8Array(await local.arrayBuffer());
        const body = await seal(bytes);
        if (body.byteLength > 4.4 * 1024 * 1024) { SY.big.push(tag); continue; }
        const r = await fetch(`/api/sync?id=${SY.id}&f=${k}`, { method: 'PUT', body });
        if (r.ok) SY.up.push(tag);
      } else if (!local) {
        const r = await fetch(`/api/sync?id=${SY.id}&f=${k}`, { cache: 'no-store' });
        if (!r.ok) continue;
        try {
          const plain = await unseal(await r.arrayBuffer());
          if (kind === 'txt') { const t = await ungz(plain); await filePut(k, t); textCache.set(p.id, t); }
          else await filePut(k, new Blob([plain], { type: 'application/pdf' }));
          SY.up.push(tag);
          if (view.name === 'paper' && view.id === p.id && ui.panel === 'pdf') { $('#panel').dataset.k = ''; renderPanel(); }
        } catch (_) {}
      }
    }
  }
}
function schedulePush() { if (!SY) return; clearTimeout(pushTimer); pushTimer = setTimeout(syncNow, 1500); }
document.addEventListener('visibilitychange', () => { if (!SY) return; if (document.hidden) { if (pushTimer) { clearTimeout(pushTimer); pushTimer = null; syncNow(); } } else syncNow(); });
window.addEventListener('pagehide', () => { if (SY && pushTimer) { clearTimeout(pushTimer); pushTimer = null; syncNow(); } });
window.addEventListener('online', () => SY && syncNow());

/* ───────── Sign-in gate: one Folio password opens the same library everywhere ───────── */
function showGate() {
  let el = $('#gate');
  if (!el) { el = document.createElement('div'); el.id = 'gate'; document.body.appendChild(el); }
  el.innerHTML = `
    <form class="gate-inner" id="gateForm" autocomplete="on">
      <div class="brand-mark">${IC.logo.replace('width="17" height="17"', 'width="30" height="30"')}</div>
      <div class="gate-title">Folio</div>
      <div class="gate-sub">Enter your Folio password.<br/>Use the same one on every device — your library syncs, encrypted.</div>
      <input type="text" name="username" value="folio" autocomplete="username" hidden />
      <input class="gate-in" id="gatePass" name="password" type="password" autocomplete="current-password" placeholder="Folio password" />
      <button class="gate-btn" id="gateGo" type="submit">Open Folio</button>
      <div class="gate-msg" id="gateMsg"></div>
      <button type="button" class="gate-skip" id="gateSkip">Not now — use only on this device</button>
    </form>`;
  setTimeout(() => $('#gatePass')?.focus(), 100);
  $('#gateSkip').onclick = () => hideGate(true);
  $('#gateForm').onsubmit = async (e) => {
    e.preventDefault();
    const pass = $('#gatePass').value; const msg = $('#gateMsg'); const btn = $('#gateGo');
    if (pass.length < 8) { msg.textContent = 'Use at least 8 characters'; return; }
    btn.disabled = true; btn.textContent = 'Opening…'; msg.textContent = '';
    try {
      const ping = await fetch('/api/sync?ping=1', { cache: 'no-store' }).then((r) => r.json()).catch(() => null);
      if (!ping) throw new Error('offline');
      if (!ping.ready) throw new Error('storage-not-connected');
      const keys = await syncDerive(pass);
      const head = await fetch(`/api/sync?id=${keys.id}`, { cache: 'no-store' });
      if (head.status === 404) {
        btn.disabled = false; btn.textContent = 'Open Folio';
        const ok = await ask('No library found for this password', 'Check for a typo. If this is your first time, create a new library with this password — then use exactly the same password on your other devices.', 'Create library');
        if (!ok) { $('#gatePass').focus(); return; }
      } else if (!head.ok) throw new Error(`HTTP ${head.status}`);
      SY = { ...keys, up: [], big: [], last: 0, err: '' }; syncCK = null; saveSY();
      await syncNow();
      if (SY?.err) { const err = SY.err; SY = null; saveSY(); throw new Error(err); }
      hideGate(); toast('Welcome back 📚');
    } catch (err) {
      btn.disabled = false; btn.textContent = 'Open Folio';
      msg.textContent = err.message === 'offline' ? 'Can\'t reach the cloud — check your connection' : err.message === 'storage-not-connected' ? 'Cloud storage isn\'t connected to the site yet' : err.message === 'wrong-password' ? 'Wrong password' : `Couldn't open (${err.message})`;
    }
  };
}
function hideGate(skipped) {
  if (skipped) { try { localStorage.setItem('folio-gate-skip', '1'); } catch (_) {} }
  const el = $('#gate'); if (el) { el.classList.add('out'); setTimeout(() => el.remove(), 250); }
  render();
}

/* keep the title textarea sized when the layout width changes (panel open/close, rotation) */
new ResizeObserver(() => { const t = $('#titleIn'); if (t) autosize(t); }).observe($('#main'));

/* ───────── init ───────── */
initStamps();
view = parseHash();
render();
if (SY) syncNow();
else if (!localStorage.getItem('folio-gate-skip') && location.protocol === 'https:') showGate();
setInterval(() => { if (SY && !document.hidden) syncNow(); }, 60000);
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
