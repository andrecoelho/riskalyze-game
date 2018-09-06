const functions = require('firebase-functions');
const db = require('./db');
const slack = require('./slack');

module.exports = functions.https.onRequest((request, response) => {
  const users = db.collection('users');

  users
    .where('slack_handle', '==', request.body.user_name)
    .get()
    .then(matchedUsers => {
      if (matchedUsers.size == 1) {
        return slack.chat.postMessage({
          channel: request.body.channel_id,
          text: 'Your full name is: ' + matchedUsers.docs[0].data().name
        });
      }
    })
    .catch(console.error);

  response.send('');
});
