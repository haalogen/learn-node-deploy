const mongoose = require('mongoose');

// Make sure we are running node 7.6+
const [major, minor] = process.versions.node.split('.').map(parseFloat);
if (major < 7 || (major === 7 && minor <= 5)) {
  console.log('🛑 🌮 🐶 💪 💩\nHey You! \n\t ya you! \n\t\tBuster! \n\tYou\'re on an older version of node that doesn\'t support the latest and greatest things we are learning (Async + Await)! Please go to nodejs.org and download version 7.6 or greater. 👌\n ');
  process.exit();
}

// import environmental variables from our variables.env file
// Env variables = where we store SENSITIVE data:
// passwords, usernames, logins, API keys, tokens, anything for safety
// `variables.env` file should never go to repo
// `dotenv` puts env vars to process.env.VARNAME
require('dotenv').config({ path: 'variables.env' });

// Connect to our Database and handle any bad connections
mongoose.connect(process.env.DATABASE);
// Tell Mongoose to use ES6 promises. So we can use async/await
mongoose.Promise = global.Promise;
// Listen for any error mongoose can throw
mongoose.connection.on('error', (err) => {
  console.error(` 🙅 🚫 → ${err.message}`);
});

// READY?! Let's go!

// Import all of our models
require('./models/Store');
require('./models/User');
require('./models/Review');


// Start our app!
const app = require('./app');
// Kick off (start) the server
app.set('port', process.env.PORT || 7777);
const server = app.listen(app.get('port'), () => {
  console.log(`Express running → PORT ${server.address().port}`);
});
