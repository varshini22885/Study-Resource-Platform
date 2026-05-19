const passport = require('passport');
const User = require('../models/User');

// Serialize user
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user
passport.deserializeUser((id, done) => {
  User.findById(id)
    .select('-password')
    .then(user => done(null, user))
    .catch(err => done(err));
});

module.exports = passport;
