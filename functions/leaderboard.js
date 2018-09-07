const functions = require('firebase-functions');
const slack = require('./slack');

const db  = require('./db');

module.exports = functions.https.onRequest((req, response) => {
  const postMessage = (message) => {
    return slack.chat.postEphemeral({
      user: req.body.user_id,
      channel: req.body.channel_id,
      text: message
    });
  }
  const params = req.body.text.split(' ');
  const game = params[0].trim().toLowerCase();
  const user = params[1] ? params[1].trim().substr(1) : null;

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

  // If user param exists, send user's score
  if (user) {
    db.collection('users').doc(user).get()
      .then(snapshot => {
        if(snapshot.exists) {
          db.collection('ratings')
          .where('game', '==', game)
          .where('slack_handle', '==', user)
          .get()
          .then(rating => {
            if(rating.docs[0]) {
              const record = rating.docs[0].data();
              
              const slackMessage = {
                user: req.body.user_id,
                channel: req.body.channel_id,
                attachments: [{
                  color: "#ed9005",
                  title: `Riskalyze Leaderboard: ${game.toUpperCase()}`,
                  fields: [{
                    value: `<@${record.slack_handle}>: ${record.rating}`,
                    short: false
                  }]
                }]
              }

              return slack.chat.postEphemeral(slackMessage);
            } else {
              const errorMessage = `This user does not have a rating.`

              return postMessage(errorMessage);
            }
          })
        } else {
          const errorMessage = `Not a valid user.`

          return postMessage(errorMessage);
        }
      })
      .catch(err => {
        const errorMessage = `Could not get user ranking.`

        return postMessage(errorMessage);
      })
    response.send('');
  } else {
  db.collection('games').doc(game).get()
    .then(snapshot => {
      if(snapshot.exists) {
        db.collection('ratings')
          .where('game', '==', game)
          .orderBy('rating', 'desc')
          .limit(15)
          .get()
          .then(ratings => {

            let rankCounter = 1;

            ratings.forEach(rating => {
              const user = rating.data().slack_handle
              const score = rating.data().rating;

              slackMessage.attachments[0].fields.push({
                value: `${rankCounter}. <@${user}>: ${score}`,
                short: false
              });

              rankCounter++;
            });

            return slack.chat.postEphemeral(slackMessage);
          })
          .catch(err => {
            const errorMessage = `There was an unexpected error. Please try again soon.`

            return postMessage(errorMessage);
          });
          response.send('');
      } else {
        const errorMessage = `Currently, "${game}" is not a valid game. Try "pong" or "smash" instead.`

        return postMessage(errorMessage);
      }
      response.send('');
    })
  }
});