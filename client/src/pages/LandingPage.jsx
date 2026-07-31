import { Button, Card, Chip } from '@heroui/react';
import { ArrowRight, FilePenLine, Link2, LockKeyhole, PanelsTopLeft, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { SignInModal } from '../components/SignInModal.jsx';

const featureCards = [
  {
    icon: FilePenLine,
    title: 'One private workspace',
    detail: 'Keep resumes, drafts, and supporting career documents organized in one place.'
  },
  {
    icon: ShieldCheck,
    title: 'Controlled publishing',
    detail: 'Review changes before publishing a polished, current resume.'
  },
  {
    icon: Link2,
    title: 'Secure sharing',
    detail: 'Shared resume links open only the profile they were created for.'
  }
];

export function LandingPage({ authState, refreshAuth }) {
  const [signInOpen, setSignInOpen] = useState(() => new URLSearchParams(window.location.search).get('signin') === '1');

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('signin') === '1') {
      setSignInOpen(true);
    }
  }, []);

  const handleSignInChange = isOpen => {
    setSignInOpen(isOpen);
    if (!isOpen && window.location.search) {
      window.history.replaceState({}, '', '/');
    }
  };

  const openDashboard = () => {
    window.location.assign('/dashboard');
  };

  return (
    <div className="landing-shell">
      <header className="landing-topbar">
        <a className="landing-brand" href="/" aria-label="Household Resume home">
          <span className="landing-brand__mark"><PanelsTopLeft size={19} /></span>
          <span>
            <strong>Household Resume</strong>
            <small>Private career workspace</small>
          </span>
        </a>
        {authState.user ? (
          <div className="landing-account">
            <span>{authState.user.name}</span>
            <Chip variant="soft" color="primary">{authState.user.role}</Chip>
          </div>
        ) : (
          <Button type="button" variant="bordered" onPress={() => setSignInOpen(true)}>Sign In</Button>
        )}
      </header>

      <main className="landing-main">
        <section className="landing-hero">
          <div className="landing-hero__copy">
            <p className="landing-kicker"><LockKeyhole size={15} /> Private by design</p>
            <h1>Professional resumes, managed with confidence.</h1>
            <p className="landing-lede">Create, manage, publish, and securely share professional resumes from one private workspace.</p>
            <div className="landing-actions">
              {authState.user ? (
                <Button type="button" onPress={openDashboard}>
                  <span>Open Dashboard</span>
                  <ArrowRight size={17} />
                </Button>
              ) : (
                <Button type="button" onPress={() => setSignInOpen(true)}>
                  <span>Sign In</span>
                  <ArrowRight size={17} />
                </Button>
              )}
            </div>
            <p className="landing-note">Shared resume links open only the profile they were created for.</p>
          </div>

          <Card className="landing-assurance">
            <Card.Content>
              <span className="landing-assurance__icon"><ShieldCheck size={22} /></span>
              <p className="eyebrow">Private Resume Management</p>
              <h2>Built for controlled access.</h2>
              <p>Your household profile directory stays private. Only authorized users and intentionally shared resume links can access career documents.</p>
            </Card.Content>
          </Card>
        </section>

        <section className="landing-features" aria-label="Application features">
          {featureCards.map(({ icon: Icon, title, detail }) => (
            <Card key={title} className="landing-feature-card">
              <Card.Content>
                <span className="landing-feature-card__icon"><Icon size={19} /></span>
                <h2>{title}</h2>
                <p>{detail}</p>
              </Card.Content>
            </Card>
          ))}
        </section>
      </main>

      <footer className="landing-footer">
        <p>&copy; {new Date().getFullYear()} Household Resume CMS.</p>
        <p>Designed and developed by Jareth Thomas.</p>
      </footer>

      <SignInModal
        authState={authState}
        isOpen={signInOpen && !authState.user}
        onOpenChange={handleSignInChange}
        refreshAuth={refreshAuth}
        onAuthenticated={openDashboard}
      />
    </div>
  );
}
