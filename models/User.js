const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
const md5 = require('md5');
const validator = require('validator');
const mongodbErrorHandler = require('mongoose-mongodb-errors');
const passportLocalMongoose = require('passport-local-mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    lowercase: true,
    require: 'Please supply email address',
    trim: true,
    unique: true, // Will give ugly error
    validate: [validator.isEmail, 'Invalid Email Address'],
  },
  hearts: [ // Array of IDs
    { type: mongoose.Schema.ObjectId, ref: 'Store' }, // "Heart" is a reference to the "Store" item
  ],
  name: {
    type: String,
    require: 'Please supply a name',
    trim: true,
  },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
});

// Add a virtual field to schema (not stored, but can be calculated on the fly)
userSchema.virtual('gravatar').get(function () {
  const hash = md5(this.email);
  return `https://gravatar.com/avatar/${hash}?s=200`;
});

// Adds auth for each user: exposes "register()" method on "User" model; builds index by field "email"
userSchema.plugin(passportLocalMongoose, { usernameField: 'email' });
userSchema.plugin(mongodbErrorHandler); // For "prettifying" ugly MongoDB errors


module.exports = mongoose.model('User', userSchema);