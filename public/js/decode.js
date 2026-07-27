/* Decode-on-reveal headers + cycling role ticker.
 *
 * Headers matching the selectors below (plus anything with [data-decode])
 * scramble briefly and lock left-to-right the first time they enter the
 * viewport. Mono labels (eyebrows, section indexes) cycle through the full
 * ASCII pool; display headers cycle only through case-matched letters, so
 * serif text reads as typesetting settling rather than a glitch effect.
 *
 * The element with [data-ticker] (hero eyebrow) keeps cycling through the
 * roles in its data-roles attribute — the one element that stays alive.
 *
 * Respects prefers-reduced-motion: if set, this file does nothing and the
 * existing .reveal transitions (already reduced-motion-aware) take over.
 */
(function () {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var MONO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#&+-*/<>';
  var UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  var LOWER = 'abcdefghijklmnopqrstuvwxyz';
  var CYCLABLE = /[A-Za-z0-9]/;

  var SELECTORS = [
    '.eyebrow',
    '.index',
    '.section-title',
    '.hero-name',
    '.page-intro h1',
    '.project-body h3',
    '.m-title',
    '[data-decode]'
  ].join(',');

  function randFor(ch, pool) {
    if (pool === 'mono') return MONO[(Math.random() * MONO.length) | 0];
    if (UPPER.indexOf(ch) > -1) return UPPER[(Math.random() * 26) | 0];
    if (LOWER.indexOf(ch) > -1) return LOWER[(Math.random() * 26) | 0];
    return ch;
  }

  /* Wrap every character in a span, preserving markup (<em>, .tick, links).
     Final characters render invisibly (.pre) so there is no layout shift.
     The original text becomes an aria-label; spans are hidden from AT so
     screen readers get one clean string instead of per-character noise. */
  function prepare(el) {
    var spans = [];
    var label = (el.textContent || '').replace(/\s+/g, ' ').trim();
    if (label && !el.hasAttribute('aria-label')) el.setAttribute('aria-label', label);
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = document.createDocumentFragment();
          Array.from(n.textContent).forEach(function (ch) {
            var s = document.createElement('span');
            s.className = 'dc pre';
            s.textContent = ch;
            s.dataset.ch = ch;
            s.setAttribute('aria-hidden', 'true');
            frag.appendChild(s);
            spans.push(s);
          });
          node.replaceChild(frag, n);
        } else if (n.nodeType === 1 && !n.hasAttribute('data-ticker')) {
          walk(n);
        }
      });
    })(el);
    return spans;
  }

  /* Cycle then lock left-to-right. Lock speed scales with length so short
     and long headers both resolve in roughly 1.2s. */
  function decode(spans, pool) {
    if (!spans.length) return;
    var lockStep = Math.min(55, Math.max(18, 950 / spans.length));
    var start = performance.now();
    var iv = setInterval(function () {
      var now = performance.now();
      var allLocked = true;
      spans.forEach(function (s, i) {
        if (s.dataset.done) return;
        var ch = s.dataset.ch;
        var cyclable = CYCLABLE.test(ch);
        var lockAt = start + (cyclable ? 200 + i * lockStep : 60 + i * lockStep * 0.4);
        if (now >= lockAt) {
          s.textContent = ch;
          s.className = 'dc';
          s.dataset.done = '1';
        } else {
          allLocked = false;
          s.className = 'dc cyc';
          s.textContent = cyclable ? randFor(ch, pool) : ch;
        }
      });
      if (allLocked) clearInterval(iv);
    }, 38);
  }

  function lockNow(spans) {
    spans.forEach(function (s) {
      s.textContent = s.dataset.ch;
      s.className = 'dc';
      s.dataset.done = '1';
    });
  }

  function initHeaders() {
    var targets = [];
    Array.prototype.slice.call(document.querySelectorAll(SELECTORS)).forEach(function (el) {
      if (el.dataset.decoded) return;
      el.dataset.decoded = '1';
      var pool = (el.matches('.eyebrow, .index') || el.dataset.pool === 'mono') ? 'mono' : 'serif';
      targets.push({ el: el, spans: prepare(el), pool: pool, fired: false });
    });
    if (!targets.length) return;

    if (!('IntersectionObserver' in window)) {
      targets.forEach(function (t) { lockNow(t.spans); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        for (var i = 0; i < targets.length; i++) {
          if (targets[i].el === e.target && !targets[i].fired) {
            targets[i].fired = true;
            decode(targets[i].spans, targets[i].pool);
            io.unobserve(e.target);
            break;
          }
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.2 });
    targets.forEach(function (t) { io.observe(t.el); });

    /* Safety net, mirroring the .reveal one: if the observer never fires at
       all (broken/blocked), show everything. Otherwise trust it — below-fold
       headers must stay armed so they can decode when scrolled to. */
    setTimeout(function () {
      var any = targets.some(function (t) { return t.fired; });
      if (!any) {
        targets.forEach(function (t) { t.fired = true; lockNow(t.spans); io.unobserve(t.el); });
      }
    }, 1800);
  }

  function initTicker() {
    var el = document.querySelector('[data-ticker]');
    if (!el) return;
    var roles = (el.getAttribute('data-roles') || '').split('|').filter(Boolean);
    if (!roles.length) return;

    var width = 0;
    roles.forEach(function (r) { width = Math.max(width, r.length); });
    var label = el.getAttribute('aria-label') || roles.join(', ');
    el.setAttribute('aria-label', label);
    el.textContent = '';
    var cells = [];
    for (var i = 0; i < width; i++) {
      var s = document.createElement('span');
      s.className = 'tkc';
      s.textContent = '\u00A0';
      s.setAttribute('aria-hidden', 'true');
      el.appendChild(s);
      cells.push(s);
    }

    var iv = null;
    function show(text, baseDelay) {
      if (iv) clearInterval(iv);
      var line = text;
      while (line.length < width) line += ' ';
      var start = performance.now() + (baseDelay || 0);
      iv = setInterval(function () {
        var now = performance.now();
        var allLocked = true;
        cells.forEach(function (cell, i) {
          var lockAt = start + 240 + i * 55;
          if (now >= lockAt) {
            var ch = line[i];
            cell.textContent = ch === ' ' ? '\u00A0' : ch;
            cell.className = 'tkc on';
          } else if (now >= start) {
            allLocked = false;
            cell.className = 'tkc';
            cell.textContent = MONO[(Math.random() * MONO.length) | 0];
          } else {
            allLocked = false;
          }
        });
        if (allLocked) { clearInterval(iv); iv = null; }
      }, 38);
    }

    var ri = 0;
    show(roles[0], 700);
    setInterval(function () {
      ri = (ri + 1) % roles.length;
      show(roles[ri]);
    }, 4200);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { initHeaders(); initTicker(); });
  } else {
    initHeaders();
    initTicker();
  }
})();
