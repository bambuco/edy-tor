/**
 * @file Controls the compact navigation menu in generated help pages.
 *
 * @copyright 2026 David Herney - BambuCo
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

const button = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#help-navigation');

button.addEventListener('click', () => {
  const open = navigation.classList.toggle('is-open');
  button.setAttribute('aria-expanded', String(open));
});

navigation.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && navigation.classList.contains('is-open') &&
      getComputedStyle(button).display !== 'none') {
    navigation.classList.remove('is-open');
    button.setAttribute('aria-expanded', 'false');
    button.focus();
  }
});

navigation.classList.add('is-collapsible');
button.hidden = false;
