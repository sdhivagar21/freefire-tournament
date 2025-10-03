const mongoose = require('mongoose');
const { Schema, Types } = mongoose;

const MatchSchema = new Schema({
  round: { type: Number, required: true },
  teamA: { type: Types.ObjectId, ref: 'Team', required: true },
  teamB: { type: Types.ObjectId, ref: 'Team', default: null },
  winner: { type: Types.ObjectId, ref: 'Team', default: null },
  bye: { type: Boolean, default: false }
});

const TournamentSchema = new Schema(
  {
    status: { type: String, enum: ['idle', 'running', 'finished'], default: 'idle' },
    currentRound: { type: Number, default: 0 },
    rounds: { type: [[MatchSchema]], default: [] },
    champion: { type: Types.ObjectId, ref: 'Team', default: null }
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

module.exports = mongoose.model('Tournament', TournamentSchema);
