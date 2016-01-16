'use strict';

var env = process.env.NODE_ENV || 'development';

var config = null;
try {
    var configFile = require(__dirname + '/../config/stripe-config.json');
    config = configFile[env];
} catch (e) {
    console.log("Could not find stripe config file");
}

var getSecretKey = () => {
    let env_secret_key = process.env["STRIPE_SECRET_KEY"];
    if(env_secret_key) {
        return env_secret_key;
    }

    if(config) {
        return config.stripe_secret_key;
    }

    return undefined;
};

var getPublicKey = () => {
    let env_public_key = process.env["STRIPE_PUBLIC_KEY"];
    if(env_public_key) {
        return env_public_key;
    }

    if(config) {
        return config.stripe_public_key;
    }

    return undefined;
};

var stripe = require("stripe")(getSecretKey());

var chargeCard = (stripeToken, totalAmount) => {
    return stripe.charges.create({
        amount: parseFloat(totalAmount) * 100,
        currency: "aud",
        source: stripeToken,
        description: "Pirate party membership."
    })
};


module.exports = {
    getPublicKey: getPublicKey,
    getSecretKey: getSecretKey,
    chargeCard: chargeCard
};