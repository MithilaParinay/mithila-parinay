export default function VerificationBadge({
  idVerified,
  selfieVerified,
}: {
  idVerified?: boolean | null;
  selfieVerified?: boolean | null;
}) {
  const idDone = Boolean(idVerified);
  const selfieDone = Boolean(selfieVerified);

  if (idDone && selfieDone) {
    return (
      <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
        Blue Tick Verified
      </span>
    );
  }

  if (idDone || selfieDone) {
    const missing = idDone ? "Selfie pending" : "ID pending";
    return (
      <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
        Green Tick Partially Verified · {missing}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
      Verification pending
    </span>
  );
}
