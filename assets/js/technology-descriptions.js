'use strict';

(() => {
  const descriptions = [...document.querySelectorAll('.c2-showcase-workflow details, .system-platforms details')];
  if (!descriptions.length) return;

  const mobile = window.matchMedia('(max-width: 600px)');
  function adapt() {
    descriptions.forEach(details => {
      details.open = !mobile.matches;
      details.querySelector('summary').tabIndex = mobile.matches ? 0 : -1;
    });
  }
  descriptions.forEach(details => {
    details.querySelector('summary').addEventListener('click', event => {
      if (!mobile.matches) event.preventDefault();
    });
  });
  mobile.addEventListener('change', adapt);
  adapt();
})();
