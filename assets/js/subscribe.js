// Subscribe modal + client-side validation and direct Supabase insert.
(function () {
  const SUPABASE_URL = 'https://odnnztyftzznebwqkvso.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kbm56dHlmdHp6bmVid3FrdnNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4NTUxNjEsImV4cCI6MjA5OTQzMTE2MX0.3s9Z5iPKDE4YcjI4ZyBWOjT38uHcwQMv9-0C0Hk0bRU';
  const TABLE_NAME = 'phones';
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
  const submitButton = form && form.querySelector('[type="submit"]');

  function openModal() {
    if (!modal || !phoneInput || !msg) return;
    if (hpInput) hpInput.value = '';
    phoneInput.value = '';
    msg.textContent = '';
    modal.classList.add('visible');
    phoneInput.focus();
    modal.dataset.openedAt = Date.now();
  }

  function closeModal() {
    modal.classList.remove('visible');
  }

  if (btn) btn.addEventListener('click', (e) => { e.preventDefault(); openModal(); });
  if (closeBtn) closeBtn.addEventListener('click', (e) => { e.preventDefault(); closeModal(); });

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

      const normalizedPhone = phone.replace(/[\s()-]/g, '');
      if (!/^\+?\d{6,15}$/.test(normalizedPhone)) {
        msg.textContent = 'Invalid phone format.';
        return;
      }
      const phoneNumber = Number(normalizedPhone.replace(/^\+/, ''));
      if (!Number.isSafeInteger(phoneNumber)) {
        msg.textContent = 'Invalid phone format.';
        return;
      }
      if (!supabase) {
        msg.textContent = 'Subscription service is unavailable right now.';
        return;
      }

      try {
        if (submitButton) submitButton.disabled = true;
        const { error } = await supabase
          .from(TABLE_NAME)
          .insert({ phone: phoneNumber, active: true });

        if (error) {
          if (error.code === '23505') {
            msg.textContent = 'This phone number is already registered.';
            return;
          }
          console.error('Supabase subscription insert failed:', error);
          if (error.code === '22003') {
            msg.textContent = 'The phone column is too small. Change phones.phone to bigint in Supabase.';
          } else if (error.code === '42501') {
            msg.textContent = 'Supabase denied the anonymous insert. Re-run the phones-table permissions SQL in README_SUBSCRIBE.md; see console for details.';
          } else if (error.code === '42P01' || error.code === 'PGRST205') {
            msg.textContent = 'The Supabase phones table was not found. Check its name and schema.';
          } else if (error.code === 'PGRST204') {
            msg.textContent = 'A required column is missing from phones. Check for phone and active columns.';
          } else {
            msg.textContent = 'Could not save subscription' + (error.code ? ' (Supabase ' + error.code + ')' : '') + '. Check the browser console.';
          }
          return;
        }
        msg.textContent = 'Thank you — subscribed.';
        setTimeout(closeModal, 1200);
      } catch (err) {
        console.error('Subscription request failed:', err);
        msg.textContent = 'Network error — please try again.';
      } finally {
        if (submitButton) submitButton.disabled = false;
      }
    });
  }

  // close on background click
  if (modal) modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
})();
