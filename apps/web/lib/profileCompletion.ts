export function calculateCompletion(profile: any) {
  if (!profile) return 0;

  let score = 0;

  // 30% basics
  if (profile.fullName) score += 7;
  if (profile.email) score += 4;
  if (profile.phone) score += 4;
  if (profile.country) score += 5;
  if (profile.state) score += 2;
  if (profile.city) score += 2;
  if (profile.gender) score += 5;
  if (profile.profileManagedBy) score += 1;

  // 20% personality
  if (profile.about) score += 8;
  if (profile.lookingFor) score += 8;
  if (profile.promptOneAnswer) score += 1;
  if (profile.promptTwoAnswer) score += 1;
  if (profile.promptThreeAnswer) score += 2;

  // 20% family
  if (profile.fatherName) score += 4;
  if (profile.motherName) score += 4;
  if (profile.siblings) score += 3;
  if (profile.siblingsDetails || profile.siblingsOccupation) score += 3;
  if (profile.gotra) score += 3;
  if (profile.grandfatherName) score += 3;
  if (profile.grandmotherName) score += 3;

  // 20% career and compatibility
  if (profile.occupation) score += 4;
  if (profile.career) score += 4;
  if (profile.education) score += 3;
  if (profile.salary) score += 5;
  if (profile.visaStatus) score += 2;
  if (profile.heightCm || profile.height) score += 2;

  // 10%
  if (Array.isArray(profile.photoKeys) && profile.photoKeys.length >= 3) score += 10;

  // 10%
  if (profile.idVerified && profile.selfieVerified) {
    score += 10;
  } else if (profile.idVerified || profile.selfieVerified) {
    score += 5;
  }

  return Math.min(score, 100);
}
