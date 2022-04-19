//Dependencies
var express = require('express');
const router = express.Router();
var utils = require('../../../scripts/util/commonUtils');
const { getId, sendEmail, getEmailTemplate } = require("../../common");
var session = require('express-session');
var config = require('../../../scripts/config/config');
var gatewayService = require('../../../service/gatewayService');
var webhookService = require('../../../service/webhookService');
var view_path = '../views';
function requestPayload() {
    var orderId = "order-" + utils.keyGen(10);
    var orderAmount = "";
    var orderCurrency = utils.getCurrency();
    var orderDescription = 'Wonderful product that you should buy!';
    var transactionId = "trans-" + utils.keyGen(10);
    var baseUrl = config.TEST_GATEWAY.BASEURL;
    var merchant = config.TEST_GATEWAY.MERCHANTID;
    var apiVersion = config.TEST_GATEWAY.API_VERSION;
    return {
        baseUrl: baseUrl,
        merchant: merchant,
        apiVersion: apiVersion,
        orderId: orderId,
        orderAmount: orderAmount,
        orderCurrency: orderCurrency,
        orderDescription: orderDescription,
        transactionId: transactionId
    };
}

/**
 * Display AUTHORIZE operation page
 *
 * @return response for authorize.ejs
 */
// router.get('/authorize', function (request, response, next) {
//     var responseData = requestPayload();
//     responseData.title = "Authorize";
//     response.render(view_path + '/authorize', responseData);
//     next();
// });

router.get('/detail', function (req, response, next) {
    const config = req.app.config;
    let paymentType = "";
    if (req.session.cartSubscription) {
      paymentType = "_subscription";
    }
    response.render(view_path + '/themes/Cloth/contact', {
        title: "contact",
        config: req.app.config,
        session: req.session,
        paymentType,
        cartClose: false,
        page: "contact",
        helpers: req.handlebars.helpers,
        showFooter: "showFooter",
      });
    // next();
})

/**
 * Display PAY operation page
 *
 * @return response for pay.ejs
 */
router.post('/pay-detail', function (req, response, next) {
    
    response.redirect('/instore/pay-detail');
});

/**
 * Display PAY operation page
 *
 * @return response for pay.ejs
 */
 router.get('/payment-checkout', function (req, response, next) {
    
    req.datastring = JSON.stringify(req);
    let reqData = req;
    response.render(view_path + '/paymentCheckout', {
        title: "paymentCheckout",
        config: req.app.config,
        session: req.session,
        reqData: reqData,
        cartClose: false,
        page: "paymentCheckout",
        helpers: req.handlebars.helpers,
        showFooter: "showFooter",
      });
});

/**
 * Display PAY operation page
 *
 * @return response for pay.ejs
 */
 router.get('/pay-detail', function (req, response, next) {
    var responseData = requestPayload();
    // responseData.title = "Pay";
        console.log('baseUrl1');
        console.log(req.session)
    if(!req.session.totalCartAmount){
        console.log('baseUrl1');
        console.log(req.session);
        response.redirect("/shop");
        return;
    }
    responseData.orderId = getId();
    responseData.orderAmount = parseInt(req.session.totalCartAmount);
    responseData.totalCartShipping = parseInt(req.session.totalCartShipping);
    responseData.totalCartDiscount = parseInt(req.session.totalCartDiscount);
    responseData.totalCartNetAmount = parseInt(req.session.totalCartNetAmount);
    responseData.orderCurrency = utils.getCurrency();
    responseData.orderDescription = 'Wonderful product that you should buy!';
    responseData.transactionId = "trans-" + utils.keyGen(10);
    response.render(view_path + '/pay', {
        title: "Pay Mastarcard",
        config: req.app.config,
        session: req.session,
        cartClose: false,
        page: "Pay Mastercard",
        result: responseData,
        helpers: req.handlebars.helpers,
        showFooter: "showFooter",
      });
    // next();
});

/**
 * Display Capture operation page
 *
 * @return response for capture.ejs
 */
// router.get('/capture', function (request, response, next) {
//     var transid = "trans-" + utils.keyGen(10);
//     var responseData = { title: "Capture", transctionId: transid };
//     response.render(view_path + '/capture', responseData);
//     next();
// });
/**
 * Display REFUND operation page
 *
 * @return response for refund.ejs
 */
router.get('/refund', function (request, response, next) {
    var transid = "trans-" + utils.keyGen(10);
    var responseData = { title: "Refund", transctionId: transid };
    response.render(view_path + '/refund', responseData);
    next();
});
/**
 * Display VOID operation page
 *
 * @return response for void.ejs
 */
router.get('/void', function (request, response, next) {
    var transid = "trans-" + utils.keyGen(10);
    var responseData = { title: "Void", transctionId: transid };
    response.render(view_path + '/void', responseData);
    next();
});
/**
 * Display VERIFY operation page
 *
 * @return response for verify.ejs
 */
router.get('/verify', function (request, response, next) {

    var responseData = requestPayload();
    responseData.title = "Verify";

    response.render(view_path + '/verify', responseData);
    next();
});
/**
 * Display Retrive Transaction operation page
 *
 * @return response for retrive.ejs
 */
router.get('/retrieve', function (request, response, next) {
    var responseData = { title: "Retrieve" };
    response.render(view_path + '/retrieve', responseData);
    next();
});


/**
 * Display page for PayPal browser payment
 *
 * Set request URL hostname to the redirect URL
 * @return response for paypal.ejs
 */
router.get('/paypal', function (request, response, next) {
    var responseData = requestPayload();
    var returnUrl = request.protocol + "://" + request.headers.host + "/browserPaymentReceipt?transactionId=" + responseData.transactionId + "&amp;orderId=" + responseData.orderId;
    responseData.title = "PayPal";
    responseData.apiOperation = "INITIATE_BROWSER_PAYMENT";
    responseData.apiMethod = "PUT";
    responseData.sourceType = "PAYPAL";
    responseData.browserPaymentOperation = "PAY";
    responseData.returnUrl = returnUrl;
    response.render(view_path + '/paypal', responseData);
    next();
});



/**
 * Display page for Authorize with UnionPay SecurePay browser payment
 *
 * Set request URL hostname to the redirect URL
 * @return response for unionpay.ejs
 */
router.get('/unionpay', function (request, response, next) {
    var responseData = requestPayload();
    var returnUrl = request.protocol + "://" + request.headers.host + "/process/browserPaymentReceipt?transactionId=" + responseData.transactionId + "&amp;orderId=" + responseData.orderId;
    responseData.title = "Union Pay";
    responseData.apiOperation = "INITIATE_BROWSER_PAYMENT";
    responseData.apiMethod = "PUT";
    responseData.sourceType = "UNION_PAY";
    responseData.browserPaymentOperation = "PAY";
    responseData.returnUrl = returnUrl;
    response.render(view_path + '/unionpay', responseData);
    next();
});

/**
 * Display page for Authorize 3DS
 *
 *
 * Set request URL hostname to the redirect URL
 * @return response for secureId.ejs
 */
router.get('/secureId', function (request, response, next) {
    var responseData = requestPayload();
    responseData.title = "secureId";
    response.render(view_path + '/secureId', responseData);
    next();
});

/**
* Show Masterpass page - this is only for demonstration purposes so that the user of this sample code can enter API payload details
* Set request URL hostname to the redirect URL
* @return response for masterpass.ejs
 */
router.get('/masterpass', function (request, response, next) {
    var responseData = requestPayload();
    responseData.title = "Masterpass";
    responseData.masterpassOriginUrl = request.protocol + "://" + request.headers.host + "/process/masterpassResponse";
    response.render(view_path + '/masterpass', responseData);
    next();
});

/**
 * Display payWithToken operation page
 *
 * @return response for payWithToken.ejs
 */
router.get('/payWithToken', function (request, response, next) {
    var responseData = requestPayload();
    responseData.title = "Pay With Token";
    response.render(view_path + '/payWithToken', responseData);
    next();
});

router.get('/getwebhookNotification', function (request, response, next) {
    return response.status(200).json(webhookService.listWebhookNotification());
    next();
});
/**
 * Display PAY throygh NVP operation page
 *
 * @return response for payThroughNVP.ejs
 */
router.get("/payThroughNVP", function (request, response, next) {
    var responseData = requestPayload();
    responseData.title = "payThroughNVP";
    response.render(view_path + '/payThroughNVP', responseData);
    next();
});
/**
 * Display webhooks operation page
 *
 * @return response for webhooks.ejs
 */
router.get('/webhooks', function (request, response, next) {
    var responseData = { title: "Webhooks" };
    response.render(view_path + '/webhooks', responseData);
    next();
});
router.post('/process-webhook', function (request, response, next) {
    webhookService.processWebhook(request, response);
    response.send("processed-webhook");
    next();
});

module.exports = router;