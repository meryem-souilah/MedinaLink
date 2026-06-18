import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import * as THREE from 'three';
import gsap from 'gsap';

/* ── Brown Earth canvas (register variant — mirrored rotation) ── */
function AuthCanvas() {
  const ref = useRef();
  useEffect(() => {
    const canvas = ref.current;
    const W = canvas.parentElement.offsetWidth  || 600;
    const H = canvas.parentElement.offsetHeight || 700;

    const scene  = new THREE.Scene();
    scene.fog    = new THREE.FogExp2(0x0F0703, 0.016);

    const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 100);
    camera.position.z = 18;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setClearColor(0x0F0703, 1);

    /* Arabesque rings */
    const ring1Geo = new THREE.TorusGeometry(6, 0.02, 10, 110);
    const ring1Mat = new THREE.MeshBasicMaterial({ color: 0xD4A853, transparent: true, opacity: 0.22 });
    const ring1 = new THREE.Mesh(ring1Geo, ring1Mat);
    ring1.rotation.x = -0.7; ring1.rotation.z = 0.3; scene.add(ring1);

    const ring2Geo = new THREE.TorusGeometry(4.5, 0.018, 8, 90);
    const ring2Mat = new THREE.MeshBasicMaterial({ color: 0xC4622D, transparent: true, opacity: 0.18 });
    const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
    ring2.rotation.x = 0.6; ring2.rotation.y = -1; scene.add(ring2);

    /* Icosahedron center */
    const icoGeo = new THREE.IcosahedronGeometry(3.5, 1);
    const icoMat = new THREE.MeshBasicMaterial({ color: 0xC4622D, wireframe: true, transparent: true, opacity: 0.08 });
    const ico = new THREE.Mesh(icoGeo, icoMat);
    scene.add(ico);

    /* Particles */
    const N   = 160;
    const pos = new Float32Array(N * 3);
    const vel = new Float32Array(N * 3);
    const col = new Float32Array(N * 3);
    const palette = [
      [0.769, 0.384, 0.176],
      [0.831, 0.659, 0.325],
      [0.545, 0.369, 0.235],
      [0.878, 0.612, 0.416],
    ];
    for (let i = 0; i < N; i++) {
      const r = 5 + Math.random() * 10;
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos((Math.random() - 0.5) * 2);
      pos[i*3]   = r * Math.sin(phi) * Math.cos(theta);
      pos[i*3+1] = r * Math.sin(phi) * Math.sin(theta) * 0.65;
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
      t  += 0.005;
      for (let i = 0; i < N; i++) {
        pos[i*3] += vel[i*3]; pos[i*3+1] += vel[i*3+1]; pos[i*3+2] += vel[i*3+2];
        const r2 = pos[i*3]**2 + pos[i*3+1]**2 + pos[i*3+2]**2;
        if (r2 > 225) { pos[i*3] *= 0.97; pos[i*3+1] *= 0.97; pos[i*3+2] *= 0.97; }
        if (r2 < 20)  { pos[i*3] *= 1.03; pos[i*3+1] *= 1.03; pos[i*3+2] *= 1.03; }
      }
      geo.attributes.position.needsUpdate = true;
      ring1.rotation.y = -t * 0.12;
      ring1.rotation.z =  0.3 + t * 0.06;
      ring2.rotation.x =  0.6 + t * 0.09;
      ring2.rotation.z = -t * 0.05;
      ico.rotation.y   =  t * 0.1;
      ico.rotation.x   =  t * 0.06;
      pts.rotation.y   = -t * 0.04;
      renderer.render(scene, camera);
    };
    tick();

    gsap.fromTo(mat, { opacity: 0 }, { opacity: 0.65, duration: 1.8, ease: 'power2.out' });

    return () => {
      cancelAnimationFrame(raf);
      renderer.dispose(); geo.dispose(); mat.dispose();
      ring1Geo.dispose(); ring1Mat.dispose();
      ring2Geo.dispose(); ring2Mat.dispose();
      icoGeo.dispose(); icoMat.dispose();
    };
  }, []);
  return (
    <canvas
      ref={ref}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', display: 'block' }}
    />
  );
}

export default function Register() {
  const [fullName, setFullName] = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const formRef = useRef();

  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    gsap.fromTo(formRef.current,
      { opacity: 0, x: 50, filter: 'blur(6px)' },
      { opacity: 1, x: 0, filter: 'blur(0px)', duration: 0.9, ease: 'power4.out', delay: 0.25 }
    );
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('Le mot de passe doit faire au moins 6 caractères');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/auth/register', { fullName, email, password });
      login(res.data);
      navigate('/citizen/reports');
    } catch (err) {
      setError(err.response?.data?.message || "Erreur lors de l'inscription");
      gsap.fromTo(formRef.current, { x: -10 }, { x: 0, duration: 0.45, ease: 'elastic.out(1, 0.3)' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* LEFT — visual */}
      <div className="auth-left" style={{ position: 'relative', overflow: 'hidden' }}>
        <AuthCanvas />
        <div className="auth-visual-bg" />

        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
          background: 'linear-gradient(90deg, transparent, #D4A853, #C4622D, transparent)',
        }} />

        <div className="auth-quote" style={{ position: 'relative', zIndex: 1 }}>
          <blockquote>
            Rejoignez la<br />
            communauté <span>citoyenne.</span>
          </blockquote>
          <p>
            Créez votre compte en quelques secondes et commencez à contribuer
            à l'amélioration de votre ville dès aujourd'hui.
          </p>
          <div className="auth-stats">
            <div className="auth-stat">
              <strong>15 420</strong>
              <span>Citoyens</span>
            </div>
            <div className="auth-stat">
              <strong>100%</strong>
              <span>Gratuit</span>
            </div>
            <div className="auth-stat">
              <strong>24/7</strong>
              <span>Disponible</span>
            </div>
          </div>
        </div>

        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(212,168,83,0.35), transparent)',
        }} />
      </div>

      {/* RIGHT — form */}
      <div className="auth-right" ref={formRef}>
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
          background: 'linear-gradient(90deg, transparent 10%, #D4A853 50%, transparent 90%)',
          opacity: 0.5,
        }} />

        <div className="auth-brand">
          <span className="auth-logo"><em>Medina</em>Link</span>
          <h1>Créer un compte</h1>
          <p>Votre espace citoyen, gratuit et sécurisé</p>
        </div>

        {error && (
          <div className="auth-alert error">
            <span>⚠</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-field">
            <label htmlFor="fullName">Nom complet</label>
            <input
              id="fullName" type="text" value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Ahmed Benjelloun"
              required autoComplete="name"
            />
          </div>
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
              placeholder="Au moins 6 caractères"
              required autoComplete="new-password" minLength={6}
            />
          </div>
          <button type="submit" className="btn-auth" disabled={loading}>
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <span style={{ width: 14, height: 14, border: '2px solid rgba(7,4,1,0.3)', borderTopColor: 'rgba(7,4,1,0.9)', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                Création…
              </span>
            ) : 'Créer mon compte →'}
          </button>
        </form>

        <p className="auth-switch">
          Déjà un compte ?{' '}
          <Link to="/login">Se connecter</Link>
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
