const mongoose = require('mongoose');
const JournalEntrySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  text: String,
  mood: String,
  tags: [String],
  createdAt: { type: Date, default: Date.now }
});
module.exports = mongoose.model('JournalEntry', JournalEntrySchema);