export async function GET(req, { params }) {
    const { id } = await params;
    const html = `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #1e1e2e;
      display: flex; flex-direction: column; height: 100vh;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      overflow: hidden; color: #fff;
    }
    #toolbar {
      background: rgba(255,255,255,0.07);
      backdrop-filter: blur(10px);
      border-bottom: 1px solid rgba(255,255,255,0.1);
      padding: 10px 14px;
      display: flex; align-items: center; gap: 8px;
      flex-shrink: 0;
    }
    .btn {
      background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.15);
      color: #fff; padding: 7px 16px; border-radius: 8px;
      cursor: pointer; font-size: 13px; font-weight: 600;
      transition: background 0.15s; white-space: nowrap;
    }
    .btn:hover:not(:disabled) { background: rgba(255,255,255,0.22); }
    .btn:disabled { opacity: 0.3; cursor: default; }
    .btn.icon { padding: 7px 12px; font-size: 16px; }
    #page-info {
      flex: 1; text-align: center;
      font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.8);
      letter-spacing: 0.02em;
    }
    #canvas-wrap {
      flex: 1; overflow: auto;
      display: flex; justify-content: center; align-items: flex-start;
      padding: 20px 16px;
      scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.2) transparent;
    }
    #canvas-wrap::-webkit-scrollbar { width: 6px; height: 6px; }
    #canvas-wrap::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 3px; }
    canvas {
      display: block;
      border-radius: 4px;
      box-shadow: 0 4px 32px rgba(0,0,0,0.6);
      max-width: 100%;
    }
    #loading {
      position: absolute; inset: 0;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 14px; color: rgba(255,255,255,0.6); font-size: 14px;
    }
    .spinner {
      width: 36px; height: 36px; border: 3px solid rgba(255,255,255,0.15);
      border-top-color: #fff; border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    #aanvinken-bar {
      position: fixed; bottom: 0; left: 0; right: 0;
      padding: 10px 14px;
      background: rgba(16,185,129,0.95);
      backdrop-filter: blur(8px);
      display: flex; align-items: center; justify-content: center; gap: 10px;
      cursor: pointer; z-index: 90;
      font-size: 15px; font-weight: 700; color: #fff;
      border-top: 1px solid rgba(255,255,255,0.2);
      transition: background 0.2s;
    }
    #aanvinken-bar:hover:not(.wachten):not(.gelezen) { background: rgba(5,150,105,0.97); }
    #aanvinken-bar.gelezen {
      background: rgba(15,118,110,0.7); cursor: default; font-size: 13px;
    }
    #aanvinken-bar.wachten {
      background: rgba(100,116,139,0.85); cursor: default; font-size: 13px;
    }
    #rotate-hint {
      display: none;
      position: fixed; bottom: 70px; left: 50%; transform: translateX(-50%);
      background: rgba(0,0,0,0.82); color: #fff;
      padding: 10px 18px; border-radius: 20px;
      font-size: 13px; font-weight: 600;
      display: flex; align-items: center; gap: 8px;
      white-space: nowrap; z-index: 99;
      animation: fadein 0.4s ease, fadeout 0.5s ease 3.5s forwards;
    }
    @keyframes fadein { from { opacity: 0; transform: translateX(-50%) translateY(10px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
    @keyframes fadeout { to { opacity: 0; pointer-events: none; } }
    .rotate-icon { font-size: 20px; animation: rotateIcon 1s ease infinite alternate; display: inline-block; }
    @keyframes rotateIcon { from { transform: rotate(0deg); } to { transform: rotate(90deg); } }
    @media (orientation: landscape) { #rotate-hint { display: none !important; } }
  </style>
</head>
<body>
  <div id="toolbar">
    <button class="btn" id="prev" disabled>&#8249; Vorige</button>
    <span id="page-info">Laden…</span>
    <button class="btn" id="next" disabled>Volgende &#8250;</button>
    <button class="btn icon" id="zoom-out" title="Uitzoomen">−</button>
    <button class="btn icon" id="zoom-in" title="Inzoomen">+</button>
  </div>
  <div id="aanvinken-bar">
    <span id="aanvinken-icon">✓</span>
    <span id="aanvinken-tekst">Aanvinken als gelezen</span>
  </div>
  <div id="rotate-hint">
    <span class="rotate-icon">📱</span> Draai je telefoon voor een beter overzicht
  </div>
  <div id="canvas-wrap">
    <div id="loading"><div class="spinner"></div>Document laden…</div>
    <canvas id="cv" style="display:none"></canvas>
  </div>

  <script src="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.min.js"></script>
  <script>
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js';

    let pdf = null, page = 1, scale = 1, baseScale = 1, renderTask = null, reachedLastPage = false;
    const canvas = document.getElementById('cv');
    const ctx = canvas.getContext('2d');
    const wrap = document.getElementById('canvas-wrap');

    function calcBaseScale(viewport) {
      const availW = wrap.clientWidth - 32;
      const availH = wrap.clientHeight - 40;
      const scaleW = availW / viewport.width;
      const scaleH = availH / viewport.height;
      return Math.min(scaleW, scaleH, 2);
    }

    function render(num) {
      if (renderTask) { renderTask.cancel(); renderTask = null; }
      pdf.getPage(num).then(p => {
        const baseVp = p.getViewport({ scale: 1 });
        if (num === 1 && scale === baseScale) {
          baseScale = calcBaseScale(baseVp);
          scale = baseScale;
        }
        const vp = p.getViewport({ scale });
        canvas.width = vp.width;
        canvas.height = vp.height;
        canvas.style.display = 'block';
        document.getElementById('loading').style.display = 'none';
        renderTask = p.render({ canvasContext: ctx, viewport: vp });
        renderTask.promise.catch(() => {});
        document.getElementById('page-info').textContent = num + ' / ' + pdf.numPages;
        document.getElementById('prev').disabled = num <= 1;
        document.getElementById('next').disabled = num >= pdf.numPages;
        wrap.scrollTo({ top: 0, behavior: 'smooth' });
        if (num >= pdf.numPages) { reachedLastPage = true; }
        updateAanvinkenBar();
      });
    }

    pdfjsLib.getDocument('/api/documenten/${id}/bestand').promise.then(doc => {
      pdf = doc;
      render(1);
    }).catch(() => {
      document.getElementById('loading').textContent = 'Document kon niet worden geladen.';
    });

    document.getElementById('prev').onclick = () => { if (page > 1) render(--page); };
    document.getElementById('next').onclick = () => { if (page < pdf.numPages) render(++page); };
    document.getElementById('zoom-in').onclick  = () => { scale = Math.min(scale * 1.25, 4); render(page); };
    document.getElementById('zoom-out').onclick = () => { scale = Math.max(scale * 0.8, 0.3); render(page); };

    // Aanvinken als gelezen
    const sp = new URLSearchParams(location.search);
    const userId = sp.get('userId');
    const naam = sp.get('naam');
    const bar = document.getElementById('aanvinken-bar');
    const tekst = document.getElementById('aanvinken-tekst');
    const icon = document.getElementById('aanvinken-icon');
    let isGelezen = sp.get('gelezen') === '1';

    if (!userId) { bar.style.display = 'none'; }

    function updateAanvinkenBar() {
      if (!userId) return;
      if (isGelezen) {
        bar.className = 'gelezen';
        icon.textContent = '✓';
      } else if (reachedLastPage) {
        bar.className = '';
        icon.textContent = '✓';
        tekst.textContent = 'Aanvinken als gelezen';
      } else {
        bar.className = 'wachten';
        icon.textContent = '📖';
        tekst.textContent = "Lees alle pagina\u2019s om te mogen aanvinken";
      }
    }

    if (isGelezen) {
      bar.className = 'gelezen';
      icon.textContent = '✓';
      tekst.textContent = 'Al gelezen';
    }

    bar.onclick = async () => {
      if (!reachedLastPage || isGelezen || bar.classList.contains('gelezen') || bar.classList.contains('wachten')) return;
      bar.style.opacity = '0.7';
      try {
        const res = await fetch('/api/documenten/${id}/gelezen', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: Number(userId), naam })
        });
        const data = await res.json();
        if (data.ok) {
          isGelezen = true;
          bar.className = 'gelezen';
          icon.textContent = '✓';
          const ts = data.timestamp ? new Date(data.timestamp) : new Date();
          const dag = ts.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });
          const tijd = ts.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
          tekst.textContent = 'Gelezen door ' + naam + ' · ' + dag + ' ' + tijd;
          // Stuur bericht naar parent app zodat het kaartje groen wordt
          window.parent.postMessage({ type: 'gelezen', docId: ${id}, userId: Number(userId), naam, timestamp: data.timestamp }, '*');
        }
      } catch {}
      bar.style.opacity = '1';
    };

    // Toon rotate hint alleen op mobiel in portrait
    const hint = document.getElementById('rotate-hint');
    function checkOrientation() {
      const isMobile = window.innerWidth < 768;
      const isPortrait = window.innerHeight > window.innerWidth;
      hint.style.display = (isMobile && isPortrait) ? 'flex' : 'none';
    }
    checkOrientation();
    window.addEventListener('resize', checkOrientation);

    // Swipe links/rechts voor mobiel
    let tx = 0;
    wrap.addEventListener('touchstart', e => { tx = e.touches[0].clientX; }, { passive: true });
    wrap.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - tx;
      if (Math.abs(dx) > 60) {
        if (dx < 0 && page < pdf?.numPages) render(++page);
        if (dx > 0 && page > 1) render(--page);
      }
    });
  </script>
</body>
</html>`;

    return new Response(html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
}
