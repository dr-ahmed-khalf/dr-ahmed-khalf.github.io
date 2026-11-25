// Gentle pointer parallax for the atmospheric background.
const scene = document.querySelector(".scene");
const backdrop = document.querySelector(".portrait-backdrop");
if (scene && backdrop && window.matchMedia("(pointer:fine)").matches) {
  scene.addEventListener("pointermove", (event) => {
    const x = (event.clientX / window.innerWidth - 0.5) * 8;
    const y = (event.clientY / window.innerHeight - 0.5) * 6;
    backdrop.style.transform = `scale(1.045) translate(${x}px, ${y}px)`;
  });
  scene.addEventListener("pointerleave", () => {
    backdrop.style.transform = "scale(1.035) translate(0, 0)";
  });
}

// Soft tilt on the glass panel, with restrained movement.
const panel = document.querySelector(".glass-panel");
if (panel && window.matchMedia("(pointer:fine)").matches) {
  const sceneEl = document.querySelector(".scene");
  sceneEl.addEventListener("pointermove", (event) => {
    const bounds = panel.getBoundingClientRect();
    const px = (event.clientX - (bounds.left + bounds.width / 2)) / bounds.width;
    const py = (event.clientY - (bounds.top + bounds.height / 2)) / bounds.height;
    if (Math.abs(px) < 1.4 && Math.abs(py) < 1.4) {
      panel.style.setProperty("--tilt-x", `${(-py * 1.1).toFixed(2)}deg`);
      panel.style.setProperty("--tilt-y", `${(px * 1.1).toFixed(2)}deg`);
      panel.style.transform = `perspective(1000px) rotateX(${-py * 1.1}deg) rotateY(${px * 1.1}deg)`;
    }
  });
  sceneEl.addEventListener("pointerleave", () => {
    panel.style.transform = "";
  });
}

/* ===== v19 premium layer: particles, aurora, 3D tilt, shine, depth parallax ===== */
(function () {
  const sceneEl = document.querySelector(".scene");
  const card = document.querySelector(".glass-panel");
  if (!sceneEl || !card) return;
  const reduce = false; // decorative motion stays on (Windows "animation effects off" would otherwise hide everything)
  const fine = window.matchMedia("(pointer:fine)").matches;
  const small = () => window.innerWidth <= 650;

  // aurora gradient blobs
  const aurora = document.createElement("div");
  aurora.className = "aurora";
  aurora.setAttribute("aria-hidden", "true");
  aurora.innerHTML = "<i></i><i></i><i></i>";
  const shade = document.querySelector(".portrait-shade");
  (shade ? shade.after.bind(shade) : sceneEl.prepend.bind(sceneEl))(aurora);

  // floating particles (canvas)
  const cv = document.createElement("canvas");
  cv.className = "particles";
  cv.setAttribute("aria-hidden", "true");
  aurora.after(cv);
  const ctx = cv.getContext("2d");
  let W = 0, H = 0, dpr = 1, parts = [], raf = 0, mx = -999, my = -999;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    W = sceneEl.clientWidth; H = Math.max(sceneEl.scrollHeight, window.innerHeight);
    cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = small() ? 26 : Math.min(70, Math.round(W / 24));
    parts = Array.from({ length: n }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      r: Math.random() * 1.8 + .5, vx: (Math.random() - .5) * .22,
      vy: -(Math.random() * .35 + .08), a: Math.random() * .5 + .2, p: Math.random() * 6.28
    }));
  }
  function frame(t) {
    ctx.clearRect(0, 0, W, H);
    for (const p of parts) {
      p.x += p.vx; p.y += p.vy; p.p += .02;
      if (p.y < -10) { p.y = H + 10; p.x = Math.random() * W; }
      if (p.x < -10) p.x = W + 10; if (p.x > W + 10) p.x = -10;
      const dx = p.x - mx, dy = p.y - my, d = dx * dx + dy * dy;
      if (d < 14000) { p.x += dx * .0016; p.y += dy * .0016; }
      const tw = p.a * (.6 + .4 * Math.sin(p.p));
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 5);
      g.addColorStop(0, `rgba(170,205,255,${tw})`);
      g.addColorStop(1, "rgba(120,170,255,0)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 5, 0, 6.283); ctx.fill();
    }
    if (!small()) {
      ctx.lineWidth = .6;
      for (let i = 0; i < parts.length; i++) for (let j = i + 1; j < parts.length; j++) {
        const a = parts[i], b = parts[j], dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy;
        if (d2 < 15000) { ctx.strokeStyle = `rgba(130,175,255,${(1 - d2 / 15000) * .22})`; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
      }
    }
    raf = requestAnimationFrame(frame);
  }
  resize();
  let rt; window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(resize, 200); });
  document.addEventListener("visibilitychange", () => {
    cancelAnimationFrame(raf);
    if (!document.hidden && !reduce) raf = requestAnimationFrame(frame);
  });
  if (reduce) { frame(0); cancelAnimationFrame(raf); } else raf = requestAnimationFrame(frame);

  // shine layer inside the card
  const shine = document.createElement("div");
  shine.className = "card-shine";
  shine.setAttribute("aria-hidden", "true");
  card.prepend(shine);

  // 3D tilt + layered depth (desktop pointer only)
  if (fine && !reduce) {
    let tx = 0, ty = 0, cx = 0, cy = 0, tick = false;
    const loop = () => {
      cx += (tx - cx) * .12; cy += (ty - cy) * .12;
      card.style.setProperty("--rx", (-cy * 7).toFixed(2) + "deg");
      card.style.setProperty("--ry", (cx * 9).toFixed(2) + "deg");
      card.style.setProperty("--px", cx.toFixed(3));
      card.style.setProperty("--py", cy.toFixed(3));
      if (Math.abs(tx - cx) > .002 || Math.abs(ty - cy) > .002) requestAnimationFrame(loop); else tick = false;
    };
    sceneEl.addEventListener("pointermove", (e) => {
      mx = e.clientX; my = e.clientY + window.scrollY;
      const b = card.getBoundingClientRect();
      tx = Math.max(-1, Math.min(1, (e.clientX - (b.left + b.width / 2)) / (window.innerWidth / 2)));
      ty = Math.max(-1, Math.min(1, (e.clientY - (b.top + b.height / 2)) / (window.innerHeight / 2)));
      card.style.setProperty("--mx", ((e.clientX - b.left) / b.width * 100).toFixed(1) + "%");
      card.style.setProperty("--my", ((e.clientY - b.top) / b.height * 100).toFixed(1) + "%");
      if (!tick) { tick = true; requestAnimationFrame(loop); }
    });
    sceneEl.addEventListener("pointerleave", () => { tx = 0; ty = 0; mx = my = -999; if (!tick) { tick = true; requestAnimationFrame(loop); } });
  }
  // press ripple on social + contact buttons
  document.querySelectorAll(".social-link, .contact-button").forEach((el) => {
    el.addEventListener("pointerdown", (e) => {
      const r = el.getBoundingClientRect(), s = document.createElement("span");
      s.className = "ripple";
      s.style.left = e.clientX - r.left + "px"; s.style.top = e.clientY - r.top + "px";
      el.appendChild(s); setTimeout(() => s.remove(), 650);
    });
  });
})();

/* ===== v5 magic layer: preloader, cursor glow, magnetic buttons, constellation lines, ECG, spring tilt ===== */
(function () {
  const reduce = false; // decorative motion stays on (Windows "animation effects off" would otherwise hide everything)
  const fine = window.matchMedia("(pointer:fine)").matches;
  // preloader: AK mark + heartbeat line
  const pre = document.createElement("div");
  pre.className = "preloader";
  pre.setAttribute("aria-hidden", "true");
  pre.innerHTML = '<div class="pl-mark">AK<b>.</b></div><svg class="pl-ecg" viewBox="0 0 240 40"><path d="M0 20H70l8-14 10 30 10-24 8 8H240"/></svg><div class="pl-bar"><i></i></div>';
  document.body.appendChild(pre);
  const hide = () => { pre.classList.add("done"); setTimeout(() => pre.remove(), 900); };
  if (reduce) hide(); else setTimeout(hide, 1300);

  // ECG heartbeat line behind the card footer area
  const card = document.querySelector(".glass-panel");
  if (card) {
    const ecg = document.createElement("svg");
    ecg.setAttribute("class", "card-ecg");
    ecg.setAttribute("viewBox", "0 0 400 60");
    ecg.setAttribute("preserveAspectRatio", "none");
    ecg.setAttribute("aria-hidden", "true");
    ecg.innerHTML = '<path d="M0 30H120l10-22 14 46 12-34 8 10H400"/>';
    card.appendChild(ecg);
  }

  if (!fine || reduce) return;
  // glowing cursor with trailing ring
  const dot = document.createElement("div"); dot.className = "cur-dot";
  const ring = document.createElement("div"); ring.className = "cur-ring";
  document.body.append(dot, ring);
  document.documentElement.classList.add("has-cursor");
  let x = -100, y = -100, rx = -100, ry = -100;
  window.addEventListener("pointermove", (e) => { x = e.clientX; y = e.clientY; dot.style.transform = `translate(${x}px,${y}px)`; });
  (function loop() { rx += (x - rx) * .16; ry += (y - ry) * .16; ring.style.transform = `translate(${rx}px,${ry}px)`; requestAnimationFrame(loop); })();
  const hov = "a,button,.social-link,.contact-button";
  document.addEventListener("pointerover", (e) => { if (e.target.closest && e.target.closest(hov)) ring.classList.add("hot"); });
  document.addEventListener("pointerout", (e) => { if (e.target.closest && e.target.closest(hov)) ring.classList.remove("hot"); });
  // magnetic buttons
  document.querySelectorAll(".social-link, .contact-button, .top-contact").forEach((el) => {
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) * .22, dy = (e.clientY - (r.top + r.height / 2)) * .3;
      el.style.setProperty("--mgx", dx.toFixed(1) + "px"); el.style.setProperty("--mgy", dy.toFixed(1) + "px");
    });
    el.addEventListener("pointerleave", () => { el.style.setProperty("--mgx", "0px"); el.style.setProperty("--mgy", "0px"); });
  });
})();
