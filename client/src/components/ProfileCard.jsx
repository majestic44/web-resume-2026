import { Card, Chip, Link } from '@heroui/react';
import { FileText, MailOpen } from 'lucide-react';

export function ProfileCard({ profile }) {
  return (
    <Card className="profile-card rounded-lg border border-slate-200 bg-white shadow-[0_18px_40px_rgba(20,33,61,0.08)]">
      <Card.Content className="profile-card-content flex min-h-[180px] flex-col justify-between gap-6 p-5">
        <div>
          <p className="card-label mb-2 text-xs font-bold uppercase text-teal-700">{profile.label}</p>
          <h2 className="text-2xl font-semibold text-slate-900">{profile.name}</h2>
          <div className="chip-row mt-3 flex flex-wrap gap-2">
            <Chip color="primary" variant="soft">{profile.template}</Chip>
            <Chip variant="flat">Profile</Chip>
          </div>
        </div>
        <div className="card-actions flex flex-wrap gap-2.5">
          <Link className="hero-link-button primary inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-teal-700 bg-teal-700 px-3.5 py-2 font-extrabold text-white" href={profile.resumeLink}>
            <FileText size={16} />
            <span>Resume</span>
          </Link>
          <Link className="hero-link-button inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 font-extrabold text-slate-900" href={profile.coverLetterLink}>
            <MailOpen size={16} />
            <span>Cover Letter</span>
          </Link>
        </div>
      </Card.Content>
    </Card>
  );
}
