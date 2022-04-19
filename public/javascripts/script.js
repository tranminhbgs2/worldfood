// add remove class
function funtionform() {
    var element = document.getElementById("form-input--hide");
    element.classList.add("form-input--open");
}

function funtionclose() {
    var element = document.getElementById("form-input--hide");
    element.classList.remove("form-input--open");
}

// function closeproductinfor() {
//     var elementinfor = document.getElementById("banner__content-product-infor-id");
//     elementinfor.classList.add("closetab");
// }
// add remove class

// Active class
// var header = document.getElementById("btn-active");
// var btns = header.getElementsByClassName("product-intro__btn");
// for (var i = 0; i < btns.length; i++) {
//     btns[i].addEventListener("click", function() {
//         var current = document.getElementsByClassName("product-intro__btn--active");
//         current[0].className = current[0].className.replace(" product-intro__btn--active", "");
//         this.className += " product-intro__btn--active";
//     });
// }
// Active class

$(document).on('click', '.category-item', function() {
    $(this).addClass('category-item--active').siblings().removeClass('category-item--active')
})
$(document).on('click', '.home-fitter__btn', function() {
    $(this).addClass('btn__primary').siblings().removeClass('btn__primary')
})
$(document).on('click', '.pagination-item', function() {
    $(this).addClass('pagination-item--active').siblings().removeClass('pagination-item--active')
})
$(document).on('click', '.header__notify-item', function() {
    $(this).addClass('header__notify-item--viewed')
})
$(document).on('click', '.header__sort-item', function() {
    $(this).addClass('header__sort-item--active').siblings().removeClass('header__sort-item--active')
})

// function search() {
//     var element = document.getElementById("header__search-historys");
//     element.classList.add("opentab");
// }

// document.getElementById('input-header-search').onclick = function() {
//     window.location.href = "#header__search-historys";
// }
$('.banner__slider').slick({
    slidesToShow: 3,
    slidesToScroll: 1,
    infinite: true,
    dots: false,
    autoplay: true,
    autoplaySpeed: 6000,
    cssEase: 'linear',
    responsive: [{
            breakpoint: 1126,
            settings: {
                slidesToShow: 2,

            }
        },
        {
            breakpoint: 540,
            settings: {
                slidesToShow: 1,
            }
        }
    ]
});


function makeTimer() {

    //		var endTime = new Date("29 April 2018 9:56:00 GMT+01:00");	
    var endTime = new Date("29 April 2021 9:56:00 GMT+01:00");
    endTime = (Date.parse(endTime) / 1000);

    var now = new Date();
    now = (Date.parse(now) / 1000);

    var timeLeft = endTime - now;

    var days = Math.floor(timeLeft / 86400);
    var hours = Math.floor((timeLeft - (days * 86400)) / 3600);
    var minutes = Math.floor((timeLeft - (days * 86400) - (hours * 3600)) / 60);
    var seconds = Math.floor((timeLeft - (days * 86400) - (hours * 3600) - (minutes * 60)));

    if (hours < "10") { hours = "0" + hours; }
    if (minutes < "10") { minutes = "0" + minutes; }
    if (seconds < "10") { seconds = "0" + seconds; }

    $("#days").html(days + "<span> Ngày</span>");
    $("#hours").html(hours + "<span> Giờ</span>");
    $("#minutes").html(minutes + "<span> Phút</span>");
    $("#seconds").html(seconds + "<span> Giây</span>");

}

setInterval(function() { makeTimer(); }, 1000);

// loader
var preloader = document.getElementById('loader');

function funtionloader() {
    preloader.style.display = 'none';
}
// loader