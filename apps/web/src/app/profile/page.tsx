import { PageHeader } from "@/components/page-header";
import { getProfile } from "@/lib/store";
import { ProfileForm } from "./profile-form";
import { ResumeUpload } from "./resume-upload";

export default function ProfilePage() {
  const profile = getProfile();
  return (
    <>
      <PageHeader
        title="Your resume"
        lead="Upload it once. Every draft is built only from what is here, so fix anything the reader got wrong."
      />
      <div className="space-y-8">
        <ResumeUpload fileName={profile.resumeFileName} />
        {profile.resumeText ? (
          <ProfileForm profile={profile} />
        ) : (
          <p className="text-sm text-muted-foreground">Your profile fields show up here after the upload.</p>
        )}
      </div>
    </>
  );
}
