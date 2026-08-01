(function(){
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- sticky nav ---------- */
  var nav = document.getElementById('nav');
  var onScroll = function(){ nav.classList.toggle('stuck', window.scrollY > 8); };
  onScroll(); window.addEventListener('scroll', onScroll, {passive:true});

  /* ---------- mobile menu ---------- */
  var burger = document.getElementById('burger'), mobile = document.getElementById('mobile');
  burger.addEventListener('click', function(){
    var open = mobile.classList.toggle('open');
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  });
  function closeMobile(){
    mobile.classList.remove('open');
    burger.setAttribute('aria-expanded','false');
    burger.setAttribute('aria-label','Open menu');
  }
  mobile.addEventListener('click', function(e){
    if(e.target.tagName === 'A'){ closeMobile(); }
  });
  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape' && mobile.classList.contains('open')){ closeMobile(); burger.focus(); }
  });

  /* ---------- reveal on scroll ----------
     IntersectionObserver drives the effect, but scrolling is not the only way an
     element reaches the screen: browser zoom, window resize and find-in-page all
     change the viewport without a scroll, and IO does not reliably re-evaluate
     for those. A geometry sweep on resize and on load guarantees that anything
     genuinely on screen gets revealed, so the page can never sit blank. */
  var pending = [].slice.call(document.querySelectorAll('.rv'));

  function revealInView(){
    var h = window.innerHeight || document.documentElement.clientHeight;
    for(var i = pending.length - 1; i >= 0; i--){
      var el = pending[i];
      if(el.classList.contains('in')){ pending.splice(i, 1); continue; }
      var r = el.getBoundingClientRect();
      if(r.top < h * 0.92 && r.bottom > 0){
        el.classList.add('in');
        pending.splice(i, 1);
      }
    }
  }

  if(!('IntersectionObserver' in window)){
    /* no IO support: show everything rather than hide everything */
    pending.forEach(function(el){ el.classList.add('in'); });
    pending.length = 0;
  } else {
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        if(en.isIntersecting){ en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, {rootMargin:'0px 0px -12% 0px', threshold:.08});
    document.querySelectorAll('.rv:not(.in)').forEach(function(el){ io.observe(el); });
  }

  revealInView();
  window.addEventListener('load', revealInView);
  window.addEventListener('resize', function(){
    revealInView();
    if(window.innerWidth > 820) closeMobile();
  }, {passive:true});

  /* ---------- bar chart fill ---------- */
  var barsWrap = document.getElementById('bars');
  var barIO = new IntersectionObserver(function(entries){
    entries.forEach(function(en){
      if(!en.isIntersecting) return;
      en.target.querySelectorAll('.bar-fill').forEach(function(f, i){
        var v = f.getAttribute('data-v');
        if(reduce){ f.style.width = v + '%'; return; }
        setTimeout(function(){ f.style.width = v + '%'; }, 90 * i);
      });
      barIO.unobserve(en.target);
    });
  }, {threshold:.35});
  if(barsWrap) barIO.observe(barsWrap);

  /* ---------- waitlist form ---------- */
  var form = document.getElementById('waitlist');
  var sent = document.getElementById('sent'), sentMsg = document.getElementById('sent-msg');
  form.addEventListener('submit', function(e){
    e.preventDefault();
    var name = form.name.value.trim(), email = form.email.value.trim();
    if(!name || !email || email.indexOf('@') < 1){
      sent.classList.add('show');
      sentMsg.textContent = 'Add your name and a work email address so we know who to reply to.';
      (name ? form.email : form.elements.name).focus();
      return;
    }
    var body =
      'Name: ' + name + '\n' +
      'Email: ' + email + '\n' +
      'Company: ' + (form.company.value.trim() || '—') + '\n' +
      'Role: ' + form.role.value + '\n\n' +
      (form.message.value.trim() || '(no message)');
    sent.classList.add('show');
    sentMsg.textContent = 'Opening your email client with these details prefilled — send it and we will be in touch.';
    window.location.href = 'mailto:hello@joinglippy.com?subject=' +
      encodeURIComponent('Waitlist — ' + name) + '&body=' + encodeURIComponent(body);
  });

  /* ---------- hero network canvas ---------- */
  var cv = document.getElementById('net');
  if(!cv) return;
  var ctx = cv.getContext('2d');

  /* hubs laid out west-to-east across the archipelago */
  var NODES = [
    {x:.09, y:.24, r:3.2, n:'Medan'},
    {x:.16, y:.40, r:2.6, n:'Batam'},
    {x:.22, y:.57, r:2.8, n:'Palembang'},
    {x:.32, y:.64, r:5.2, n:'Jakarta', hub:true},
    {x:.38, y:.74, r:2.6, n:'Bandung'},
    {x:.45, y:.68, r:2.8, n:'Semarang'},
    {x:.53, y:.73, r:4.0, n:'Surabaya', hub:true},
    {x:.61, y:.79, r:2.6, n:'Denpasar'},
    {x:.40, y:.40, r:2.6, n:'Pontianak'},
    {x:.55, y:.44, r:3.0, n:'Balikpapan'},
    {x:.68, y:.58, r:3.6, n:'Makassar', hub:true},
    {x:.74, y:.29, r:2.6, n:'Manado'},
    {x:.83, y:.66, r:2.6, n:'Ambon'},
    {x:.94, y:.50, r:3.0, n:'Jayapura'}
  ];
  var LINKS = [[3,0],[3,1],[3,2],[3,4],[3,5],[3,8],[5,6],[6,7],[6,9],[3,6],[9,10],[10,11],[10,12],[12,13],[6,10],[8,9],[0,1],[10,13]];

  var packets = LINKS.map(function(l, i){
    return {l:l, t:(i * 0.137) % 1, sp:0.0028 + (i % 5) * 0.0009, on:(i % 3 !== 2)};
  });

  var W = 0, H = 0, dpr = 1;
  function resize(){
    var r = cv.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function css(v){ return getComputedStyle(document.documentElement).getPropertyValue(v).trim(); }
  var C = {};
  function readColors(){
    C.node = css('--net-node') || '#0F172A';
    C.link = css('--net-link') || 'rgba(15,23,42,.16)';
    C.grid = css('--net-grid') || 'rgba(15,23,42,.05)';
    C.accent = css('--accent') || '#14B8A6';
  }
  readColors();

  var PAD = 0.06;
  function px(n){ return (PAD + n.x * (1 - PAD * 2)) * W; }
  function py(n){ return (PAD + n.y * (1 - PAD * 2)) * H * .94 + H * .03; }

  function arc(a, b, t){
    /* quadratic bezier bowed away from the horizontal, so routes read as flight paths */
    var ax = px(a), ay = py(a), bx = px(b), by = py(b);
    var mx = (ax + bx) / 2, my = (ay + by) / 2;
    var dx = bx - ax, dy = by - ay;
    var len = Math.sqrt(dx * dx + dy * dy);
    var bow = Math.min(len * 0.18, 34);
    var cx = mx - (dy / (len || 1)) * bow, cy = my + (dx / (len || 1)) * bow;
    var u = 1 - t;
    return {
      x: u * u * ax + 2 * u * t * cx + t * t * bx,
      y: u * u * ay + 2 * u * t * cy + t * t * by,
      cx: cx, cy: cy, ax: ax, ay: ay, bx: bx, by: by
    };
  }

  var time = 0;
  function draw(){
    ctx.clearRect(0, 0, W, H);

    /* dot grid */
    var step = 26;
    ctx.fillStyle = C.grid;
    for(var gx = step; gx < W; gx += step){
      for(var gy = step; gy < H; gy += step){
        ctx.fillRect(gx, gy, 1, 1);
      }
    }

    /* links */
    ctx.lineWidth = 1;
    ctx.strokeStyle = C.link;
    LINKS.forEach(function(l){
      var g = arc(NODES[l[0]], NODES[l[1]], 0);
      ctx.beginPath();
      ctx.moveTo(g.ax, g.ay);
      ctx.quadraticCurveTo(g.cx, g.cy, g.bx, g.by);
      ctx.stroke();
    });

    /* packets */
    packets.forEach(function(p){
      if(!p.on) return;
      var a = NODES[p.l[0]], b = NODES[p.l[1]];
      for(var k = 0; k < 7; k++){
        var t = p.t - k * 0.022;
        if(t < 0 || t > 1) continue;
        var pt = arc(a, b, t);
        var alpha = (1 - k / 7) * 0.9;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, k === 0 ? 2.3 : 1.5 - k * 0.13, 0, 6.284);
        ctx.fillStyle = C.accent;
        ctx.globalAlpha = alpha;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    });

    /* nodes */
    NODES.forEach(function(n, i){
      var x = px(n), y = py(n);
      if(n.hub){
        var ph = (time * 0.0009 + i * 0.3) % 1;
        ctx.beginPath();
        ctx.arc(x, y, n.r + ph * 26, 0, 6.284);
        ctx.strokeStyle = C.accent;
        ctx.globalAlpha = (1 - ph) * 0.35;
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      ctx.beginPath();
      ctx.arc(x, y, n.r, 0, 6.284);
      ctx.fillStyle = n.hub ? C.accent : C.node;
      ctx.globalAlpha = n.hub ? 1 : .55;
      ctx.fill();
      ctx.globalAlpha = 1;

      if(n.hub && W > 340){
        ctx.font = '600 10px InterV, system-ui, sans-serif';
        ctx.fillStyle = C.node;
        ctx.globalAlpha = .62;
        ctx.textAlign = 'center';
        ctx.fillText(n.n, x, y - n.r - 7);
        ctx.globalAlpha = 1;
      }
    });
  }

  /* Animate only while the panel is on screen and the tab is visible — otherwise
     this repaints the whole canvas every frame for the entire life of the page. */
  var running = false, rafId = 0, onScreen = true;

  function tick(ts){
    time = ts || 0;
    packets.forEach(function(p){
      p.t += p.sp;
      if(p.t > 1.14){ p.t = 0; p.on = Math.random() > 0.18; }
    });
    draw();
    rafId = requestAnimationFrame(tick);
  }

  function start(){
    if(running || reduce) return;
    running = true;
    rafId = requestAnimationFrame(tick);
  }
  function stop(){
    if(!running) return;
    running = false;
    cancelAnimationFrame(rafId);
  }
  function sync(){
    if(onScreen && !document.hidden){ start(); } else { stop(); }
  }

  resize();
  if(reduce){ draw(); } else { start(); }

  if('IntersectionObserver' in window){
    new IntersectionObserver(function(entries){
      onScreen = entries[0].isIntersecting;
      sync();
    }, {threshold:0}).observe(cv);
  }
  document.addEventListener('visibilitychange', sync);

  window.addEventListener('resize', function(){ resize(); if(reduce || !running) draw(); });
  if(window.matchMedia){
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    if(mq.addEventListener) mq.addEventListener('change', function(){ setTimeout(readColors, 30); });
  }
  new MutationObserver(function(){ readColors(); if(reduce) draw(); })
    .observe(document.documentElement, {attributes:true, attributeFilter:['data-theme']});

  /* ---------- hero metric drift (illustrative) ---------- */
  if(!reduce){
    var m1 = document.getElementById('m1'), m2 = document.getElementById('m2'), m3 = document.getElementById('m3');
    var seq = 0;
    setInterval(function(){
      if(!onScreen || document.hidden) return;
      seq++;
      var lat = 34 + ((seq * 7) % 11);
      var rps = 1180 + ((seq * 53) % 190);
      m1.innerHTML = lat + '<span>ms p99</span>';
      m2.innerHTML = rps.toLocaleString('en-US') + '<span>/s</span>';
      m3.innerHTML = (99.94 + ((seq * 3) % 6) / 100).toFixed(2) + '<span>%</span>';
    }, 2400);
  }
})();
