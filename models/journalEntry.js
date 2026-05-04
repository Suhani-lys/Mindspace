const mongoose = require('mongoose');
const JournalEntrySchema = new mongoose.Schema({
  text: String,
  mood: String,
  tags: [String],
  createdAt: { type: Date, default: Date.now }
});
module.exports = mongoose.model('JournalEntry', JournalEntrySchema);