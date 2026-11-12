// Small interactive canvases next to each homepage publication.
// Each toy illustrates the paper's idea or headline result; see TOYS at the bottom.
(function () {
  var root = document.querySelector('.about-pubs');
  if (!root || !window.requestAnimationFrame || !window.ResizeObserver) return;

  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canHover = matchMedia('(hover: hover)').matches;
  var TAU = Math.PI * 2;
  var MONO = 'ui-monospace, Menlo, Consolas, monospace';
  var toys = [];
  var col = {};

  // ── helpers ────────────────────────────────────────────────────────────────
  function readColors() {
    var cs = getComputedStyle(document.documentElement);
    ['accent', 'text', 'text-2', 'text-3', 'border', 'bg'].forEach(function (k) {
      col[k.replace('-', '')] = cs.getPropertyValue('--' + k).trim() || '#888';
    });
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, k) { return a + (b - a) * k; }
  function smooth(x) { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); }
  function fract(x) { return x - Math.floor(x); }
  function hash(n) { return fract(Math.sin(n * 127.1 + 11.7) * 43758.5453); }
  function rgb(c, a) {
    return 'rgba(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ',' + (a == null ? 1 : a) + ')';
  }
  function mix(a, b, k) { return [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)]; }
  function ease(dt, rate) { return reduce ? 1 : 1 - Math.exp(-dt * rate); }
  function label(g, txt, x, y, color, align, size) {
    g.font = '600 ' + (size || 8) + 'px ' + MONO;
    g.textAlign = align || 'left';
    g.textBaseline = 'middle';
    g.fillStyle = color;
    g.fillText(txt, x, y);
  }
  // Stick figure with feet at (x, y), total height hgt; swing animates the limbs.
  function figure(g, x, y, hgt, swing, color) {
    var r = hgt * 0.14, hip = y - hgt * 0.4, neck = y - hgt + r * 2;
    g.strokeStyle = color; g.fillStyle = color; g.lineWidth = Math.max(1.2, hgt * 0.05); g.lineCap = 'round';
    g.beginPath(); g.arc(x, y - hgt + r, r, 0, TAU); g.fill();
    g.beginPath();
    g.moveTo(x, neck); g.lineTo(x, hip);
    g.moveTo(x, hip); g.lineTo(x - hgt * 0.14 - swing, y);
    g.moveTo(x, hip); g.lineTo(x + hgt * 0.14 + swing, y);
    g.moveTo(x, neck + hgt * 0.08); g.lineTo(x - hgt * 0.2 + swing, hip - hgt * 0.04);
    g.moveTo(x, neck + hgt * 0.08); g.lineTo(x + hgt * 0.2 - swing, hip - hgt * 0.04);
    g.stroke();
  }

  // ── mounting & loop ────────────────────────────────────────────────────────
  function mount(key, aria, hint, def) {
    var host = document.getElementById(key);
    if (!host || !host.parentElement) return;
    var row = host.parentElement, li = row.closest('li') || row;
    var box = document.createElement('div'); box.className = 'pub-toy col-sm-2';
    var cv = document.createElement('canvas'); cv.className = 'pub-toy__canvas';
    cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', aria);
    var cap = document.createElement('div'); cap.className = 'pub-toy__cap'; cap.innerHTML = hint;
    box.appendChild(cv); box.appendChild(cap); row.appendChild(box);

    var s = {
      cv: cv, g: cv.getContext('2d'), def: def, hint: hint, w: 0, h: 0, t: def.t0 || 0,
      px: 0.5, py: 0.5, inside: false, active: false, visible: false, dirty: true, _cap: hint,
      say: function (html) { if (html !== s._cap) { s._cap = html; cap.innerHTML = html; } },
      live: function () { return s.active || s.inside; }
    };
    if (def.init) def.init(s);

    function point(e) {
      var r = cv.getBoundingClientRect();
      s.px = clamp((e.clientX - r.left) / r.width, 0, 1);
      s.py = clamp((e.clientY - r.top) / r.height, 0, 1);
      if (!s.inside && def.enter) def.enter(s);
      s.inside = true; s.dirty = true;
    }
    cv.addEventListener('pointermove', point);
    cv.addEventListener('pointerdown', function (e) { point(e); if (def.click) def.click(s); });
    ['pointerleave', 'pointercancel'].forEach(function (ev) {
      cv.addEventListener(ev, function () { s.inside = false; s.dirty = true; });
    });
    if (canHover) {
      li.addEventListener('pointerenter', function () { s.active = true; s.dirty = true; });
      li.addEventListener('pointerleave', function () { s.active = false; s.dirty = true; });
    }
    new ResizeObserver(function () {
      var dpr = window.devicePixelRatio || 1;
      s.w = cv.clientWidth; s.h = cv.clientHeight;
      cv.width = Math.round(s.w * dpr); cv.height = Math.round(s.h * dpr);
      s.dirty = true;
    }).observe(cv);
    new IntersectionObserver(function (en) {
      s.visible = en[0].isIntersecting;
      if (!canHover) s.active = s.visible;
      s.dirty = true;
    }).observe(cv);
    toys.push(s);
  }

  var last = 0;
  function loop(now) {
    var dt = Math.min(0.05, (now - last) / 1000 || 0); last = now;
    toys.forEach(function (s) {
      if (!s.visible || !s.w) return;
      var run = s.live() && !reduce;
      if (!run && !s.dirty) return;
      if (run) s.t += dt;
      var dpr = window.devicePixelRatio || 1;
      s.g.setTransform(dpr, 0, 0, dpr, 0, 0);
      s.g.clearRect(0, 0, s.w, s.h);
      s.g.globalAlpha = 1;
      s.dirty = !!s.def.draw(s, s.g, s.w, s.h, dt);
    });
    requestAnimationFrame(loop);
  }

  // ── MUSE: steer the emotion of one scene ───────────────────────────────────
  // v = sky top, sky bottom, sun, far hills, near hills (rgb each), sun height, jaggedness
  var EMO = [
    { n: 'contentment', v: [255, 206, 150, 255, 238, 205, 255, 176, 96, 150, 182, 120, 104, 148, 96, 0.44, 0] },
    { n: 'awe', v: [34, 44, 104, 150, 122, 196, 255, 244, 224, 74, 74, 138, 40, 40, 92, 0.24, 0.55] },
    { n: 'excitement', v: [255, 112, 84, 255, 212, 92, 255, 255, 204, 232, 84, 124, 178, 50, 112, 0.3, 0.3] },
    { n: 'sadness', v: [86, 100, 120, 150, 160, 174, 204, 208, 216, 92, 106, 120, 64, 78, 94, 0.6, 0.05] },
    { n: 'fear', v: [14, 14, 24, 62, 30, 50, 196, 44, 44, 38, 26, 42, 14, 10, 20, 0.34, 1] }
  ];
  function tri(u) { return Math.abs(fract(u * 0.5) * 2 - 1) * 2 - 1; }
  var muse = {
    init: function (s) { s.c = EMO[0].v.slice(); },
    draw: function (s, g, w, h, dt) {
      var i = s.inside ? Math.min(EMO.length - 1, Math.floor(s.px * EMO.length)) : Math.floor(s.t / 1.8) % EMO.length;
      var T = EMO[i].v, c = s.c, k = ease(dt, 5), d = 0, j;
      for (j = 0; j < c.length; j++) { c[j] = lerp(c[j], T[j], k); d += Math.abs(c[j] - T[j]) / (j < 15 ? 255 : 1); }
      var sky = g.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, rgb(c.slice(0, 3))); sky.addColorStop(1, rgb(c.slice(3, 6)));
      g.fillStyle = sky; g.fillRect(0, 0, w, h);
      g.fillStyle = rgb(c.slice(6, 9)); g.beginPath(); g.arc(w * 0.7, h * c[15], h * 0.1, 0, TAU); g.fill();
      [[0.62, 0.045, 1, 7, 0.09, 9, 9], [0.8, 0.03, 4, 5, 0.13, 6, 12]].forEach(function (p) {
        g.fillStyle = rgb(c.slice(p[6], p[6] + 3));
        g.beginPath(); g.moveTo(0, h);
        for (var x = 0; x <= w + 3; x += 3) g.lineTo(x, h * p[0] + Math.sin(x * p[1] + p[2]) * p[3] + c[16] * tri(x * p[4] + p[2]) * p[5]);
        g.lineTo(w, h); g.fill();
      });
      var seg = (w - 12) / EMO.length;
      for (j = 0; j < EMO.length; j++) {
        g.fillStyle = j === i ? '#fff' : 'rgba(255,255,255,.35)';
        g.fillRect(6 + j * seg + 1, h - 6, seg - 2, 2);
      }
      s.say(s.live() ? '<b>' + EMO[i].n + '</b> · only the emotion token is optimised' : s.hint);
      return d > 0.02;
    }
  };

  // ── FakeParts: find the locally edited region ──────────────────────────────
  function field(x, y, sd) {
    return 0.5 + 0.25 * Math.sin(x * 0.55 + sd) + 0.25 * Math.sin(y * 0.7 + sd * 1.7 + Math.sin(x * 0.3 + sd) * 2);
  }
  var FP_R = 3.4, FP_C = 6;
  var fakeparts = {
    init: function (s) { this.round(s); },
    round: function (s) { s.seed = Math.random() * 50; s.fx = 0.2 + Math.random() * 0.6; s.fy = 0.25 + Math.random() * 0.5; s.guess = null; },
    click: function (s) {
      if (s.guess) { this.round(s); return; }
      var gx = s.px * s.w / FP_C, gy = s.py * s.h / FP_C;
      var d = Math.hypot(gx - s.fx * s.w / FP_C, gy - s.fy * s.h / FP_C);
      s.guess = { x: s.px, y: s.py, found: d < FP_R + 1 };
    },
    draw: function (s, g, w, h) {
      var cols = Math.ceil(w / FP_C), rows = Math.ceil(h / FP_C), cx = s.fx * w / FP_C, cy = s.fy * h / FP_C;
      var A = [44, 58, 84], B = [238, 198, 150], C2 = [176, 96, 110];
      for (var y = 0; y < rows; y++) for (var x = 0; x < cols; x++) {
        var a = field(x, y, s.seed), b = field(y * 0.8, x * 0.6, s.seed + 3);
        var d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
        if (d < FP_R) {
          var k = smooth(1 - d / FP_R) * 0.6;
          a = lerp(a, field(x + 9, y + 5, s.seed + 9), k); b = lerp(b, 1 - b, k * 0.6);
        }
        g.fillStyle = rgb(mix(mix(A, B, a), C2, b * 0.35));
        g.fillRect(x * FP_C, y * FP_C, FP_C, FP_C);
      }
      if (s.guess) {
        g.lineWidth = 1.5; g.strokeStyle = '#fff'; g.setLineDash([3, 2]);
        g.beginPath(); g.arc(cx * FP_C, cy * FP_C, FP_R * FP_C, 0, TAU); g.stroke(); g.setLineDash([]);
        var mx = s.guess.x * w, my = s.guess.y * h;
        g.strokeStyle = s.guess.found ? '#fff' : 'rgba(0,0,0,.8)';
        g.beginPath(); g.moveTo(mx - 3, my - 3); g.lineTo(mx + 3, my + 3); g.moveTo(mx + 3, my - 3); g.lineTo(mx - 3, my + 3); g.stroke();
        s.say((s.guess.found ? '<b>spotted!</b> ' : '<b>missed.</b> ') + 'People are up to 26% worse at this than at spotting full deepfakes');
      } else {
        s.say(s.hint);
      }
    }
  };

  // ── VERTIGO: keeping the character in frame ────────────────────────────────
  var vertigo = {
    init: function (s) { s.m = 0; },
    draw: function (s, g, w, h, dt) {
      var on = s.inside || (!s.inside && s.active && Math.floor(s.t / 4) % 2 === 1);
      s.m = lerp(s.m, on ? 1 : 0, ease(dt, 4));
      var m = s.m, ph = s.t * 1.1;
      // amplitude chosen so the baseline subject is out of frame 38% of the time
      var x = lerp(0.605 * Math.sin(ph), 0.1 * Math.sin(ph), m);
      var vx = w / 2 - x * w * 0.3 * m, vy = h * 0.42, zoom = 1 + m * 0.22 * Math.sin(ph);
      g.strokeStyle = col.border; g.lineWidth = 1;
      for (var k = 1; k <= 5; k++) {
        var sc = Math.pow(k / 5, 1.6) * zoom * 1.25;
        g.strokeRect(vx - w * sc / 2, vy - h * sc / 2, w * sc, h * sc);
      }
      g.beginPath();
      [[0, 0], [w, 0], [0, h], [w, h]].forEach(function (p) { g.moveTo(p[0], p[1]); g.lineTo(vx, vy); });
      g.stroke();
      var sx = w / 2 + x * w, off = Math.abs(x) > 0.5;
      figure(g, sx, h * 0.9, h * 0.42, Math.sin(s.t * 7) * 2.5, col.text);
      if (off) {
        var ex = x > 0 ? w - 7 : 7, dir = x > 0 ? 1 : -1;
        g.fillStyle = col.accent; g.beginPath();
        g.moveTo(ex + dir * 4, h * 0.7); g.lineTo(ex - dir * 3, h * 0.7 - 5); g.lineTo(ex - dir * 3, h * 0.7 + 5); g.fill();
      }
      label(g, on ? 'off-screen ~0%' : 'off-screen 38%', 6, 9, on ? col.accent : col.text2);
      s.say(!s.live() ? s.hint : on ? '<b>after VERTIGO</b>: the character stays in frame' : 'baseline: the character is off-screen 38% of the time');
      return Math.abs(s.m - (on ? 1 : 0)) > 0.01;
    }
  };

  // ── VIGOR: geometric consistency across frames ─────────────────────────────
  var CUBE_E = [[0, 1], [1, 3], [3, 2], [2, 0], [4, 5], [5, 7], [7, 6], [6, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
  var vigor = {
    draw: function (s, g, w, h) {
      var r = s.inside ? s.px : 0.5 - 0.5 * Math.cos(s.t * 0.9);
      var a = s.t * 0.7 + 0.6, ca = Math.cos(a), sa = Math.sin(a), ct = Math.cos(0.5), st = Math.sin(0.5);
      var amp = (1 - r) * h * 0.11, cx = w / 2, cy = h * 0.53, step = Math.floor(s.t * 10);
      function verts(stp) {
        var out = [];
        for (var i = 0; i < 8; i++) {
          var x = i & 1 ? 1 : -1, y = i & 2 ? 1 : -1, z = i & 4 ? 1 : -1;
          var x1 = x * ca + z * sa, z1 = -x * sa + z * ca, y1 = y * ct - z1 * st, z2 = y * st + z1 * ct;
          var sc = h * 0.21 / (1 + z2 * 0.22);
          out.push([cx + x1 * sc + (hash(i * 7.1 + stp) * 2 - 1) * amp, cy + y1 * sc + (hash(i * 3.3 + stp + 0.5) * 2 - 1) * amp]);
        }
        return out;
      }
      function edges(v, alpha) {
        g.globalAlpha = alpha; g.strokeStyle = col.text; g.lineWidth = 1.2; g.beginPath();
        CUBE_E.forEach(function (e) { g.moveTo(v[e[0]][0], v[e[0]][1]); g.lineTo(v[e[1]][0], v[e[1]][1]); });
        g.stroke(); g.globalAlpha = 1;
      }
      if (amp > 0.6) edges(verts(step - 1), 0.22);
      var v = verts(step); edges(v, 1);
      g.fillStyle = col.accent;
      v.forEach(function (p) { g.beginPath(); g.arc(p[0], p[1], 1.8, 0, TAU); g.fill(); });
      g.fillStyle = col.border; g.fillRect(8, h - 7, w - 16, 2);
      g.fillStyle = col.accent; g.fillRect(8, h - 7, (w - 16) * r, 2);
      g.beginPath(); g.arc(8 + (w - 16) * r, h - 6, 3, 0, TAU); g.fill();
      label(g, 'reproj. err ' + ((1 - r) * 0.9 + 0.03).toFixed(2), 6, 9, col.text2);
    }
  };

  // ── SCENT: an e-nose named by language ─────────────────────────────────────
  var SRC = [
    { n: 'coffee residue', s: 'coffee', x: 0.2, y: 0.5, c: [156, 100, 62] },
    { n: 'distant grass', s: 'grass', x: 0.8, y: 0.46, c: [96, 152, 84] },
    { n: 'print toner', s: 'toner', x: 0.5, y: 0.84, c: [104, 116, 168] }
  ];
  var scent = {
    draw: function (s, g, w, h) {
      var nx = s.inside ? s.px * w : w * (0.5 + 0.34 * Math.cos(s.t * 0.5));
      var ny = s.inside ? s.py * h : h * (0.55 + 0.22 * Math.sin(s.t * 0.8));
      for (var j = 0; j < 36; j++) {
        var S = SRC[j % 3], p = fract(s.t * 0.25 + hash(j));
        g.fillStyle = rgb(S.c, (1 - p) * 0.5);
        g.beginPath();
        g.arc(S.x * w + (hash(j + 0.5) - 0.5) * w * 0.3 * p + Math.sin(s.t + j) * 2, S.y * h - 5 - p * h * 0.36, 1.4 + p * 2.2, 0, TAU);
        g.fill();
      }
      var ws = SRC.map(function (S, i) {
        var d = Math.hypot(nx - S.x * w, ny - (S.y * h - h * 0.12));
        g.fillStyle = rgb(S.c); g.beginPath(); g.arc(S.x * w, S.y * h - 5, 3.5, 0, TAU); g.fill();
        label(g, S.s, S.x * w, S.y * h + 4, col.text2, 'center', 7.5);
        return { i: i, w: Math.exp(-d * d / (2 * Math.pow(0.24 * w, 2))) };
      });
      ws.forEach(function (o) {
        g.fillStyle = col.border; g.fillRect(w / 2 - 11 + o.i * 8, 5, 5, 14);
        g.fillStyle = rgb(SRC[o.i].c); g.fillRect(w / 2 - 11 + o.i * 8, 19 - 14 * o.w, 5, 14 * o.w);
      });
      g.strokeStyle = col.accent; g.lineWidth = 1.5; g.beginPath(); g.arc(nx, ny, 8, 0, TAU); g.stroke();
      g.fillStyle = col.accent; g.beginPath(); g.arc(nx, ny, 1.5, 0, TAU); g.fill();
      ws.sort(function (a, b) { return b.w - a.w; });
      if (!s.live()) s.say(s.hint);
      else if (ws[0].w < 0.25) s.say('e-nose reads: <b>nothing distinct</b>');
      else s.say('e-nose reads: <b>' + SRC[ws[0].i].n + '</b>' + (ws[1].w > 0.3 ? ' + ' + SRC[ws[1].i].n : ''));
    }
  };

  // ── SF20K: story-level questions need the whole film ───────────────────────
  var SF_N = 10;
  var sf20k = {
    init: function (s) { s.seen = []; s.lap = -1; },
    enter: function (s) { s.seen = []; },
    draw: function (s, g, w, h) {
      var lap = Math.floor(s.t / 5), x;
      if (s.inside) x = s.px * w;
      else { if (lap !== s.lap) { s.seen = []; s.lap = lap; } x = fract(s.t / 5) * w; }
      var fw = w / SF_N, y0 = h * 0.3, fh = h * 0.42, n = 0, i;
      label(g, '20,143 films · 3,582 h', w / 2, h * 0.13, col.text2, 'center', 7.5);
      g.fillStyle = col.text; g.globalAlpha = 0.9; g.fillRect(0, y0 - 6, w, fh + 12); g.globalAlpha = 1;
      for (i = 0; i < SF_N; i++) {
        var fx = i * fw;
        if (s.live() && Math.abs(fx + fw / 2 - x) < fw * 0.8) s.seen[i] = true;
        g.fillStyle = col.bg;
        g.fillRect(fx + fw / 2 - 1.5, y0 - 4.5, 3, 2.5); g.fillRect(fx + fw / 2 - 1.5, y0 + fh + 2, 3, 2.5);
        g.globalAlpha = s.seen[i] ? 1 : 0.18; g.fillRect(fx + 1, y0, fw - 2, fh); g.globalAlpha = 1;
        if (s.seen[i]) {
          n++;
          var q = i / (SF_N - 1);
          g.fillStyle = col.accent; g.beginPath(); g.arc(fx + 1 + (fw - 2) * (0.22 + 0.56 * q), y0 + fh * (0.62 - 0.3 * Math.sin(q * Math.PI)), 1.8, 0, TAU); g.fill();
          g.fillStyle = col.text; g.fillRect(fx + 1 + (fw - 2) * (0.78 - 0.56 * q) - 1.5, y0 + fh * 0.72 - 1.5, 3, 3);
        }
      }
      g.fillStyle = col.accent; g.fillRect(x - 0.75, y0 - 8, 1.5, fh + 16);
      label(g, n < SF_N ? 'Q: why did they part?  ' + n + '/' + SF_N : 'Q: why did they part?  ✓', w / 2, h * 0.9, n < SF_N ? col.text2 : col.accent, 'center', 7.5);
      s.say(!s.live() ? s.hint : n < SF_N ? 'watched ' + n + '/' + SF_N + ' shots: not enough to answer yet' : '<b>answered.</b> Story-level questions need the whole film');
    }
  };

  // ── Pulp Motion: actor and camera move together ────────────────────────────
  var pulp = {
    init: function (s) { s.fx = null; s.cam = null; },
    draw: function (s, g, w, h, dt) {
      var ww = w * 0.6, ground = h * 0.86, fh = h * 0.4;
      var target = s.inside ? clamp(s.px * w, 12, ww - 10) : ww * (0.55 + 0.28 * Math.sin(s.t * 0.7));
      if (s.fx == null) { s.fx = target; s.cam = target; }
      var prev = s.fx;
      s.fx = lerp(s.fx, target, ease(dt, 6)); s.cam = lerp(s.cam, s.fx, ease(dt, 2.2));
      var speed = dt ? Math.abs(s.fx - prev) / dt : 0, swing = Math.sin(s.t * 9) * clamp(speed / 12, 0.4, 3);
      g.strokeStyle = col.border; g.lineWidth = 1; g.beginPath(); g.moveTo(0, ground + 0.5); g.lineTo(ww, ground + 0.5); g.stroke();
      var cx = clamp(s.cam - ww * 0.36, 8, ww - 30), cy = h * 0.2;
      g.fillStyle = col.accent; g.globalAlpha = 0.14; g.beginPath();
      g.moveTo(cx, cy); g.lineTo(s.cam + 9, ground - fh - 5); g.lineTo(s.cam + 9, ground + 2); g.fill(); g.globalAlpha = 1;
      g.fillStyle = col.accent; g.fillRect(cx - 9, cy - 4, 9, 7);
      g.beginPath(); g.moveTo(cx, cy - 0.5); g.lineTo(cx + 4, cy - 4); g.lineTo(cx + 4, cy + 3); g.fill();
      figure(g, s.fx, ground, fh, swing, col.text);
      var iw = w * 0.34, ih = iw * 0.75, ix = w - iw - 5, iy = (h - ih) / 2;
      g.save(); g.beginPath(); g.rect(ix, iy, iw, ih); g.clip();
      g.fillStyle = col.border; g.globalAlpha = 0.35; g.fillRect(ix, iy, iw, ih); g.globalAlpha = 1;
      figure(g, ix + iw / 2 + (s.fx - s.cam) * 0.9, iy + ih * 0.95, ih * 0.78, swing, col.text);
      g.restore();
      g.strokeStyle = col.text2; g.lineWidth = 1; g.strokeRect(ix + 0.5, iy + 0.5, iw - 1, ih - 1);
      g.fillStyle = col.accent; g.beginPath(); g.arc(ix + 5, iy + 5, 1.8, 0, TAU); g.fill();
      label(g, 'on screen', ix + iw / 2, iy + ih + 7, col.text2, 'center', 7);
      return Math.abs(target - s.fx) > 0.3 || Math.abs(s.fx - s.cam) > 0.3;
    }
  };

  // ── Soft-Di[M]O: one step versus many ──────────────────────────────────────
  var DG = 6;
  function dimoPixel(i, j, hue) {
    var c;
    if (j >= 4) c = mix([40, 84, 150], [255, 190, 120], i === 2 || i === 3 ? 0.55 - (j - 4) * 0.2 : 0.08);
    else c = mix([255, 150, 90], [120, 90, 170], 1 - j / 3.2);
    if (j < 4 && Math.hypot(i - 2.5, j - 2.6) < 1.2) c = [255, 226, 130];
    return hue ? [c[2], c[0], c[1]] : c;
  }
  var dimo = {
    t0: 2.3,
    init: function (s) { s.hue = 0; },
    enter: function (s) { s.t = 0; },
    click: function (s) { s.t = 0; s.hue = 1 - s.hue; },
    draw: function (s, g, w, h) {
      var cs = Math.min((w - 24) / 2 / DG, (h - 20) / DG), gw = cs * DG, gap = (w - 2 * gw) / 3;
      var ph = s.t % 6.5, steps = Math.floor(clamp((ph - 0.5) / 3.2, 0, 1) * 16), fast = clamp((ph - 0.5) / 0.18, 0, 1);
      for (var side = 0; side < 2; side++) {
        var x0 = gap + side * (gw + gap), y0 = 4;
        for (var j = 0; j < DG; j++) for (var i = 0; i < DG; i++) {
          var idx = j * DG + i, shown = side ? fast : (hash(idx * 1.37) * 16 < steps ? 1 : 0);
          g.fillStyle = col.border; g.fillRect(x0 + i * cs + 0.5, y0 + j * cs + 0.5, cs - 1, cs - 1);
          if (shown) { g.globalAlpha = shown; g.fillStyle = rgb(dimoPixel(i, j, s.hue)); g.fillRect(x0 + i * cs + 0.5, y0 + j * cs + 0.5, cs - 1, cs - 1); g.globalAlpha = 1; }
        }
        var done = side ? fast >= 1 : steps >= 16;
        label(g, side ? (done ? '1 step ✓' : '1 step') : (done ? 'teacher ✓' : 'teacher · step ' + Math.max(1, steps)), x0 + gw / 2, y0 + gw + 8, side && done ? col.accent : col.text2, 'center', 7.5);
      }
      s.say(s.live() ? '<b>one step</b> instead of many · FID 1.56 on ImageNet-256' : s.hint);
    }
  };

  // ── DualHeads: reward tilting fixes rendered text ──────────────────────────
  var DH_LINES = ['REWARD-TILTED', 'FEW-STEP', 'DIFFUSION', 'MADE SIMPLE'], DH_GLYPHS = '#@%&$?!XZKQW';
  var dualheads = {
    init: function (s) { s.m = 0; },
    draw: function (s, g, w, h, dt) {
      var on = s.inside || (s.active && Math.floor(s.t / 3) % 2 === 1);
      s.m = lerp(s.m, on ? 1 : 0, ease(dt, 5));
      // share of correctly rendered characters follows the reported OCR accuracy
      var acc = lerp(0.59, 0.92, s.m), fs = Math.min(11, (w - 16) / (13 * 0.62)), lh = (h - 24) / DH_LINES.length;
      g.font = '600 ' + fs + 'px ' + MONO; g.textAlign = 'left'; g.textBaseline = 'middle';
      DH_LINES.forEach(function (line, li) {
        for (var ci = 0; ci < line.length; ci++) {
          if (line[ci] === ' ') continue;
          var ok = hash(li * 31 + ci * 7.3) < acc;
          g.fillStyle = ok ? col.text : col.text3;
          g.fillText(ok ? line[ci] : DH_GLYPHS[Math.floor(hash(li * 13 + ci + Math.floor(s.t * 6)) * DH_GLYPHS.length)], 8 + ci * fs * 0.62, 22 + lh * (li + 0.5));
        }
      });
      label(g, on ? 'OCR acc 0.92' : 'OCR acc 0.59', 6, 9, on ? col.accent : col.text2);
      s.say(!s.live() ? s.hint : on ? '<b>reward-tilted</b>: OCR accuracy 0.92, same inference cost' : '4-step base model: OCR accuracy 0.59');
      return Math.abs(s.m - (on ? 1 : 0)) > 0.01;
    }
  };

  // ── CameraVLM: the picture moves against the camera ────────────────────────
  var cameravlm = {
    init: function (s) { s.v = -0.8; s.off = 0; },
    draw: function (s, g, w, h, dt) {
      var target = s.inside ? (s.px - 0.5) * 2 : s.active ? Math.sin(s.t * 0.9) : -0.8;
      s.v = lerp(s.v, target, ease(dt, 6));
      if (s.live()) s.off -= s.v * dt * 46;
      var v = s.v, still = Math.abs(v) < 0.08;
      g.lineCap = 'round';
      for (var i = 0; i < 26; i++) {
        var depth = 0.35 + hash(i + 0.3) * 0.65;
        var x = ((hash(i) * w + s.off * depth) % w + w) % w, y = 16 + hash(i * 2.7) * (h - 46);
        g.strokeStyle = col.text3; g.lineWidth = 1;
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + v * depth * 11, y); g.stroke();
        g.fillStyle = col.text; g.beginPath(); g.arc(x, y, 0.8 + depth, 0, TAU); g.fill();
      }
      g.save(); g.translate(w / 2, h - 9); g.rotate(v * 0.55);
      g.fillStyle = col.accent; g.globalAlpha = 0.16;
      g.beginPath(); g.moveTo(0, -3); g.lineTo(-13, -22); g.lineTo(13, -22); g.fill(); g.globalAlpha = 1;
      g.fillRect(-5, -3, 10, 7); g.restore();
      label(g, still ? 'cam still' : v < 0 ? 'cam ← left' : 'cam right →', 6, 9, col.accent);
      label(g, still ? '' : v < 0 ? 'pixels right →' : '← pixels left', w - 6, 9, col.text2, 'right');
      s.say(!s.live() ? s.hint : still ? 'camera still, picture still' : 'camera pans <b>' + (v < 0 ? 'left' : 'right') + '</b>, the picture slides <b>' + (v < 0 ? 'right' : 'left') + '</b>');
      return Math.abs(s.v - target) > 0.01;
    }
  };

  // ── wire up ────────────────────────────────────────────────────────────────
  readColors();
  new MutationObserver(function () { readColors(); toys.forEach(function (s) { s.dirty = true; }); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  mount('zhu2026dualheads', 'Interactive: garbled rendered text that reward tilting corrects', 'hover: tilt the 4-step model towards the reward', dualheads);
  mount('cheng2026cameravlm', 'Interactive: pan a camera and watch the picture move the other way', 'pan the camera: which way does the picture move?', cameravlm);
  mount('xia2025muse', 'Interactive: one landscape re-rendered under different emotions', 'move across: steer the emotion of the scene', muse);
  mount('liu2025fakeparts', 'Interactive: find the locally manipulated region of an image', 'one region is AI-edited. Click where you think it is', fakeparts);
  mount('li2026vertigo', 'Interactive: a camera that loses or keeps its character in frame', 'hover the frame: apply preference optimisation', vertigo);
  mount('yin2026vigor', 'Interactive: a wireframe cube that becomes geometrically consistent', 'slide right: more geometry reward, less reprojection error', vigor);
  mount('tsonis2026scent', 'Interactive: an electronic nose moving between odour sources', 'move the e-nose: language names what the image cannot show', scent);
  mount('ghermi2024short', 'Interactive: scrub a film strip to answer a story-level question', 'scrub the film: can you answer before the end?', sf20k);
  mount('courant2025pulpmotion', 'Interactive: a camera following an actor to keep the framing', 'move the actor: the jointly generated camera keeps the framing', pulp);
  mount('zhu2025softdimo', 'Interactive: one-step generation racing a multi-step teacher', 'hover: race the multi-step teacher', dimo);

  requestAnimationFrame(loop);
})();
