import API from './api.js';
import { qs, renderTeams, toast } from './ui.js';

function buildPlayerInputs(n){
  const box = qs('#playerInputs');
  box.innerHTML = '';
  for(let i=0;i<n;i++){
    const inp = document.createElement('input');
    inp.placeholder = `Player ${i+1} name`;
    inp.maxLength = 40;
    box.appendChild(inp);
  }
}

function readPlayers(){
  return Array.from(qs('#playerInputs').querySelectorAll('input'))
    .map(i=>i.value.trim())
    .filter(Boolean);
}

async function refreshTeams(){
  try{
    const teams = await API.getTeams();
    renderTeams(teams);
  }catch(e){ /* silent */ }
}

(function boot(){
  const num = qs('#numPlayers');
  buildPlayerInputs(Number(num.value || 2));
  num.addEventListener('change', ()=> {
    let v = Number(num.value || 2);
    if (v<2) v=2; if (v>5) v=5;
    num.value = v;
    buildPlayerInputs(v);
  });

  qs('#regForm').addEventListener('submit', async (e)=>{
    e.preventDefault();
    const name = qs('#teamName').value.trim();
    const n = Number(qs('#numPlayers').value || 2);
    const players = readPlayers();
    if (!name) return toast('Team name required');
    if (players.length !== n) return toast(`Please provide exactly ${n} player names`);
    try{
      await API.createTeam({ name, players });
      toast('Team registered!', true);
      qs('#regForm').reset();
      qs('#numPlayers').value = 2;
      buildPlayerInputs(2);
      await refreshTeams();
    }catch(err){
      toast(err.message);
    }
  });

  refreshTeams();
  setInterval(refreshTeams, 5000);
})();
