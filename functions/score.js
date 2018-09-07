const functions = require('firebase-functions');
const db = require('./db');
const slack = require('./slack');

module.exports = functions.https.onRequest((request, response) => {
  response.send();

  const arguments = request.body.text.replace(/\s+/, ' ').split(' ');

  if (arguments.length != 3) {
    return slack.chat.postEphemeral({
      channel: request.body.channel_id,
      user: request.body.user_id,
      text: 'Usage: *'+request.body.command+'* `@opponent [game] @winner`'
    });
  }

  const player = request.body.user_name.toLowerCase();
  const opponent = stripAt(arguments[0]).toLowerCase();
  const game = arguments[1].toLowerCase();
  const winner = stripAt(arguments[2]).toLowerCase();

  findOpenChallenge(game, player, opponent)
    .then(challenges => {
      if (challenges.size == 1) {
        return challenges.docs[0];
      } else {
        return findOpenChallenge(game, opponent, player).then(challenges => {
          if (challenges.size == 1) {
            return challenges.docs[0];
          } else {
            slack.chat.postEphemeral({
              channel: request.body.channel_id,
              user: request.body.user_id,
              text: 'Cannot post score, challenge not found.'
            });

            throw new Error();
          }
        });
      }
    })
    .then(challenge => {
      db.doc('/challenges/' + challenge.id).set(
        {
          winner,
          status: 'scored'
        },
        { merge: true }
      );

      slack.chat.postEphemeral({
        channel: request.body.channel_id,
        user: request.body.user_id,
        text:
          'Score result saved for winner: <@' +
          winner +
          '>. Waiting for <@' +
          opponent +
          '> to confirm.'
      });

      slack.chat.postMessage({
        channel: '@' + opponent,
        text:
          '<@' +
          player +
          '> has submitted scores for your game together, setting the winner as: <@' +
          winner +
          '>.',
        attachments: [
          {
            fallback: 'Your slack app is not able to approve scores.',
            text: 'Please choose your agreement below:',
            actions: [
              {
                name: 'approve',
                text: 'Approve',
                type: 'button',
                value: 'approve',
                style: 'primary'
              },
              {
                name: 'reject',
                text: 'Reject',
                type: 'button',
                value: 'reject',
                style: 'danger'
              }
            ]
          }
        ]
      });
    })
    .catch(() => {});
});

function findOpenChallenge(game, player, opponent) {
  return db
    .collection('challenges')
    .where('status', '==', 'open')
    .where('game', '==', game)
    .where('user_a', '==', player)
    .where('user_b', '==', opponent)
    .get();
}

function stripAt(username) {
  if (username.indexOf('@') == 0) {
    return username.slice(1);
  }

  return username;
}
