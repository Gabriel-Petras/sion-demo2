// Subscribe modal and client-side phone validation.
(function () {
  const SUPABASE_URL = 'https://odnnztyftzznebwqkvso.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kbm56dHlmdHp6bmVid3FrdnNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4NTUxNjEsImV4cCI6MjA5OTQzMTE2MX0.3s9Z5iPKDE4YcjI4ZyBWOjT38uHcwQMv9-0C0Hk0bRU';
  function qs(sel, parent) { return (parent || document).querySelector(sel); }

  const supabase = window.supabase
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      })
    : null;

  const btn = qs('#subscribe-button');
  const modal = qs('#subscribe-modal');
  const closeBtn = qs('#subscribe-close');
  const form = qs('#subscribe-form');
  const phoneInput = qs('#subscribe-phone');
  const hpInput = qs('#subscribe-hp');
  const msg = qs('#subscribe-message');
  const unsubscribeForm = qs('#unsubscribe-form');
  const unsubscribePhoneInput = qs('#unsubscribe-phone');
  const unsubscribeHpInput = qs('#unsubscribe-hp');
  const unsubscribeMsg = qs('#unsubscribe-message');
  const subscribeSection = qs('#subscribe-section');
  const unsubscribeSection = qs('#unsubscribe-section');
  const subscribeModeButton = qs('#subscribe-mode-button');
  const unsubscribeModeButton = qs('#unsubscribe-mode-button');
  const submitButton = form && form.querySelector('[type="submit"]');
  const unsubscribeSubmitButton = unsubscribeForm && unsubscribeForm.querySelector('[type="submit"]');

  function showMode(mode) {
    const unsubscribeMode = mode === 'unsubscribe';
    subscribeSection.hidden = unsubscribeMode;
    unsubscribeSection.hidden = !unsubscribeMode;
    subscribeModeButton.classList.toggle('primary', !unsubscribeMode);
    unsubscribeModeButton.classList.toggle('primary', unsubscribeMode);
    subscribeModeButton.setAttribute('aria-selected', String(!unsubscribeMode));
    unsubscribeModeButton.setAttribute('aria-selected', String(unsubscribeMode));
  }

  function openModal(mode) {
    if (!modal || !phoneInput || !msg) return;
    if (hpInput) hpInput.value = '';
    if (unsubscribeHpInput) unsubscribeHpInput.value = '';
    phoneInput.value = '';
    unsubscribePhoneInput.value = '';
    msg.textContent = '';
    unsubscribeMsg.textContent = '';
    showMode(mode || 'subscribe');
    modal.classList.add('visible');
    (mode === 'unsubscribe' ? unsubscribePhoneInput : phoneInput).focus();
    modal.dataset.openedAt = Date.now();
  }

  function closeModal() {
    modal.classList.remove('visible');
  }

  if (btn) btn.addEventListener('click', (e) => { e.preventDefault(); openModal(); });
  if (closeBtn) closeBtn.addEventListener('click', (e) => { e.preventDefault(); closeModal(); });
  if (subscribeModeButton) subscribeModeButton.addEventListener('click', () => showMode('subscribe'));
  if (unsubscribeModeButton) unsubscribeModeButton.addEventListener('click', () => showMode('unsubscribe'));

  function parsePhoneNumber(value) {
    const normalizedPhone = value.trim().replace(/[\s()-]/g, '');
    if (!/^\+?\d{6,15}$/.test(normalizedPhone)) return null;

    const phoneNumber = Number(normalizedPhone.replace(/^\+/, ''));
    return Number.isSafeInteger(phoneNumber) ? phoneNumber : null;
  }

  if (form) {
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      msg.textContent = '';
      const phone = phoneInput.value.trim();
      const hp = hpInput ? hpInput.value || '' : '';
      const ts = parseInt(modal.dataset.openedAt || Date.now(), 10);

      // basic client-side validation
      if (!phone) { msg.textContent = 'Please enter your phone number.'; return; }
      if (hp.trim() !== '') { msg.textContent = 'Submission could not be verified.'; return; }
      if (Date.now() - ts < 1000) { msg.textContent = 'Please wait a moment before submitting.'; return; }

      const phoneNumber = parsePhoneNumber(phone);
      if (phoneNumber === null) {
        msg.textContent = 'Unesite ispravan broj telefona.';
        return;
      }
      if (!supabase) {
        msg.textContent = 'SMS usluga trenutno nije dostupna.';
        return;
      }

      try {
        if (submitButton) submitButton.disabled = true;
        const { data, error } = await supabase.functions.invoke('subscribe-phone', {
          body: { phone: phoneNumber }
        });

        if (error) {
          let message = error.message || 'Prijava trenutno nije uspela.';
          if (error.context && typeof error.context.json === 'function') {
            try {
              const responseBody = await error.context.json();
              if (responseBody && responseBody.error) message = responseBody.error;
            } catch {
              // Keep the SDK error message if the response has no JSON body.
            }
          }
          console.error('Phone subscription failed:', error);
          msg.textContent = message;
          return;
        }
        if (!data || !data.subscribed) {
          msg.textContent = 'Prijava trenutno nije uspela.';
          return;
        }
        msg.textContent = 'Broj je prijavljen za SMS obaveštenja.';
        setTimeout(closeModal, 1200);
      } catch (err) {
        console.error('Subscription request failed:', err);
        msg.textContent = err.message || 'Prijava trenutno nije uspela.';
      } finally {
        if (submitButton) submitButton.disabled = false;
      }
    });
  }

  if (unsubscribeForm) {
    unsubscribeForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      unsubscribeMsg.textContent = '';

      const hp = unsubscribeHpInput ? unsubscribeHpInput.value || '' : '';
      const openedAt = parseInt(modal.dataset.openedAt || Date.now(), 10);
      if (hp.trim() !== '') {
        unsubscribeMsg.textContent = 'Zahtev nije mogao biti potvrđen.';
        return;
      }
      if (Date.now() - openedAt < 1000) {
        unsubscribeMsg.textContent = 'Sačekajte trenutak pa pokušajte ponovo.';
        return;
      }

      const phoneNumber = parsePhoneNumber(unsubscribePhoneInput.value);
      if (phoneNumber === null) {
        unsubscribeMsg.textContent = 'Unesite ispravan broj telefona.';
        return;
      }
      if (!supabase) {
        unsubscribeMsg.textContent = 'SMS usluga trenutno nije dostupna.';
        return;
      }

      try {
        if (unsubscribeSubmitButton) unsubscribeSubmitButton.disabled = true;
        const { data, error } = await supabase.functions.invoke('unsubscribe-phone', {
          body: { phone: phoneNumber }
        });

        if (error) {
          let message = error.message || 'Odjava trenutno nije uspela.';
          if (error.context && typeof error.context.json === 'function') {
            try {
              const responseBody = await error.context.json();
              if (responseBody && responseBody.error) message = responseBody.error;
            } catch {
              // Keep the SDK error message if the response has no JSON body.
            }
          }
          throw new Error(message);
        }

        unsubscribeMsg.textContent = data && data.unsubscribed
          ? 'Broj je odjavljen sa SMS obaveštenja.'
          : 'Ovaj broj nije aktivan za SMS obaveštenja.';
      } catch (error) {
        console.error('Phone unsubscribe failed:', error);
        unsubscribeMsg.textContent = error.message || 'Odjava trenutno nije uspela.';
      } finally {
        if (unsubscribeSubmitButton) unsubscribeSubmitButton.disabled = false;
      }
    });
  }

  // close on background click
  if (modal) modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
})();
