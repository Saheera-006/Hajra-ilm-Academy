export const isAppleMobile = /iPhone|iPad|iPod/i.test(navigator.userAgent)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
export const isMobileDevice = isAppleMobile || /Android/i.test(navigator.userAgent);

let installPrompt = null;

export function isStudentAppInstalled() {
  return navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
}

window.addEventListener('beforeinstallprompt', event => {
  if (!isMobileDevice) return;
  event.preventDefault();
  installPrompt = event;
});
window.addEventListener('appinstalled', () => { installPrompt = null; });

export async function promptStudentInstall() {
  if (!installPrompt) return 'unavailable';
  const prompt = installPrompt;
  installPrompt = null;
  await prompt.prompt();
  return (await prompt.userChoice).outcome;
}
