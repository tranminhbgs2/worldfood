const express = require("express");
const { indexOrders } = require("../indexing");
const { getId, sendEmail, getEmailTemplate } = require("../common");
const { getPaymentConfig } = require("../config");
const { emptyCart } = require("../cart");
const router = express.Router();

// The homepage of the site
router.post("/checkout_action", async (req, res, next) => {
  var ipAddr =
    req.headers["x-forwarded-for"] ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    req.connection.socket.remoteAddress;
  const db = req.app.db;
  //
  const instoreConfig = getPaymentConfig();

  const orderDoc = {
    orderPaymentId: getId(),
    orderPaymentGateway: "VNPay",
    orderPaymentMessage: "Thanh toán của bạn đã được hoàn thành",
    orderTotal: req.session.totalCartAmount,
    orderShipping: 0,
    orderItemCount: req.session.totalCartItems,
    orderProductCount: req.session.totalCartProducts,
    orderCustomer: getId(req.session.customerId),
    orderEmail: req.session.customerEmail,
    orderCompany: req.session.customerCompany,
    orderFirstname: req.session.customerFirstname,
    orderLastname: req.session.customerLastname,
    orderAddr1: req.session.customerAddress1,
    orderAddr2: req.session.customerAddress2,
    orderCountry: req.session.customerCountry,
    orderState: req.session.customerState,
    orderPostcode: req.session.customerPostcode,
    orderPhoneNumber: req.session.customerPhone,
    orderComment: req.session.orderComment,
    orderStatus: instoreConfig.orderStatus,
    orderDate: new Date(),
    orderProducts: req.session.cart,
    orderType: "Single",
  };

  // insert order into DB
  try {
    
    const newDoc = await db.orders.insertOne(orderDoc);

    // get the new ID
    const newId = newDoc.insertedId;

    // add to lunr index
    indexOrders(req.app).then(() => {
      // set the results
      req.session.messageType = "success";
      req.session.message =
        "Đơn hàng của bạn đang được tiếp nhận và trong quá trình xử lí. Dưới đây là thông tin đơn hàng";
      req.session.paymentEmailAddr = newDoc.ops[0].orderEmail;
      req.session.paymentApproved = true;
      req.session.paymentDetails = `<p><strong>Mã đơn hàng: </strong>${newId}</p>
        <p><strong>Thời gian: </strong>${orderDoc.orderDate}</p>
      
        `;

      // set payment results for email
      const paymentResults = {
        message: req.session.message,
        messageType: req.session.messageType,
        paymentEmailAddr: req.session.paymentEmailAddr,
        paymentApproved: true,
        paymentDetails: req.session.paymentDetails,
      };

      // clear the cart
      if (req.session.cart) {
        emptyCart(req, res, "function");
      }

      // send the email with the response
      // TODO: Should fix this to properly handle result
      sendEmail(
        req.session.paymentEmailAddr,
        `Thông báo đặt hàng thành công từ Ogani`,
        getEmailTemplate(paymentResults)
      );

      // redirect to outcome
      // res.redirect(`/payment/${newId}`);
    });
  } catch (ex) {
    console.log("Error sending payment to API", ex);
    res.status(400).json({ err: "Your order declined. Please try again" });
  }

  var config = require("config");
  var dateFormat = require("dateformat");

  var tmnCode = config.get("vnp_TmnCode");
  var secretKey = config.get("vnp_HashSecret");
  var vnpUrl = config.get("vnp_Url");
  var returnUrl = config.get("vnp_ReturnUrl");

  var date = new Date();

  var createDate = dateFormat(date, "yyyymmddHHmmss");
  var orderId = dateFormat(date, "HHmmss");
  var amount = req.session.totalCartAmount;
  var orderInfo = req.session.customerEmail;
  var locale = req.body.language;
  if (locale === null || locale === "") {
    locale = "vn";
  }

  var locale = "vn";
  var currCode = "VND";
  var vnp_Params = {};
  vnp_Params["vnp_Version"] = "2";
  vnp_Params["vnp_Command"] = "pay";
  vnp_Params["vnp_TmnCode"] = tmnCode;
  // vnp_Params['vnp_Merchant'] = ''
  vnp_Params["vnp_OrderInfo"] = orderInfo;
  vnp_Params["vnp_Locale"] = locale;
  vnp_Params["vnp_CurrCode"] = currCode;
  vnp_Params["vnp_TxnRef"] = orderId;
  vnp_Params["vnp_Amount"] = amount * 100;
  vnp_Params["vnp_ReturnUrl"] = returnUrl;
  vnp_Params["vnp_IpAddr"] = ipAddr;
  vnp_Params["vnp_CreateDate"] = createDate;

  vnp_Params = sortObject(vnp_Params);
  console.log(vnp_Params);
  // console.log(req.session)
  var querystring = require("qs");
  var signData = secretKey + querystring.stringify(vnp_Params, { encode: false });

  var sha256 = require("sha256");

  var secureHash = sha256(signData);

  vnp_Params["vnp_SecureHashType"] = "SHA256";
  vnp_Params["vnp_SecureHash"] = secureHash;
  vnpUrl += "?" + querystring.stringify(vnp_Params, { encode: true });

  // res.redirect(vnpUrl`/payment/${newId}`)
  // res.redirect(`/payment/${newId}`);
  res.redirect(vnpUrl);
});

router.get("/vnpay_return", function (req, res, next) { 
  var vnp_Params = req.query;

  var secureHash = vnp_Params["vnp_SecureHash"];

  delete vnp_Params["vnp_SecureHash"];
  delete vnp_Params["vnp_SecureHashType"];

  vnp_Params = sortObject(vnp_Params);

  var config = require("config");
  var tmnCode = config.get("vnp_TmnCode");
  var secretKey = config.get("vnp_HashSecret");

  var querystring = require("qs");
  var signData = secretKey + querystring.stringify(vnp_Params, { encode: false });

  var sha256 = require("sha256");

  var checkSum = sha256(signData);

  if (secureHash === checkSum) {
    //Kiem tra xem du lieu trong db co hop le hay khong va thong bao ket qua

    res.render("success", { code: vnp_Params["vnp_ResponseCode"] });
  } else {
    res.render("success", { code: "97" });
  }
});

router.get("/vnpay_ipn", function (req, res, next) {
  var vnp_Params = req.query;
  var secureHash = vnp_Params["vnp_SecureHash"];

  delete vnp_Params["vnp_SecureHash"];
  delete vnp_Params["vnp_SecureHashType"];

  vnp_Params = sortObject(vnp_Params);
  var config = require("config");
  var secretKey = config.get("vnp_HashSecret");
  var querystring = require("qs");
  var signData = secretKey + querystring.stringify(vnp_Params, { encode: false });

  var sha256 = require("sha256");

  var checkSum = sha256(signData);

  if (secureHash === checkSum) {
    var orderId = vnp_Params["vnp_TxnRef"];
    var rspCode = vnp_Params["vnp_ResponseCode"];
    //Kiem tra du lieu co hop le khong, cap nhat trang thai don hang va gui ket qua cho VNPAY theo dinh dang duoi
    res.status(200).json({ RspCode: "00", Message: "success" });
  } else {
    res.status(200).json({ RspCode: "97", Message: "Fail checksum" });
  }
});

function sortObject(o) {
  var sorted = {},
    key,
    a = [];

  for (key in o) {
    if (o.hasOwnProperty(key)) {
      a.push(key);
    }
  }

  a.sort();

  for (key = 0; key < a.length; key++) {
    sorted[a[key]] = o[a[key]];
  }
  return sorted;
}

module.exports = router;
