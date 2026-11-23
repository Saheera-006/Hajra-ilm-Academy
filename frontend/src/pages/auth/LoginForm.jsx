import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, KeyRound, ShieldCheck, Copy, Download, Mail } from 'lucide-react';
import { Button, Field, inputClass, StatusMessage } from '@/components/kit';

function PasswordInput({ value, onChange, id }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input id={id} type={show ? 'text' : 'password'} value={value} onChange={onChange} maxLength={72} autoComplete="current-password" className={`${inputClass} pr-12`} placeholder="Enter your password" />
      <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-[var(--p-muted)] hover:text-[var(--p-text)]">
        {show ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
      </button>
    </div>
  );
}

export default function LoginForm({ flow, admin }) {
  const { stage, identifier, setIdentifier, password, setPassword, code, setCode, setup, recoveryCodes, error, busy, submit, finishRecovery } = flow;
  const [saved, setSaved] = useState(false);

  if (stage === 'recovery') {
    const download = () => {
      const url = URL.createObjectURL(new Blob([`Hajara Ilm Academy admin recovery codes\n\n${recoveryCodes.join('\n')}\n`], { type: 'text/plain' }));
      const a = document.createElement('a'); a.href = url; a.download = 'hajara-admin-recovery-codes.txt'; a.click(); URL.revokeObjectURL(url);
    };
    return (
      <div className="grid gap-5">
        <div>
          <h2 className="text-xl font-semibold">Save your recovery codes</h2>
          <p className="mt-1.5 text-sm text-[var(--p-muted)]">Each one-time code lets you sign in if you lose your authenticator. They are shown only now.</p>
        </div>
        <pre className="rounded-xl border border-[var(--p-border)] bg-[var(--p-input)] p-4 font-mono text-base leading-8">{recoveryCodes.join('\n')}</pre>
        <div className="flex gap-3">
          <Button variant="secondary" size="sm" onClick={() => navigator.clipboard?.writeText(recoveryCodes.join('\n'))}><Copy className="h-4 w-4" />Copy</Button>
          <Button variant="secondary" size="sm" onClick={download}><Download className="h-4 w-4" />Download</Button>
        </div>
        <label className="flex items-center gap-2.5 text-sm"><input type="checkbox" className="h-4 w-4 accent-emerald-500" checked={saved} onChange={(e) => setSaved(e.target.checked)} />I have stored these codes safely</label>
        <Button size="lg" disabled={!saved} onClick={finishRecovery}>Continue to admin</Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-5" noValidate>
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">{stage === 'password' ? (admin ? 'Administrator sign in' : 'Welcome back') : 'Two-step verification'}</h2>
        <p className="mt-1.5 text-sm text-[var(--p-muted)]">
          {stage === 'password' ? (admin ? 'Sign in to the Admin Control Center.' : 'Sign in to continue your learning journey.') : 'Enter the code from your authenticator app.'}
        </p>
      </div>
      <StatusMessage error={error} />
      {stage === 'password' ? (
        <>
          <Field label="Email" htmlFor="identifier">
            <div className="relative"><Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--p-muted)]" />
              <input id="identifier" type="email" className={`${inputClass} pl-10`} value={identifier} onChange={(e) => setIdentifier(e.target.value)} maxLength={190} autoComplete="username" placeholder={admin ? 'admin@example.com' : 'you@example.com'} autoFocus={admin} />
            </div>
          </Field>
          <Field label="Password" htmlFor="password"><PasswordInput id="password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
          <Button size="lg" loading={busy} type="submit">{busy ? 'Signing in…' : 'Sign in'}</Button>
          {!admin && <Link to="/forgot-password" className="text-right text-sm font-semibold text-emerald-300 hover:underline">Forgot password?</Link>}
        </>
      ) : (
        <>
          {stage === 'setup' && setup && (
            <div className="rounded-xl border border-[var(--p-border)] bg-[var(--p-input)] p-4 text-sm">
              <p className="flex items-center gap-2 font-semibold"><ShieldCheck className="h-4 w-4 text-[var(--p-accent)]" />Set up authenticator</p>
              <p className="mt-2 text-[var(--p-muted)]">Add a time-based account in your authenticator app using this key:</p>
              <code className="mt-2 block break-all font-mono text-base">{setup.secret}</code>
              <a className="mt-2 inline-block text-[var(--p-accent)] underline" href={setup.otpauthUrl}>Open in authenticator app</a>
            </div>
          )}
          <Field label={stage === 'setup' ? '6-digit code' : '6-digit or recovery code'} htmlFor="code">
            <div className="relative"><KeyRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--p-muted)]" />
              <input id="code" className={`${inputClass} pl-10 tracking-widest`} value={code} onChange={(e) => setCode(e.target.value)} maxLength={16} inputMode={stage === 'setup' ? 'numeric' : 'text'} autoComplete="one-time-code" autoFocus />
            </div>
          </Field>
          <Button size="lg" loading={busy} type="submit">{stage === 'setup' ? 'Enable MFA and continue' : 'Verify and continue'}</Button>
        </>
      )}
    </form>
  );
}
