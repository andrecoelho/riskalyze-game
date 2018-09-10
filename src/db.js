const firebase = require('firebase');

firebase.initializeApp({
  apiKey: process.env.FIREBASE_WEBAPI,
  databaseUrl: process.env.FIREBASE_DATABASE_URL,
  projectId: process.env.FIREBASE_PROJECT_ID
});

firebase.firestore().settings( { timestampsInSnapshots: true });

module.exports = firebase.firestore();