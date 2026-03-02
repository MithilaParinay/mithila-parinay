import Link from "next/link";

export default function NewProfilePage() {
  return (
    <main className="section mt-12">
      <div className="card-dotted p-10 text-center">
        <h1 className="text-3xl font-extrabold text-pink-800">Create Profile</h1>
        <p className="mt-3 text-slate-600">
          Registration starts at the create profile page. Existing users can complete remaining details after login.
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/register" className="btn-primary">Create New Profile</Link>
          <Link href="/login" className="btn-outline">Login</Link>
        </div>
      </div>
    </main>
  );
}
