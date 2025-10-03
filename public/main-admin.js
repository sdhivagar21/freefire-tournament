import API from './api.js';
import { qs, renderBracketAdmin, toast, setAdminUI } from './ui.js';

let pollTeams, pollTournament;

async function refreshAll(){
  await refreshTournament();
  await refreshStartButton();
}

async function refreshTournament(){
  try{
    const t = await API.getTournament();
    renderBracketAdmin(t);
  }catch(e){ /* silent */ }
}

async function refreshStartButton(){
  try{
    const teams = await API.getTeams();
    const startBtn = qs('#startBtn');
    if (startBtn) startBtn.disabled = !(teams && teams.length >= 2);
  }catch(e){/*silent*/}
}

(function boot(){
  // Admin key verify & store
  const setBtn = qs('#adminSetBtn');
  const keyInput = qs('#adminKeyInput');

  // Restore saved key
  const savedKey = localStorage.getItem('adminKey');
  if (savedKey) {
    setAdminUI(true);
  }

  setBtn.addEventListener('click', ()=>{
    const key = keyInput.value.trim();
    if (!key) return toast('Enter admin key');
    API.setAdminKey(key);
    setAdminUI(true); // server will still validate on actions
    toast('Admin key saved ✓', true);
  });

  // Winner delegation
  document.body.addEventListener('click', async (e)=>{
    const btn = e.target.closest('button[data-action="win"]');
    if (!btn) return;
    try{
      const matchId = btn.dataset.match;
      const teamId = btn.dataset.team;
      await API.setWinner(matchId, teamId);
      await refreshTournament();
      toast('Winner updated!', true);
    }catch(err){ toast(err.message); }
  });

  // Start / Reset
  qs('#startBtn').addEventListener('click', async ()=>{
    try{
      await API.startTournament();
      await refreshAll();
      toast('Tournament started!', true);
    }catch(err){ toast(err.message); }
  });
  qs('#resetBtn').addEventListener('click', async ()=>{
    try{
      await API.resetTournament();
      await refreshAll();
      toast('Tournament reset.', true);
    }catch(err){ toast(err.message); }
  });

  refreshAll();
  pollTeams = setInterval(refreshStartButton, 5000);
  pollTournament = setInterval(refreshTournament, 5000);
})();
