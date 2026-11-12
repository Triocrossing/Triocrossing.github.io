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

  // ── Soft-Di[M]O: hard tokens versus soft embeddings ────────────────────────
  // dimoPixel (a tiny sunset picture) is also used by the Di[M]O toy below.
  function dimoPixel(i, j, hue) {
    var c;
    if (j >= 4) c = mix([40, 84, 150], [255, 190, 120], i === 2 || i === 3 ? 0.55 - (j - 4) * 0.2 : 0.08);
    else c = mix([255, 150, 90], [120, 90, 170], 1 - j / 3.2);
    if (j < 4 && Math.hypot(i - 2.5, j - 2.6) < 1.2) c = [255, 226, 130];
    return hue ? [c[2], c[0], c[1]] : c;
  }
  var CODEBOOK = [[232, 86, 70], [244, 160, 60], [240, 212, 90], [96, 184, 120], [70, 140, 220], [150, 100, 200]];
  var dimo = {
    draw: function (s, g, w, h) {
      // the generator's categorical distribution over codebook entries, peaked at c
      var K = CODEBOOK.length, c = (s.inside ? s.px : 0.5 - 0.5 * Math.cos(s.t * 0.7)) * (K - 1);
      var p = [], sum = 0, best = 0, soft = [0, 0, 0], i;
      for (i = 0; i < K; i++) { p[i] = Math.exp(-Math.pow(i - c, 2) / 0.9); sum += p[i]; }
      for (i = 0; i < K; i++) {
        p[i] /= sum; if (p[i] > p[best]) best = i;
        soft[0] += p[i] * CODEBOOK[i][0]; soft[1] += p[i] * CODEBOOK[i][1]; soft[2] += p[i] * CODEBOOK[i][2];
      }
      var bx = 8, bwid = w * 0.42, bw = bwid / K, base = h - 16, top = 18;
      for (i = 0; i < K; i++) {
        g.fillStyle = col.border; g.fillRect(bx + i * bw + 1, top, bw - 2, base - top);
        g.fillStyle = rgb(CODEBOOK[i]); g.fillRect(bx + i * bw + 1, base - (base - top) * p[i] / 0.62, bw - 2, (base - top) * p[i] / 0.62);
      }
      label(g, 'p(token)', bx + bwid / 2, h - 7, col.text2, 'center', 7.5);
      var sx = w * 0.56, sz = Math.min(24, (h - 26) / 2), y1 = 12, y2 = y1 + sz + 10;
      [[y1, CODEBOOK[best], 'argmax', '∇ blocked', col.text2], [y2, soft, 'soft emb.', '∇ flows', col.accent]].forEach(function (r) {
        g.strokeStyle = col.text3; g.lineWidth = 1; g.beginPath(); g.moveTo(bx + bwid + 3, r[0] + sz / 2); g.lineTo(sx - 3, r[0] + sz / 2); g.stroke();
        g.fillStyle = rgb(r[1]); g.fillRect(sx, r[0], sz, sz);
        label(g, r[2], sx + sz + 5, r[0] + sz / 2 - 5, col.text, 'left', 7.5);
        label(g, r[3], sx + sz + 5, r[0] + sz / 2 + 5, r[4], 'left', 7.5);
      });
      s.say(s.live() ? 'hard tokens jump; the <b>soft embedding</b> blends the codebook, so gradients flow' : s.hint);
    }
  };

  // Small dark pill with light text, readable on top of a drawn picture.
  function tag(g, txt, x, y, align, color) {
    g.font = '600 8px ' + MONO;
    var tw = g.measureText(txt).width + 8, x0 = align === 'right' ? x - tw : x;
    g.fillStyle = 'rgba(12,10,8,.62)'; g.fillRect(x0, y - 6, tw, 12);
    g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillStyle = color || '#fff';
    g.fillText(txt, x0 + 4, y + 0.5);
  }

  // ── DualHeads: reward tilting fixes the text in a generated picture ────────
  var DH_SIGN = [['DUAL HEADS', 1], ['FEW-STEP DIFFUSION', 0.56]], DH_GLYPHS = 'ÆΞЯИΛØЖΣҔЦ';
  var dualheads = {
    init: function (s) { s.m = 0; },
    draw: function (s, g, w, h, dt) {
      var on = s.inside || (s.active && Math.floor(s.t / 3) % 2 === 1);
      s.m = lerp(s.m, on ? 1 : 0, ease(dt, 5));
      // share of correctly rendered characters follows the reported OCR accuracy
      var acc = lerp(0.59, 0.92, s.m), i;
      // shop front: wall, sign board, awning, door and windows
      var wall = g.createLinearGradient(0, 0, 0, h);
      wall.addColorStop(0, 'rgb(226,200,164)'); wall.addColorStop(1, 'rgb(198,166,128)');
      g.fillStyle = wall; g.fillRect(0, 0, w, h);
      var bx = 9, by = 7, bw = w - 18, bh = h * 0.42;
      g.fillStyle = 'rgb(120,92,62)'; g.fillRect(bx - 2, by - 2, bw + 4, bh + 4);
      g.fillStyle = 'rgb(26,66,58)'; g.fillRect(bx, by, bw, bh);
      var fs = Math.min(15, (bw - 10) / (10 * 0.62));
      g.textAlign = 'center'; g.textBaseline = 'middle';
      DH_SIGN.forEach(function (row, li) {
        var size = fs * row[1], cw = size * 0.62, line = row[0], x0 = w / 2 - (line.length - 1) * cw / 2;
        g.font = '700 ' + size + 'px ' + MONO;
        for (var ci = 0; ci < line.length; ci++) {
          if (line[ci] === ' ') continue;
          var ok = hash(li * 31 + ci * 7.3) < acc;
          g.fillStyle = ok ? 'rgb(246,232,200)' : 'rgba(246,232,200,.78)';
          g.fillText(ok ? line[ci] : DH_GLYPHS[Math.floor(hash(li * 13 + ci + Math.floor(s.t * 1.2)) * DH_GLYPHS.length)], x0 + ci * cw, by + bh * (li ? 0.74 : 0.36));
        }
      });
      var ay = by + bh + 5, ah = h * 0.11, n = 9, sw = (w + 8) / n;
      for (i = 0; i < n; i++) { g.fillStyle = i % 2 ? 'rgb(244,238,226)' : 'rgb(190,64,52)'; g.fillRect(-4 + i * sw, ay, sw + 0.5, ah); }
      var gy = ay + ah + 4, gh = h - gy - 5;
      [[10, w * 0.3 - 10], [w * 0.7, w * 0.3 - 10]].forEach(function (p) {
        var glass = g.createLinearGradient(0, gy, 0, gy + gh);
        glass.addColorStop(0, 'rgb(150,190,214)'); glass.addColorStop(1, 'rgb(92,128,156)');
        g.fillStyle = 'rgb(120,92,62)'; g.fillRect(p[0] - 1.5, gy - 1.5, p[1] + 3, gh + 3);
        g.fillStyle = glass; g.fillRect(p[0], gy, p[1], gh);
      });
      g.fillStyle = 'rgb(74,50,36)'; g.fillRect(w / 2 - w * 0.09, gy - 2, w * 0.18, gh + 7);
      g.fillStyle = 'rgb(226,190,110)'; g.beginPath(); g.arc(w / 2 + w * 0.055, gy + gh * 0.55, 1.3, 0, TAU); g.fill();
      g.fillStyle = 'rgb(120,104,90)'; g.fillRect(0, h - 4, w, 4);
      tag(g, on ? 'OCR acc 0.92' : 'OCR acc 0.59', 4, h - 9, 'left', on ? 'rgb(255,196,120)' : '#fff');
      s.say(!s.live() ? s.hint : on ? '<b>reward-tilted</b>: OCR accuracy 0.92, same inference cost' : '4-step base model: OCR accuracy 0.59');
      return Math.abs(s.m - (on ? 1 : 0)) > 0.01;
    }
  };

  // ── CameraVLM: the picture moves against the camera ────────────────────────
  function wrap(x, period) { return ((x % period) + period) % period; }
  var cameravlm = {
    init: function (s) { s.v = -0.8; s.off = 0; },
    draw: function (s, g, w, h, dt) {
      var target = s.inside ? (s.px - 0.5) * 2 : s.active ? Math.sin(s.t * 0.9) : -0.8;
      s.v = lerp(s.v, target, ease(dt, 6));
      if (s.live()) s.off -= s.v * dt * 46;
      var v = s.v, still = Math.abs(v) < 0.08, o = s.off, x, k;
      var sky = g.createLinearGradient(0, 0, 0, h * 0.7);
      sky.addColorStop(0, 'rgb(120,170,224)'); sky.addColorStop(1, 'rgb(244,214,170)');
      g.fillStyle = sky; g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgb(255,236,190)'; g.beginPath(); g.arc(wrap(w * 0.7 + o * 0.06, w + 30) - 15, h * 0.3, 7, 0, TAU); g.fill();
      // far mountains, mid hills with trees, near fence: nearer layers slide faster
      g.fillStyle = 'rgb(112,128,168)'; g.beginPath(); g.moveTo(0, h);
      for (x = 0; x <= w + 3; x += 3) g.lineTo(x, h * 0.55 - Math.sin((x - o * 0.25) * 0.04) * 8 - Math.sin((x - o * 0.25) * 0.013 + 1) * 10);
      g.lineTo(w, h); g.fill();
      function hill(xx) { return h * 0.7 - Math.sin((xx - o * 0.6) * 0.05 + 2) * 5; }
      g.fillStyle = 'rgb(96,150,96)'; g.beginPath(); g.moveTo(0, h);
      for (x = 0; x <= w + 3; x += 3) g.lineTo(x, hill(x));
      g.lineTo(w, h); g.fill();
      g.fillStyle = 'rgb(40,92,66)';
      for (k = 0; k < 6; k++) {
        var tx = wrap(k * 37 + hash(k) * 14 + o * 0.6, w + 24) - 12, ty = hill(tx) + 2, th = 12 + hash(k + 0.4) * 7;
        g.beginPath(); g.moveTo(tx, ty - th); g.lineTo(tx - 5, ty); g.lineTo(tx + 5, ty); g.fill();
      }
      g.fillStyle = 'rgb(134,104,70)'; g.fillRect(0, h * 0.86, w, h * 0.14);
      g.fillStyle = 'rgb(236,226,206)'; g.fillRect(0, h * 0.8, w, 1.5);
      for (k = 0; k < 12; k++) g.fillRect(wrap(k * 16 + o * 1.25, w + 16) - 8, h * 0.76, 2.5, h * 0.12);
      if (!still) {
        var ax = w / 2, ay = h * 0.5, d = v < 0 ? 1 : -1, len = 9 + Math.abs(v) * 9;
        g.strokeStyle = 'rgba(255,255,255,.9)'; g.fillStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 2; g.lineCap = 'round';
        g.beginPath(); g.moveTo(ax - d * len, ay); g.lineTo(ax + d * len, ay); g.stroke();
        g.beginPath(); g.moveTo(ax + d * (len + 5), ay); g.lineTo(ax + d * len, ay - 4); g.lineTo(ax + d * len, ay + 4); g.fill();
      }
      tag(g, still ? 'camera still' : v < 0 ? 'camera ← left' : 'camera right →', 4, 9, 'left', 'rgb(255,196,120)');
      s.say(!s.live() ? s.hint : still ? 'camera still, picture still' : 'camera pans <b>' + (v < 0 ? 'left' : 'right') + '</b>, the picture slides <b>' + (v < 0 ? 'right' : 'left') + '</b>');
      return Math.abs(s.v - target) > 0.01;
    }
  };

  // ── Di[M]O: many teacher steps distilled into one ──────────────────────────
  var dimoDistill = {
    init: function (s) { s.m = 0; },
    draw: function (s, g, w, h, dt) {
      var on = s.inside || (s.active && Math.floor(s.t / 3.5) % 2 === 1);
      s.m = lerp(s.m, on ? 1 : 0, ease(dt, 5));
      var m = s.m, G = 4, cs = Math.min(9, (h - 30) / G), gw = cs * G, y0 = (h - gw) / 2 + 3, xl = 8, xr = w - 8 - gw, i, j;
      for (j = 0; j < G; j++) for (i = 0; i < G; i++) {
        // student input: masks mixed with random tokens; teacher input: all masks
        var rnd = hash(i * 5.3 + j * 9.1) < 0.45;
        g.fillStyle = col.border; g.fillRect(xl + i * cs + 0.5, y0 + j * cs + 0.5, cs - 1, cs - 1);
        if (rnd) { g.globalAlpha = m; g.fillStyle = rgb(dimoPixel(Math.floor(hash(i + j * 4.7) * 6), Math.floor(hash(i * 3.1 + j) * 6))); g.fillRect(xl + i * cs + 0.5, y0 + j * cs + 0.5, cs - 1, cs - 1); g.globalAlpha = 1; }
        g.fillStyle = rgb(dimoPixel(Math.round(i * 5 / 3), Math.round(j * 5 / 3))); g.fillRect(xr + i * cs + 0.5, y0 + j * cs + 0.5, cs - 1, cs - 1);
      }
      var x1 = xl + gw + 5, x2 = xr - 5, cy = y0 + gw / 2, K = 9, run = fract(s.t / 2.2);
      for (i = 0; i < K; i++) {
        var q = (i + 0.5) / K, px = lerp(x1, x2, q), py = cy + Math.sin(q * TAU * 1.5) * 9 * (1 - m);
        g.globalAlpha = 1 - m; g.fillStyle = Math.floor(run * K) === i ? col.accent : col.text3;
        g.beginPath(); g.arc(px, py, 1.8, 0, TAU); g.fill();
      }
      g.globalAlpha = m; g.strokeStyle = col.accent; g.fillStyle = col.accent; g.lineWidth = 1.6;
      g.beginPath(); g.moveTo(x1, cy); g.lineTo(x2 - 4, cy); g.stroke();
      g.beginPath(); g.moveTo(x2, cy); g.lineTo(x2 - 6, cy - 4); g.lineTo(x2 - 6, cy + 4); g.fill();
      g.globalAlpha = 1;
      label(g, on ? '1 step' : 'teacher: many steps', w / 2, 9, on ? col.accent : col.text2, 'center');
      s.say(!s.live() ? s.hint : on ? '<b>distilled</b>: one step, from masks mixed with random tokens' : 'masked diffusion teacher: many unmasking steps');
      return Math.abs(s.m - (on ? 1 : 0)) > 0.01;
    }
  };

  // ── AKiRa: optical controls, zoom and bokeh ────────────────────────────────
  var akira = {
    draw: function (s, g, w, h) {
      var fx = s.inside ? s.px : 0.5 + 0.5 * Math.sin(s.t * 0.7), ap = s.inside ? 1 - s.py : 0.5 + 0.5 * Math.sin(s.t * 1.1 + 1);
      var zoom = lerp(1, 1.9, fx), cx = w / 2, cy = h * 0.55;
      var hues = [[255, 196, 110], [255, 140, 120], [150, 190, 255], [255, 230, 170]];
      for (var i = 0; i < 12; i++) {
        var x = cx + (hash(i) - 0.5) * w * 1.1 * zoom, y = cy + (hash(i * 3.7) - 0.62) * h * 0.9 * zoom;
        g.fillStyle = rgb(hues[i % 4], lerp(0.95, 0.32, ap));
        g.beginPath(); g.arc(x, y, (1.6 + ap * 6.5) * zoom, 0, TAU); g.fill();
      }
      figure(g, cx, cy + h * 0.2 * zoom, h * 0.36 * zoom, 0, col.text);
      label(g, Math.round(lerp(24, 85, fx)) + 'mm', 6, 9, col.accent);
      label(g, 'f/' + lerp(16, 1.4, ap).toFixed(1), w - 6, 9, col.accent, 'right');
    }
  };

  // ── CFG schedulers: constant versus increasing guidance ────────────────────
  var cfg = {
    draw: function (s, g, w, h) {
      var k = s.inside ? s.px : 0.5 - 0.5 * Math.cos(s.t * 0.8);
      var x0 = 10, x1 = w - 8, yb = h - 12, yt = 20, mid = (yb + yt) / 2 + 4;
      function wy(q) { return lerp(mid, lerp(yb - 3, yt, q), k); }
      g.strokeStyle = col.border; g.lineWidth = 1;
      g.beginPath(); g.moveTo(x0, yt - 4); g.lineTo(x0, yb); g.lineTo(x1, yb); g.stroke();
      g.setLineDash([3, 3]); g.strokeStyle = col.text3;
      g.beginPath(); g.moveTo(x0, mid); g.lineTo(x1, mid); g.stroke(); g.setLineDash([]);
      g.strokeStyle = col.accent; g.lineWidth = 1.8;
      g.beginPath(); g.moveTo(x0, wy(0)); g.lineTo(x1, wy(1)); g.stroke();
      var q = fract(s.t / 2.5);
      g.fillStyle = col.accent; g.beginPath(); g.arc(lerp(x0, x1, q), wy(q), 2.6, 0, TAU); g.fill();
      label(g, k < 0.2 ? 'constant ω' : 'increasing ω(t)', 6, 9, k < 0.2 ? col.text2 : col.accent);
      label(g, 'noise → image', (x0 + x1) / 2, h - 5, col.text3, 'center', 7);
      s.say(!s.live() ? s.hint : k < 0.2 ? 'constant guidance weight: the usual default' : '<b>increasing guidance</b>: a one-line change that consistently helps');
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
  mount('zhu2025softdimo', 'Interactive: a token distribution turned into a hard token or a soft embedding', 'slide: shift the token distribution, compare hard and soft', dimo);
  mount('zhu2025di', 'Interactive: a multi-step masked diffusion teacher distilled into one step', 'hover: distil the many-step teacher into one step', dimoDistill);
  mount('wang2024akira', 'Interactive: change focal length and aperture of a virtual lens', 'move: focal length (left-right) and aperture (up-down)', akira);
  mount('wang2024analysis', 'Interactive: a guidance weight schedule from constant to increasing', 'slide right: from constant to increasing guidance', cfg);

  requestAnimationFrame(loop);
})();
