const path = require('path');
const { WebClient } = require('@slack/client');

require('dotenv').config({
  path: path.join(path.dirname(__filename), '.env')
});

module.exports = new WebClient(process.env.SLACK_TOKEN);