module.exports = () => ({
    "firebase-auth": {
        enabled: true,
        config: { FIREBASE_JSON_ENCRYPTION_KEY: process.env.FIREBASE_JSON_ENCRYPTION_KEY }
    },
});
