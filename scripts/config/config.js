var CONFIG = {};
CONFIG.JWT = {
    SECRET: 'TEST_SECRET'
}
CONFIG.MODE = 'DEV';
CONFIG.PROD_MODE = CONFIG.MODE === 'DEV' ? false: true;
CONFIG.IS_CERT_AUTH_ENABLED = false;
CONFIG.CURRENCY= "VND";
CONFIG.TEST_GATEWAY = {
    BASEURL: "https://test-gateway.mastercard.com",
    API_VERSION: "61",
    USERNAME: "merchant.111-M-220322",
    PASSWORD: "14b400226ffa8af6ff2c0681e84e074e",
    MERCHANTID: "111-M-220322"
};
CONFIG.PKI_GATEWAY = {
    BASEURL: "https://test-gateway.mastercard.com",
    API_VERSION: "61",
    MERCHANTID: "111-M-220322"
}
CONFIG.WEBHOOKS = {
    WEBHOOKS_NOTIFICATION_SECRET : '',
    WEBHOOKS_NOTIFICATION_FOLDER : 'webhooks-notifications'
}
CONFIG.SSL_FILES = {
    CRT: process.env.SSL_CRT_PATH,
    KEY: process.env.SSL_KEY_PATH
}
module.exports = CONFIG;