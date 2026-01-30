const API_URL = 'auth.php';

function hidePageTransition() {
    const pageTransition = document.querySelector('.page-transition');
    if (pageTransition) {
        pageTransition.classList.add('hidden');
        setTimeout(() => {
            pageTransition.style.display = 'none';
            pageTransition.style.visibility = 'hidden';
            pageTransition.remove();
        }, 300);
    }
}

function initSlider() {
    const slider = document.querySelector('.modern-slider');
    if (!slider) return null;

    const track = slider.querySelector('.slider-track');
    const slides = slider.querySelectorAll('.slide');
    const prevBtn = slider.querySelector('.slider-arrow.prev');
    const nextBtn = slider.querySelector('.slider-arrow.next');
    const dotsContainer = slider.querySelector('.slider-dots');

    if (!track || slides.length === 0 || !prevBtn || !nextBtn || !dotsContainer) {
        return null;
    }

    let currentSlide = 0;
    const totalSlides = slides.length;
    let autoPlayInterval;
    let isDragging = false;
    let startPos = 0;
    let currentTranslate = 0;
    let prevTranslate = 0;
    let animationID;

    slides.forEach((_, index) => {
        const dot = document.createElement('button');
        dot.classList.add('slider-dot');
        if (index === 0) dot.classList.add('active');
        dot.setAttribute('aria-label', `Go to slide ${index + 1}`);
        dot.addEventListener('click', () => goToSlide(index));
        dotsContainer.appendChild(dot);
    });

    const dots = dotsContainer.querySelectorAll('.slider-dot');

    function updateSlider() {
        track.style.transform = `translateX(-${currentSlide * 100}%)`;
        slides.forEach((slide, index) => {
            slide.classList.toggle('active', index === currentSlide);
        });
        dots.forEach((dot, index) => {
            dot.classList.toggle('active', index === currentSlide);
        });
    }

    function goToSlide(index) {
        currentSlide = index;
        if (currentSlide < 0) currentSlide = totalSlides - 1;
        if (currentSlide >= totalSlides) currentSlide = 0;
        updateSlider();
        resetAutoPlay();
    }

    function prevSlide() {
        goToSlide(currentSlide - 1);
    }

    function nextSlide() {
        goToSlide(currentSlide + 1);
    }

    function startAutoPlay() {
        autoPlayInterval = setInterval(nextSlide, 8000);
    }

    function stopAutoPlay() {
        clearInterval(autoPlayInterval);
    }

    function resetAutoPlay() {
        stopAutoPlay();
        startAutoPlay();
    }

    function getPositionX(event) {
        return event.type.includes('mouse') ? event.pageX : event.touches[0].clientX;
    }

    function touchStart(event) {
        isDragging = true;
        startPos = getPositionX(event);
        currentTranslate = prevTranslate;
        animationID = requestAnimationFrame(animation);
        stopAutoPlay();
    }

    function touchMove(event) {
        if (!isDragging) return;
        event.preventDefault();
        const currentPosition = getPositionX(event);
        const currentMove = currentPosition - startPos;
        currentTranslate = prevTranslate + currentMove;
    }

    function touchEnd() {
        if (!isDragging) return;
        isDragging = false;
        cancelAnimationFrame(animationID);

        const threshold = 50;
        const movedBy = currentTranslate - prevTranslate;

        if (movedBy < -threshold) {
            nextSlide();
        } else if (movedBy > threshold) {
            prevSlide();
        }

        currentTranslate = prevTranslate;
        track.style.transform = `translateX(-${currentSlide * 100}%)`;
        resetAutoPlay();
    }

    function animation() {
        track.style.transform = `translateX(${currentTranslate}px)`;
        if (isDragging) {
            requestAnimationFrame(animation);
        }
    }

    slider.addEventListener('touchstart', (e) => {
        if (e.target.closest('.slider-arrow') || e.target.closest('.slider-dot')) return;
        touchStart(e);
    }, { passive: false });

    slider.addEventListener('touchmove', (e) => {
        if (e.target.closest('.slider-arrow') || e.target.closest('.slider-dot')) return;
        touchMove(e);
    }, { passive: false });

    slider.addEventListener('touchend', (e) => {
        if (e.target.closest('.slider-arrow') || e.target.closest('.slider-dot')) return;
        touchEnd();
    });

    slider.addEventListener('touchcancel', () => {
        touchEnd();
    });

    slider.addEventListener('mousedown', (e) => {
        if (e.target.closest('.slider-arrow') || e.target.closest('.slider-dot')) return;
        touchStart(e);
    });

    slider.addEventListener('mousemove', (e) => {
        if (e.target.closest('.slider-arrow') || e.target.closest('.slider-dot')) return;
        touchMove(e);
    });

    slider.addEventListener('mouseup', () => {
        touchEnd();
    });

    slider.addEventListener('mouseleave', () => {
        if (isDragging) touchEnd();
    });

    prevBtn.addEventListener('click', (e) => {
        e.preventDefault();
        prevSlide();
        resetAutoPlay();
    });

    nextBtn.addEventListener('click', (e) => {
        e.preventDefault();
        nextSlide();
        resetAutoPlay();
    });

    slider.addEventListener('mouseenter', stopAutoPlay);
    slider.addEventListener('mouseleave', startAutoPlay);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') {
            prevSlide();
            resetAutoPlay();
        } else if (e.key === 'ArrowRight') {
            nextSlide();
            resetAutoPlay();
        }
    });

    updateSlider();
    startAutoPlay();

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            stopAutoPlay();
        } else {
            startAutoPlay();
        }
    });

    return { slider, prevBtn, nextBtn };
}

function initAuthForm() {
    const form = document.getElementById('auth-form');
    if (!form) return;

    const elements = {
        title: document.getElementById('form-title'),
        submitBtn: document.getElementById('submit-btn'),
        toggleLink: document.getElementById('toggle-link'),
        emailGroup: document.getElementById('email-group'),
        confirmGroup: document.getElementById('confirm-group'),
        nameFieldsGroup: document.getElementById('name-fields-group'),
        lastnameFieldsGroup: document.getElementById('lastname-fields-group'),
        emailInput: document.getElementById('email'),
        confirmInput: document.getElementById('confirm-password'),
        firstNameInput: document.getElementById('first_name'),
        lastNameInput: document.getElementById('last_name'),
        authMessage: document.getElementById('auth-message')
    };

    if (!elements.submitBtn || !elements.toggleLink || !elements.authMessage) {
        return;
    }

    let isSignUp = false;

    elements.toggleLink.addEventListener('click', (e) => {
        e.preventDefault();
        isSignUp = !isSignUp;

        if (isSignUp) {
            elements.title.textContent = 'Sign Up';
            elements.submitBtn.textContent = 'Sign Up';
            elements.emailGroup.style.display = 'block';
            elements.confirmGroup.style.display = 'block';
            elements.nameFieldsGroup.style.display = 'block';
            elements.lastnameFieldsGroup.style.display = 'block';
            elements.emailInput.required = true;
            elements.confirmInput.required = true;
            elements.firstNameInput.required = true;
            elements.lastNameInput.required = true;
            elements.toggleLink.textContent = 'Already have an account? Sign In';
        } else {
            elements.title.textContent = 'Sign In';
            elements.submitBtn.textContent = 'Sign In';
            elements.emailGroup.style.display = 'none';
            elements.confirmGroup.style.display = 'none';
            elements.nameFieldsGroup.style.display = 'none';
            elements.lastnameFieldsGroup.style.display = 'none';
            elements.emailInput.required = false;
            elements.confirmInput.required = false;
            elements.firstNameInput.required = false;
            elements.lastNameInput.required = false;
            elements.toggleLink.textContent = "Don't have an account? Sign Up.";
        }

        hideAuthMessage();
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData(form);
        const action = isSignUp ? 'register' : 'login';
        formData.append('action', action);

        if (isSignUp) {
            const password = formData.get('password');
            const confirmPassword = formData.get('confirm_password');
            if (password !== confirmPassword) {
                showAuthMessage('Passwords do not match', 'error');
                return;
            }
        }

        elements.submitBtn.disabled = true;
        elements.submitBtn.textContent = isSignUp ? 'Creating Account...' : 'Signing In...';
        elements.submitBtn.classList.add('loading');

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const text = await response.text();
                throw new Error('Server returned non-JSON response');
            }

            const result = await response.json();

            if (result.success) {
                showAuthMessage(result.message || 'Success!', 'success');

                setTimeout(() => {
                    if (result.user && result.user.role === 'admin') {
                        window.location.href = 'admin_dashboard.html';
                    } else {
                        window.location.href = 'user_dashboard.html';
                    }
                }, 1500);
            } else {
                showAuthMessage(result.message, 'error');
            }
        } catch (error) {
            showAuthMessage('An error occurred: ' + error.message, 'error');
        } finally {
            elements.submitBtn.disabled = false;
            elements.submitBtn.textContent = isSignUp ? 'Sign Up' : 'Sign In';
            elements.submitBtn.classList.remove('loading');
        }
    });

    function showAuthMessage(message, type) {
        const icons = {
            success: `<svg class="message-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>`,
            error: `<svg class="message-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>`
        };

        elements.authMessage.innerHTML = icons[type] + '<span class="message-text">' + message + '</span>';
        elements.authMessage.className = 'auth-message ' + type;
        elements.authMessage.style.display = 'flex';
    }

    function hideAuthMessage() {
        elements.authMessage.style.display = 'none';
    }
}

function initContactForm() {
    const contactForm = document.getElementById('contact-form');
    if (!contactForm) return;

    // Remove any existing listeners to prevent conflicts
    const newContactForm = contactForm.cloneNode(true);
    contactForm.parentNode.replaceChild(newContactForm, contactForm);

    newContactForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        e.stopPropagation();

        // Debug: Log form data
        const formData = new FormData(this);
        console.log('Form data being sent:');
        for (let [key, value] of formData.entries()) {
            console.log(key + ':', value);
        }

        const submitBtn = this.querySelector('.contact-btn');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Sending...';
        submitBtn.disabled = true;

        formData.append('action', 'submit_contact');

        // Add cache-busting timestamp
        const timestamp = new Date().getTime();

        try {
            const response = await fetch('auth.php?t=' + timestamp, {
                method: 'POST',
                body: formData,
                cache: 'no-store'
            });

            console.log('Response status:', response.status);
            const result = await response.json();
            console.log('Response:', result);

            if (result.success) {
                alert(result.message);
                this.reset();
            } else {
                alert(result.message);
            }
        } catch (error) {
            alert('An error occurred. Please try again.');
            console.error('Contact form error:', error);
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });
}

document.addEventListener('DOMContentLoaded', function() {
    hidePageTransition();
    initSlider();
    initAuthForm();
    initContactForm();
});

