const express = require('express');
const app = express();
const path = require('path');
const bodyParser = require('body-parser');
const fs = require('fs');
const name = fs.readFileSync('./name.txt', 'utf8');
let port = process.env.PORT || 3000;

if (process.env.NODE_ENV !== 'production') {
  console.log('DEVELOPMENT MODE');

  require('dotenv').config({
    path: path.join(path.dirname(__filename), '.env')
  });

  port = process.env.APP_PORT;
}

const challenge = require('./src/functions/challenge');
const leaderboard = require('./src/functions/leaderboard');
const score = require('./src/functions/score');
const messageAction = require('./src/message-action');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.post('/challenge', challenge);
app.post('/leaderboard', leaderboard);
app.post('/score', score);
app.post('/message-action', messageAction);

app.get('/status', (req, res) => res.send('OK'));

app.listen(port, () => console.log(`Server running on port ${port}\n\n${name}\n`));
