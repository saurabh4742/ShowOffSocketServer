const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  sender: { type: String, required: true },
  receiver: { type: String, required: true },
  message: { type: String, required: true },
  attachmentUrl: { type: String },
  sentAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Chat', chatSchema);
