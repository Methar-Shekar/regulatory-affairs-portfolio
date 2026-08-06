const MODULES = [
  { tag: 'm1-administrative-information-and-prescribing-information', num: '1', name: 'Module 1 — Administrative & Prescribing' },
  { tag: 'm2-common-technical-document-summaries', num: '2', name: 'Module 2 — CTD Summaries' },
  { tag: 'm3-quality', num: '3', name: 'Module 3 — Quality (CMC)' },
  { tag: 'm4-nonclinical-study-reports', num: '4', name: 'Module 4 — Nonclinical' },
  { tag: 'm5-clinical-study-reports', num: '5', name: 'Module 5 — Clinical / BE' },
];

function badgeClass(status) {
  if (!status) return '';
  if (status.indexOf('final') !== -1) return 'final';
  if (status.indexOf('placeholder') !== -1) return 'placeholder';
  if (status.indexOf('supplementary') !== -1) return 'supplementary';
  return '';
}

function openFile(href, title, note, modNum) {
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

  document.querySelectorAll('.file-item').forEach((el) => el.classList.remove('active'));
  const activeEl = document.querySelector(`.file-item[data-href="${href}"]`);
  if (activeEl) activeEl.classList.add('active');
}

function wireFilter() {
  const input = document.getElementById('treeFilter');
  if (!input) return;
  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    document.querySelectorAll('.mod-group').forEach((group) => {
      let anyVisible = false;
      group.querySelectorAll('.file-item').forEach((item) => {
        const match = !q || item.textContent.toLowerCase().indexOf(q) !== -1;
        item.style.display = match ? '' : 'none';
        if (match) anyVisible = true;
      });
      if (q) {
        group.classList.toggle('open', anyVisible);
        group.style.display = anyVisible ? '' : 'none';
      } else {
        group.style.display = '';
      }
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
    let firstFileHref = null;

    for (const mod of MODULES) {
      const modEl = xml.querySelector(mod.tag);
      const leaves = modEl ? Array.from(modEl.querySelectorAll('leaf')) : [];

      const group = document.createElement('div');
      group.className = 'mod-group open';
      group.style.borderLeft = `3px solid var(--tab-m${mod.num})`;

      const header = document.createElement('button');
      header.className = 'mod-header';
      header.type = 'button';
      header.innerHTML = `<span class="mod-dot" style="background:var(--tab-m${mod.num})"></span>
        <span class="mname">${mod.name}</span>
        <span class="mcount">${leaves.length}</span>
        <span class="chev">▸</span>`;
      header.addEventListener('click', () => group.classList.toggle('open'));
      group.appendChild(header);

      const fileList = document.createElement('div');
      fileList.className = 'mod-files';

      if (leaves.length === 0) {
        const p = document.createElement('p');
        p.style.cssText = 'font-size:12px;color:var(--ink-faint);padding:6px 10px;';
        p.textContent = 'No documents in this module.';
        fileList.appendChild(p);
      } else {
        for (const leaf of leaves) {
          const titleEl = leaf.querySelector('title');
          const noteEl = leaf.querySelector('note');
          const xrefEl = leaf.querySelector('xref');
          const title = titleEl ? titleEl.textContent : '(untitled)';
          const note = noteEl ? noteEl.textContent : '';
          const hrefRaw = xrefEl ? xrefEl.getAttribute('href') : null;
          const href = hrefRaw ? ('ectd/0000/' + hrefRaw) : null;
          const status = leaf.getAttribute('status') || (modEl && modEl.getAttribute('status')) || '';

          const btn = document.createElement('button');
          btn.className = 'file-item';
          btn.type = 'button';
          btn.style.borderLeft = `2px solid var(--tab-m${mod.num})`;
          if (href) btn.setAttribute('data-href', href);

          const cls = badgeClass(status);
          btn.innerHTML = title + (cls ? `<span class="file-badge">${cls}</span>` : '');

          if (href) {
            btn.addEventListener('click', () => openFile(href, title, note, mod.num));
            if (!firstFileHref) { firstFileHref = href; }
          } else {
            btn.disabled = true;
          }
          fileList.appendChild(btn);
        }
      }
      group.appendChild(fileList);
      treeList.appendChild(group);
    }

    wireFilter();
  } catch (err) {
    treeList.innerHTML = '<p class="error-msg">Could not load index.xml: ' + err.message +
      '.<br><br>If you\u2019re opening this file directly from disk (file://), browsers block XML ' +
      'fetches for security — serve the folder over http(s) instead (e.g. GitHub Pages, or ' +
      '<code>python3 -m http.server</code> locally).</p>';
  }
}

loadTree();
