import { useEffect } from 'react';

// Keep bookmarked /login URLs working while the landing page owns the sign-in modal.
export function Login() {
  useEffect(() => {
    window.location.replace('/?signin=1');
  }, []);

  return <div className="route-redirect-status" role="status">Opening secure sign-in...</div>;
}
