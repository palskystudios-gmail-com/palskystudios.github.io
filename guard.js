// Clickjacking guard: runs first, in <head>, before any content shows.
// Don't run inside another site's frame (stops clickjacking; GitHub Pages can't send X-Frame-Options)
if (window.top !== window.self) {
  // Browsers stop a framed page from redirecting the outer window, so hide everything and offer a way out instead
  document.documentElement.classList.add('framed');
  document.addEventListener('DOMContentLoaded', function () {
    var a = document.createElement('a');
    a.href = window.location.href; a.target = '_top'; a.rel = 'noopener'; a.className = 'framed-note';
    a.textContent = 'This page is shown inside another website. Open it on its own \u2197';
    document.body.appendChild(a);
  });
}
