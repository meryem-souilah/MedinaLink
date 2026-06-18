// src/api/axios.js
// ============================================================
// Ce fichier configure Axios — la librairie qui fait les
// appels HTTP vers notre API Jakarta EE.
//
// Au lieu d'écrire l'URL complète partout :
//   "http://localhost:8080/medinalink/api/v1/auth/login"
// On écrit juste :
//   "/auth/login"
// Et Axios ajoute automatiquement le préfixe.
// ============================================================

import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8080/medinalink/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// -------------------------------------------------------
// Intercepteur de requête :
// Avant CHAQUE requête, on ajoute automatiquement le token JWT
// dans le header Authorization si l'utilisateur est connecté.
//
// Sans ça, il faudrait ajouter le token manuellement
// dans chaque appel API — très répétitif.
// -------------------------------------------------------
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// -------------------------------------------------------
// Intercepteur de réponse :
// Si le serveur répond 401 (token expiré), on déconnecte
// automatiquement l'utilisateur et on redirige vers login.
// -------------------------------------------------------
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;