function myFunction() {
    var element = document.getElementById("specifi-hide");
    element.classList.toggle("opentab");

    var an = document.getElementById("down");
    an.classList.toggle("closetab");
    var hien = document.getElementById("up");
    hien.classList.toggle("opentab");
}
$(document).on('click', '.product-intro__btn', function() {
    $(this).addClass('product-intro__btn--active').siblings().removeClass('product-intro__btn--active')
})

// loader
var preloader = document.getElementById('loader');

function funtionloader() {
    preloader.style.display = 'none';
}
// loader