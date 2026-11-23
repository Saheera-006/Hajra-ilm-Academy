import { useEffect, useRef, useState } from 'react';
import { Download, X } from 'lucide-react';
import { Button } from '@/components/kit';
import { isAppleMobile, isMobileDevice, isStudentAppInstalled, promptStudentInstall } from '@/services/studentInstall';

export default function InstallApp() {
  const [installed, setInstalled] = useState(isStudentAppInstalled);
  const sheet = useRef(null);
  const [showSheet, setShowSheet] = useState(false);
  const [help, setHelp] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const markInstalled = () => setInstalled(true);
    window.addEventListener('appinstalled', markInstalled);
    return () => window.removeEventListener('appinstalled', markInstalled);
  }, []);

  useEffect(() => {
    const dialog = sheet.current;
    if (dialog && showSheet && !installed && !dialog.open) dialog.showModal();
    else if (dialog?.open && (!showSheet || installed)) dialog.close();
  }, [showSheet, installed]);

  if (!isMobileDevice || installed) return null;

  function dismiss() {
    setShowSheet(false);
  }

  async function install() {
    setBusy(true);
    try {
      const outcome = await promptStudentInstall();
      if (outcome === 'accepted') setInstalled(true);
      else if (outcome === 'unavailable') setHelp(true);
      else dismiss();
    } catch {
      setHelp(true);
    } finally {
      setBusy(false);
    }
  }

  return <>
    <button type="button" aria-label="Install app" title="Install app" aria-haspopup="dialog"
      onClick={() => setShowSheet(true)}
      className="rounded-xl border border-[var(--p-border)] p-2.5 text-[var(--p-muted)] hover:bg-[var(--p-surface-3)] hover:text-[var(--p-text)]">
      <Download aria-hidden="true" className="h-[18px] w-[18px]" />
    </button>
    <dialog ref={sheet} aria-labelledby="install-app-title"
      onCancel={event => { event.preventDefault(); dismiss(); }}
      onClick={event => { if (event.target === event.currentTarget) dismiss(); }}
      className="fixed inset-x-0 top-auto bottom-0 m-0 max-h-[90dvh] w-full max-w-none overflow-y-auto rounded-t-[2rem] border border-[var(--p-border)] bg-[var(--p-surface)] text-[var(--p-text)] shadow-2xl backdrop:bg-black/60 motion-safe:animate-[install-sheet-in_.24s_ease-out]">
      <section className="relative mx-auto max-w-lg px-6 pt-7 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-center">
        <button type="button" aria-label="Close install prompt" onClick={dismiss}
          className="absolute top-4 right-4 rounded-full p-2 text-[var(--p-muted)] hover:bg-[var(--p-surface-3)]"><X size={20} /></button>
        <img src="/icon-192.png" alt="" className="mx-auto mb-4 h-20 w-20 rounded-2xl" />
        <h2 id="install-app-title" className="text-xl font-bold">Install Hajara Ilm Academy</h2>
        <p className="mt-2 text-sm text-[var(--p-muted)]">Open your lessons, class links and certificates from your Home Screen.</p>
        {help && <p role="status" className="mt-4 rounded-xl bg-[var(--p-surface-2)] p-3 text-sm">{isAppleMobile
          ? 'In Safari, tap Share → Add to Home Screen → Add.'
          : 'Open this page in Chrome. Tap ⋮ → Install app or Add to Home screen, then confirm.'}</p>}
        <Button type="button" className="mt-5 w-full" onClick={install} disabled={busy}>Install app</Button>
        <button type="button" className="mt-3 w-full rounded-xl py-3 text-sm font-semibold text-[var(--p-muted)]" onClick={dismiss}>Continue on web</button>
      </section>
    </dialog>
  </>;
}
