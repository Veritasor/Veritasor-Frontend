(function () {
  var key = 'veritasor-theme';
  var theme;
  try {
    theme = localStorage.getItem(key);
  } catch (e) {
    // localStorage may be unavailable in restricted contexts
  }
  var resolved = theme === 'high-contrast' ? 'high-contrast' : 'dark';
  document.documentElement.setAttribute('data-theme', resolved);
})();
