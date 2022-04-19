                  var utils = require("../scripts/util/commonUtils");
var config = require("../scripts/config/config");
var gatewayService = require('../service/gatewayService');
var testConfig = {
    userName :"TESTSIMPLIFYDEV1",
    password: "0af6b287057c4705f4f1d4da8581c646",
    baseUrl: "https://test-gateway.mastercard.com"
}
function requestPayload() {
    var orderId = "order-" + utils.keyGen(10);
    var orderAmount = "40.00";
    var orderCurrency = utils.getCurrency() || "USD";
    var orderDescription = 'Wonderful product that you should buy!';
    var transactionId = "trans-" + utils.keyGen(10);
    var baseUrl = testConfig.baseUrl;
    var merchant = "TESTSIMPLIFYDEV1";
    var apiVersion = "45";
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
var request = require("request");
jasmine.DEFAULT_TIMEOUT_INTERVAL = 20000;
describe("NodeJS Server", function() {
    describe("GET /", function() {
        it("verify generated authorize request data is equal or not", function(done) {
            var payload = requestPayload();
            var sessionId = utils.keyGen(16).toUpperCase();
            console.log(payload);
            payload.sessionId = sessionId;
            var requestData = gatewayService.apiRequestBody("AUTHORIZE", { body: payload });
            var responseToBe  = {
                apiOperation: 'AUTHORIZE',
                order: {
                    amount: '40.00',
                    currency: 'USD'
                },
                session: {
                    id: sessionId
                }
            }
            expect(requestData).toEqual(responseToBe);
            done();
        });
        it("verify generated PAY request data is equal or not", function(done) {
            var payload = requestPayload();
            var sessionId = utils.keyGen(16).toUpperCase();
            payload.sessionId = sessionId;
            var requestData = gatewayService.apiRequestBody("PAY", { body: payload });
            var responseToBe  = {
                apiOperation: 'PAY',
                order: {
                    amount: '40.00',
                    currency: 'USD'
                },
                session: {
                    id: sessionId
                }
            }
            expect(requestData).toEqual(responseToBe);
            done();
        });
        it("verify generated capture request data is equal or not", function(done) {
             var payload = requestPayload();
             var requestData = gatewayService.apiRequestBody("CAPTURE", { body: payload });
             var responseToBe  = {
                 apiOperation: 'CAPTURE',
                 transaction: {
                        amount: '40.00',
                        currency: 'USD'
                 }
             }
             expect(requestData).toEqual(responseToBe);
             done();
        });
        it("verify generated REFUND request data is equal or not", function(done) {
             var payload = requestPayload();
             var requestData = gatewayService.apiRequestBody("REFUND", { body: payload });
             var responseToBe  = {
                 apiOperation: 'REFUND',
                 transaction: {
                 amount: '40.00',
                 currency: 'USD'
                 }
             }
             expect(requestData).toEqual(responseToBe);
             done();
        });
        it("verify generated VOID request data is equal or not", function(done) {
             var payload = requestPayload();
             var requestData = gatewayService.apiRequestBody("VOID", { body: payload });
             requestData.transaction.targetTransactionId  = payload.transactionId;
             var responseToBe = {
                 apiOperation: 'VOID',
                 transaction: {
                 targetTransactionId: payload.transactionId
                  }
             }
             expect(requestData).toEqual(responseToBe);
             done();
        });
        it("verify generated RETRIVE request data is equal or not", function(done) {
             var payload = requestPayload();
             var requestData = gatewayService.apiRequestBody("RETRIVE", { body: payload });
             var responseToBe  = {
                 apiOperation: 'RETRIVE',
                 transaction: {
                 targetOrderId: payload.orderId
                 }
             }
             expect(requestData).toEqual(responseToBe);
             done();
        });

        it("verify generated INITIATE_BROWSER_PAYMENT request data is equal or not", function(done) {
             var payload = requestPayload();
             payload.sourceType = "card";
             payload.browserPaymentOperation = "INITIATE_BROWSER_PAYMENT";
                 var requestData = gatewayService.apiRequestBody("INITIATE_BROWSER_PAYMENT",{
                     body: payload,
                     protocol: "https",
                     headers : { host: "mytestweb.com"}
                 });
                 var responseToBe  = {
                     apiOperation: 'INITIATE_BROWSER_PAYMENT',
                     order: {
                     amount: '40.00',
                     currency: 'USD'
                     },
                     sourceOfFunds: { type: "card" },
                     browserPayment:{
                        operation: "INITIATE_BROWSER_PAYMENT",

                        paypal: {
                           paymentConfirmation: 'CONFIRM_AT_PROVIDER'
                        },

                     returnUrl: 'https://mytestweb.com/process/browserPaymentReceipt/'+payload.transactionId+'/'+payload.orderId


                     }
                 }
             expect(requestData).toEqual(responseToBe);
             done();
        });

    });
});