import Link from "next/link";

export default function MyProfileEntryPage() {
  return (
    <main className="section mt-12">
      <div className="card-dotted p-10 text-center">
        <h1 className="text-3xl font-extrabold text-pink-800">My Profile</h1>
        <p className="mt-3 text-slate-600">Use profile preview and edit pages to manage your details and verification.</p>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/profile/preview" className="btn-outline">Profile Preview</Link>
          <Link href="/complete-profile" className="btn-outline">Complete Profile</Link>
          <Link href="/verify-upload" className="btn-primary">Verification Center</Link>
        </div>
      </div>
    </main>
  );
}
