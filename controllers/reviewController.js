const mongoose = require('mongoose');
const Review = mongoose.model('Review');

exports.addReview = async (req, res) => {
  // Add necessary fields to "req.body"
  req.body.author = req.user._id;
  req.body.store = req.params.id;
  const newReview = await (new Review(req.body)).save(); // Wait for saving to MongoDB

  req.flash('success', `Review saved!`);
  res.redirect('back');
}