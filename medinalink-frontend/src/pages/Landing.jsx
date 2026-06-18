import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/* ─────────────────────────────────────────────────────────────
   THREE.JS — MOROCCAN EARTH SPHERE
   Dark espresso background with terracotta + amber particles
   ───────────────────────────────────────────────────────────── */
function EarthCanvas({ isDark }) {
  const ref = useRef();

  useEffect(() => {
    const canvas = ref.current;
    const W = window.innerWidth;
    const H = window.innerHeight;

    const scene  = new THREE.Scene();
    if (isDark) scene.fog = new THREE.FogExp2(0x070401, 0.012);

    const camera = new THREE.PerspectiveCamera(52, W / H, 0.1, 220);
    camera.position.set(0, 0, 30);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    /* ── CENTRAL ICOSAHEDRON WIREFRAME (city backbone) ── */
    const icoGeo = new THREE.IcosahedronGeometry(7.5, 2);
    const icoMat = new THREE.MeshBasicMaterial({
      color: 0xC4622D,
      wireframe: true,
      transparent: true,
      opacity: 0.1,
    });
    const ico = new THREE.Mesh(icoGeo, icoMat);
    scene.add(ico);

    /* ── INNER GLOW SPHERE ── */
    const coreGeo = new THREE.SphereGeometry(4.5, 32, 32);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xC4622D,
      transparent: true,
      opacity: 0.04,
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    scene.add(core);

    /* ── ORBITAL RINGS ── */
    const ringColors = [0xC4622D, 0xD4A853, 0x8B5E3C];
    const rings = ringColors.map((col, i) => {
      const r = 10.5 + i * 1.8;
      const geo = new THREE.TorusGeometry(r, 0.012, 8, 120);
      const mat = new THREE.MeshBasicMaterial({
        color: col, transparent: true, opacity: 0.2 - i * 0.04,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = (Math.PI / 2.5) + i * 0.4;
      mesh.rotation.z = i * 0.65;
      scene.add(mesh);
      return mesh;
    });

    /* ── PARTICLE CLOUD ── */
    const N    = 520;
    const posA = new Float32Array(N * 3);
    const colA = new Float32Array(N * 3);
    const sizA = new Float32Array(N);
    const velA = new Float32Array(N * 3);
    const radA = new Float32Array(N);   // orbit radius
    const angA = new Float32Array(N);   // orbit angle
    const incA = new Float32Array(N);   // inclination

    // Earth-tone palette: terracotta, amber, burnt brown, sand, clay
    const palette = [
      [0.769, 0.384, 0.176],  // #C4622D terracotta
      [0.831, 0.659, 0.325],  // #D4A853 amber
      [0.545, 0.369, 0.235],  // #8B5E3C clay
      [0.627, 0.443, 0.251],  // #A0714 leather
      [0.878, 0.612, 0.416],  // #E09C6A light terra
      [0.302, 0.188, 0.086],  // #4D3016 dark espresso
      [0.941, 0.804, 0.627],  // #F0CDA0 parchment
    ];

    for (let i = 0; i < N; i++) {
      // Place in sphere shell (min radius 9, max 22)
      const r     = 9 + Math.random() * 13;
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos((Math.random() - 0.5) * 2);

      posA[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      posA[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.65;
      posA[i * 3 + 2] = r * Math.cos(phi);

      radA[i] = r;
      angA[i] = theta;
      incA[i] = phi;

      // Slow drift velocities
      velA[i * 3]     = (Math.random() - 0.5) * 0.004;
      velA[i * 3 + 1] = (Math.random() - 0.5) * 0.003;
      velA[i * 3 + 2] = (Math.random() - 0.5) * 0.003;

      sizA[i] = 0.05 + Math.random() * 0.12;

      const col = palette[Math.floor(Math.random() * palette.length)];
      const br  = 0.7 + Math.random() * 0.5;
      colA[i * 3]     = col[0] * br;
      colA[i * 3 + 1] = col[1] * br;
      colA[i * 3 + 2] = col[2] * br;
    }

    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(posA, 3));
    pGeo.setAttribute('color',    new THREE.BufferAttribute(colA, 3));
    pGeo.setAttribute('size',     new THREE.BufferAttribute(sizA, 1));

    const pMat = new THREE.PointsMaterial({
      size: 0.14, vertexColors: true,
      transparent: true, opacity: 0.82,
      sizeAttenuation: true,
    });
    const pts = new THREE.Points(pGeo, pMat);
    scene.add(pts);

    /* ── CONNECTION LINES ── */
    const MAX_L = 220;
    const lPos  = new Float32Array(MAX_L * 6);
    const lCol  = new Float32Array(MAX_L * 6);
    const lGeo  = new THREE.BufferGeometry();
    lGeo.setAttribute('position', new THREE.BufferAttribute(lPos, 3));
    lGeo.setAttribute('color',    new THREE.BufferAttribute(lCol, 3));
    const lMat  = new THREE.LineBasicMaterial({
      vertexColors: true, transparent: true, opacity: 0.18,
    });
    const lines = new THREE.LineSegments(lGeo, lMat);
    scene.add(lines);

    /* ── DUST PARTICLES (foreground ambient) ── */
    const ND   = 80;
    const dPos = new Float32Array(ND * 3);
    const dVel = new Float32Array(ND * 3);
    const dCol = new Float32Array(ND * 3);
    for (let i = 0; i < ND; i++) {
      dPos[i*3]   = (Math.random() - 0.5) * 50;
      dPos[i*3+1] = (Math.random() - 0.5) * 30;
      dPos[i*3+2] = (Math.random() - 0.5) * 20 + 5;
      dVel[i*3]   = (Math.random() - 0.5) * 0.006;
      dVel[i*3+1] = (Math.random() - 0.5) * 0.003;
      dVel[i*3+2] = 0;
      const t = Math.random();
      if (t < 0.5) { dCol[i*3]=0.769; dCol[i*3+1]=0.384; dCol[i*3+2]=0.176; }
      else         { dCol[i*3]=0.831; dCol[i*3+1]=0.659; dCol[i*3+2]=0.325; }
    }
    const dGeo = new THREE.BufferGeometry();
    dGeo.setAttribute('position', new THREE.BufferAttribute(dPos, 3));
    dGeo.setAttribute('color',    new THREE.BufferAttribute(dCol, 3));
    const dMat = new THREE.PointsMaterial({
      size: 0.06, vertexColors: true, transparent: true, opacity: 0.3, sizeAttenuation: true,
    });
    const dust = new THREE.Points(dGeo, dMat);
    scene.add(dust);

    /* ── MOUSE ── */
    let mx = 0, my = 0;
    const onMouse = (e) => {
      mx = (e.clientX / window.innerWidth  - 0.5) * 2;
      my = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('mousemove', onMouse, { passive: true });

    /* ── RESIZE ── */
    const onResize = () => {
      const w = window.innerWidth, h = window.innerHeight;
      camera.aspect = w / h; camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    /* ── ANIMATE ── */
    let raf;
    let t   = 0;
    const THRESHOLD = 7;

    const tick = () => {
      raf = requestAnimationFrame(tick);
      t  += 0.003;

      /* Rotate central structure */
      ico.rotation.y  = t * 0.12;
      ico.rotation.x  = t * 0.07;
      core.rotation.y = -t * 0.08;

      /* Rotate rings */
      rings[0].rotation.z = t * 0.04;
      rings[1].rotation.x = (Math.PI / 2.5) + t * 0.03;
      rings[2].rotation.y = t * 0.025;

      /* Drift particles */
      const pos = pGeo.attributes.position.array;
      for (let i = 0; i < N; i++) {
        pos[i*3]   += velA[i*3]   + Math.sin(t + i) * 0.0005;
        pos[i*3+1] += velA[i*3+1] + Math.cos(t * 0.7 + i) * 0.0003;
        pos[i*3+2] += velA[i*3+2];
        // Boundary bounce
        const r = Math.sqrt(pos[i*3]**2 + pos[i*3+1]**2 + pos[i*3+2]**2);
        if (r > 23) {
          pos[i*3]   *= 0.98;
          pos[i*3+1] *= 0.98;
          pos[i*3+2] *= 0.98;
        }
        if (r < 8.5) {
          pos[i*3]   *= 1.02;
          pos[i*3+1] *= 1.02;
          pos[i*3+2] *= 1.02;
        }
      }
      pGeo.attributes.position.needsUpdate = true;

      /* Rebuild connection lines */
      let lc = 0;
      for (let i = 0; i < N && lc < MAX_L; i++) {
        for (let j = i + 1; j < N && lc < MAX_L; j++) {
          const dx = pos[i*3] - pos[j*3];
          const dy = pos[i*3+1] - pos[j*3+1];
          const dz = pos[i*3+2] - pos[j*3+2];
          const d  = Math.sqrt(dx*dx + dy*dy + dz*dz);
          if (d < THRESHOLD) {
            const li  = lc * 6;
            const a   = (1 - d / THRESHOLD) * 0.35;
            lPos[li]   = pos[i*3];   lPos[li+1] = pos[i*3+1]; lPos[li+2] = pos[i*3+2];
            lPos[li+3] = pos[j*3];   lPos[li+4] = pos[j*3+1]; lPos[li+5] = pos[j*3+2];
            // Terracotta-amber gradient per line
            const blend = (i / N);
            lCol[li]   = lCol[li+3] = (0.769 + blend * 0.062) * a;
            lCol[li+1] = lCol[li+4] = (0.384 + blend * 0.275) * a;
            lCol[li+2] = lCol[li+5] = (0.176 + blend * 0.149) * a;
            lc++;
          }
        }
      }
      lGeo.attributes.position.needsUpdate = true;
      lGeo.attributes.color.needsUpdate    = true;
      lGeo.setDrawRange(0, lc * 2);

      /* Drift dust */
      const dp = dGeo.attributes.position.array;
      for (let i = 0; i < ND; i++) {
        dp[i*3]   += dVel[i*3];
        dp[i*3+1] += dVel[i*3+1];
        if (dp[i*3]   >  25) dp[i*3]   = -25;
        if (dp[i*3]   < -25) dp[i*3]   =  25;
        if (dp[i*3+1] >  15) dp[i*3+1] = -15;
        if (dp[i*3+1] < -15) dp[i*3+1] =  15;
      }
      dGeo.attributes.position.needsUpdate = true;

      /* Camera mouse parallax */
      camera.position.x += (mx * 3.5 - camera.position.x) * 0.022;
      camera.position.y += (-my * 2.2 - camera.position.y) * 0.022;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    };
    tick();

    /* GSAP entrance — fade in particles */
    gsap.fromTo(pMat, { opacity: 0 }, { opacity: 0.82, duration: 2.4, ease: 'power2.out', delay: 0.3 });
    gsap.fromTo(lMat, { opacity: 0 }, { opacity: 0.18, duration: 2.8, ease: 'power2.out', delay: 0.5 });
    gsap.fromTo(icoMat, { opacity: 0 }, { opacity: 0.1, duration: 3, ease: 'power2.out', delay: 0.2 });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMouse);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      [pGeo, pMat, lGeo, lMat, icoGeo, icoMat, coreGeo, coreMat, dGeo, dMat].forEach(o => o.dispose?.());
      rings.forEach(({ geometry: g, material: m }) => { g.dispose(); m.dispose(); });
    };
  }, [isDark]);

  return (
    <canvas
      ref={ref}
      className="city-canvas"
      style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }}
    />
  );
}

/* ─────────────────────────────────────────────────────────────
   MAGNETIC BUTTON HOOK
   ───────────────────────────────────────────────────────────── */
function useMagnetic(strength = 0.35) {
  const ref = useRef();
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onMove = (e) => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top  + rect.height / 2;
      const dx = (e.clientX - cx) * strength;
      const dy = (e.clientY - cy) * strength;
      gsap.to(el, { x: dx, y: dy, duration: 0.4, ease: 'power2.out' });
    };
    const onLeave = () => {
      gsap.to(el, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.4)' });
    };
    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
    return () => {
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseleave', onLeave);
    };
  }, [strength]);
  return ref;
}

/* ─────────────────────────────────────────────────────────────
   FEATURE DATA
   ───────────────────────────────────────────────────────────── */
const FEATURES = [
  { icon: '◎', title: 'Géolocalisation précise',  desc: 'Chaque signalement est ancré avec vos coordonnées GPS exactes et une adresse auto-générée.', accent: '#C4622D' },
  { icon: '◈', title: 'Analyse IA intégrée',      desc: "L'intelligence artificielle analyse chaque rapport et assiste les agents dans leur priorisation.", accent: '#D4A853' },
  { icon: '◑', title: 'Suivi temps réel',         desc: 'Recevez des notifications instantanées dès que le statut de votre signalement évolue.', accent: '#C4622D' },
  { icon: '◆', title: 'Votes citoyens',           desc: 'Soutenez les signalements des autres citoyens pour amplifier leur priorité de traitement.', accent: '#D4A853' },
  { icon: '◰', title: 'Dashboard agent',          desc: 'Les agents municipaux disposent d\'outils de gestion avancés avec statistiques et filtres.', accent: '#C4622D' },
  { icon: '◉', title: 'Carte interactive',        desc: 'Visualisez tous les signalements sur une carte en temps réel avec filtres par catégorie.', accent: '#D4A853' },
];

/* ─────────────────────────────────────────────────────────────
   LANDING PAGE
   ───────────────────────────────────────────────────────────── */
export default function Landing() {
  const [scrolled, setScrolled] = useState(false);
  const heroPrimaryRef = useMagnetic(0.3);

  const [isDark, setIsDark] = useState(() => localStorage.getItem('ml-theme') === 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    localStorage.setItem('ml-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  /* Scroll detection */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* GSAP animations */
  useEffect(() => {
    const ctx = gsap.context(() => {

      /* ── Hero entrance (staggered reveal) ── */
      const heroTL = gsap.timeline({ delay: 0.6 });
      heroTL
        .fromTo('.hero-label',
          { opacity: 0, y: 18, filter: 'blur(4px)' },
          { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.8, ease: 'power3.out' }
        )
        .fromTo('.hero-title',
          { opacity: 0, y: 70, skewY: 2 },
          { opacity: 1, y: 0, skewY: 0, duration: 1, ease: 'power4.out' }, '-=0.3'
        )
        .fromTo('.hero-sub',
          { opacity: 0, y: 30 },
          { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }, '-=0.5'
        )
        .fromTo('.hero-ctas',
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }, '-=0.4'
        )
        .fromTo('.scroll-indicator',
          { opacity: 0 },
          { opacity: 1, duration: 0.6 }, '-=0.1'
        );

      /* ── Stats counter ── */
      ScrollTrigger.create({
        trigger: '.stats-section', start: 'top 80%', once: true,
        onEnter: () => {
          document.querySelectorAll('.stat-number[data-val]').forEach(el => {
            const target = parseInt(el.dataset.val, 10);
            const suffix = el.dataset.suffix || '';
            const obj    = { val: 0 };
            gsap.to(obj, {
              val: target, duration: 2.5, ease: 'power2.out',
              onUpdate() {
                el.textContent = Math.round(obj.val).toLocaleString('fr-FR') + suffix;
              },
            });
          });
        },
      });

      gsap.fromTo('.stat-item',
        { opacity: 0, y: 28, scale: 0.97 },
        { opacity: 1, y: 0, scale: 1, stagger: 0.1, duration: 0.75, ease: 'power3.out',
          scrollTrigger: { trigger: '.stats-section', start: 'top 85%', once: true } }
      );

      /* ── Process steps ── */
      gsap.fromTo('.process-step',
        { opacity: 0, x: -45 },
        { opacity: 1, x: 0, stagger: 0.18, duration: 0.9, ease: 'power4.out',
          scrollTrigger: { trigger: '.process-section', start: 'top 68%', once: true } }
      );

      /* ── Feature cards ── */
      gsap.fromTo('.feature-card',
        { opacity: 0, y: 40, scale: 0.97 },
        { opacity: 1, y: 0, scale: 1, stagger: 0.075, duration: 0.8, ease: 'power3.out',
          scrollTrigger: { trigger: '.features-section', start: 'top 72%', once: true } }
      );

      /* ── CTA ── */
      gsap.fromTo('.cta-content',
        { opacity: 0, y: 50 },
        { opacity: 1, y: 0, duration: 1, ease: 'power4.out',
          scrollTrigger: { trigger: '.cta-section', start: 'top 75%', once: true } }
      );

      /* ── Section headers ── */
      gsap.utils.toArray('.section-header').forEach(el => {
        gsap.fromTo(el,
          { opacity: 0, y: 30 },
          { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out',
            scrollTrigger: { trigger: el, start: 'top 80%', once: true } }
        );
      });

      /* ── Number accent color on terra ── */
      gsap.utils.toArray('.stat-number').forEach((el, i) => {
        ScrollTrigger.create({
          trigger: '.stats-section', start: 'top 80%', once: true,
          onEnter: () => {
            gsap.to(el, { color: i % 2 === 0 ? '#C4622D' : '#D4A853', duration: 0.5, delay: i * 0.1 });
          },
        });
      });

    });

    return () => {
      ctx.revert();
      ScrollTrigger.getAll().forEach(t => t.kill());
    };
  }, []);

  return (
    <div className="landing-page">
      {/* Noise texture */}
      <div className="noise-overlay" />

      {/* Three.js canvas */}
      <EarthCanvas isDark={isDark} />

      {/* NAV */}
      <nav className={`landing-nav${scrolled ? ' scrolled' : ''}`}>
        <span className="landing-nav-brand">Medina<em>Link</em></span>
        <div className="landing-nav-links">
          <a href="#features" className="landing-nav-link">Fonctionnalités</a>
          <a href="#process"  className="landing-nav-link">Comment ça marche</a>
        </div>
        <div className="landing-nav-actions">
          <button onClick={() => setIsDark(p => !p)} className="btn-nav-theme" title={isDark ? 'Mode jour' : 'Mode nuit'}>
            {isDark ? '☀️' : '🌙'}
          </button>
          <Link to="/login"    className="btn-nav-ghost">Connexion</Link>
          <Link to="/register" className="btn-nav-gold">Commencer →</Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="hero-section" style={{ minHeight: '100vh', position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 clamp(1.5rem, 5vw, 4rem)' }}>
        <div className="hero-overlay" />

        <div className="hero-content" style={{ position: 'relative', maxWidth: 1000 }}>
          <div className="hero-label">
            La plateforme citoyenne du Maroc
          </div>

          <h1 className="hero-title">
            Votre ville.
            <span className="accent">Votre voix.</span>
          </h1>

          <p className="hero-sub">
            Signalez les problèmes de votre quartier, suivez leur résolution
            et participez activement à l'amélioration de votre ville.
          </p>

          <div className="hero-ctas">
            <Link ref={heroPrimaryRef} to="/register" className="btn-hero-primary">
              Signaler un problème
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ marginLeft: 2 }}>
                <path d="M1 7h12M8 2l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
            <Link to="/login" className="btn-hero-secondary">
              Se connecter
            </Link>
          </div>
        </div>

        <div className="scroll-indicator">
          <span>Défiler</span>
          <div className="scroll-line" />
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="stats-section">
        <div className="stats-container">
          <div className="stat-item">
            <span className="stat-number" data-val="2847" data-suffix="+">0</span>
            <span className="stat-label">Signalements traités</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <span className="stat-number" data-val="96" data-suffix="%">0</span>
            <span className="stat-label">Taux de résolution</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <span className="stat-number" data-val="12">0</span>
            <span className="stat-label">Villes connectées</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <span className="stat-number" data-val="15420" data-suffix="+">0</span>
            <span className="stat-label">Citoyens actifs</span>
          </div>
        </div>
      </section>

      {/* ── PROCESS ── */}
      <section className="process-section" id="process" style={{ position: 'relative', zIndex: 1, padding: 'clamp(5rem, 10vw, 9rem) clamp(1.5rem, 5vw, 4.5rem)' }}>
        {/* Ambient glow */}
        <div style={{ position: 'absolute', left: '30%', top: '20%', width: 500, height: 500, background: 'radial-gradient(circle, rgba(196,98,45,0.05) 0%, transparent 70%)', pointerEvents: 'none', borderRadius: '50%' }} />

        <div className="section-container">
          <div className="section-header">
            <span className="section-tag">Comment ça marche</span>
            <h2>Simple. Rapide. Efficace.</h2>
            <p>En trois étapes, transformez un problème visible en solution concrète pour votre quartier.</p>
          </div>
          <div className="process-steps">
            {[
              { n: '01', h: 'Signalez', p: 'Prenez une photo, décrivez le problème et laissez votre position GPS se localiser automatiquement. Votre signalement est envoyé en moins de deux minutes.' },
              { n: '02', h: 'Les agents interviennent', p: 'Un agent municipal reçoit une alerte, analyse le signalement grâce à l\'IA intégrée et planifie l\'intervention selon les priorités.' },
              { n: '03', h: 'Votre ville s\'améliore', p: 'Vous êtes notifié en temps réel dès que le problème est résolu. Chaque signalement traité rend votre ville meilleure.' },
            ].map(step => (
              <div className="process-step" key={step.n}>
                <div className="step-connector" />
                <div className="step-number">{step.n}</div>
                <div className="step-body">
                  <h3>{step.h}</h3>
                  <p>{step.p}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="features-section" id="features">
        <div className="section-container">
          <div className="section-header">
            <span className="section-tag">Fonctionnalités</span>
            <h2>Tout ce dont vous avez besoin</h2>
            <p>Une suite complète d'outils pour les citoyens et les équipes municipales.</p>
          </div>
          <div className="features-grid">
            {FEATURES.map(f => (
              <div className="feature-card" key={f.title}>
                <span className="feature-icon" style={{ color: f.accent, fontSize: '1.4rem', fontFamily: 'monospace' }}>{f.icon}</span>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="cta-section">
        <div className="cta-content">
          <span className="section-tag">Rejoignez le mouvement</span>
          <h2>Votre ville<br />a besoin de vous</h2>
          <p>
            Chaque signalement compte. Chaque voix renforce la démocratie locale.
            Rejoignez des milliers de citoyens qui façonnent leurs villes au Maroc.
          </p>
          <Link to="/register" className="btn-cta">
            Créer un compte gratuit
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 7h12M8 2l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="landing-footer">
        <div className="footer-inner">
          <span className="footer-logo"><em>Medina</em>Link</span>
          <div className="footer-links">
            <Link to="/login">Connexion</Link>
            <Link to="/register">Inscription</Link>
          </div>
          <span className="footer-copy">© 2026 MedinaLink — Tous droits réservés</span>
        </div>
      </footer>
    </div>
  );
}
