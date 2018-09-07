const functions = require('firebase-functions');
const score = require('./score');
const gameChallenge = require('./game-challenge');

exports.score = score;
exports.gameChallenge = gameChallenge;

exports.message_action = functions.https.onRequest((request, response) => {
    console.log(request.body);

    if (request.method !== "POST") {
        console.error(`Got unsupported ${request.method} request. Expected POST.`);
        return response.send(405, "Only POST requests are accepted");
    }

    if (!request.body && request.body.payload) {
        return response.send(405, "Expected a message action payload.");
    }

    const action = JSON.parse(request.body.payload);

    return response.contentType("json").status(200).send(action.original_message);
});