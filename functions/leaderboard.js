const functions = require('firebase-functions');
const slack = require('./slack');

const db  = require('./db');

module.exports = functions.https.onRequest((req, response) => {
  const game = req.body.text.trim().toLowerCase();

  const slackMessage = {
    user: req.body.user_id,
    channel: req.body.channel_id,
    attachments: [
        {
            color: "#ed9005",
            title: `Riskalyze Leaderboard: ${game.toUpperCase()}`,
            fields: []
        }
    ]
  }

  db.collection('games').doc(game).get()
    .then(snapshot => {
      if(snapshot.exists) {
        db.collection('ratings')
          .where('game', '==', game)
          .orderBy('rating', 'desc')
          .limit(10)
          .get()
          .then(ratings => {

            let rankCounter = 1;

            ratings.forEach(rating => {
              const slack_handle = rating.data().slack_handle
              const score = rating.data().rating;

              slackMessage.attachments[0].fields.push({
                value: `${rankCounter}. <@${slack_handle}>: ${score}`,
                short: false
              });

              rankCounter++;
            });

            return slack.chat.postEphemeral(slackMessage);
          })
          .catch(err => {
            return slack.chat.postEphemeral({
              user: req.body.user_id,
              channel: req.body.channel_id,
              text: `There was an unexpected error. Please try again soon.`
            });
          });
          response.send('')
      } else {
        return slack.chat.postEphemeral({
          user: req.body.user_id,
          channel: req.body.channel_id,
          text: `Currently, "${game}" is not a valid game. Try "pong" or "smash" instead.`
        });
      }
    })
});