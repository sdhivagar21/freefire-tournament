require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');

const Team = require('./models/Team');
const Tournament = require('./models/Tournament');

const app = express();

// If you serve frontend from same origin, you can comment CORS out.
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;
const ADMIN_KEY = process.env.ADMIN_KEY;

mongoose
  .connect(process.env.MONGODB_URI, {})
  .then(() => console.log('MongoDB connected'))
  .catch((err) => {
    console.error('Mongo connect error:', err.message);
    process.exit(1);
  });

/* ---------------------------- helpers ---------------------------- */
const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const requireAdmin = (req, res, next) => {
  const key = req.header('x-admin-key');
  if (!key || key !== ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized: invalid admin key' });
  }
  next();
};

async function getSingletonTournament() {
  let t = await Tournament.findOne();
  if (!t) {
    t = await Tournament.create({ status: 'idle', currentRound: 0, rounds: [], champion: null });
  }
  return t;
}

function buildRoundFromTeams(teamIds, roundNumber) {
  const ids = shuffle(teamIds);
  const matches = [];
  let byeIndex = -1;

  if (ids.length % 2 === 1) {
    byeIndex = Math.floor(Math.random() * ids.length);
  }

  const used = new Set();
  for (let i = 0; i < ids.length; i++) {
    if (used.has(i)) continue;

    if (i === byeIndex) {
      matches.push({
        round: roundNumber,
        teamA: ids[i],
        teamB: null,
        winner: ids[i],
        bye: true
      });
      used.add(i);
    } else {
      // find next unused partner
      let partner = -1;
      for (let j = i + 1; j < ids.length; j++) {
        if (used.has(j)) continue;
        if (j === byeIndex) continue;
        partner = j;
        break;
      }
      if (partner === -1) {
        // fallback if only BYE remains
        matches.push({
          round: roundNumber,
          teamA: ids[i],
          teamB: null,
          winner: ids[i],
          bye: true
        });
        used.add(i);
      } else {
        matches.push({
          round: roundNumber,
          teamA: ids[i],
          teamB: ids[partner],
          winner: null,
          bye: false
        });
        used.add(i);
        used.add(partner);
      }
    }
  }
  return matches;
}

function roundWinners(matches) {
  return matches
    .filter((m) => m.winner) // includes byes
    .map((m) => m.winner.toString());
}

/* ------------------------------ APIs ----------------------------- */
// Teams
app.post('/api/teams', async (req, res) => {
  try {
    const { name, players } = req.body || {};
    if (!name || !Array.isArray(players)) {
      return res.status(400).json({ error: 'name and players[] required' });
    }
    const trimmed = players.map((p) => String(p || '').trim()).filter(Boolean);
    if (trimmed.length < 2 || trimmed.length > 5) {
      return res.status(400).json({ error: 'Players must be 2–5' });
    }
    const team = await Team.create({ name: String(name).trim(), players: trimmed });
    res.json(team);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Team name must be unique' });
    }
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/teams', async (_req, res) => {
  const teams = await Team.find().sort({ createdAt: 1 });
  res.json(teams);
});

// Tournament
app.post('/api/tournament/start', requireAdmin, async (_req, res) => {
  try {
    const t = await getSingletonTournament();
    if (t.status !== 'idle') {
      return res.status(400).json({ error: 'Tournament already started or finished' });
    }
    const teams = await Team.find().select('_id');
    if (teams.length < 2) {
      return res.status(400).json({ error: 'Need at least 2 teams to start' });
    }
    const firstRound = buildRoundFromTeams(teams.map((x) => x._id), 1);

    t.status = 'running';
    t.currentRound = 1;
    t.rounds = [firstRound];
    t.champion = null;
    await t.save();

    res.json(await Tournament.findById(t._id).populate({
      path: 'rounds.teamA rounds.teamB rounds.winner champion',
      model: 'Team'
    }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/tournament', async (_req, res) => {
  try {
    const t = await getSingletonTournament();
    await t.populate({
      path: 'rounds.teamA rounds.teamB rounds.winner champion',
      model: 'Team'
    });
    res.json(t);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/matches/:matchId/winner', requireAdmin, async (req, res) => {
  try {
    const { matchId } = req.params;
    const { winnerTeamId } = req.body || {};
    if (!winnerTeamId) return res.status(400).json({ error: 'winnerTeamId required' });

    const t = await getSingletonTournament();
    if (t.status !== 'running') return res.status(400).json({ error: 'Tournament not running' });

    // Find match in current round
    const rIndex = t.currentRound - 1;
    const roundMatches = t.rounds[rIndex];
    if (!roundMatches) return res.status(400).json({ error: 'No matches in current round' });

    const match = roundMatches.find((m) => m._id.toString() === matchId);
    if (!match) return res.status(404).json({ error: 'Match not found in current round' });

    // Validate the winner belongs to match
    const valid =
      (match.teamA && match.teamA.toString() === winnerTeamId) ||
      (match.teamB && match.teamB.toString() === winnerTeamId);

    if (!valid) return res.status(400).json({ error: 'Winner must be teamA or teamB' });

    match.winner = winnerTeamId;

    // If all decided, build next round or finish
    const allDone = roundMatches.every((m) => !!m.winner);
    if (allDone) {
      const winners = roundWinners(roundMatches);
      if (winners.length === 1) {
        // Champion
        t.status = 'finished';
        t.champion = winners[0];
      } else {
        const nextRound = buildRoundFromTeams(winners, t.currentRound + 1);
        t.rounds.push(nextRound);
        t.currentRound += 1;
      }
    }

    await t.save();
    await t.populate({
      path: 'rounds.teamA rounds.teamB rounds.winner champion',
      model: 'Team'
    });

    res.json(t);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tournament/reset', requireAdmin, async (_req, res) => {
  try {
    const t = await getSingletonTournament();
    t.status = 'idle';
    t.currentRound = 0;
    t.rounds = [];
    t.champion = null;
    await t.save();
    await t.populate({
      path: 'rounds.teamA rounds.teamB rounds.winner champion',
      model: 'Team'
    });
    res.json(t);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ---------------------------- start ----------------------------- */
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
