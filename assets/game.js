/* Bolt to Home — site-as-game engine.
   HUD timer + gem counter, section reveals, scroll energy bar, floating specks,
   and LEVEL 0: a playable 3x3 sliding-tile puzzle (slide tiles into the gap,
   connect the bolt to the home — same mechanic as the game). Vanilla JS. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- HUD timer ---------- */
  var t0 = Date.now();
  var timerEl = $('#hudTimer');
  if (timerEl) {
    setInterval(function () {
      var s = Math.floor((Date.now() - t0) / 1000);
      var m = Math.floor(s / 60); s = s % 60;
      timerEl.textContent = (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
    }, 1000);
  }

  /* ---------- gems ---------- */
  var gems = 0, shown = 0, gemEl = $('#hudGems'), gemHero = $('#heroGems'), gemRaf = null;
  function drawGems() {
    shown += (gems - shown) * 0.18;
    if (Math.abs(gems - shown) < 0.6) { shown = gems; }
    var v = Math.round(shown);
    if (gemEl) gemEl.textContent = v;
    if (gemHero) gemHero.textContent = v;
    if (shown !== gems) gemRaf = requestAnimationFrame(drawGems); else gemRaf = null;
  }
  function addGems(n) { gems += n; if (!gemRaf) gemRaf = requestAnimationFrame(drawGems); }

  /* ---------- floating specks ---------- */
  var stars = $('#stars');
  if (stars) {
    for (var i = 0; i < 26; i++) {
      var sp = document.createElement('i');
      sp.className = 'spk';
      var sz = 2 + Math.random() * 3;
      sp.style.width = sz + 'px'; sp.style.height = sz + 'px';
      sp.style.left = (Math.random() * 100) + '%';
      sp.style.top = (Math.random() * 100) + '%';
      sp.style.setProperty('--d', (4 + Math.random() * 5) + 's');
      sp.style.setProperty('--dl', (Math.random() * 6) + 's');
      sp.style.setProperty('--o', (0.25 + Math.random() * 0.5).toFixed(2));
      stars.appendChild(sp);
    }
  }

  /* ---------- scroll energy bar + section reveals + footer ---------- */
  var fill = $('#scrollfill');
  function onScroll() {
    if (!fill) return;
    var h = document.documentElement;
    var max = h.scrollHeight - h.clientHeight;
    fill.style.width = (max > 0 ? (h.scrollTop / max) * 100 : 0) + '%';
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('on');
        if (!e.target.dataset.gemmed) { e.target.dataset.gemmed = '1'; addGems(5); }
        io.unobserve(e.target);
      });
    }, { threshold: 0.15 });
    $$('.gsec').forEach(function (s) { io.observe(s); });

    var foot = $('footer');
    if (foot) {
      var fio = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { foot.classList.add('lit'); fio.disconnect(); } });
      }, { threshold: 0.5 });
      fio.observe(foot);
    }
  } else {
    $$('.gsec').forEach(function (s) { s.classList.add('on'); });
  }

  /* ---------- LEVEL 0 mini-game ---------- */
  var stage = $('#stage');
  if (!stage) return;
  var titleStage = $('#titleStage'), playStage = $('#playStage'),
      board = $('#board'), banner = $('#winBanner'),
      portHome = $('#portHome'), portBolt = $('#portBolt'),
      stubHome = $('#stubHome'), stubBolt = $('#stubBolt');
  if (!board) return;

  var GAP = 8, N = 3;
  // Each scramble: 9 cells (row-major), value = dirs string or null (the gap).
  // Solved when the bolt (below cell 7, feeding N into its S port) reaches the
  // home (above cell 1, fed from its N port) through matching tile ports.
  var SCRAMBLES = [
    ['ES', 'NS', 'SW', 'NS', null, 'EW', 'NE', 'NS', 'NW'],
    [null, 'EW', 'SW', 'NS', 'NS', 'NE', 'EW', 'NS', 'NW'],
    ['ES', 'NS', 'SW', 'NE', 'NS', 'NW', null, 'EW', 'NS']
  ];
  var scrambleIdx = 0, cells = [], tiles = [], won = false;

  function segFor(d) {
    var m = { N: '50,50 50,0', S: '50,50 50,100', E: '50,50 100,50', W: '50,50 0,50' };
    return '<polyline class="seg" points="' + m[d] + '"/>';
  }
  function tileSvg(dirs) {
    var s = '<svg viewBox="0 0 100 100" aria-hidden="true">';
    for (var i = 0; i < dirs.length; i++) s += segFor(dirs[i]);
    return s + '</svg>';
  }
  function cellSize() { return (board.clientWidth - 2 * GAP - 16) / N; } // 16 = board padding*2
  function place(el, idx) {
    var r = Math.floor(idx / N), c = idx % N, cs = cellSize();
    var tf = 'translate(' + (c * (cs + GAP)) + 'px,' + (r * (cs + GAP)) + 'px)';
    el.style.width = cs + 'px'; el.style.height = cs + 'px';
    el.style.transform = tf;
    el.style.setProperty('--tf', tf);
  }

  function build() {
    won = false;
    stage.classList.remove('won');
    board.classList.remove('moved');
    if (banner) banner.classList.remove('show');
    [portHome, portBolt].forEach(function (p) { if (p) p.classList.remove('lit', 'charged'); });
    [stubHome, stubBolt].forEach(function (p) { if (p) p.classList.remove('lit', 'charged'); });
    board.innerHTML = '';
    cells = SCRAMBLES[scrambleIdx].slice();
    tiles = [];
    cells.forEach(function (dirs, idx) {
      if (!dirs) { tiles.push(null); return; }
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'tile';
      b.setAttribute('aria-label', 'Slide tile');
      b.innerHTML = tileSvg(dirs);
      b.addEventListener('click', function () { slide(tiles.indexOf(b)); });
      board.appendChild(b);
      place(b, idx);
      tiles.push(b);
    });
    refresh();
  }

  function neighbors(idx) {
    var r = Math.floor(idx / N), c = idx % N, out = [];
    if (r > 0) out.push(idx - N);
    if (r < N - 1) out.push(idx + N);
    if (c > 0) out.push(idx - 1);
    if (c < N - 1) out.push(idx + 1);
    return out;
  }

  function slide(idx) {
    if (won || idx < 0) return;
    var gap = cells.indexOf(null);
    if (neighbors(idx).indexOf(gap) === -1) return;
    cells[gap] = cells[idx]; cells[idx] = null;
    tiles[gap] = tiles[idx]; tiles[idx] = null;
    place(tiles[gap], gap);
    board.classList.add('moved');
    refresh();
  }

  // BFS from the bolt across matching tile ports; returns visited set.
  function flood() {
    var OPP = { N: 'S', S: 'N', E: 'W', W: 'E' };
    var DELTA = { N: -N, S: N, E: 1, W: -1 };
    var start = 7; // bottom-middle; the bolt feeds its S edge
    var visited = {};
    if (!cells[start] || cells[start].indexOf('S') === -1) return visited;
    var q = [start]; visited[start] = true;
    while (q.length) {
      var cur = q.shift(), dirs = cells[cur];
      for (var i = 0; i < dirs.length; i++) {
        var d = dirs[i], r = Math.floor(cur / N), c = cur % N;
        if (d === 'N' && r === 0) continue; if (d === 'S' && r === N - 1) continue;
        if (d === 'W' && c === 0) continue; if (d === 'E' && c === N - 1) continue;
        var nx = cur + DELTA[d];
        if (visited[nx] || !cells[nx]) continue;
        if (cells[nx].indexOf(OPP[d]) !== -1) { visited[nx] = true; q.push(nx); }
      }
    }
    return visited;
  }

  function refresh() {
    var gap = cells.indexOf(null);
    var vis = flood();
    var connected = !!vis[7];
    var solved = !!(vis[1] && cells[1] && cells[1].indexOf('N') !== -1);
    tiles.forEach(function (t, idx) {
      if (!t) return;
      t.classList.toggle('canmove', neighbors(idx).indexOf(gap) !== -1 && !won);
      t.classList.toggle('charged', !solved && !!vis[idx]);
      t.classList.toggle('lit', solved && !!vis[idx]);
    });
    if (portBolt) portBolt.classList.toggle('charged', connected && !solved);
    if (stubBolt) stubBolt.classList.toggle('charged', connected && !solved);
    if (solved) win();
  }

  function win() {
    if (won) return;
    won = true;
    stage.classList.add('won');
    if (portHome) portHome.classList.add('lit');
    if (stubHome) stubHome.classList.add('lit');
    addGems(20);
    for (var i = 0; i < 18; i++) {
      var sp = document.createElement('span');
      sp.className = 'spark';
      var a = Math.random() * Math.PI * 2, d = 70 + Math.random() * 110;
      sp.style.setProperty('--dx', Math.cos(a) * d + 'px');
      sp.style.setProperty('--dy', Math.sin(a) * d + 'px');
      sp.style.background = ['#58f6ff', '#ffc107', '#7cff9b', '#fff'][i % 4];
      sp.style.boxShadow = '0 0 8px ' + ['#58f6ff', '#ffc107', '#7cff9b', '#fff'][i % 4];
      playStage.appendChild(sp);
      sp.addEventListener('animationend', function () { this.remove(); });
    }
    setTimeout(function () { if (banner) banner.classList.add('show'); }, 650);
  }

  var startBtn = $('#startBtn');
  if (startBtn) startBtn.addEventListener('click', function () {
    titleStage.classList.add('out');
    playStage.classList.add('in');
    build();
  });
  $$('.js-replay').forEach(function (b) {
    b.addEventListener('click', function () {
      scrambleIdx = (scrambleIdx + 1) % SCRAMBLES.length;
      build();
    });
  });
  window.addEventListener('resize', function () {
    tiles.forEach(function (t, idx) { if (t) place(t, idx); });
  });
})();
