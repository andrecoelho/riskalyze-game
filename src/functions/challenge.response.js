const db = require('../db');
const slack = require('../slack');

module.exports = function(payload) {
  const button = payload.actions[0];
  const challengeRef = db.doc('/challenges/' + button.value);

  if (button.name === 'accept') {
    challengeRef.get().then(challenge => {
      const player = payload.user.name;
      const user_a = challenge.data().user_a;
      const user_b = challenge.data().user_b;

      const opponent = player === user_a ? user_b : user_a;

      slack.chat.postMessage({
        channel: '@' + opponent,
        text: '<@' + player + '> has accepted your challenge. :tada:'
      });

      challengeRef.update({
        status: 'accepted'
      });

      slack.chat.update({
        channel: payload.channel.id,
        ts: payload.message_ts,
        text: payload.original_message.text,
        attachments: [
          {
            text: ':white_check_mark: Accepted.'
          }
        ]
      });
    });
  } else {
    challengeRef.get().then(challenge => {
      const player = payload.user.name;
      const user_a = challenge.data().user_a;
      const user_b = challenge.data().user_b;

      const opponent = player === user_a ? user_b : user_a;

      slack.chat.postMessage({
        channel: '@' + opponent,
        text: '<@' + player + '> has rejected your challenge. :disappointed:'
      });

      challengeRef.delete();

      slack.chat.update({
        channel: payload.channel.id,
        ts: payload.message_ts,
        text: payload.original_message.text,
        attachments: [
          {
            text: ':no_entry_sign: Rejected.'
          }
        ]
      });
    });
  }
};
