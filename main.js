/* ---------- Fading tagline ---------- */
const TAGLINES = ['M.Pharm — Regulatory Affairs', 'eCTD & CTD Dossier Preparation', 'QMS Documentation | GMP Compliance', 'Open to Internships & RA Roles'];
(function fadeLoop() {
  const el = document.getElementById('typed');
  if (!el) return;
  let ti = 0;

  function show() {
    el.style.opacity = '0';
    setTimeout(() => {
      el.textContent = TAGLINES[ti];
      el.style.opacity = '1';
      ti = (ti + 1) % TAGLINES.length;
    }, 400);
  }

  show();
  setInterval(show, 2800);
})();
/* ---------- Scroll reveal ---------- */
(function scrollReveal() {
  const sections = document.querySelectorAll('.msection');
  if (!sections.length) return;
  const obs = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  sections.forEach((s) => obs.observe(s));
})();
/* ---------- Mobile sidebar toggle ---------- */
(function mobileNav() {
  const toggle = document.getElementById('sToggle');
  const sidebar = document.getElementById('sidebar');
  if (!toggle || !sidebar) return;
  toggle.addEventListener('click', () => {
    const open = sidebar.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  document.querySelectorAll('#sNav a').forEach((a) => {
    a.addEventListener('click', () => sidebar.classList.remove('open'));
  });
})();

/* ---------- Scrollspy ---------- */
(function scrollspy() {
  const sections = document.querySelectorAll('.msection[id]');
  const navLinks = document.querySelectorAll('#sNav a');
  if (!sections.length || !navLinks.length) return;

  const spy = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const id = entry.target.getAttribute('id');
        navLinks.forEach((a) => a.classList.toggle('active', a.getAttribute('data-target') === id));
      }
    });
  }, { rootMargin: '-40% 0px -55% 0px', threshold: 0 });

  sections.forEach((s) => spy.observe(s));
})();

/* ---------- Animated stat counters + skill bars (trigger once, on view) ---------- */
(function animateOnView() {
  const statNums = document.querySelectorAll('.stat-box .n[data-count]');
  const skillFills = document.querySelectorAll('.sb-fill[data-w]');

  function animateCount(el) {
    const target = parseInt(el.getAttribute('data-count'), 10);
    const dur = 900;
    const start = performance.now();
    function step(now) {
      const p = Math.min((now - start) / dur, 1);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  const obs = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      if (el.classList.contains('n')) animateCount(el);
      if (el.classList.contains('sb-fill')) el.style.width = el.getAttribute('data-w') + '%';
      observer.unobserve(el);
    });
  }, { threshold: 0.4 });

  statNums.forEach((el) => obs.observe(el));
  skillFills.forEach((el) => obs.observe(el));
})();

/* ---------- Portfolio filter ---------- */
(function portfolioFilter() {
  const buttons = document.querySelectorAll('.filter-btn');
  const cards = document.querySelectorAll('.port-card');
  if (!buttons.length) return;
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      buttons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const f = btn.getAttribute('data-filter');
      cards.forEach((c) => {
        const show = f === 'all' || c.getAttribute('data-cat') === f;
        c.style.display = show ? '' : 'none';
      });
    });
  });
})();

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
/* ---------- Contact form (Formspree AJAX) ---------- */
(function contactForm() {
  const form = document.getElementById('contactForm');
  const status = document.getElementById('formStatus');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    status.textContent = 'Sending\u2026';
    status.className = 'form-status';
    try {
      const res = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        status.textContent = 'Message sent \u2014 thank you! I\u2019ll get back to you soon.';
        status.className = 'form-status ok';
        form.reset();
      } else {
        status.textContent = 'Something went wrong. Please email me directly instead.';
        status.className = 'form-status err';
      }
    } catch (err) {
      status.textContent = 'Network error. Please email me directly instead.';
      status.className = 'form-status err';
    }
  });
})();
