# AMLOZA — Mock USFDA ANDA / eCTD Portfolio Site

A static portfolio site + working eCTD viewer for the AMLOZA (amlodipine besylate) mock ANDA dossier,
built by M. Shekar for M.Pharm Regulatory Affairs portfolio purposes.

## What's in this folder

```
index.html      — portfolio landing page
viewer.html     — eCTD viewer (parses ectd/0000/index.xml live, links to every PDF)
style.css       — shared styles
viewer.js       — viewer logic (fetch + parse index.xml, render module tree)
ectd/0000/      — the actual final PDF dossier (Letter size, all 19 documents) + index.xml
```

## How to deploy on GitHub Pages (free, ~5 minutes)

1. Create a new GitHub repository (e.g. `amloza-anda-portfolio`). Keep it **public** so Pages works
   on the free tier.
2. Upload every file/folder in this package to the repository, preserving the folder structure
   exactly as-is (the `ectd/0000/...` path must stay intact — the viewer's links depend on it).
   - Easiest way: on github.com, use "Add file → Upload files" and drag the whole folder in, or
   - Via git:
     ```bash
     git init
     git add .
     git commit -m "Initial commit: AMLOZA ANDA portfolio"
     git branch -M main
     git remote add origin https://github.com/<your-username>/amloza-anda-portfolio.git
     git push -u origin main
     ```
3. In the repository, go to **Settings → Pages**.
4. Under "Build and deployment", set **Source: Deploy from a branch**, **Branch: main**, folder **/ (root)**.
5. Save. GitHub will give you a live URL within a minute or two, typically:
   `https://<your-username>.github.io/amloza-anda-portfolio/`
6. Put that link on your resume/LinkedIn under the M.Pharm project entry.

## Testing locally before you deploy (optional)

Browsers block XML `fetch()` calls from `file://` URLs, so opening `index.html` by double-clicking
it won't load the viewer correctly. To test locally first:

```bash
cd path/to/this/folder
python3 -m http.server 8000
```

Then open `http://localhost:8000/index.html` in your browser.

## Before you deploy: connect the contact form

The Contact section has a real, working form (not decorative) — but it needs to be pointed at
your own [Formspree](https://formspree.io) endpoint to actually deliver email, since GitHub Pages
can't run server-side code.

1. Go to [formspree.io](https://formspree.io) and sign up free (no credit card).
2. Create a new form, and set the recipient email to `metharshekarshekar@gmail.com`.
3. Formspree gives you a form ID that looks like `xyzabcde`.
4. Open `index.html`, find this line (in the Contact section):
   ```html
   <form class="cform" id="contactForm" action="https://formspree.io/f/YOUR_FORM_ID" method="POST">
   ```
5. Replace `YOUR_FORM_ID` with your real ID, e.g. `action="https://formspree.io/f/xyzabcde"`.
6. Save, redeploy. The free tier handles 50 submissions/month, which is plenty for a portfolio.

Until you do this, the form will show an error message when someone submits it — so do this step
before sharing the link.

## If you add more documents later

Any new document just needs a `<leaf>` entry added to `ectd/0000/index.xml` under the right module,
with a `<title>` and an `<xref href="...">` pointing to the PDF's path relative to `ectd/0000/`. The
viewer picks up new entries automatically — no code changes needed.
