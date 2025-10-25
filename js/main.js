jQuery(function($) {
    //typewrite effect
    var TxtType = function(el, toRotate, period) {
        this.toRotate = toRotate;
        this.el = el;
        this.loopNum = 0;
        this.period = parseInt(period, 10) || 2000;
        this.txt = "";
        this.tick();
        this.isDeleting = false;
    };

    TxtType.prototype.tick = function() {
        var i = this.loopNum % this.toRotate.length;
        var fullTxt = this.toRotate[i];

        if (this.isDeleting) {
            this.txt = fullTxt.substring(0, this.txt.length - 1);
        } else {
            this.txt = fullTxt.substring(0, this.txt.length + 1);
        }

        this.el.innerHTML = '<span class="intro__cursor">' + this.txt + "</span>";

        var that = this;
        var delta = 200 - Math.random() * 100;

        if (this.isDeleting) {
            delta /= 2;
        }

        if (!this.isDeleting && this.txt === fullTxt) {
            delta = this.period;
            this.isDeleting = true;
        } else if (this.isDeleting && this.txt === "") {
            this.isDeleting = false;
            this.loopNum++;
            delta = 500;
        }

        setTimeout(function() {
            that.tick();
        }, delta);
    };

    window.onload = function() {
        var elements = document.getElementsByClassName("typewrite");
        for (var i = 0; i < elements.length; i++) {
            var toRotate = elements[i].getAttribute("data-type");
            var period = elements[i].getAttribute("data-period");
            if (toRotate) {
                new TxtType(elements[i], JSON.parse(toRotate), period);
            }
        }
        // INJECT CSS
        var css = document.createElement("style");
        css.type = "text/css";
        css.innerHTML = ".typewrite > .intro__cursor { border-right: 0.08em solid #007bff}";
        document.body.appendChild(css);
        // INJECT CSSs
    };
    //typewrite effect

    // const hand = document.querySelector(".emoji.wave-hand");

    // function waveOnLoad() {
    //     hand.classList.add("wave");
    //     setTimeout(function() {
    //         hand.classList.remove("wave");
    //     }, 2000);
    // }

    // setTimeout(function() {
    //     waveOnLoad();
    // }, 1000);

    // hand.addEventListener("mouseover", function() {
    //     hand.classList.add("wave");
    // });

    // hand.addEventListener("mouseout", function() {
    //     hand.classList.remove("wave");
    // });

    window.sr = ScrollReveal({
        reset: false,
        duration: 600,
        easing: "cubic-bezier(.694,0,.335,1)",
        scale: 1,
        viewFactor: 0.3
    });

    sr.reveal(".background");
    sr.reveal(".skills");
    sr.reveal(".experience", { viewFactor: 0.2 });
    sr.reveal(".featured-projects", { viewFactor: 0.1 });
    sr.reveal(".other-projects", { viewFactor: 0.05 });
});

// Article Carousel
let currentSlide = 0;
const slides = document.querySelectorAll('.article-slide');
const totalSlides = slides.length;

function initCarousel() {
    const dotsContainer = document.getElementById('carouselDots');
    for (let i = 0; i < totalSlides; i++) {
        const dot = document.createElement('button');
        dot.className = 'carousel-dot';
        dot.onclick = () => goToSlide(i);
        dotsContainer.appendChild(dot);
    }
    updateCarousel();
}

function moveCarousel(direction) {
    currentSlide += direction;
    if (currentSlide >= totalSlides) currentSlide = 0;
    if (currentSlide < 0) currentSlide = totalSlides - 1;
    updateCarousel();
}

function goToSlide(index) {
    currentSlide = index;
    updateCarousel();
}

function updateCarousel() {
    const container = document.getElementById('carouselContainer');
    const offset = -currentSlide * 100;
    container.style.transform = `translateX(${offset}%)`;

    // Update dots
    const dots = document.querySelectorAll('.carousel-dot');
    dots.forEach((dot, index) => {
        dot.classList.toggle('active', index === currentSlide);
    });

    // Update arrow buttons
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    prevBtn.disabled = currentSlide === 0;
    nextBtn.disabled = currentSlide === totalSlides - 1;
}

// Initialize carousel when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCarousel);
} else {
    initCarousel();
}
