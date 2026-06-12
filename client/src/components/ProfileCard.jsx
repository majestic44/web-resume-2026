import { Card, Link } from '@heroui/react';
import { Check, Copy, FileText, MailOpen, UserRound } from 'lucide-react';
import { useState } from 'react';

function getInitials(name) {
  return String(name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() || '')
    .join('');
}

export function ProfileCard({ profile }) {
  const [copied, setCopied] = useState(false);
  const initials = getInitials(profile.name);
  const shareUrl = `${window.location.origin}${profile.profileLink || profile.resumeLink}`;

  const copyShareUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Card className="profile-card directory-profile-card rounded-lg border border-slate-200 bg-white shadow-[0_18px_40px_rgba(20,33,61,0.08)]">
      <Card.Content className="profile-card-content directory-profile-card__content flex min-h-[180px] flex-col justify-between gap-6 p-5">
        <div className="directory-profile-card__top">
          <div className="directory-profile-card__avatar" aria-hidden="true">
            {profile.image ? <img src={profile.image} alt={profile.name} /> : <span>{initials}</span>}
          </div>
          <div className="directory-profile-card__copy">
            <p className="card-label mb-2 text-xs font-bold uppercase text-teal-700">{profile.label}</p>
            <h2 className="text-2xl font-semibold text-slate-900">{profile.name}</h2>
            <button
              type="button"
              className="directory-profile-card__share"
              onClick={copyShareUrl}
              title="Copy shareable resume link"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              <span>{shareUrl}</span>
            </button>
          </div>
        </div>

        <p className="directory-profile-card__hint">Public profile hub with direct access to resume, cover letter, and portfolio items.</p>

        <div className="card-actions directory-profile-card__actions flex flex-wrap gap-2.5">
          <Link className="hero-link-button primary directory-profile-card__action inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-teal-700 bg-teal-700 px-3.5 py-2 font-extrabold text-white" href={profile.profileLink || profile.resumeLink}>
            <UserRound size={16} />
            <span>Profile</span>
          </Link>
          <Link className="hero-link-button directory-profile-card__action inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 font-extrabold text-slate-900" href={profile.resumeLink}>
            <FileText size={16} />
            <span>Resume</span>
          </Link>
          <Link className="hero-link-button directory-profile-card__action inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 font-extrabold text-slate-900" href={profile.coverLetterLink}>
            <MailOpen size={16} />
            <span>Cover Letter</span>
          </Link>
        </div>
      </Card.Content>
    </Card>
  );
}
