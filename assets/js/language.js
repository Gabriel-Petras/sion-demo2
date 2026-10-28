(function () {
  const languages = ['sr', 'sk', 'en'];
  const match = window.location.pathname.match(/\/(sr|sk|en)\/?$/);
  const requestedLanguage = new URLSearchParams(window.location.search).get('lang');
  const currentLanguage = languages.includes(requestedLanguage)
    ? requestedLanguage
    : match ? match[1] : 'sr';
  const isFileProtocol = window.location.protocol === 'file:';
  const baseUrl = new URL(match ? '../' : './', window.location.href);

  document.documentElement.lang = currentLanguage;

  document.querySelectorAll('.language-switcher .lang-button').forEach((link) => {
    const language = link.dataset.language;
    if (!languages.includes(language)) return;

    if (isFileProtocol) {
      const pageUrl = new URL(match ? '../index.html' : './index.html', window.location.href);
      pageUrl.searchParams.set('lang', language);
      link.href = pageUrl.href;
    } else {
      link.href = new URL(`${language}/`, baseUrl).href;
    }
    link.classList.toggle('active', language === currentLanguage);
    if (language === currentLanguage) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.removeAttribute('aria-current');
    }
  });
})();