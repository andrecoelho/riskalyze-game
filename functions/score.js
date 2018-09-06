const functions = require('firebase-functions');
const db = require('./db');

module.exports = functions.https.onRequest((request, response) => {
  console.log(request.body);
  const challenges = db.collection('challenges');
  response.send("Score from separate file, Hi Fish! :fish:");
 });