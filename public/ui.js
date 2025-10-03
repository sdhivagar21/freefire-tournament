// DOM helpers + toasts + confetti + bracket renderers (spectator/admin)
export const qs = (s) => document.querySelector(s);
export const el = (t, cls) => { const n = document.createElement(t); if (cls) n.className = cls; return n; };

let toastTimer;
export function toast(msg, ok=false){
  const t = qs('#toast');
  if (!t) return;
  t.textContent = msg;
  t.style.borderColor = ok ? 'var(--good)' : '#30407a';
  t.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=> t.classList.add('hidden'), 2200);
}

export function renderTeams(teams){
  const box = qs('#teamsList');
  if (!box) return;
  box.innerHTML = '';
  if (!teams || !teams.length){
    box.classList.add('empty');
    box.textContent = 'No teams yet—be the first!';
    return;
  }
  box.classList.remove('empty');
  teams.forEach(t=>{
    const row = el('div','team pair-in');
    row.style.animationDelay = `${Math.min(200, teams.indexOf(t)*60)}ms`;
    row.innerHTML = `<div><strong>${escapeHtml(t.name)}</strong><div class="small">${t.players.length} players</div></div>`;
    box.appendChild(row);
  });
}

function baseBracket(t, opts){
  const { adminMode=false } = opts||{};
  const container = qs('#bracketContainer');
  if (!container) return;
  container.innerHTML = '';

  if (!t || !t.rounds || !t.rounds.length){
    container.innerHTML = `<div class="small" style="opacity:.8">No bracket yet. ${adminMode ? 'Click Start once there are at least 2 teams.' : 'Waiting for admin to start the tournament.'}</div>`;
    return;
  }

  t.rounds.forEach((round, idx)=>{
    const col = el('div','round-col');
    const title = el('div','round-title');
    title.textContent = `Round ${idx+1}`;
    col.appendChild(title);

    round.forEach((m, i)=>{
      const card = el('div','match' + (m.bye ? ' bye' : '') + ' pair-in');
      card.style.animationDelay = `${Math.min(420, i*90)}ms`;

      const a = m.teamA, b = m.teamB;
      const aName = a ? a.name : '???';
      const bName = b ? b.name : '— BYE —';
      const isWinA = m.winner && a && m.winner._id === a._id;
      const isWinB = m.winner && b && m.winner._id === b._id;

      const adminButtons = adminMode && !m.bye && !m.winner ? `
        <div class="row" style="margin-top:8px; gap:6px;">
          <button class="btn wide" data-action="win" data-match="${m._id}" data-team="${a?._id}">🏆 ${escapeHtml(a?.name||'Team A')}</button>
          ${b ? `<button class="btn wide loser" data-action="win" data-match="${m._id}" data-team="${b._id}">🏆 ${escapeHtml(b.name)}</button>` : ''}
        </div>
      ` : '';

      card.innerHTML = `
        <div class="row">
          <span class="team-name ${isWinA?'win':''}">${escapeHtml(aName)}</span>
          ${m.bye ? `<span class="tag">BYE</span>`:''}
        </div>
        <div class="vs">vs</div>
        <div class="row">
          <span class="team-name ${isWinB?'win':''}">${escapeHtml(bName)}</span>
          ${m.winner ? `<span class="tag">Winner</span>`:''}
        </div>
        ${adminButtons}
      `;
      col.appendChild(card);
    });

    container.appendChild(col);
  });

  if (t.status === 'finished' && t.champion){
    winnerConfetti();
    const champ = el('div','match win pair-in');
    champ.style.animationDelay = '120ms';
    champ.innerHTML = `<div class="row"><span class="team-name">🏆 Winner: ${escapeHtml(t.champion.name)}</span><span class="tag" style="background:#1f3;">Champion</span></div>`;
    container.appendChild(champ);
  }
}

export function renderBracketSpectator(t){
  baseBracket(t, { adminMode:false });
}

export function renderBracketAdmin(t){
  baseBracket(t, { adminMode:true });
}

export function setAdminUI(isAdmin){
  const badge = qs('#adminStatus');
  if (badge) badge.textContent = isAdmin ? 'Verified' : 'Not Verified';
}

function escapeHtml(s){ return String(s).replace(/[&<>"']/g,(c)=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }

/* ------------ tiny confetti (inline, no libs) ------------- */
let confettiOnce = false;
export function winnerConfetti(){
  if (confettiOnce) return;
  confettiOnce = true;
  const canvas = document.getElementById('confetti');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W,H,parts=[],t=0;
  function resize(){ W=canvas.width=window.innerWidth; H=canvas.height=window.innerHeight; }
  resize(); window.addEventListener('resize', resize);

  for(let i=0;i<180;i++){
    parts.push({
      x: Math.random()*W,
      y: -20 - Math.random()*H/2,
      r: 3+Math.random()*4,
      vx: -1+Math.random()*2,
      vy: 2+Math.random()*3,
      a: Math.random()*Math.PI
    });
  }
  (function anim(){
    t++; ctx.clearRect(0,0,W,H);
    parts.forEach(p=>{
      p.x+=p.vx; p.y+=p.vy; p.a+=0.05;
      ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.a);
      ctx.fillStyle = `hsl(${(p.x+p.y+t)%360} 90% 60%)`;
      ctx.fillRect(-p.r,-p.r,p.r*2,p.r*2);
      ctx.restore();
    });
    if (t<300) requestAnimationFrame(anim); else ctx.clearRect(0,0,W,H);
  })();
}
