/* ---------- Typed tagline ---------- */
const TAGLINES = ['Regulatory Affairs Professional', 'eCTD & CTD Documentation', 'M.Pharm Student'];
(function typeLoop() {
  const el = document.getElementById('typed');
  if (!el) return;
  let ti = 0, ci = 0, deleting = false;

  function tick() {
    const full = TAGLINES[ti];
    if (!deleting) {
      ci++;
      el.textContent = full.slice(0, ci);
      if (ci === full.length) { deleting = true; setTimeout(tick, 1400); return; }
    } else {
      ci--;
      el.textContent = full.slice(0, ci);
      if (ci === 0) { deleting = false; ti = (ti + 1) % TAGLINES.length; }
    }
    setTimeout(tick, deleting ? 35 : 65);
  }
  tick();
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
