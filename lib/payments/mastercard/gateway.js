var express = require('express');
var gatewayService = require('../../../service/gatewayService');
var utils = require('../../../scripts/util/commonUtils');
var config = require('../../../scripts/config/config');
const { getPaymentConfig } = require("../../config");
const { getId, sendEmail, getEmailTemplate } = require("../../common");
const { indexOrders } = require("../../indexing");
var router = express.Router();
var view_path = '../views';
var requestCrud = require('request');
var https = require('https');
const { detect } = require('detect-browser');
const { toUpper } = require('lodash');
const { newId } = require('../../common');
const open = require('open');
const { emptyCart } = require("../../cart");
const browser = detect();

function handleResponse(result, req, response) {
    // var responseData = gatewayService.apiResponseBody(req, result);
    console.log('result');
    console.log(result);
    if(result.idOrder){
        let urlDomain = req.protocol+"://"+req.headers.host;
        open(urlDomain+"/instore/verify-otp/"+result.idOrder);
        // response.redirect(urlDomain+"/instore/verify-otp/"+result.idOrder);
        return true;
    }
    var responseData = gatewayService.apiResponsePay(req, result);
    if (responseData.status) {
        console.log('responseData');
        console.log(responseData);
        const db = req.app.db;

        async function detailOrders(){
            const orders = await db.orders
            .findOne({
                _id: getId(responseData.order.id),
            });
            return orders;
        }
        
        let detailOrder = detailOrders();
        detailOrder.then( function (result){
            console.log('result');
            console.log(result);
            response.render(view_path + '/receipt', {
                title: "receipt",
                config: req.app.config,
                session: req.session,
                resData: responseData,
                order: result,
                cartClose: false,
                page: "receipt",
                helpers: req.handlebars.helpers,
                showFooter: "showFooter",
            });
        });
    } else {
        response.render(view_path + '/errors', {
            title: "Erros",
            config: req.app.config,
            session: req.session,
            result: responseData,
            cartClose: false,
            page: "errors",
            helpers: req.handlebars.helpers,
            showFooter: "showFooter",
          });
    }
}

router.get('/detail-gate', function (req, response, next) {
    const config = req.app.config;
    let paymentType = "";
    if (req.session.cartSubscription) {
      paymentType = "_subscription";
    }
    
    const db = req.app.db;

    async function detailOrders(){
        const orders = await db.orders
        .findOne({
            _id: getId('6242cc6ff6e2c01c5c6d66a7'),
        });
        return orders;
    }
    
    let detailOrder = detailOrders();
    detailOrder.then( function (result){

        console.log("detailOrder");
        console.log(result);
        response.render(view_path + '/verifyOtp', {
            title: "contact",
            config: req.app.config,
            session: req.session,
            order: result,
            cartClose: false,
            page: "contact",
            helpers: req.handlebars.helpers,
            showFooter: "showFooter",
          });
    });
    // next();
})
/**
* This method calls the AUTHORIZE operation, which returns the response body or error body.
*
* @param request contains info on how to construct API call
* @return  receipt page or error page with response body for AUTHORIZE operation
*/
router.post('/authorize', function (request, response) {
    var requestData = gatewayService.apiRequestBody("AUTHORIZE", request);
    var apiRequest = request.body;
    var requestUrl = gatewayService.getRequestUrl("REST", apiRequest);
    gatewayService.processAuthorize(requestData, requestUrl, function (result) {
        handleResponse(result, request, response);
    });
});
/**
* This method calls the PAY operation, which returns the  response body or error body.
*
* @param request contains info on how to construct API call
* @return  receipt page or error page with response body for PAY operation
*/
router.post('/pay', function (request, response, next) {
    console.log('resquest');
    console.log(request);
    var requestData = gatewayService.apiRequestBody("INITIATE_AUTHENTICATION", request);
    var apiRequest = request.body;
    
    var urlDomain = request.protocol+"://"+request.headers.host;
    var idOrder = '';
    //Lưu lại đơn hàng
    const db = request.app.db;
    const instoreConfig = getPaymentConfig();

    const orderDoc = {
        orderPaymentId: apiRequest.orderId,
        transactionId: apiRequest.transactionId,
        sessionId: apiRequest.sessionId,
        orderPaymentGateway: "MASTERCARD",
        orderPaymentMessage: "Thanh toán của bạn đã được hoàn thành",
        orderTotal: parseInt(request.session.totalCartAmount),
        orderShipping: parseInt(apiRequest.totalCartShipping),
        orderDiscount: parseInt(apiRequest.totalCartDiscount),
        orderItemCount: request.session.totalCartItems,
        orderProductCount: request.session.totalCartProducts,
        orderCustomer: getId(request.session.customerId),
        orderEmail: request.session.customerEmail,
        orderCompany: request.session.customerCompany,
        orderFirstname: request.session.customerFirstname,
        orderLastname: request.session.customerLastname,
        orderAddr1: request.session.customerAddress1,
        orderAddr2: request.session.customerAddress2,
        orderCountry: request.session.customerCountry,
        orderState: request.session.customerState,
        orderPostcode: request.session.customerPostcode,
        orderPhoneNumber: request.session.customerPhone,
        orderComment: request.session.orderComment,
        orderStatus: instoreConfig.orderStatus,
        paymentStatus: 0,
        orderDate: new Date(),
        orderProducts: request.session.cart,
        orderType: "Single",
    };
    // insert order into DB
    try {
        async function start() {
            const newDoc = await db.orders.insertOne(orderDoc);
            // get the new ID
            var newId = newDoc.insertedId;
            return newId;
        }
       
        let idOrderCall = start();
        idOrderCall.then( function (result){
            idOrder = result;
            console.log('idOrder');
            console.log(idOrder);
            if(!idOrder){
                return false;
            }
            // return false;
            //INITIATE_AUTHENTICATION
            var url = utils.getTestMerchantUrl(config) + "/order/" + idOrder + "/transaction/" + apiRequest.transactionId;
            var auth = {
                user: config.TEST_GATEWAY.USERNAME,
                pass: config.TEST_GATEWAY.PASSWORD,
                sendImmediately: false
            };
            var options = {
                url: url,
                json: requestData,
                auth: auth
            }
            requestCrud.put(options, function (error, res, body) {
                if(body.result == "SUCCESS"){
                    let ipAddr =
                    request.headers["x-forwarded-for"] ||
                    request.connection.remoteAddress ||
                    request.socket.remoteAddress ||
                    request.connection.socket.remoteAddress;
                    let opt = {
                        "authentication": {
                            "redirectResponseUrl": urlDomain+"/instore/payment-checkout"
                        },
                        "correlationId": "test",
                        "device": {
                            "browser": toUpper(browser.name),
                            "browserDetails": {
                                "3DSecureChallengeWindowSize": "FULL_SCREEN",
                                "acceptHeaders": "application/json",
                                "colorDepth": 24,
                                "javaEnabled": true,
                                "language": "en-US",
                                "screenHeight": 640,
                                "screenWidth": 480,
                                "timeZone": 273
                            },
                            "ipAddress": "127.0.0.1"
                        },
                        "order": {
                            "amount": request.session.totalCartAmount,
                            "currency": "VND"
                        },
                        "session": {
                            "id": apiRequest.sessionId
                        },
                        "apiOperation": "AUTHENTICATE_PAYER"
                    };
                    var url = utils.getTestMerchantUrl(config) + "/order/" + idOrder + "/transaction/" + apiRequest.transactionId;
                    var options_payer = {
                        url: url,
                        json: opt,
                        auth: auth
                    }
                    requestCrud.put(options_payer, function (error, res, body) {
                        console.log('AUTHENTICATE_PAYER');
                        console.log(body);
                        console.log(options_payer);
                        console.log(body.authentication.redirectHtml);

                        let html = body.authentication.redirectHtml;
                        
                        const instoreConfig = getPaymentConfig();

                        const orderDocUpdate = {
                            paymentStatus: 1,
                            html: html
                        };

                        // insert order into DB
                        try {
                            async function updateOders(){
                                const updatedOrder = await db.orders.findOneAndUpdate(
                                    { _id: getId(idOrder) },
                                    {
                                    $set: orderDocUpdate,
                                    },
                                    { multi: false, returnOriginal: false, useFindAndModify: false }
                                );
                                return updatedOrder;
                            }
                            let orderUpdate = updateOders();
                            let orderdetail = '';
                            orderUpdate.then( function (result){
                                orderdetail = result;
                                orderdetail.idOrder = idOrder;
                                console.log('idOrder1');
                                console.log(idOrder);
                                console.log(result);
                                handleResponse(orderdetail, request, response);
                            });
                            return;
                        } catch (ex) {
                            console.log("Error sending payment to API", ex);
                            response.status(400).json({ err: "Your order declined. Please try again" });
                        }
                    });
                } else{
                    console.log('INITIATE_AUTHENTICATION');
                    console.log(body);
                    console.log(options);
                    
                    handleResponse(body, request, response);
                }
            });
        })
       
    } catch (ex) {
        console.log("Error sending payment to API", ex);
        response.status(400).json({ err: "Your order declined. Please try again" });
    }
    // console.log('idOrder1');
    // console.log(idOrder);
    // response.redirect(urlDomain+"/instore/verify-otp/6256b7f32c57075660cb5255");
    // var requestUrl = gatewayService.getRequestUrl("REST", apiRequest);
    // gatewayService.processPay(requestData, requestUrl, function (result) {
        // handleResponse(result, request, response);
    // });
});

router.post('/payer-payment', async (request, response) => {
    console.log(request);
    let apiRequest = request.body;
    
    var auth = {
        user: config.TEST_GATEWAY.USERNAME,
        pass: config.TEST_GATEWAY.PASSWORD,
        sendImmediately: false
    };
    let opt_pay = {
        "apiOperation": "PAY",
        "authentication": {
            "transactionId": apiRequest.transactionId
        },
        "order": {
            "amount": apiRequest.amount,
            "currency": "VND",
            "reference": apiRequest.idOrder
        },
        "session": {
            "id": apiRequest.sessionId
        },
        "transaction": {
            "reference": apiRequest.idOrder
        }
    };
    var url = utils.getTestMerchantUrl(config) + "/order/" + apiRequest.idOrder + "/transaction/" + "trans-" + utils.keyGen(10);
    var options_pay = {
        url: url,
        json: opt_pay,
        auth: auth
    }
    requestCrud.put(options_pay, function (error, res, body) {
        console.log('PAY');
        console.log(options_pay);
        console.log(body);
        handleResponse(body, request, response);
        if(body.result == "SUCCESS"){
            //update trạng thái đơn hàng
            const db = request.app.db;
            const instoreConfig = getPaymentConfig();

            const orderDocUpdate = {
                paymentStatus: 2,
                datePayment: new Date(),
            };

            // insert order into DB
            try {
                async function updateOders(){
                    const updatedOrder = await db.orders.findOneAndUpdate(
                        { _id: getId(apiRequest.idOrder) },
                        {
                        $set: orderDocUpdate,
                        },
                        { multi: false, returnOriginal: false }
                    );
                    
                    return updatedOrder;
                }
                
                let orderUpdate = updateOders();
                let orderdetail = '';
                orderUpdate.then( function (result){
                    orderdetail = result;
                    // orderdetail.idOrder = idOrder;
                    // console.log('idOrder1');
                    // console.log(idOrder);
                    // console.log(result);
                    // handleResponse(orderdetail, request, response);
                });
                // set payment results for email
                const paymentResults = {
                    message: request.session.message,
                    messageType: request.session.messageType,
                    paymentEmailAddr: request.session.paymentEmailAddr,
                    paymentApproved: true,
                    paymentDetails: request.session.paymentDetails,
                };

                // clear the cart
                if (request.session.cart) {
                    emptyCart(request, response, "function");
                }

                // send the email with the response
                // TODO: Should fix this to properly handle result
                sendEmail(
                    request.session.paymentEmailAddr,
                    `Thông báo đặt hàng thành công từ Ogani`,
                    getEmailTemplate(paymentResults)
                );
            } catch (ex) {
                console.log("Error sending payment to API", ex);
                response.status(400).json({ err: "Your order declined. Please try again" });
            }
        }
    })
})

// render the editor
router.get("/verify-otp/:id", async (req, res) => {
    const db = req.app.db;
    const order = await db.orders.findOne({ _id: getId(req.params.id) });
    if(order){

        res.render(view_path + '/verifyOtp', {
            title: "VerifyOtp",
            config: req.app.config,
            session: req.session,
            idOrder: req.params.id,
            order: order,
            cartClose: false,
            page: "VerifyOtp",
            helpers: req.handlebars.helpers,
            showFooter: "showFooter",
        });
    } else{
        res.render(view_path + '/verifyOtp', {
            title: "VerifyOtp",
            config: req.app.config,
            session: req.session,
            idOrder: req.params.id,
            order: order,
            cartClose: false,
            page: "VerifyOtp",
            helpers: req.handlebars.helpers,
            showFooter: "showFooter",
        });
    }
    // res.render("order", {
    //   title: "View order",
    //   result: order,
    //   config: req.app.config,
    //   session: req.session,
    //   cartClose: false,
    //   page: "VerifyOtp",
    //   helpers: req.handlebars.helpers,
    // });
  });

/**
* This method calls the capture operation, which returns the  response body or error body.
*
* @param request contains info on how to construct API call
* @return  receipt page or error page with response body for capture operation
*/
router.post('/capture', function (request, response) {
    var requestData = gatewayService.apiRequestBody("CAPTURE", request);
    var apiRequest = request.body;
    var requestUrl = gatewayService.getRequestUrl("REST", apiRequest);
    gatewayService.processCapture(requestData, requestUrl, function (result) {
        handleResponse(result, request, response);
    });
});
/**
* This method calls the REFUND operation, which returns the  response body or error body.
*
* @param request contains info on how to construct API call
* @return  receipt page or error page with response body for REFUND operation
*/
router.post('/refund', function (request, response) {
    var requestData = gatewayService.apiRequestBody("REFUND", request);
    var apiRequest = request.body;
    var requestUrl = gatewayService.getRequestUrl("REST", apiRequest);
    gatewayService.processRefund(requestData, requestUrl, function (result) {
        handleResponse(result, request, response);
    });
});
/**
* This method calls the VOID operation, which returns the  response body or error body.
*
* @param request contains info on how to construct API call
* @return  receipt page or error page with response body for VOID operation
*/
router.post('/void', function (request, response) {
    var requestData = gatewayService.apiRequestBody("VOID", request);
    var apiRequest = request.body;
    var requestUrl = gatewayService.getRequestUrl("REST", apiRequest);
    gatewayService.voidTransaction(requestData, requestUrl, function (result) {
        handleResponse(result, request, response);
    });
});
/**
* This method calls the VERIFY operation, which returns the  response body or error body.
*
* @param request contains info on how to construct API call
* @return  receipt page or error page with response body for VERIFY operation
*/
router.post('/verify', function (request, response) {
    var requestData = gatewayService.apiRequestBody("VERIFY", request);
    var apiRequest = request.body;
    var requestUrl = gatewayService.getRequestUrl("REST", apiRequest);
    gatewayService.processVerify(requestData, requestUrl, function (result) {
        handleResponse(result, request, response);
    });
});
/**
* This method calls the RETRIVE operation, which returns the response body or error body.
*
* @param request contains info on how to construct API call
* @return  receipt page or error page with response body for RETRIVE operation
*/
router.post('/retrieve', function (request, response) {
    var requestData = gatewayService.apiRequestBody("RETRIEVE", request);
    var apiRequest = request.body;
    var requestUrl = gatewayService.getRequestUrl("REST", apiRequest);
    gatewayService.retriveOrder(requestData, requestUrl, function (result) {
        handleResponse(result, request, response);
    });
});

/**
 * This method calls the INTIATE_BROWSER_PAYMENT operation, which returns a URL to the provider's website. The user is redirected to this URL, where the purchase is completed.
 *
 * @param request contains info on how to construct API call
 * @return either redirects to appropriate provider website or returns error page
 */
router.post('/browserPayment', function (request, response, next) {
    var requestData = gatewayService.apiRequestBody("INITIATE_BROWSER_PAYMENT", request);
    var apiRequest = request.body;
    var requestUrl = gatewayService.getRequestUrl("REST", apiRequest);
    gatewayService.browserPaymentResult(requestData, requestUrl, function (result) {
        var responseData = gatewayService.apiResponseBody(request, result);
        if (responseData.status) {
            var Url = result.resbody.browserPayment.redirectUrl;
            response.redirect(Url);
            next();
        } else {
            response.render(view_path + '/errors', responseData);
        }

    });
});



/**
* This method handles the callback from the payment . It looks up the transaction based on the transaction ID and order ID and displays
* either a receipt page or an error page.
*
* @param transactionId used to retrieve transaction
* @param orderId used to construct API endpoint
* @return for  SecurePay receipt page or error page
*/
router.get('/browserPaymentReceipt/:transactionId/:orderId', function (request, response, next) {
    var apiRequest = request.params;
    var requestUrl = gatewayService.getRequestUrl("REST", apiRequest);
    gatewayService.browserPaymentReceiptResult(requestUrl, function (callback) {
        response.render(view_path + '/browserPaymentReceipt', { title: "browserPaymentReceipt", resbody: callback });
        next();
    });
});

 /**
 * This method calls the Tokenize operation, which returns the  response body or error body.
 *
 * @param request contains info on how to construct API call
 * @return  receipt page or error page with response body for PAY operation
 */
 router.post('/tokenize', function (request, response) {
     var requestData = gatewayService.apiRequestBody("PAY", request);
     var apiRequest = request.body;
     gatewayService.processTokenPay(requestData, apiRequest, function (result) {
         handleResponse(result, request, response);
     });
 });
module.exports = router;