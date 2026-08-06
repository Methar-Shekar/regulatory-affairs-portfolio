const MODULES = [
  { tag: 'm1-administrative-information-and-prescribing-information', num: '1', short: 'm1', full: 'Administrative & Prescribing' },
  { tag: 'm2-common-technical-document-summaries', num: '2', short: 'm2', full: 'CTD Summaries' },
  { tag: 'm3-quality', num: '3', short: 'm3', full: 'Quality (CMC)' },
  { tag: 'm4-nonclinical-study-reports', num: '4', short: 'm4', full: 'Nonclinical' },
  { tag: 'm5-clinical-study-reports', num: '5', short: 'm5', full: 'Clinical / BE' },
];

// Only Module 1's backbone nests documents inside section-level elements
// (1.0, 1.1, 1.2 ...). Modules 2-5 hold <leaf> elements directly.
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

function folderIcon(colorVar) {
  return `<svg class="node-icon" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
    <path d="M2 5.5C2 4.67 2.67 4 3.5 4H7.7L9.2 5.6H16.5C17.33 5.6 18 6.27 18 7.1V14.5C18 15.33 17.33 16 16.5 16H3.5C2.67 16 2 15.33 2 14.5V5.5Z" fill="${colorVar}"/>
  </svg>`;
}

function fileIcon() {
  return `<svg class="node-icon" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
    <path d="M5 2.2C5 1.8 5.3 1.5 5.7 1.5H11.4L15 5.2V17.3C15 17.7 14.7 18 14.3 18H5.7C5.3 18 5 17.7 5 17.3V2.2Z" fill="var(--stamp)"/>
    <path d="M11.4 1.5L15 5.2H12.1C11.7 5.2 11.4 4.9 11.4 4.5V1.5Z" fill="#5F241C"/>
  </svg>`;
}

function makeNode(classNames) {
  const el = document.createElement('div');
  el.className = 'node ' + classNames;
  return el;
}

function buildFileNode(leaf, modNum) {
  const titleEl = leaf.querySelector('title');
  const noteEl = leaf.querySelector('note');
  const xrefEl = leaf.querySelector('xref');
  const title = titleEl ? titleEl.textContent : '(untitled)';
  const note = noteEl ? noteEl.textContent : '';
  const hrefRaw = xrefEl ? xrefEl.getAttribute('href') : null;
  const href = hrefRaw ? ('ectd/0000/' + hrefRaw) : null;
  const status = leaf.getAttribute('status') || '';
  const filename = hrefRaw ? hrefRaw.split('/').pop() : title;

  const node = makeNode('file');
  const row = document.createElement('button');
  row.className = 'node-row';
  row.type = 'button';
  row.title = title + (note ? ' — ' + note : '');
  const cls = statusClass(status);
  row.innerHTML = `<span class="node-chevron"></span>${fileIcon()}<span class="node-label">${filename}</span>` +
    (cls ? `<span class="status-dot ${cls}"></span>` : '');

  if (href) {
    row.addEventListener('click', () => openFile(href, title, note, modNum, row));
  } else {
    row.disabled = true;
  }
  node.appendChild(row);
  node.searchText = (title + ' ' + filename).toLowerCase();
  return node;
}

function buildFolderNode(label, subtitle, modNum, childNodes, isModuleLevel, openByDefault) {
  const classes = ['folder'];
  if (isModuleLevel) classes.push('module-level');
  if (openByDefault) classes.push('open');
  const node = makeNode(classes.join(' '));

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

function openFile(href, title, note, modNum, rowEl) {
  const header = document.getElementById('previewHeader');
  const body = document.getElementById('previewBody');
  const titleEl = document.getElementById('previewTitle');
  const noteEl = document.getElementById('previewNote');
  const dot = document.getElementById('previewDot');
  const dl = document.getElementById('previewDownload');

  header.style.display = 'flex';
  titleEl.textContent = title;
  if (noteEl) {
    noteEl.textContent = note || '';
    noteEl.style.display = note ? 'block' : 'none';
  }
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

    for (const mod of MODULES) {
      const modEl = xml.querySelector(mod.tag);
      let childNodes = [];

      if (mod.num === '1' && modEl) {
        for (const sec of M1_SECTIONS) {
          const secEl = modEl.querySelector(sec.tag);
          const leaves = secEl ? Array.from(secEl.querySelectorAll('leaf')) : [];
          const fileNodes = leaves.map((leaf) => buildFileNode(leaf, mod.num));
          childNodes.push(buildFolderNode(sec.num, sec.label, mod.num, fileNodes, false, true));
        }
      } else if (modEl) {
        const leaves = Array.from(modEl.querySelectorAll('leaf'));
        if (leaves.length) {
          childNodes = leaves.map((leaf) => buildFileNode(leaf, mod.num));
        } else {
          const p = document.createElement('div');
          p.className = 'node-empty';
          p.textContent = 'No documents in this module.';
          childNodes = [p];
        }
      }

      const totalDocs = modEl ? modEl.querySelectorAll('leaf').length : 0;
      const modNode = buildFolderNode(mod.short, mod.full, mod.num, childNodes, true, mod.num === '1');
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
  } catch (err) {
    treeList.innerHTML = '<p class="error-msg">Could not load index.xml: ' + err.message +
      '.<br><br>If you\u2019re opening this file directly from disk (file://), browsers block XML ' +
      'fetches for security — serve the folder over http(s) instead (e.g. GitHub Pages, or ' +
      '<code>python3 -m http.server</code> locally).</p>';
  }
}

loadTree();
