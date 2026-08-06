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

function statusClass(status) {
  if (!status) return '';
  if (status.indexOf('final') !== -1) return 'final';
  if (status.indexOf('placeholder') !== -1) return 'placeholder';
  if (status.indexOf('supplementary') !== -1) return 'supplementary';
  return '';
}

// ---------- 3. Semantic icons (outline style) ----------
function folderIcon(colorVar) {
  return `<svg class="node-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:${colorVar}">
    <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>
  </svg>`;
}

function fileIcon(kind) {
  const badgeClass = kind === 'xml' ? 'xml' : 'pdf';
  const label = kind === 'xml' ? 'XML' : 'PDF';
  return `<span class="node-icon file-icon">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/>
      <path d="M14 2v4a2 2 0 0 0 2 2h4"/>
      <path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>
    </svg>
    <span class="ext-badge ${badgeClass}">${label}</span>
  </span>`;
}

function makeNode(classNames) {
  const el = document.createElement('div');
  el.className = 'node ' + classNames;
  return el;
}

function buildFileNode(leaf, modNum, ancestorPath) {
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

  const node = makeNode('file');
  const row = document.createElement('button');
  row.className = 'node-row';
  row.type = 'button';
  row.title = title + (note ? ' — ' + note : '');
  row.innerHTML = `<span class="node-chevron"></span>${fileIcon('pdf')}<span class="node-label">${filename}</span>` +
    (cls ? `<span class="status-dot ${cls}"></span>` : '');

  if (href) {
    row.addEventListener('click', () => openFile(href, title, note, modNum, row, ancestorPath || [], cls));
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
  if (pathId) node.dataset.path = pathId; // NEW: breadcrumb jump target (item 4)

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

function openFile(href, title, note, modNum, rowEl, ancestorPath, statusCls) {
  const header = document.getElementById('previewHeader');
  const body = document.getElementById('previewBody');
  const titleEl = document.getElementById('previewTitle');
  const noteEl = document.getElementById('previewNote');
  const pillEl = document.getElementById('previewStatusPill');
  const dot = document.getElementById('previewDot');
  const dl = document.getElementById('previewDownload');

  header.style.display = 'flex';
  titleEl.textContent = title;
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

  body.innerHTML = '';
  const iframe = document.createElement('iframe');
  iframe.src = href;
  iframe.title = title;
  body.appendChild(iframe);

  document.querySelectorAll('.node-row.active').forEach((el) => el.classList.remove('active'));
  if (rowEl) rowEl.classList.add('active');
}

// ---------- 4. Breadcrumb + jump-to-node (additive, new) ----------
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

// ---------- 10. Sticky sidebar status (additive, new) ----------
function setSidebarStatus(ok, msg) {
  const el = document.getElementById('sidebarStatus');
  if (!el) return;
  el.classList.toggle('error', !ok);
  el.innerHTML = `<span class="dot"></span>${msg}`;
}

// ---------- 1. Decorative root backbone-file row (additive, new) ----------
// Only one root row: this repo has a single real backbone file
// (ectd/0000/index.xml). No separate backbone.xml exists, so one isn't shown.
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
          const fileNodes = leaves.map((leaf) => buildFileNode(leaf, mod.num, ancestorPath));
          childNodes.push(buildFolderNode(sec.num, sec.label, mod.num, fileNodes, false, true, secPathId));
        }
      } else if (modEl) {
        const leaves = Array.from(modEl.querySelectorAll('leaf'));
        const ancestorPath = [{ id: modPathId, label: mod.short }];
        if (leaves.length) {
          childNodes = leaves.map((leaf) => buildFileNode(leaf, mod.num, ancestorPath));
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
    setSidebarStatus(true, 'XML Parsed Successfully · Live from index.xml');
  } catch (err) {
    treeList.innerHTML = '<p class="error-msg">Could not load index.xml: ' + err.message +
      '.<br><br>If you\u2019re opening this file directly from disk (file://), browsers block XML ' +
      'fetches for security — serve the folder over http(s) instead (e.g. GitHub Pages, or ' +
      '<code>python3 -m http.server</code> locally).</p>';
    setSidebarStatus(false, 'XML parse failed — see error above');
  }
}

loadTree();
