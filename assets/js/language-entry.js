(function () {
  const script = document.currentScript;
  const language = script && script.dataset.language;

  if (!['sr', 'sk', 'en'].includes(language)) return;

  if (window.location.protocol === 'file:') {
    const page = new URL('../index.html', window.location.href);
    page.searchParams.set('lang', language);
    window.location.replace(page.href);
    return;
  }

  function loadSupabaseLibrary() {
    if (window.supabase) return Promise.resolve();

    return new Promise((resolve, reject) => {
      const library = document.createElement('script');
      library.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      library.onload = resolve;
      library.onerror = () => reject(new Error('Could not load Supabase.'));
      document.head.appendChild(library);
    });
  }

  fetch('../index.html')
    .then((response) => {
      if (!response.ok) throw new Error('Could not load the shared page.');
      return response.text();
    })
    .then(async (html) => {
      const page = new DOMParser().parseFromString(html, 'text/html');
      const base = page.createElement('base');
      base.href = new URL('../', window.location.href).href;
      page.head.prepend(base);
      page.documentElement.lang = language;
      page.querySelector('script[src*="supabase-js"]')?.remove();

      page.querySelectorAll('a[href^="#"]').forEach((link) => {
        link.href = `${window.location.pathname}${window.location.search}${link.getAttribute('href')}`;
      });

      await loadSupabaseLibrary();
      document.open();
      document.write(`<!DOCTYPE html>${page.documentElement.outerHTML}`);
      document.close();
    })
    .catch((error) => {
      console.error(error);
      document.body.textContent = 'Stranica trenutno nije dostupna.';
    });
})();