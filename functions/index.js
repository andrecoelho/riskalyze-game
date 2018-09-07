const functions = require('firebase-functions');

const gameChallenge = require('./game-challenge');
const gameChallengeResponse = require('./game-challenge.response');
const leaderboard = require('./leaderboard');
const score = require('./score');
const scoreResponse = require('./score.response');

exports.score = score;
exports.gameChallenge = gameChallenge;
exports.leaderboard = leaderboard;

exports.message_action = functions.https.onRequest((request, response) => {
  if (request.method !== 'POST') {
    console.error(`Got unsupported ${request.method} request. Expected POST.`);
    return response.send(405, 'Only POST requests are accepted');
  }

  if (!request.body && request.body.payload) {
    return response.send(405, 'Expected a message action payload.');
  }

  response.send();

  const payload = JSON.parse(request.body.payload);

  switch (payload.callback_id) {
    case 'game-challenge':
      gameChallengeResponse(payload);
      break;
    case 'approve-score':
      scoreResponse(payload);
      break;
  }
});
