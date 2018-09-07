const functions = require('firebase-functions');
const db = require('./db');
const slack = require('./slack');

const GAME_CHALLENGE_STATUS = {
    OPEN: 'open',
    ACCEPTED: 'accepted',
    SCORED: 'scored',
    CLOSED: 'closed'
};

class GameChallenge {
    constructor() {
        this.errors = [];
        this.challengee = null;
        this.challenger = null;
        this.game = null;
        this.slackResponse = {};
        this.availableGames = [];        
    }

    // fetch the availabe games from the database, and validate the input from the user is a valid game to challenge
    validateAvailableGames() {
        const games = db.collection('games');
        const self = this;

        return new Promise(function(resolve, reject) {
            games.get().then(allGames => {
                let isValidGame = false;
                let shortNames = [];
                allGames.forEach((game) => {
                    let data = game.data();
                    self.availableGames.push(data);   
                    if (game.id === self.game) {
                        isValidGame = true;
                    }
                    shortNames.push(game.id);
                });
                if (isValidGame) {
                    resolve();
                } else {
                    self.errors.push(self.game + " is not a valid game! Valid games: " + shortNames.join(', '));
                    reject();
                }
            }, err => {
                reject();
            }).catch(console.error);
        });
    }
    
    validateAndParseParameters(slackResponse) {
        let commandParameters = slackResponse.text.split(' ');
        if (commandParameters.length !== 2) {
            this.errors.push("Invalid parameters! Example command: `/game-challenge @someone smash`.");
            return false;
        }
        this.slackResponse = slackResponse;
        this.challengee = commandParameters[0].substr(1); // cut off the leading "@" in Slack handle
        this.challenger = slackResponse.user_name;
        this.game = commandParameters[1].toLowerCase();

        return true;
    }

    challenge() {
        const self = this;
        // make sure it's a valid game   
        this.validateAvailableGames().then(() => {    
            self.validateChallengeAvailability()
                .then(() => {
                    // create a challenge and tell the challengee
                    db.collection('challenges').add({
                        game: self.game,
                        status: 'open',
                        user_a: self.challenger,
                        user_b: self.challengee
                    }).then(challenge => {
                        slack.chat.postMessage({
                            text: 'You have been challenged by <@' + self.challenger + '> in a game of ' + self.game + '.',
                            channel: '@' + self.challengee,                        
                            attachments: [
                                {
                                    text: 'Do you accept?',
                                    fallback: "You are unable to accept",
                                    callback_id: 'game-challenge',
                                    actions: [
                                        {
                                            name: 'approval',
                                            text: 'I Accept!',
                                            type: 'button',
                                            value: 'accept',
                                            style: 'primary'
                                        },
                                        {
                                            name: 'approval',
                                            text: 'No thanks!',
                                            type: 'button',
                                            value: 'reject',
                                            style: 'danger'
                                        }                                    
                                    ]
                                }
                            ]
                        });
                    });                                        
                }, err => {             
                    slack.chat.postEphemeral({
                        channel: self.slackResponse.channel_id,
                        user: self.slackResponse.user_id,
                        text: self.getErrors()
                    });
                })                
        }, (err) => {
            // send message back to user with error
            slack.chat.postEphemeral({
                channel: self.slackResponse.channel_id,
                user: self.slackResponse.user_id,
                text: self.getErrors()
            });
        }).catch(console.error);
    }

    // Checks that the two Challengers don't already have an open challenge
    validateChallengeAvailability() {
        const self = this;
        return new Promise(function(resolve, reject) {        
            db.collection('challenges')
                .where('user_a', '==', self.challenger)
                .where('user_b', '==', self.challengee)
                .where('game', '==', self.game)
                .get()
                .then(matchedChallenges => {
                    let hasOpenChallenge = false;
                    // loop through the challenges. Is there anything in open, accepted, scored state?
                    matchedChallenges.forEach(challenge => {
                        if (['open', 'accepted', 'scored'].indexOf(challenge.data().status) >= 0) {
                            hasOpenChallenge = true;
                        }                
                    });
                    if (hasOpenChallenge) {
                        self.errors.push("You already have an open challenge with this Riskalyzer!");
                        reject();
                    } else {
                        db.collection('challenges')
                            .where('user_a', '==', self.challengee)
                            .where('user_b', '==', self.challenger)
                            .where('game', '==', self.game)
                            .get()
                            .then(matchedChallenges => {
                                let hasOpenChallenge = false;
                                // loop through the challenges. Is there anything in open, accepted, scored state?
                                matchedChallenges.forEach(challenge => {
                                    if (['open', 'accepted', 'scored'].indexOf(challenge.data().status) >= 0) {
                                        hasOpenChallenge = true;
                                    }                
                                });
                                if (hasOpenChallenge) {
                                    self.errors.push("You already have an open challenge with this Riskalyzer!");
                                    reject();
                                } else {
                                    resolve();
                                }
                            })
                            .catch(console.error);
                    }
                })
                .catch(console.error);
        });
    }

    getErrors() {
        return this.errors.join("\n");
    }
}

module.exports = functions.https.onRequest(function(request, response) {
    const gc = new GameChallenge();

    let slackResponse = request.body;    
    if (!gc.validateAndParseParameters(slackResponse)) {
        response.send(gc.getErrors());
        return;
    }
    gc.challenge();
    response.send('');
});