const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  clerkUserId: { type: String, required: true },
  FirstName: { type: String },
  LastName: { type: String },
  Skill: { type: String },
  LinkdinId: { type: String },
  GithubId: { type: String },
  imageUrl: { type: String, required: true },
  newUser: { type: Boolean, default: true },
  posts: [{ type: String }],
  location: { type: String },
  followers: [{ type: String }],
  followings: [{ type: String }],
});

module.exports = mongoose.model('User', userSchema);