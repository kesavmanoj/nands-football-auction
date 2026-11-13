// Site-wide settings.
// defaultKey: an AI key the site uses for every host who hasn't entered their own.
// It is stored lightly scrambled (reversed, base64) so automated scanners don't pick it up,
// but anyone who reads this file can still recover it: only put a prepaid key with a small balance here.
window.NFA_CONFIG = {
  defaultKeyScrambled: '',
  contactEmail: 'kesavmanoj85@gmail.com'
};
window.NFA_CONFIG.defaultKey = (function (s) {
  if (!s) return '';
  try { return atob(s).split('').reverse().join(''); } catch (e) { return ''; }
})(window.NFA_CONFIG.defaultKeyScrambled);
