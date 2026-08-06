const MODULES = [
  { tag: 'm1-administrative-information-and-prescribing-information', num: '1', short: 'm1', full: 'Administrative & Prescribing' },
  { tag: 'm2-common-technical-document-summaries', num: '2', short: 'm2', full: 'CTD Summaries' },
  { tag: 'm3-quality', num: '3', short: 'm3', full: 'Quality (CMC)' },
  { tag: 'm4-nonclinical-study-reports', num: '4', short: 'm4', full: 'Nonclinical' },
  { tag: 'm5-clinical-study-reports', num: '5', short: 'm5', full: 'Clinical / BE' },
];

const M1_SECTIONS = [
  { tag: 'm1-0-regional-toc', num: '1.0', label: 'Regional Table of Contents' },
  { tag: 'm1-1-forms', num: '1.1', label: 'Forms' },
  { tag: 'm1-2-cover-letter', num: '1.2', label: 'Cover Letter' },
  { tag: 'm1-3-administrative-information', num: '1.3', label: 'Administrative Information' },
  { tag: 'm1-11-labeling', num: '1.11', label: 'Labeling' },
  { tag: 'm1-14-basis-for-anda-submission', num: '1.14', label: 'Basis for ANDA Submission' },
];

// Section tags that get a distinct semantic icon instead of the generic PDF icon (item 2)
const FORM_SECTION_TAGS = ['m1-1-forms'];
const LABEL_SECTION_TAGS = ['m1-11-labeling'];

function statusClass(status) {
  if (!status) return '';
  if (status.indexOf('final') !== -1) return 'final';
  if (status.indexOf('placeholder') !== -1) return 'placeholder';
  if (status.indexOf('supplementary') !== -1) return 'supplementary';
  return '';
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

// ---------- Semantic icon system (item 2) ----------
function folderIcon(colorVar) {
  return `<svg class="node-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:${colorVar}">
    <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>
  </svg>`;
}

// kind: 'pdf' | 'xml' | 'form' | 'label'
// Same file-glyph base for scan-friendliness, distinct badge text + accent per type.
function fileIcon(kind) {
  const map = {
    xml:   { badge: 'XML', cls: 'xml' },
    form:  { badge: 'FRM', cls: 'form' },
    label: { badge: 'LBL', cls: 'label' },
    pdf:   { badge: 'PDF', cls: 'pdf' },
  };
  const m = map[kind] || map.pdf;

  // Forms get a checklist glyph, labels get a tag glyph, everything else the plain doc glyph.
  let inner;
  if (kind === 'form') {
    inner = `<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/>
      <path d="m9 13 1.5 1.5L13.5 11"/><path d="M9 17h6"/>`;
  } else if (kind === 'label') {
    inner = `<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/>
      <path d="M8.5 12.5h4l2.5 2.5-2.5 2.5h-4z"/>`;
  } else {
    inner = `<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/>
      <path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>`;
  }

  return `<span class="node-icon file-icon">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>
    <span class="ext-badge ${m.cls}">${m.badge}</span>
  </span>`;
}

function makeNode(classNames) {
  const el = document.createElement('div');
  el.className = 'node ' + classNames;
  return el;
}

// Build the raw <leaf> snippet exactly as it exists in index.xml, for the XML inspector.
// NOTE: this repo's simplified backbone does not carry checksum/xlink:href attributes —
// only operation, id, an optional status, <title>, and <xref href>. The inspector mirrors
// the *real* attributes present rather than inventing ones that don't exist in the file.
function buildRawLeafXml(leaf) {
  const id = leaf.getAttribute('id') || '';
  const operation = leaf.getAttribute('operation') || '';
  const status = leaf.getAttribute('status') || '';
  const titleEl = leaf.querySelector('title');
  const xrefEl = leaf.querySelector('xref');
  const title = titleEl ? titleEl.textContent : '';
  const href = xrefEl ? xrefEl.getAttribute('href') : '';

  const attrs = [`operation="${operation}"`, `id="${id}"`];
  if (status) attrs.push(`status="${status}"`);

  const xml = `<leaf ${attrs.join(' ')}>\n  <title>${title}</title>\n  <xref href="${href}"/>\n</leaf>`;
  return escapeHtml(xml);
}

function buildFileNode(leaf, modNum, ancestorPath, kind) {
  const titleEl = leaf.querySelector('title');
  const noteEl = leaf.querySelector('note');
  const xrefEl = leaf.querySelector('xref');
  const title = titleEl ? titleEl.textContent : '(untitled)';
  const note = noteEl ? noteEl.textContent : '';
  const hrefRaw = xrefEl ? xrefEl.getAttribute('href') : null;
  const href = hrefRaw ? ('ectd/0000/' + hrefRaw) : null;
  const status = leaf.getAttribute('status') || '';
  const filename = hrefRaw ? hrefRaw.split('/').pop() : title;
  const cls = statusClass(status);
  const iconKind = kind || 'pdf';

  const node = makeNode('file');
  const row = document.createElement('button');
  row.className = 'node-row';
  row.type = 'button';
  row.title = title + (note ? ' — ' + note : '');
  row.innerHTML = `<span class="node-chevron"></span>${fileIcon(iconKind)}<span class="node-label">${filename}</span>` +
    (cls ? `<span class="status-dot ${cls}"></span>` : '');

  if (href) {
    row.addEventListener('click', () => openFile({
      href, title, note, modNum, rowEl: row,
      ancestorPath: ancestorPath || [], statusCls: cls, iconKind, leaf,
    }));
  } else {
    row.disabled = true;
  }
  node.appendChild(row);
  node.searchText = (title + ' ' + filename).toLowerCase();
  return node;
}

function buildFolderNode(label, subtitle, modNum, childNodes, isModuleLevel, openByDefault, pathId) {
  const classes = ['folder'];
  if (isModuleLevel) classes.push('module-level');
  if (openByDefault) classes.push('open');
  const node = makeNode(classes.join(' '));
  if (pathId) node.dataset.path = pathId;

  const row = document.createElement('button');
  row.className = 'node-row';
  row.type = 'button';
  row.innerHTML = `<span class="node-chevron">\u25B8</span>${folderIcon(`var(--tab-m${modNum})`)}
    <span class="node-label">${label}${subtitle ? `<span class="node-sub">${subtitle}</span>` : ''}</span>
    <span class="node-count">${childNodes.length}</span>`;
  row.addEventListener('click', () => node.classList.toggle('open'));
  node.appendChild(row);

  const children = document.createElement('div');
  children.className = 'node-children';
  childNodes.forEach((c) => children.appendChild(c));
  node.appendChild(children);
  node.searchText = (label + ' ' + (subtitle || '')).toLowerCase();
  return node;
}

// Keeps the currently active leaf's raw XML around so the inspector can be
// opened/closed independently of which document is loaded (item 11).
let currentLeafXml = null;

function openFile({ href, title, note, modNum, rowEl, ancestorPath, statusCls, iconKind, leaf }) {
  const header = document.getElementById('previewHeader');
  const metaBar = document.getElementById('metaBar');
  const body = document.getElementById('previewBody');
  const titleEl = document.getElementById('previewTitle');
  const titleIconEl = document.getElementById('previewTitleIcon');
  const noteEl = document.getElementById('previewNote');
  const pillEl = document.getElementById('previewStatusPill');
  const dot = document.getElementById('previewDot');
  const dl = document.getElementById('previewDownload');

  header.style.display = 'flex';
  metaBar.style.display = 'flex';
  titleEl.textContent = title;
  if (titleIconEl) titleIconEl.innerHTML = fileIcon(iconKind || 'pdf');
  if (noteEl) {
    noteEl.textContent = note || '';
    noteEl.style.display = note ? 'block' : 'none';
  }
  if (pillEl) {
    pillEl.className = 'status-pill' + (statusCls ? ' ' + statusCls : '');
    pillEl.textContent = statusCls ? statusCls.charAt(0).toUpperCase() + statusCls.slice(1) : '';
    pillEl.style.display = statusCls ? 'inline-block' : 'none';
  }
  renderBreadcrumb(ancestorPath || [], title);
  dot.style.background = `var(--tab-m${modNum})`;
  dl.href = href;

  // ---------- Item 4: slim metadata bar ----------
  const modInfo = MODULES.find((m) => m.num === modNum);
  document.getElementById('metaDoc').textContent = title;
  document.getElementById('metaModule').textContent = modInfo ? `${modInfo.short.toUpperCase()} — ${modInfo.full}` : `M${modNum}`;
  document.getElementById('metaCountry').textContent = 'United States (FDA)';
  const operation = leaf ? (leaf.getAttribute('operation') || 'new') : 'new';
  document.getElementById('metaLifecycle').textContent = operation.charAt(0).toUpperCase() + operation.slice(1);
  document.getElementById('metaStatus').textContent = 'XML Parsed \u2713';

  // ---------- Item 11: XML inspector content ----------
  currentLeafXml = leaf ? buildRawLeafXml(leaf) : null;
  refreshXmlInspector();

  // ---------- Item 10: skeleton loader while the PDF swaps in ----------
  body.innerHTML = '<div class="skeleton-loader" aria-hidden="true"><div class="sk-bar"></div><div class="sk-bar short"></div></div>';
  const iframe = document.createElement('iframe');
  iframe.src = href;
  iframe.title = title;
  iframe.style.display = 'none';
  iframe.addEventListener('load', () => {
    const sk = body.querySelector('.skeleton-loader');
    if (sk) sk.remove();
    iframe.style.display = 'block';
  });
  body.appendChild(iframe);

  document.querySelectorAll('.node-row.active').forEach((el) => el.classList.remove('active'));
  if (rowEl) rowEl.classList.add('active');
}

// ---------- Item 11: collapsible XML inspector wiring ----------
function refreshXmlInspector() {
  const codeEl = document.getElementById('xmlInspectorCode');
  if (!codeEl) return;
  codeEl.innerHTML = currentLeafXml || 'Select a document to inspect its backbone.xml entry.';
}

function wireXmlInspector() {
  const toggleBtn = document.getElementById('xmlToggleBtn');
  const closeBtn = document.getElementById('xmlInspectorClose');
  const panel = document.getElementById('xmlInspector');
  if (!toggleBtn || !panel) return;

  function setOpen(open) {
    panel.classList.toggle('open', open);
    panel.setAttribute('aria-hidden', open ? 'false' : 'true');
    toggleBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggleBtn.classList.toggle('active', open);
    if (open) refreshXmlInspector();
  }

  toggleBtn.addEventListener('click', () => setOpen(!panel.classList.contains('open')));
  if (closeBtn) closeBtn.addEventListener('click', () => setOpen(false));
}

// ---------- Breadcrumb + jump-to-node (item 3) ----------
function renderBreadcrumb(ancestorPath, currentTitle) {
  const el = document.getElementById('previewBreadcrumb');
  if (!el) return;
  const parts = [`<button type="button" class="crumb" data-jump="__top">Home</button>`];
  ancestorPath.forEach((p) => {
    parts.push(`<span class="crumb-sep">\u203A</span><button type="button" class="crumb" data-jump="${p.id}">${p.label}</button>`);
  });
  parts.push(`<span class="crumb-sep">\u203A</span><span class="crumb current">${currentTitle}</span>`);
  el.innerHTML = parts.join('');
  el.querySelectorAll('[data-jump]').forEach((btn) => {
    btn.addEventListener('click', () => jumpToNode(btn.getAttribute('data-jump')));
  });
}

function jumpToNode(id) {
  const treePane = document.getElementById('treePane');
  if (id === '__top') { treePane.scrollTo({ top: 0, behavior: 'smooth' }); return; }
  const target = document.querySelector(`[data-path="${id}"]`);
  if (!target) return;
  target.classList.add('open');
  let p = target.parentElement;
  while (p && p !== treePane) {
    if (p.classList && p.classList.contains('node')) p.classList.add('open');
    p = p.parentElement;
  }
  target.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ---------- Sticky sidebar status (item 8) ----------
function setSidebarStatus(ok, msg) {
  const el = document.getElementById('sidebarStatus');
  if (!el) return;
  el.classList.toggle('error', !ok);
  el.innerHTML = `<span class="dot"></span>${msg}`;
}

// ---------- Root backbone-file row (item 1) ----------
// Only one root row: this repo has a single real backbone file (ectd/0000/index.xml).
// No separate backbone.xml exists in this project, so one isn't fabricated here.
function buildRootXmlNode() {
  const node = makeNode('file root-xml');
  const row = document.createElement('button');
  row.className = 'node-row';
  row.type = 'button';
  row.title = 'ectd/0000/index.xml — the backbone file this tree is parsed from';
  row.innerHTML = `<span class="node-chevron"></span>${fileIcon('xml')}<span class="node-label">index.xml</span>`;
  row.addEventListener('click', () => window.open('ectd/0000/index.xml', '_blank'));
  node.appendChild(row);
  node.searchText = 'index.xml backbone';
  return node;
}

function wireFilter() {
  const input = document.getElementById('treeFilter');
  const treeList = document.getElementById('treeList');
  if (!input) return;

  function apply(el, q) {
    if (!el.classList || !el.classList.contains('node')) return true;
    if (el.classList.contains('file')) {
      const match = !q || (el.searchText || '').indexOf(q) !== -1;
      el.style.display = match ? '' : 'none';
      return match;
    }
    const childrenWrap = el.querySelector(':scope > .node-children');
    let childMatch = false;
    if (childrenWrap) {
      Array.from(childrenWrap.children).forEach((child) => {
        if (apply(child, q)) childMatch = true;
      });
    }
    const selfMatch = q ? (el.searchText || '').indexOf(q) !== -1 : true;
    const visible = !q || childMatch || selfMatch;
    el.style.display = visible ? '' : 'none';
    if (q && visible) el.classList.add('open');
    return visible;
  }

  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    Array.from(treeList.children).forEach((topNode) => {
      if (topNode.classList.contains('node')) apply(topNode, q);
    });
  });
}

async function loadTree() {
  const treeList = document.getElementById('treeList');
  try {
    const res = await fetch('ectd/0000/index.xml');
    if (!res.ok) throw new Error('index.xml not found (HTTP ' + res.status + ')');
    const text = await res.text();
    const xml = new DOMParser().parseFromString(text, 'application/xml');
    if (xml.querySelector('parsererror')) throw new Error('XML parse error in index.xml');

    treeList.innerHTML = '';
    treeList.appendChild(buildRootXmlNode());

    for (const mod of MODULES) {
      const modEl = xml.querySelector(mod.tag);
      const modPathId = 'm' + mod.num;
      let childNodes = [];

      if (mod.num === '1' && modEl) {
        for (const sec of M1_SECTIONS) {
          const secEl = modEl.querySelector(sec.tag);
          const secPathId = modPathId + '__' + sec.num.replace(/\./g, '-');
          const leaves = secEl ? Array.from(secEl.querySelectorAll('leaf')) : [];
          const ancestorPath = [
            { id: modPathId, label: mod.short },
            { id: secPathId, label: sec.num },
          ];
          const kind = FORM_SECTION_TAGS.includes(sec.tag) ? 'form'
            : LABEL_SECTION_TAGS.includes(sec.tag) ? 'label'
            : 'pdf';
          const fileNodes = leaves.map((leaf) => buildFileNode(leaf, mod.num, ancestorPath, kind));
          childNodes.push(buildFolderNode(sec.num, sec.label, mod.num, fileNodes, false, true, secPathId));
        }
      } else if (modEl) {
        const leaves = Array.from(modEl.querySelectorAll('leaf'));
        const ancestorPath = [{ id: modPathId, label: mod.short }];
        if (leaves.length) {
          childNodes = leaves.map((leaf) => buildFileNode(leaf, mod.num, ancestorPath, 'pdf'));
        } else {
          const p = document.createElement('div');
          p.className = 'node-empty';
          p.textContent = 'No documents in this module.';
          childNodes = [p];
        }
      }

      const totalDocs = modEl ? modEl.querySelectorAll('leaf').length : 0;
      const modNode = buildFolderNode(mod.short, mod.full, mod.num, childNodes, true, mod.num === '1', modPathId);
      const countEl = modNode.querySelector(':scope > .node-row .node-count');
      if (countEl) countEl.textContent = totalDocs;
      treeList.appendChild(modNode);
    }

    const legend = document.createElement('div');
    legend.className = 'tree-legend';
    legend.innerHTML = `
      <span><span class="status-dot final"></span>Final</span>
      <span><span class="status-dot placeholder"></span>Placeholder</span>
      <span><span class="status-dot supplementary"></span>Supplementary</span>`;
    treeList.appendChild(legend);

    wireFilter();
    wireXmlInspector();
    setSidebarStatus(true, 'XML Parsed Successfully · Live from index.xml · Sequence 0000');
  } catch (err) {
    treeList.innerHTML = '<p class="error-msg">Could not load index.xml: ' + err.message +
      '.<br><br>If you\u2019re opening this file directly from disk (file://), browsers block XML ' +
      'fetches for security — serve the folder over http(s) instead (e.g. GitHub Pages, or ' +
      '<code>python3 -m http.server</code> locally).</p>';
    setSidebarStatus(false, 'XML parse failed — see error above');
  }
}

loadTree();
