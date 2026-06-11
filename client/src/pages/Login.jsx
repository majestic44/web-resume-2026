import { Button, Card, Input, Label, Link, TextField } from '@heroui/react';
import { LogIn } from 'lucide-react';
import { useState } from 'react';
import { PageHeader } from '../components/PageHeader.jsx';

export function Login({ authState, refreshAuth }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    setStatus('loading');
    setError('');

    fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })
      .then(async response => {
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.error || 'Unable to sign in.');
        }

        await refreshAuth();
        setStatus('success');
      })
      .catch(loginError => {
        setError(loginError.message);
        setStatus('error');
      });
  };

  const handleLogout = () => {
    fetch('/api/auth/logout', { method: 'POST' })
      .then(() => refreshAuth())
      .then(() => setStatus('idle'));
  };

  return (
    <>
      <PageHeader eyebrow="Account Access" title="Sign in">
        <p>
          {authState.dataSource === 'database'
            ? 'Database mode uses real login sessions for draft editing.'
            : 'Login is disabled in seed mode. Switch to DATA_SOURCE=database to use account sessions.'}
        </p>
      </PageHeader>

      <Card className="form-panel">
        <Card.Content className="form-stack">
          {authState.user ? (
            <>
              <p className="muted">Signed in as {authState.user.name} ({authState.user.role})</p>
              <Button type="button" variant="bordered" onPress={handleLogout}>
                <span>Sign Out</span>
              </Button>
            </>
          ) : null}
          <TextField>
            <Label>Email</Label>
            <Input type="email" placeholder="you@example.com" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} />
          </TextField>
          <TextField>
            <Label>Password</Label>
            <Input type="password" placeholder="Password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} />
          </TextField>
          {error ? <p className="editor-error">{error}</p> : null}
          {authState.dataSource !== 'database' ? <p className="muted">Use seed mode for local UI work, or switch to database mode for secure editing.</p> : null}
          {authState.user?.editableProfiles && !authState.user.editableProfiles.includes('*') ? (
            <p className="muted">Assigned editable profiles: {authState.user.editableProfiles.join(', ') || 'none'}</p>
          ) : null}
          <Button type="button" isDisabled={authState.dataSource !== 'database' || status === 'loading' || Boolean(authState.user)} onPress={handleSubmit}>
            <LogIn size={16} />
            <span>{status === 'loading' ? 'Signing In...' : 'Sign In'}</span>
          </Button>
          {!authState.user && authState.dataSource === 'database' ? <Link href="/editor">Go to editor after sign-in</Link> : null}
        </Card.Content>
      </Card>
    </>
  );
}
