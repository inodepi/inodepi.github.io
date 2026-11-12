/* "Show the backend" — expands the interactive workflow in place, loading the iframe on first open. */
(function () {
  var buttons = document.querySelectorAll('.project-backend-toggle');
  Array.prototype.forEach.call(buttons, function (btn) {
    var panel = document.getElementById(btn.getAttribute('aria-controls'));
    if (!panel) return;
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') === 'true';
      if (open) {
        panel.hidden = true;
        btn.setAttribute('aria-expanded', 'false');
        btn.textContent = 'Show the backend';
        return;
      }
      panel.hidden = false;
      btn.setAttribute('aria-expanded', 'true');
      btn.textContent = 'Hide the backend';
      var frame = panel.querySelector('iframe[data-src]');
      if (frame && !frame.getAttribute('src')) frame.setAttribute('src', frame.getAttribute('data-src'));
    });
  });
})();
