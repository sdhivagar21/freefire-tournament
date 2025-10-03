// Lightweight fetch wrappers + admin key header
const API = (() => {
  const headers = () => {
    const h = { 'Content-Type': 'application/json' };
    const key = localStorage.getItem('adminKey');
    if (key) h['x-admin-key'] = key;
    return h;
  };

  const get = async (url) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error((await res.json()).error || res.statusText);
    return res.json();
  };

  const post = async (url, body, admin = false) => {
    const opts = {
      method: 'POST',
      headers: admin ? headers() : { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : null
    };
    const res = await fetch(url, opts);
    if (!res.ok) throw new Error((await res.json()).error || res.statusText);
    return res.json();
  };

  return {
    setAdminKey: (key) => localStorage.setItem('adminKey', key),
    clearAdminKey: () => localStorage.removeItem('adminKey'),
    getTeams: () => get('/api/teams'),
    createTeam: (payload) => post('/api/teams', payload),
    getTournament: () => get('/api/tournament'),
    startTournament: () => post('/api/tournament/start', null, true),
    setWinner: (matchId, winnerTeamId) =>
      post(`/api/matches/${matchId}/winner`, { winnerTeamId }, true),
    resetTournament: () => post('/api/tournament/reset', null, true)
  };
})();

export default API;
