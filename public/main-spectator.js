import API from './api.js';
import { renderBracketSpectator } from './ui.js';

let pollTimer;

async function refreshTournament(){
  try{
    const t = await API.getTournament();
    renderBracketSpectator(t);
  }catch(e){ /* silent */ }
}

(function boot(){
  refreshTournament();
  pollTimer = setInterval(refreshTournament, 5000);
})();
