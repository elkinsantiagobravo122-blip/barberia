const functions = require('firebase-functions');
const app = require('../server/server.js');

exports.api = functions.https.onRequest(app);
