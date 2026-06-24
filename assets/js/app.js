/* =================================================================
   Air Purification Association - shared interactions
   ================================================================= */
(function(){
  "use strict";

  /* year */
  document.querySelectorAll('[data-year]').forEach(function(el){
    el.textContent = new Date().getFullYear();
  });

  /* mobile menu */
  var burger = document.getElementById('burger');
  var links = document.getElementById('navLinks');
  if(burger && links){
    burger.addEventListener('click', function(){
      burger.classList.toggle('on');
      links.classList.toggle('open');
    });
    links.querySelectorAll('a').forEach(function(a){
      a.addEventListener('click', function(){
        burger.classList.remove('on');
        links.classList.remove('open');
      });
    });
  }

  /* navbar condense on scroll */
  var nav = document.querySelector('.nav');
  if(nav){
    window.addEventListener('scroll', function(){
      nav.style.padding = window.scrollY > 18 ? '8px 0' : '14px 0';
    }, {passive:true});
  }

  /* scroll reveal */
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, {threshold:.14});
  document.querySelectorAll('.reveal').forEach(function(el){ io.observe(el); });

  /* count up (supports decimals, prefix, suffix) */
  function animateCount(el){
    var target = parseFloat(el.getAttribute('data-count'));
    var dec = parseInt(el.getAttribute('data-dec') || '0', 10);
    var prefix = el.getAttribute('data-prefix') || '';
    var suffix = el.getAttribute('data-suffix') || '';
    var dur = parseInt(el.getAttribute('data-dur') || '2000', 10);
    var t0 = performance.now();
    function fmt(v){
      var n = dec > 0 ? v.toFixed(dec) : Math.round(v).toLocaleString();
      return prefix + n + suffix;
    }
    function tick(now){
      var p = Math.min((now - t0) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(eased * target);
      if(p < 1){ requestAnimationFrame(tick); }
      else { el.textContent = fmt(target); }
    }
    requestAnimationFrame(tick);
  }
  var countObs = new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(e.isIntersecting){ animateCount(e.target); countObs.unobserve(e.target); }
    });
  }, {threshold:.5});
  document.querySelectorAll('[data-count]').forEach(function(el){ countObs.observe(el); });

  /* parallax tilt (image-led, subtle and intentional) */
  document.querySelectorAll('[data-tilt]').forEach(function(card){
    var max = parseFloat(card.getAttribute('data-tilt-max') || '8');
    var inner = card.querySelector('[data-tilt-inner]');
    card.addEventListener('mousemove', function(e){
      var r = card.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width;
      var py = (e.clientY - r.top) / r.height;
      var rx = (py - .5) * -2 * max;
      var ry = (px - .5) * 2 * max;
      card.style.transform = 'perspective(900px) rotateX(' + rx + 'deg) rotateY(' + ry + 'deg) translateY(-6px)';
      if(inner){ inner.style.transform = 'translateZ(40px) translate(' + (px-.5)*10 + 'px,' + (py-.5)*10 + 'px)'; }
      card.style.setProperty('--mx', px*100 + '%');
      card.style.setProperty('--my', py*100 + '%');
    });
    card.addEventListener('mouseleave', function(){
      card.style.transform = '';
      if(inner){ inner.style.transform = ''; }
    });
  });

  /* ----------------------------------------------------------
     SHARED LIVE COUNT  (single source of truth)
     Every place that shows the crown jewel figure reads from here,
     so the hero, footer, claims tile and stats all stay in sync.
     value(t) = BASE + RATE * (now - EPOCH)
     ---------------------------------------------------------- */
  var APA_LIVE = {
    EPOCH_MS: Date.UTC(2026, 5, 24, 4, 21, 0), /* count equals 15.83B exactly here */
    BASE: 15.83e9,
    RATE: 858,                                  /* cubic feet per second (Total CFS) */
    value: function(){ return this.BASE + this.RATE * ((Date.now() - this.EPOCH_MS) / 1000); },
    compact: function(){ return (this.value() / 1e9).toFixed(2); },
    full: function(){ return Math.floor(this.value()).toLocaleString('en-US'); }
  };
  window.APA_LIVE = APA_LIVE;

  function refreshLive(){
    var c = APA_LIVE.compact();
    document.querySelectorAll('[data-live="compactB"]').forEach(function(el){ el.textContent = c + 'B'; });
    document.querySelectorAll('[data-live="compact"]').forEach(function(el){ el.textContent = c; });
    document.querySelectorAll('[data-live="full"]').forEach(function(el){ el.textContent = APA_LIVE.full(); });
  }
  refreshLive();
  setInterval(refreshLive, 1000);

  /* hero air-particle canvas: motes drifting and being "cleaned" */
  var canvas = document.getElementById('airCanvas');
  if(canvas && canvas.getContext){
    var ctx = canvas.getContext('2d');
    var W, H, motes = [];
    var COUNT = 70;
    function resize(){
      W = canvas.width = canvas.offsetWidth * (window.devicePixelRatio || 1);
      H = canvas.height = canvas.offsetHeight * (window.devicePixelRatio || 1);
    }
    function rnd(a, b){ return a + Math.random() * (b - a); }
    function makeMote(){
      var clean = Math.random() > .45;
      return {
        x: rnd(0, W), y: rnd(0, H),
        r: rnd(1, clean ? 2.4 : 3.6),
        vx: rnd(-.18, .5), vy: rnd(-.35, .35),
        clean: clean,
        a: rnd(.25, .8)
      };
    }
    function init(){ resize(); motes = []; for(var i=0;i<COUNT;i++){ motes.push(makeMote()); } }
    function draw(){
      ctx.clearRect(0,0,W,H);
      for(var i=0;i<motes.length;i++){
        var m = motes[i];
        m.x += m.vx; m.y += m.vy;
        if(m.x > W+10){ motes[i] = makeMote(); motes[i].x = -10; }
        if(m.y < -10) m.y = H+10; if(m.y > H+10) m.y = -10;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r, 0, Math.PI*2);
        ctx.fillStyle = m.clean
          ? 'rgba(120,200,120,' + m.a + ')'
          : 'rgba(160,190,210,' + (m.a*.7) + ')';
        ctx.fill();
      }
      requestAnimationFrame(draw);
    }
    init();
    draw();
    window.addEventListener('resize', init);
  }
})();
