const fieldValue = require('firebase-admin').firestore.FieldValue;
const db = require('./db');
const slack = require('./slack');

module.exports = function(payload) {
  const button = payload.actions[0];

  if (button.name === 'approve') {
    db.doc('/challenges/' + button.value).update({
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
  } else {
    db.doc('/challenges/' + button.value).update({
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
  }
};
