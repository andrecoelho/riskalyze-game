const fieldValue = require('firebase-admin').firestore.FieldValue;
const EloRank = require('elo-rank');
const db = require('./db');
const slack = require('./slack');
const elo = new EloRank(15);

module.exports = function(payload) {
  const button = payload.actions[0];
  const challengeRef = db.doc('/challenges/' + button.value);

  if (button.name === 'approve') {
    challengeRef.get().then(challengeDoc => {
      const challenge = challengeDoc.data();
      const player = payload.user.name;
      const user_a = challenge.user_a;
      const user_b = challenge.user_b;

      const opponent = player === user_a ? user_b : user_a;

      updateNewRanks(challenge);

      slack.chat.postMessage({
        channel: '@' + opponent,
        text: '<@' + player + '> has accepted your scores. :smile:'
      });

      challengeRef.update({
        status: 'closed'
      });

      slack.chat.update({
        channel: payload.channel.id,
        ts: payload.message_ts,
        text: payload.original_message.text,
        attachments: [
          {
            text: ':white_check_mark: Approved.'
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
        text: '<@' + player + '> has rejected your scores. :cry:'
      });

      challengeRef.update({
        winner: fieldValue.delete(),
        status: 'accepted'
      });

      slack.chat.update({
        channel: payload.channel.id,
        ts: payload.message_ts,
        text: payload.original_message.text,
        attachments: [
          {
            text: ':no_entry_sign: Rejected, receiving scores again.'
          }
        ]
      });
    });
  }
};

function updateNewRanks(challenge) {
  const winnerSlackHandle = challenge.winner;

  const loserSlackHandle =
    challenge.user_a === challenge.winner ? challenge.user_b : challenge.user_a;

  const winnerRatingPromise = db
    .collection('ratings')
    .where('game', '==', challenge.game)
    .where('slack_handle', '==', winnerSlackHandle)
    .get()
    .then(ratings => {
      if (ratings.size === 1) {
        return {
          id: ratings.docs[0].id,
          rating: ratings.docs[0].data().rating
        };
      }
    });

  const loserRatingPromise = db
    .collection('ratings')
    .where('game', '==', challenge.game)
    .where('slack_handle', '==', loserSlackHandle)
    .get()
    .then(ratings => {
      if (ratings.size === 1) {
        return {
          id: ratings.docs[0].id,
          rating: ratings.docs[0].data().rating
        };
      }
    });

  Promise.all([winnerRatingPromise, loserRatingPromise]).then(
    ([winner, loser]) => {
      const expectedWinner = elo.getExpected(winner.rating, loser.rating);
      const expectedLoser = elo.getExpected(loser.rating, winner.rating);

      db.doc('/ratings/' + winner.id).update({
        rating: elo.updateRating(expectedWinner, 1, winner.rating)
      });

      db.doc('/ratings/' + loser.id).update({
        rating: elo.updateRating(expectedLoser, 0, loser.rating)
      });
    }
  );
}
