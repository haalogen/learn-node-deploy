const crypto = require('crypto');
const mail = require('../handlers/mail');
const mongoose = require('mongoose');
const passport = require('passport'); // For logging in
const promisify = require('es6-promisify');
const User = mongoose.model('User');

exports.confirmPasswords = (req, res, next) => {
  if (req.body.password === req.body['password-confirm']) {
    next(); // Keep it going!
    return; // Stop function execution
  };

  req.flash('error', 'Passwords do not match!');
  res.redirect('back');
};

exports.forgot = async (req, res) => {
  const MESSAGE_PASSWORD_RESET_EMAIL_SENT = 'A password reset has been mailed to you.';
  // 1. See if a user with that email exists
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    req.flash('success', MESSAGE_PASSWORD_RESET_EMAIL_SENT);
    res.redirect('/login');
    return;
  };
  // 2. Set the reset token (hash string) and expiry (date) on their account
  user.resetPasswordToken = crypto.randomBytes(20).toString('hex');
  // Give them 1 hour to reset password
  const ONE_HOUR_IN_MILLISECONDS = 60 * 60 * 1000;
  user.resetPasswordExpires = Date.now() + ONE_HOUR_IN_MILLISECONDS;
  await user.save();

  // 3. Send them an email with the token
  const resetURL = `http://${req.headers.host}/account/reset/${user.resetPasswordToken}`;
  await mail.send({
    filename: 'password-reset',
    resetURL,
    subject: 'Password Reset',
    user,
  });
  req.flash('success', MESSAGE_PASSWORD_RESET_EMAIL_SENT);
  // 4. Redirect to login page
  res.redirect('/login')
}

exports.isLoggedIn = (req, res, next) => {
  // 1. Check if the user is authenticated (Passport.js)
  if (req.isAuthenticated()) {
    next(); // Carry on! They are logged in!
    return;
  };
  req.flash('error', 'Oops! You must be logged in!');
  res.redirect('/login');
}

// authenticate(strategyType=['local' (username & password), 'facebook' (token), ...], config)
exports.login = passport.authenticate('local', {
  failureRedirect: '/login',
  failureFlash: 'Failed Login!',
  successRedirect: '/',
  successFlash: 'You are now logged in!',
});

exports.logout = (req, res) => {
  req.logout();
  req.flash('success', 'You are now logged out!');
  res.redirect('/');
}

exports.reset = async (req, res) => {
  const user = await User.findOne({
    resetPasswordToken: req.params.token,
    resetPasswordExpires: {
      $gt: Date.now(), // "Greater than"
    },
  });
  if (!user) {
    req.flash('error', 'Password reset link is invalid or has expired');
    res.redirect('/login');
    return;
  };
  // If there is a user, show them the reset password form
  res.render('reset', { title: 'Reset your Password' });
}

exports.update = async (req, res) => {
  const user = await User.findOne({
    resetPasswordToken: req.params.token,
    resetPasswordExpires: {
      $gt: Date.now(), // "Greater than"
    },
  });

  if (!user) {
    req.flash('error', 'Password reset link is invalid or has expired');
    res.redirect('/login');
    return;
  };

  // "setPassword()" is provided by "passportLocalMongoose" plugin (User.js)
  const setPassword = promisify(user.setPassword, user) // Bind to "user" object
  await setPassword(req.body.password);

  // Get rid of "resetPassword..." fields
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  const updatedUser = await user.save();
  await req.login(updatedUser); // Passport.js

  req.flash('success', 'Your password has been reset. You are now logged in!');
  res.redirect('/');
}