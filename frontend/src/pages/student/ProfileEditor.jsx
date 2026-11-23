import { useState } from 'react';
import { Button, Card, StatusMessage, inputClass } from '@/components/kit';
import { useAuth } from '@/context/AuthContext';
import { portal } from '@/services/portalApi';
import { useApi } from './useStudentData';

function Field({ label, ...props }) {
  return <label className="grid gap-2 text-sm font-medium">{label}
    <input className={inputClass} required {...props} />
  </label>;
}

export default function ProfileEditor({ studentId }) {
  const profile = useApi('/my-profile');
  if (!profile.data) return <><StatusMessage error={profile.error} />{profile.loading && <p>Loading profile…</p>}</>;
  return <ProfileForms initial={profile.data} studentId={studentId} />;
}

function ProfileForms({ initial, studentId }) {
  const { refresh } = useAuth();
  const [profile, setProfile] = useState(initial);
  const [pendingEmail, setPendingEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState({});

  async function submit(event, action, suffix, method, message, onSuccess) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    if (values.age !== undefined) values.age = Number(values.age);
    setBusy(true);
    setFeedback({ action });
    try {
      const data = await portal('/my-profile' + suffix, { method, body: JSON.stringify(values) });
      form.reset();
      await onSuccess?.(data, values);
      setFeedback({ action, notice: message });
    } catch (error) {
      setFeedback({ action, error: error.message });
    } finally {
      setBusy(false);
    }
  }

  async function updateProfile(data) {
    setProfile(data);
    await refresh();
  }

  const status = action => feedback.action === action ?
    <StatusMessage error={feedback.error} notice={feedback.notice} /> : null;

  return <div className="grid max-w-3xl gap-4">
    <Card>
      <h2 className="mb-1 font-semibold">Personal details</h2>
      <p className="mb-4 text-sm text-[var(--p-muted)]">Student ID · {studentId}</p>
      <form key={JSON.stringify([profile.name, profile.age, profile.phone])} className="grid gap-3"
        onSubmit={e => submit(e, 'details', '', 'PUT', 'Personal details saved.', updateProfile)}>
        <Field label="Full name" name="name" defaultValue={profile.name} maxLength={150} autoComplete="name" />
        <Field label="Age" name="age" type="number" min={5} max={120} defaultValue={profile.age} />
        <Field label="Phone number" name="phone" type="tel" defaultValue={profile.phone ?? ''} maxLength={30} autoComplete="tel" />
        {status('details')}
        <div><Button disabled={busy}>Save details</Button></div>
      </form>
    </Card>
    <Card>
      <h2 className="mb-1 font-semibold">Email address</h2>
      <p className="mb-4 break-all text-sm text-[var(--p-muted)]">{profile.email}</p>
      {pendingEmail ? <form className="grid gap-3" onSubmit={e => submit(e, 'email', '/email/confirm', 'POST',
        'Email updated. Use your new email the next time you sign in.', async data => {
          setPendingEmail('');
          await updateProfile(data);
        })}>
        <p className="break-all text-sm">Enter the code sent to {pendingEmail}.</p>
        <Field label="Verification code" name="code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" />
        {status('email')}
        <div className="flex flex-wrap gap-2">
          <Button disabled={busy}>Confirm email</Button>
          <Button type="button" variant="secondary" disabled={busy} onClick={() => {
            setPendingEmail('');
            setFeedback({});
          }}>Change address or resend code</Button>
        </div>
      </form> : <form className="grid gap-3" onSubmit={e => submit(e, 'email', '/email/request', 'POST',
        'Verification code sent.', (_, values) => setPendingEmail(values.email.trim()))}>
        <Field label="New email" name="email" type="email" maxLength={190} autoComplete="email" />
        <Field label="Current password" name="currentPassword" type="password" maxLength={72} autoComplete="current-password" />
        {status('email')}
        <div><Button disabled={busy}>Send verification code</Button></div>
      </form>}
    </Card>
    <Card>
      <form className="grid gap-3" onSubmit={e => submit(e, 'password', '/password', 'PUT', 'Password updated.')}>
        <h2 className="font-semibold">Change password</h2>
        <Field label="Current password" name="currentPassword" type="password" maxLength={72} autoComplete="current-password" />
        <Field label="New password (at least 10 characters)" name="newPassword" type="password" minLength={10}
          maxLength={72} autoComplete="new-password" />
        {status('password')}
        <div><Button disabled={busy}>Update password</Button></div>
      </form>
    </Card>
  </div>;
}
