import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import * as THREE from 'three';
import gsap from 'gsap';

/* ── Brown Earth Three.js canvas for auth pages ── */
function AuthCanvas() {
  const ref = useRef();
  useEffect(() => {
    const canvas = ref.current;
    const W = canvas.parentElement.offsetWidth  || 600;
    const H = canvas.parentElement.offsetHeight || 700;

    const scene  = new THREE.Scene();
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    if (isDark) scene.fog = new THREE.FogExp2(0x0F0703, 0.018);

    const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 100);
    camera.position.z = 18;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);

    /* Central torus — Moroccan arabesque ring */
    const torusGeo = new THREE.TorusGeometry(5.5, 0.025, 12, 100);
    const torusMat = new THREE.MeshBasicMaterial({ color: 0xC4622D, transparent: true, opacity: 0.25 });
    const torus1 = new THREE.Mesh(torusGeo, torusMat);
    torus1.rotation.x = 0.8; scene.add(torus1);

    const torus2Geo = new THREE.TorusGeometry(4, 0.02, 8, 80);
    const torus2Mat = new THREE.MeshBasicMaterial({ color: 0xD4A853, transparent: true, opacity: 0.18 });
    const torus2 = new THREE.Mesh(torus2Geo, torus2Mat);
    torus2.rotation.x = -0.5; torus2.rotation.y = 1.2; scene.add(torus2);

    /* Particles */
    const N   = 160;
    const pos = new Float32Array(N * 3);
    const vel = new Float32Array(N * 3);
    const col = new Float32Array(N * 3);

    const palette = [
      [0.769, 0.384, 0.176],
      [0.831, 0.659, 0.325],
      [0.545, 0.369, 0.235],
      [0.941, 0.804, 0.627],
    ];

    for (let i = 0; i < N; i++) {
      const r = 6 + Math.random() * 10;
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos((Math.random() - 0.5) * 2);
      pos[i*3]   = r * Math.sin(phi) * Math.cos(theta);
      pos[i*3+1] = r * Math.sin(phi) * Math.sin(theta) * 0.7;
      pos[i*3+2] = r * Math.cos(phi);
      vel[i*3]   = (Math.random()-0.5)*0.005;
      vel[i*3+1] = (Math.random()-0.5)*0.003;
      vel[i*3+2] = (Math.random()-0.5)*0.003;
      const c = palette[Math.floor(Math.random() * palette.length)];
      col[i*3] = c[0]; col[i*3+1] = c[1]; col[i*3+2] = c[2];
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color',    new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({ size: 0.1, vertexColors: true, transparent: true, opacity: 0.65, sizeAttenuation: true });
    const pts = new THREE.Points(geo, mat);
    scene.add(pts);

    let raf, t = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      t += 0.005;
      for (let i = 0; i < N; i++) {
        pos[i*3]   += vel[i*3];
        pos[i*3+1] += vel[i*3+1];
        pos[i*3+2] += vel[i*3+2];
        const r2 = pos[i*3]**2 + pos[i*3+1]**2 + pos[i*3+2]**2;
        if (r2 > 256) { pos[i*3] *= 0.97; pos[i*3+1] *= 0.97; pos[i*3+2] *= 0.97; }
        if (r2 < 25)  { pos[i*3] *= 1.03; pos[i*3+1] *= 1.03; pos[i*3+2] *= 1.03; }
      }
      geo.attributes.position.needsUpdate = true;
      torus1.rotation.y = t * 0.15;
      torus1.rotation.z = t * 0.08;
      torus2.rotation.x = -0.5 + t * 0.1;
      torus2.rotation.y =  1.2 - t * 0.06;
      pts.rotation.y    = t * 0.04;
      renderer.render(scene, camera);
    };
    tick();

    gsap.fromTo(mat, { opacity: 0 }, { opacity: 0.65, duration: 1.8, ease: 'power2.out' });

    return () => {
      cancelAnimationFrame(raf);
      renderer.dispose(); geo.dispose(); mat.dispose();
      torusGeo.dispose(); torusMat.dispose();
      torus2Geo.dispose(); torus2Mat.dispose();
    };
  }, []);
  return (
    <canvas
      ref={ref}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', display: 'block' }}
    />
  );
}

export default function Login() {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const formRef = useRef();
  const lineRef = useRef();

  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    gsap.fromTo(formRef.current,
      { opacity: 0, x: 50, filter: 'blur(6px)' },
      { opacity: 1, x: 0, filter: 'blur(0px)', duration: 0.9, ease: 'power4.out', delay: 0.25 }
    );
    gsap.fromTo(lineRef.current,
      { scaleX: 0, transformOrigin: 'left center' },
      { scaleX: 1, duration: 1.2, ease: 'power3.out', delay: 0.5 }
    );
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      login(res.data);
      if      (res.data.role === 'ADMIN') navigate('/admin/dashboard');
      else if (res.data.role === 'AGENT') navigate('/agent/dashboard');
      else                                navigate('/citizen/reports');
    } catch (err) {
      setError(err.response?.data?.message || 'Email ou mot de passe incorrect');
      gsap.fromTo(formRef.current, { x: -10 }, { x: 0, duration: 0.45, ease: 'elastic.out(1, 0.3)' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* LEFT — immersive visual */}
      <div className="auth-left" style={{ position: 'relative', overflow: 'hidden' }}>
        <AuthCanvas />
        <div className="auth-visual-bg" />

        {/* Decorative line */}
        <div ref={lineRef} style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          height: '2px',
          background: 'linear-gradient(90deg, transparent, #C4622D, #D4A853, transparent)',
        }} />

        <div className="auth-quote" style={{ position: 'relative', zIndex: 1 }}>
          <blockquote>
            Ensemble,<br />
            façonnons une ville <span>meilleure.</span>
          </blockquote>
          <p>
            MedinaLink connecte les citoyens aux services municipaux pour
            un urbanisme participatif et une résolution rapide des problèmes.
          </p>
          <div className="auth-stats">
            <div className="auth-stat">
              <strong>2 847</strong>
              <span>Signalements</span>
            </div>
            <div className="auth-stat">
              <strong>96%</strong>
              <span>Résolution</span>
            </div>
            <div className="auth-stat">
              <strong>12</strong>
              <span>Villes</span>
            </div>
          </div>
        </div>

        {/* Bottom decoration */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(196,98,45,0.3), transparent)',
        }} />
      </div>

      {/* RIGHT — form */}
      <div className="auth-right" ref={formRef}>
        {/* Top accent line */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
          background: 'linear-gradient(90deg, transparent 10%, #C4622D 50%, transparent 90%)',
          opacity: 0.6,
        }} />

        <div className="auth-brand">
          <span className="auth-logo"><em>Medina</em>Link</span>
          <h1>Bon retour</h1>
          <p>Connectez-vous à votre espace citoyen</p>
        </div>

        {error && (
          <div className="auth-alert error">
            <span>⚠</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-field">
            <label htmlFor="email">Adresse email</label>
            <input
              id="email" type="email" value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="ahmed@gmail.com"
              required autoComplete="email"
            />
          </div>
          <div className="form-field">
            <label htmlFor="password">Mot de passe</label>
            <input
              id="password" type="password" value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required autoComplete="current-password"
            />
          </div>
          <button type="submit" className="btn-auth" disabled={loading}>
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <span style={{ width: 14, height: 14, border: '2px solid rgba(7,4,1,0.3)', borderTopColor: 'rgba(7,4,1,0.9)', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                Connexion…
              </span>
            ) : 'Se connecter →'}
          </button>
        </form>

        <p className="auth-switch">
          Pas encore de compte ?{' '}
          <Link to="/register">S'inscrire gratuitement</Link>
        </p>

        <p style={{ textAlign: 'center', marginTop: '2.5rem' }}>
          <Link to="/" style={{ fontSize: '0.78rem', color: 'var(--text-faint)', fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}>
            ← Retour à l'accueil
          </Link>
        </p>
      </div>
    </div>
  );
}
