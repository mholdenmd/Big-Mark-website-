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
    // Touch drag on native controls has proven unreliable across mobile
    // browsers; touch devices use the Before/After toggle buttons instead.
    if (e.pointerType === 'touch') return;
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

  // Mobile fallback: tap Before/After buttons instead of dragging
  const toggleBtns = compare.querySelectorAll('.compare-toggle-btn');
  toggleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      setPos(Number(btn.dataset.pos));
      toggleBtns.forEach(b => b.classList.toggle('active', b === btn));
    });
  });
});

// Service bubbles: tap one to feature it (large, at the top). Tap it again
// and it pops, with a fresh one forming back at its idle spot; tap a
// different bubble and the featured one pops/reforms at home while the new
// one pops at its spot and forms large up top.
const bubbleFeatured = document.getElementById('bubble-featured');
if (bubbleFeatured) {
  let selectedBubble = null;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const getAllBubbles = () => Array.from(document.querySelectorAll('.bubble-featured .bubble, .bubble-row .bubble'));

  const restoreBubble = (bubble) => {
    if (bubble._homeParent) {
      bubble._homeParent.insertBefore(bubble, bubble._homeNext || null);
    }
    bubble.classList.remove('bubble--featured');
    bubble.setAttribute('aria-pressed', 'false');
    // Only hide the featured slot if nothing else has been promoted into it
    // in the meantime (e.g. mid-swap, where a new bubble already moved in).
    if (!bubbleFeatured.querySelector('.bubble')) {
      bubbleFeatured.classList.remove('active');
    }
  };

  const promoteBubble = (bubble) => {
    bubble._homeParent = bubble.parentElement;
    bubble._homeNext = bubble.nextElementSibling;
    bubbleFeatured.appendChild(bubble);
    bubbleFeatured.classList.add('active');
    bubble.classList.add('bubble--featured');
    bubble.setAttribute('aria-pressed', 'true');
  };

  // Pop the bubble where it currently sits, run the actual DOM move once
  // it has visually vanished, then let it form back into being at its new spot.
  const popThenForm = (bubble, mutate) => {
    if (prefersReducedMotion) {
      mutate();
      return;
    }
    const popClass = bubble.classList.contains('bubble--featured') ? 'bubble-pop-featured' : 'bubble-pop';

    bubble.classList.add(popClass);
    const onPopEnd = (e) => {
      if (e.target !== bubble || e.animationName.indexOf('bubble-pop') !== 0) return;
      bubble.removeEventListener('animationend', onPopEnd);
      bubble.classList.remove(popClass);

      mutate();

      const formClass = bubble.classList.contains('bubble--featured') ? 'bubble-form-featured' : 'bubble-form';
      bubble.classList.add(formClass);
      const onFormEnd = (ev) => {
        if (ev.target !== bubble || ev.animationName.indexOf('bubble-form') !== 0) return;
        bubble.removeEventListener('animationend', onFormEnd);
        bubble.classList.remove(formClass);
      };
      bubble.addEventListener('animationend', onFormEnd);
    };
    bubble.addEventListener('animationend', onPopEnd);
  };

  const selectBubble = (bubble) => {
    if (selectedBubble === bubble) {
      popThenForm(bubble, () => restoreBubble(bubble));
      selectedBubble = null;
      return;
    }
    if (selectedBubble) {
      const previous = selectedBubble;
      popThenForm(previous, () => restoreBubble(previous));
    }
    popThenForm(bubble, () => promoteBubble(bubble));
    selectedBubble = bubble;
  };

  getAllBubbles().forEach(bubble => {
    bubble.addEventListener('click', () => selectBubble(bubble));
    bubble.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        selectBubble(bubble);
      }
    });
  });
}

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
