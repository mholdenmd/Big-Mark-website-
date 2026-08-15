document.getElementById('year').textContent = new Date().getFullYear();

const navToggle = document.getElementById('nav-toggle');
const mainNav = document.getElementById('main-nav');

navToggle.addEventListener('click', () => {
  const isOpen = mainNav.classList.toggle('open');
  navToggle.setAttribute('aria-expanded', isOpen);
});

mainNav.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    mainNav.classList.remove('open');
    navToggle.setAttribute('aria-expanded', false);
  });
});

// Before/after comparison sliders (custom pointer-based drag, not the
// native range input's own touch handling, which is unreliable on mobile)
document.querySelectorAll('.compare').forEach(compare => {
  const range = compare.querySelector('.compare-range');
  if (!range) return;

  const setPos = (percent) => {
    const clamped = Math.max(0, Math.min(100, percent));
    compare.style.setProperty('--pos', clamped + '%');
    range.value = clamped;
  };

  const percentFromClientX = (clientX) => {
    const rect = compare.getBoundingClientRect();
    return ((clientX - rect.left) / rect.width) * 100;
  };

  let dragging = false;

  compare.addEventListener('pointerdown', (e) => {
    dragging = true;
    try { compare.setPointerCapture(e.pointerId); } catch (err) { /* not critical */ }
    setPos(percentFromClientX(e.clientX));
  });

  compare.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    setPos(percentFromClientX(e.clientX));
  });

  const endDrag = (e) => {
    if (!dragging) return;
    dragging = false;
    try {
      if (compare.hasPointerCapture(e.pointerId)) {
        compare.releasePointerCapture(e.pointerId);
      }
    } catch (err) { /* not critical */ }
  };

  compare.addEventListener('pointerup', endDrag);
  compare.addEventListener('pointercancel', endDrag);

  // Keep keyboard control (arrow keys on the focused range) in sync
  range.addEventListener('input', () => setPos(Number(range.value)));

  setPos(Number(range.value));
});

// FAQ accordion
document.querySelectorAll('.faq-item').forEach(item => {
  const question = item.querySelector('.faq-question');
  question.addEventListener('click', () => {
    const isOpen = item.classList.contains('open');
    document.querySelectorAll('.faq-item.open').forEach(open => {
      if (open !== item) {
        open.classList.remove('open');
        open.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
      }
    });
    item.classList.toggle('open', !isOpen);
    question.setAttribute('aria-expanded', String(!isOpen));
  });
});

// Contact form: submit via AJAX and show a branded success state
const contactForm = document.getElementById('contact-form');
if (contactForm) {
  const submitBtn = contactForm.querySelector('button[type="submit"]');
  const submitBtnDefaultText = submitBtn.textContent;
  const formError = document.getElementById('form-error');
  const formSuccess = document.getElementById('form-success');
  const resetBtn = document.getElementById('form-reset-btn');

  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    formError.hidden = true;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';

    fetch(contactForm.action, {
      method: 'POST',
      body: new FormData(contactForm),
      headers: { Accept: 'application/json' }
    })
      .then(res => {
        if (!res.ok) throw new Error('Submission failed');
        contactForm.hidden = true;
        formSuccess.hidden = false;
      })
      .catch(() => {
        formError.hidden = false;
        submitBtn.disabled = false;
        submitBtn.textContent = submitBtnDefaultText;
      });
  });

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      contactForm.reset();
      contactForm.hidden = false;
      formSuccess.hidden = true;
      submitBtn.disabled = false;
      submitBtn.textContent = submitBtnDefaultText;
    });
  }
}

// Scroll-reveal animations
const revealEls = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window && revealEls.length) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

  revealEls.forEach(el => observer.observe(el));
} else {
  revealEls.forEach(el => el.classList.add('in-view'));
}
