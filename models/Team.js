const mongoose = require('mongoose');

const TeamSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    players: {
      type: [String],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length >= 2 && arr.length <= 5,
        message: 'Players must be 2–5.'
      }
    }
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

TeamSchema.index({ name: 1 }, { unique: true });

module.exports = mongoose.model('Team', TeamSchema);
