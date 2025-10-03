// public/api.js  — robust JSON handling to avoid "JSON.parse: unexpected..."

// If you deployed the API separately on Render and are NOT using Netlify _redirects,
// set your backend URL here, e.g.:
// const API_BASE = 'https://YOUR-BACKEND.onrender.com';
const API_BASE = ''; // keep '' when using same-origin or Netlify proxy

function buildHeaders(includeAdmin = false) {
  const h = { 'Content-Type': 'application/json' };
  if (includeAdmin) {
    const key = localStorage.getItem('adminKey');
    if (key) h['x-admin-key'] = key;
  }
  return h;
}

async function parseSafe(res) {
  const ct = (res.headers.get('content-type') || '').toLowerCase();
  if (ct.includes('application/json')) {
    try { return await res.json(); } catch { return {}; }
  }
  // Not JSON (probably an HTML 404 page) — read as text for debugging
  const txt = await res.text().catch(() => '');
  return { __raw: txt };
}

async function handle(res, url) {
  const data = await parseSafe(res);
  if (!res.ok) {
    // Prefer API error message if present
    const msg =
      (data && data.error) ||
      (data && data.message) ||
      (data && data.__raw ? `Unexpected non-JSON from ${url}` : `HTTP ${res.status} ${res.statusText}`);
    throw new Error(msg);
  }
  if (data && data.__raw) {
    // Successful status but non-JSON body — still unexpected for our API
    throw new Error(`Unexpected response (not JSON) from ${url}`);
  }
  return data;
}

async function GET(url) {
  const res = await fetch(API_BASE + url, { method: 'GET' });
  return handle(res, url);
}

async function POST(url, body, admin = false) {
  const res = await fetch(API_BASE + url, {
    method: 'POST',
    headers: buildHeaders(admin),
    body: body ? JSON.stringify(body) : null,
  });
  return handle(res, url);
}

const API = {
  setAdminKey: (key) => localStorage.setItem('adminKey', key),
  clearAdminKey: () => localStorage.removeItem('adminKey'),

  getTeams: () => GET('/api/teams'),
  createTeam: (payload) => POST('/api/teams', payload),

  getTournament: () => GET('/api/tournament'),
  startTournament: () => POST('/api/tournament/start', null, true),
  setWinner: (matchId, winnerTeamId) => POST(`/api/matches/${matchId}/winner`, { winnerTeamId }, true),
  resetTournament: () => POST('/api/tournament/reset', null, true),
};

export default API;
