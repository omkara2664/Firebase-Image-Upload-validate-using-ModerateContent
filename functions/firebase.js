const admin = require('firebase-admin')
const config = require('./admin.json')
const firebaseApp = admin.initializeApp(
    {
        credential: admin.credential.cert(config)
    },
    config.project_id,
);
module.exports = firebaseApp
const fireApp = firebaseApp.firestore();
fireApp.settings({ ignoreUndefinedProperties: true });

module.exports = { fireApp }