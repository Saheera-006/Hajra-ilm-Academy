import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { portal } from '@/services/portalApi';
import { useAuth } from '@/context/AuthContext';

/**
 * Shared sign-in state machine. Stages: password -> (setup | verify) -> recovery -> done.
 * Admin MFA (TOTP + recovery codes) is handled by the existing backend endpoints.
 */
export function useLoginFlow({ admin }) {
  const { refresh } = useAuth();
  const nav = useNavigate();
  const { state } = useLocation();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [stage, setStage] = useState('password');
  const [setup, setSetup] = useState(null);
  const [recoveryCodes, setRecoveryCodes] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (stage === 'password' && (!identifier.trim() || !password)) {
      setError('Enter your email and password.');
      return;
    }
    if (stage !== 'password' && !code.trim()) {
      setError('Enter the verification code.');
      return;
    }
    setBusy(true);
    try {
      if (stage === 'password') {
        const u = await portal('/auth/login', { method: 'POST', body: JSON.stringify({ identifier: identifier.trim(), password, portal: admin ? 'admin' : 'student' }) });
        setPassword('');
        if (u.mfaRequired) {
          if (!admin) { setError('This sign-in is for students. Administrators use /admin/login.'); return; }
          if (u.mfaSetupRequired) setSetup(await portal('/auth/admin/mfa/setup', { method: 'POST' }));
          setStage(u.mfaSetupRequired ? 'setup' : 'verify');
          return;
        }
        if (admin && u.role === 'ADMIN') {
          await refresh();
          nav('/admin', { replace: true });
          return;
        }
        if (admin) {
          // A student session was created by the shared endpoint: drop it immediately.
          await portal('/auth/logout', { method: 'POST' }).catch(() => {});
          setError('This sign-in is for administrators only.');
          return;
        }
        await refresh();
        nav('/student', { replace: true, state: state?.offerPush ? { offerPush: true } : null });
        return;
      }
      const path = stage === 'setup' ? '/auth/admin/mfa/confirm' : '/auth/admin/mfa/verify';
      const result = await portal(path, { method: 'POST', body: JSON.stringify({ code: code.trim() }) });
      if (stage === 'setup' && result.recoveryCodes?.length) {
        setRecoveryCodes(result.recoveryCodes);
        setStage('recovery');
        return;
      }
      await refresh();
      nav('/admin', { replace: true });
    } catch (err) {
      setError(err.message);
      if ((err.status === 401 || err.status === 429) && stage !== 'password') { setStage('password'); setCode(''); }
    } finally {
      setBusy(false);
    }
  }

  async function finishRecovery() {
    await refresh();
    nav('/admin', { replace: true });
  }

  return { identifier, setIdentifier, password, setPassword, code, setCode, stage, setup, recoveryCodes, error, busy, submit, finishRecovery };
}
