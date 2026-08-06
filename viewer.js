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

const FORM_SECTION_TAGS = ['m1-1-forms'];
const LABEL_SECTION_TAGS = ['m1-11-labeling'];

// Kept around so the "Home" breadcrumb crumb can reset the preview pane
// back to the dashboard without re-fetching/re-parsing the XML.
let lastXmlDoc = null;
let currentLeafXml = null;   // escaped, for display
let currentLeafXmlRaw = null; // unescaped, for the Copy button
let currentProps = null;

function statusClass(status) {
  if (!status) return 'final'; // untagged leaves default to Final, not blank (item from prior review)
  if (status.indexOf('final') !== -1) return 'final';
  if (status.indexOf('placeholder') !== -1) return 'placeholder';
  if (status.indexOf('supplementary') !== -1) return 'supplementary';
  return 'final';
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function formatBytes(n) {
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
  return (n / 1024 / 1024).toFixed(2) + ' MB';
}

// ---------- Semantic icon system ----------
function folderIcon(colorVar) {
  return `<svg class="node-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:${colorVar}">
    <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>
  </svg>`;
}

function fileIcon(kind) {
  const map = {
    xml:   { badge: 'XML', cls: 'xml' },
    form:  { badge: 'FRM', cls: 'form' },
    label: { badge: 'LBL', cls: 'label' },
    pdf:   { badge: 'PDF', cls: 'pdf' },
  };
  const m = map[kind] || map.pdf;
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

// Mirrors the real <leaf> attributes present in index.xml — operation, id,
// optional status, <title>, <xref href>. No checksum/xlink attributes are
// added because this backbone genuinely doesn't carry them.
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

  return `<leaf ${attrs.join(' ')}>\n  <title>${title}</title>\n  <xref href="${href}"/>\n</leaf>`;
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
  row.innerHTML = `<span class="node-chevron"></span>${fileIcon(iconKind)}<span class="node-label" data-raw="${escapeHtml(filename)}">${escapeHtml(filename)}</span>` +
    `<span class="status-dot ${cls}"></span>`;

  if (href) {
    row.addEventListener('click', () => openFile({
      href, title, note, modNum, rowEl: row,
      ancestorPath: ancestorPath || [], statusCls: cls, iconKind, leaf, hrefRaw,
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

// ---------- Dashboard (item 2) ----------
// Everything here comes from the parsed <admin> block and live leaf counts —
// nothing hardcoded.
function renderDashboard(xml) {
  const body = document.getElementById('previewBody');
  if (!body || !xml) return;

  const admin = xml.querySelector('admin');
  const applicant = admin?.querySelector('applicant')?.textContent || '—';
  const productName = admin?.querySelector('product-name')?.textContent || '—';
  const submissionType = admin?.querySelector('submission-type')?.textContent || '—';
  const ectdEl = xml.querySelector('ectd');
  const sequence = ectdEl ? (ectdEl.getAttribute('sequence') || '—') : '—';

  const allLeaves = Array.from(xml.querySelectorAll('leaf'));
  const pdfCount = allLeaves.length;
  const xmlCount = 1; // index.xml itself — no other XML files exist in this backbone
  const totalCount = pdfCount + xmlCount;

  const moduleRows = MODULES.map((mod) => {
    const modEl = xml.querySelector(mod.tag);
    const count = modEl ? modEl.querySelectorAll('leaf').length : 0;
    return `<div class="dmod-row">
      <span class="dmod-name">${mod.short.toUpperCase()} — ${mod.full}</span>
      <span>${count} doc${count === 1 ? '' : 's'} <span class="dmod-check ${count === 0 ? 'empty' : ''}">${count > 0 ? '\u2713' : '\u2014'}</span></span>
    </div>`;
  }).join('');

  body.innerHTML = `
    <div class="dashboard">
      <div class="dashboard-head">
        <h3>${escapeHtml(productName)}</h3>
        <p>${escapeHtml(applicant)} &middot; ${escapeHtml(submissionType)} &middot; Sequence ${escapeHtml(sequence)}</p>
      </div>
      <div class="dashboard-stats">
        <div class="dstat"><div class="dnum">${totalCount}</div><div class="dlabel">Total Files</div></div>
        <div class="dstat"><div class="dnum">${xmlCount}</div><div class="dlabel">XML</div></div>
        <div class="dstat"><div class="dnum">${pdfCount}</div><div class="dlabel">PDF</div></div>
      </div>
      <div class="dashboard-modules">${moduleRows}</div>
      <p class="dashboard-hint">No document selected. Select a document from the XML Explorer on the left. XML Parsed Successfully.</p>
    </div>`;
}

function resetPreviewToDashboard() {
  document.getElementById('previewHeader').style.display = 'none';
  document.getElementById('metaBar').style.display = 'none';
  document.querySelectorAll('.node-row.active').forEach((el) => el.classList.remove('active'));
  setDetailsPanelOpen(false);
  renderDashboard(lastXmlDoc);
}

// ---------- Main document open ----------
function openFile({ href, title, note, modNum, rowEl, ancestorPath, statusCls, iconKind, leaf, hrefRaw }) {
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
    pillEl.textContent = statusCls.charAt(0).toUpperCase() + statusCls.slice(1);
    pillEl.style.display = 'inline-block';
  }
  renderBreadcrumb(ancestorPath || [], title);
  dot.style.background = `var(--tab-m${modNum})`;
  dl.href = href;

  // ---------- Metadata bar ----------
  const modInfo = MODULES.find((m) => m.num === modNum);
  document.getElementById('metaRegion').textContent = 'US';
  document.getElementById('metaSubmission').textContent = 'ANDA';
  document.getElementById('metaModule').textContent = modInfo ? modInfo.short.toUpperCase() : `M${modNum}`;
  const operation = leaf ? (leaf.getAttribute('operation') || 'new') : 'new';
  document.getElementById('metaLifecycle').textContent = operation.charAt(0).toUpperCase() + operation.slice(1);
  const seq = lastXmlDoc?.querySelector('ectd')?.getAttribute('sequence') || '—';
  document.getElementById('metaSequence').textContent = seq;
  document.getElementById('metaStatus').textContent = 'XML Parsed \u2713';

  // ---------- Details panel: XML tab ----------
  currentLeafXmlRaw = leaf ? buildRawLeafXml(leaf) : null;
  currentLeafXml = currentLeafXmlRaw ? escapeHtml(currentLeafXmlRaw) : null;
  refreshXmlTab();

  // ---------- Details panel: Properties tab ----------
  currentProps = {
    filename: hrefRaw ? hrefRaw.split('/').pop() : title,
    module: modInfo ? `${modInfo.short.toUpperCase()} — ${modInfo.full}` : `M${modNum}`,
    leafId: leaf ? (leaf.getAttribute('id') || '—') : '—',
    operation: operation,
    path: hrefRaw || '—',
    href,
  };
  refreshPropsTab();

  // ---------- Skeleton loader while the PDF swaps in ----------
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

// ---------- Details panel: tabs, XML, Properties, Copy ----------
function refreshXmlTab() {
  const codeEl = document.getElementById('xmlInspectorCode');
  if (!codeEl) return;
  codeEl.innerHTML = currentLeafXml || 'Select a document to inspect its backbone.xml entry.';
}

function refreshPropsTab() {
  if (!currentProps) return;
  document.getElementById('propFilename').textContent = currentProps.filename;
  document.getElementById('propModule').textContent = currentProps.module;
  document.getElementById('propLeafId').textContent = currentProps.leafId;
  document.getElementById('propOperation').textContent = currentProps.operation;
  document.getElementById('propPath').textContent = currentProps.path;

  // File size fetched on demand (real HEAD request), not fabricated.
  const sizeEl = document.getElementById('propFileSize');
  sizeEl.textContent = 'Checking…';
  fetch(currentProps.href, { method: 'HEAD' })
    .then((res) => {
      const len = res.headers.get('content-length');
      sizeEl.textContent = len ? formatBytes(parseInt(len, 10)) : 'Unavailable';
    })
    .catch(() => { sizeEl.textContent = 'Unavailable'; });
}

function setDetailsPanelOpen(open) {
  const panel = document.getElementById('detailsPanel');
  const toggleBtn = document.getElementById('detailsToggleBtn');
  if (!panel || !toggleBtn) return;
  panel.classList.toggle('open', open);
  panel.setAttribute('aria-hidden', open ? 'false' : 'true');
  toggleBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  toggleBtn.classList.toggle('active', open);
}

function wireDetailsPanel() {
  const toggleBtn = document.getElementById('detailsToggleBtn');
  const closeBtn = document.getElementById('detailsPanelClose');
  const panel = document.getElementById('detailsPanel');
  const copyBtn = document.getElementById('copyXmlBtn');
  const tabBtns = document.querySelectorAll('.panel-tab');
  if (!toggleBtn || !panel) return;

  toggleBtn.addEventListener('click', () => setDetailsPanelOpen(!panel.classList.contains('open')));
  if (closeBtn) closeBtn.addEventListener('click', () => setDetailsPanelOpen(false));

  tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-tab');
      document.querySelectorAll('.panel-tab').forEach((b) => b.classList.toggle('active', b === btn));
      document.querySelectorAll('.panel-tab-content').forEach((c) => {
        c.classList.toggle('active', c.getAttribute('data-tab-content') === target);
      });
    });
  });

  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      if (!currentLeafXmlRaw) return;
      navigator.clipboard.writeText(currentLeafXmlRaw).then(() => {
        const original = copyBtn.textContent;
        copyBtn.textContent = 'Copied!';
        setTimeout(() => { copyBtn.textContent = original; }, 1400);
      });
    });
  }
}

// ---------- Breadcrumb ----------
// "Home" now also resets the preview pane to the dashboard, not just scrolls.
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
  if (id === '__top') {
    treePane.scrollTo({ top: 0, behavior: 'smooth' });
    resetPreviewToDashboard();
    return;
  }
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

// ---------- Sticky sidebar status ----------
function setSidebarStatus(ok, msg) {
  const el = document.getElementById('sidebarStatus');
  if (!el) return;
  el.classList.toggle('error', !ok);
  el.innerHTML = `<span class="dot"></span>${msg}`;
}

// ---------- Validation widget (item 3) ----------
// Real checks: parses status, structure presence, live HEAD requests against
// every PDF, lifecycle-attribute presence, sequence-attribute presence.
async function computeAndRenderValidation(xml, allHrefs) {
  const widget = document.getElementById('validationWidget');
  if (!widget) return;

  const checks = [];
  checks.push({ label: 'XML Parsed', ok: true });

  const structureOk = MODULES.every((m) => !!xml.querySelector(m.tag));
  checks.push({ label: 'XML Structure Valid', ok: structureOk });

  let brokenCount = 0;
  try {
    const results = await Promise.allSettled(allHrefs.map((href) => fetch(href, { method: 'HEAD' })));
    brokenCount = results.filter((r) => r.status !== 'fulfilled' || !r.value.ok).length;
  } catch (e) {
    brokenCount = allHrefs.length; // couldn't check — report honestly, don't claim success
  }
  checks.push({
    label: `PDF Linked (${allHrefs.length - brokenCount}/${allHrefs.length})`,
    ok: brokenCount === 0,
  });

  const leaves = Array.from(xml.querySelectorAll('leaf'));
  const lifecycleOk = leaves.length > 0 && leaves.every((l) => !!l.getAttribute('operation'));
  checks.push({ label: 'Lifecycle Valid', ok: lifecycleOk });

  const seq = xml.querySelector('ectd')?.getAttribute('sequence') || '';
  checks.push({ label: `Sequence Ready (${seq || '\u2014'})`, ok: !!seq });

  widget.innerHTML = `<p class="v-title">Validation Status</p>` + checks.map((c) =>
    `<span class="v-check ${c.ok ? 'ok' : 'fail'}"><span class="v-dot"></span>${c.label}</span>`
  ).join('');
}

// ---------- Root backbone-file row ----------
// Only one root row: this repo has a single real backbone file (ectd/0000/index.xml).
// No backbone.xml or util/ folder exist in this project, so they aren't shown as
// clickable nodes — that would just be a dead link dressed up as structure.
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

// ---------- Search: filter, auto-expand, highlight, result count ----------
function highlightText(text, q) {
  if (!q) return escapeHtml(text);
  const idx = text.toLowerCase().indexOf(q);
  if (idx === -1) return escapeHtml(text);
  return escapeHtml(text.slice(0, idx)) + '<mark>' + escapeHtml(text.slice(idx, idx + q.length)) + '</mark>' + escapeHtml(text.slice(idx + q.length));
}

function wireFilter() {
  const input = document.getElementById('treeFilter');
  const treeList = document.getElementById('treeList');
  const countEl = document.getElementById('searchResultCount');
  if (!input) return;

  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    let matchCount = 0;

    function apply(el) {
      if (!el.classList || !el.classList.contains('node')) return true;
      if (el.classList.contains('file')) {
        const match = !q || (el.searchText || '').indexOf(q) !== -1;
        el.style.display = match ? '' : 'none';
        const labelEl = el.querySelector('.node-label[data-raw]');
        if (labelEl) labelEl.innerHTML = highlightText(labelEl.getAttribute('data-raw'), q);
        if (match && q) matchCount++;
        return match;
      }
      const childrenWrap = el.querySelector(':scope > .node-children');
      let childMatch = false;
      if (childrenWrap) {
        Array.from(childrenWrap.children).forEach((child) => {
          if (apply(child)) childMatch = true;
        });
      }
      const selfMatch = q ? (el.searchText || '').indexOf(q) !== -1 : true;
      const visible = !q || childMatch || selfMatch;
      el.style.display = visible ? '' : 'none';
      if (q && visible) el.classList.add('open');
      return visible;
    }

    Array.from(treeList.children).forEach((topNode) => {
      if (topNode.classList.contains('node')) apply(topNode);
    });

    if (countEl) {
      if (q) {
        countEl.textContent = `${matchCount} result${matchCount === 1 ? '' : 's'} found`;
        countEl.style.display = 'block';
      } else {
        countEl.textContent = '';
        countEl.style.display = 'none';
      }
    }
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
    lastXmlDoc = xml;

    treeList.innerHTML = '';
    treeList.appendChild(buildRootXmlNode());

    const allHrefs = [];

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
          leaves.forEach((leaf) => {
            const href = leaf.querySelector('xref')?.getAttribute('href');
            if (href) allHrefs.push('ectd/0000/' + href);
          });
          childNodes.push(buildFolderNode(sec.num, sec.label, mod.num, fileNodes, false, true, secPathId));
        }
      } else if (modEl) {
        const leaves = Array.from(modEl.querySelectorAll('leaf'));
        const ancestorPath = [{ id: modPathId, label: mod.short }];
        if (leaves.length) {
          childNodes = leaves.map((leaf) => buildFileNode(leaf, mod.num, ancestorPath, 'pdf'));
          leaves.forEach((leaf) => {
            const href = leaf.querySelector('xref')?.getAttribute('href');
            if (href) allHrefs.push('ectd/0000/' + href);
          });
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
    wireDetailsPanel();
    renderDashboard(xml);
    setSidebarStatus(true, 'XML Parsed Successfully · Live from index.xml · Sequence 0000');

    // Validation checks run after first paint so they don't block the tree from appearing.
    computeAndRenderValidation(xml, allHrefs);
  } catch (err) {
    treeList.innerHTML = '<p class="error-msg">Could not load index.xml: ' + err.message +
      '.<br><br>If you\u2019re opening this file directly from disk (file://), browsers block XML ' +
      'fetches for security — serve the folder over http(s) instead (e.g. GitHub Pages, or ' +
      '<code>python3 -m http.server</code> locally).</p>';
    setSidebarStatus(false, 'XML parse failed — see error above');
  }
}

loadTree();
