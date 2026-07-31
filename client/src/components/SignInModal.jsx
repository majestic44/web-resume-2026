import { Button, Input, Label, Modal, Spinner, TextField, useOverlayState } from '@heroui/react';
import { KeyRound, LogIn } from 'lucide-react';
import { useEffect, useState } from 'react';

export function SignInModal({ authState, isOpen, onOpenChange, refreshAuth, onAuthenticated }) {
  const modalState = useOverlayState({ isOpen, onOpenChange });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setError('');
      setStatus('idle');
    }
  }, [isOpen]);

  const handleSubmit = async event => {
    event.preventDefault();
    if (status === 'loading' || authState.dataSource !== 'database') return;

    setStatus('loading');
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || 'Unable to sign in.');
      }

      await refreshAuth();
      modalState.close();
      onAuthenticated?.();
    } catch (loginError) {
      setError(loginError.message);
      setStatus('error');
    }
  };

  return (
    <Modal state={modalState}>
      <Modal.Backdrop>
        <Modal.Container placement="center" size="sm">
          <Modal.Dialog>
            <form className="signin-modal" onSubmit={handleSubmit}>
              <Modal.Header>
                <div className="signin-modal__icon" aria-hidden="true"><KeyRound size={19} /></div>
                <div>
                  <Modal.Heading>Sign in to your workspace</Modal.Heading>
                  <p>Access your private resume management tools.</p>
                </div>
              </Modal.Header>
              <Modal.Body>
                <TextField isInvalid={Boolean(error)} isRequired>
                  <Label>Email address</Label>
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    value={email}
                    onChange={event => setEmail(event.target.value)}
                    autoFocus
                    isDisabled={status === 'loading' || authState.dataSource !== 'database'}
                  />
                </TextField>
                <TextField isInvalid={Boolean(error)} isRequired>
                  <Label>Password</Label>
                  <Input
                    type="password"
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    value={password}
                    onChange={event => setPassword(event.target.value)}
                    isDisabled={status === 'loading' || authState.dataSource !== 'database'}
                  />
                </TextField>
                {error ? <p className="signin-modal__error" role="alert">{error}</p> : null}
                {authState.dataSource !== 'database' ? <p className="signin-modal__notice">Sign-in is available after switching the app to `DATA_SOURCE=database`.</p> : null}
              </Modal.Body>
              <Modal.Footer>
                <Button type="button" variant="bordered" onPress={() => modalState.close()} isDisabled={status === 'loading'}>
                  Cancel
                </Button>
                <Button type="submit" isDisabled={status === 'loading' || authState.dataSource !== 'database'}>
                  {status === 'loading' ? <Spinner size="sm" /> : <LogIn size={16} />}
                  <span>{status === 'loading' ? 'Signing In...' : 'Sign In'}</span>
                </Button>
              </Modal.Footer>
            </form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
