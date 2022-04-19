var view_path = '../views';
function showErrorPage(data, response, field, validationType, status){
    var responseData = {
        "cause": data.error.cause,
        "explanation": data.error.explanation,
        "field": field,
        "validationType": validationType,
        "status": status
    };
    response.render(view_path + '/errors', responseData);
}
module.exports = {
    showErrorPage: showErrorPage, 
}