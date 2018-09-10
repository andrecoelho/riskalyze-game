const challengeResponse = require('./functions/challenge.response');
const scoreResponse = require('./functions/score.response');

module.exports = (request, response) => {
  if (!request.body && request.body.payload) {
    return response.send(405, 'Expected a message action payload.');
  }

  response.send();

  const payload = JSON.parse(request.body.payload);

  switch (payload.callback_id) {
    case 'game-challenge':
      challengeResponse(payload);
      break;
    case 'approve-score':
      scoreResponse(payload);
      break;
  }
};
