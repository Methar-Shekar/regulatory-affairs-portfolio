const MODULES = [
  { tag: 'm1-administrative-information-and-prescribing-information', num: '1', name: 'Module 1 \u2014 Administrative & Prescribing' },
  { tag: 'm2-common-technical-document-summaries', num: '2', name: 'Module 2 \u2014 CTD Summaries' },
  { tag: 'm3-quality', num: '3', name: 'Module 3 \u2014 Quality (CMC)' },
  { tag: 'm4-nonclinical-study-reports', num: '4', name: 'Module 4 \u2014 Nonclinical' },
  { tag: 'm5-clinical-study-reports', num: '5', name: 'Module 5 \u2014 Clinical / BE' },
];

function badgeClass(status) {
  if (!status) return '';
  if (status.indexOf('final') !== -1) return 'final';
  if (status.indexOf('placeholder') !== -1) return 'placeholder';
  if (status.indexOf('supplementary') !== -1) return 'supplementary';
  return '';
}

function openFile(href, title, modNum) {
  const header = document.getElementById('previewHeader');
  const body = document.getElementById('previewBody');
  const titleEl = document.getElementById('previewTitle');
  const dot = document.getElementById('previewDot');
  const dl = document.getElementById('previewDownload');

  header.style.display = 'flex';
  titleEl.textContent = title;
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

async function loadTree() {
  const treeList = document.getElementById('treeList');
  try {
    const res = await fetch('ectd/0000/index.xml');
    if (!res.ok) throw new Error('index.xml not found (HTTP ' + res.status + ')');
    const text = await res.text();
    const xml = new DOMParser().parseFromString(text, 'application/xml');
    if (xml.querySelector('parsererror')) throw new Error('XML parse error in index.xml');

    treeList.innerHTML = '';
    let firstFileHref = null, firstFileTitle = null, firstFileMod = null;

    for (const mod of MODULES) {
      const modEl = xml.querySelector(mod.tag);
      const leaves = modEl ? Array.from(modEl.querySelectorAll('leaf')) : [];

      const group = document.createElement('div');
      group.className = 'mod-group open';

      const header = document.createElement('button');
      header.className = 'mod-header';
      header.type = 'button';
      header.innerHTML = `<span class="mod-dot" style="background:var(--tab-m${mod.num})"></span>
        <span class="mname">${mod.name}</span>
        <span class="chev">\u25B8</span>`;
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
          const xrefEl = leaf.querySelector('xref');
          const title = titleEl ? titleEl.textContent : '(untitled)';
          const hrefRaw = xrefEl ? xrefEl.getAttribute('href') : null;
          const href = hrefRaw ? ('ectd/0000/' + hrefRaw) : null;
          const status = leaf.getAttribute('status') || (modEl && modEl.getAttribute('status')) || '';

          const btn = document.createElement('button');
          btn.className = 'file-item';
          btn.type = 'button';
          if (href) btn.setAttribute('data-href', href);

          const cls = badgeClass(status);
          btn.innerHTML = title + (cls ? `<br><span class="file-badge">${cls}</span>` : '');

          if (href) {
            btn.addEventListener('click', () => openFile(href, title, mod.num));
            if (!firstFileHref) { firstFileHref = href; firstFileTitle = title; firstFileMod = mod.num; }
          } else {
            btn.disabled = true;
          }
          fileList.appendChild(btn);
        }
      }
      group.appendChild(fileList);
      treeList.appendChild(group);
    }

    // Deep-link support: #m3 opens Module 3's group (first file not auto-opened, user picks)
    const hash = window.location.hash.replace('#', '');
    if (!hash && firstFileHref) {
      // Leave empty state by default; do not auto-open to let the user choose deliberately.
    }
  } catch (err) {
    treeList.innerHTML = '<p class="error-msg">Could not load index.xml: ' + err.message +
      '.<br><br>If you\u2019re opening this file directly from disk (file://), browsers block XML ' +
      'fetches for security \u2014 serve the folder over http(s) instead (e.g. GitHub Pages, or ' +
      '<code>python3 -m http.server</code> locally).</p>';
  }
}

loadTree();
