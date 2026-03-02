"use client";

import {
  confirmUserAttribute,
  fetchUserAttributes,
  getCurrentUser,
  sendUserAttributeVerificationCode,
  updateUserAttribute,
} from "aws-amplify/auth";
import { getUrl, uploadData } from "aws-amplify/storage";
import { client } from "@/lib/amplifyClient";
import { calculateCompletion } from "@/lib/profileCompletion";

type AnyObj = Record<string, any>;

const CURRENT_ACCOUNT_TTL_MS = 20_000;
const MY_PROFILE_TTL_MS = 20_000;
const PROFILE_BY_ID_TTL_MS = 30_000;
const PHOTO_URL_TTL_MS = 5 * 60_000;

let currentAccountCache: { value: AnyObj; expiresAt: number } | null = null;
let currentAccountPromise: Promise<AnyObj> | null = null;

let myProfileCache: { accountId: string; value: AnyObj | null; expiresAt: number } | null = null;
let myProfilePromise: Promise<AnyObj | null> | null = null;
let myProfilePromiseAccountId = "";

const profileByIdCache = new Map<string, { value: AnyObj | null; expiresAt: number }>();
const photoUrlCache = new Map<string, { url: string; expiresAt: number }>();
const photoUrlPromiseCache = new Map<string, Promise<string | null>>();

function cacheProfileById(profileId: string | null | undefined, value: AnyObj | null) {
  if (!profileId) return;
  profileByIdCache.set(profileId, {
    value,
    expiresAt: Date.now() + PROFILE_BY_ID_TTL_MS,
  });
}

function cacheMyProfileValue(accountId: string, value: AnyObj | null) {
  myProfileCache = {
    accountId,
    value,
    expiresAt: Date.now() + MY_PROFILE_TTL_MS,
  };
  cacheProfileById(value?.id, value);
}

function invalidateMyProfileCache(accountId?: string) {
  if (!accountId || myProfileCache?.accountId === accountId) {
    myProfileCache = null;
  }
  if (!accountId || myProfilePromiseAccountId === accountId) {
    myProfilePromise = null;
    myProfilePromiseAccountId = "";
  }
}

export function clearSessionCaches() {
  currentAccountCache = null;
  currentAccountPromise = null;
  invalidateMyProfileCache();
}

function flattenErrorMessage(errors: Array<{ message?: string }> | undefined) {
  return (errors ?? []).map((e) => e?.message ?? "").filter(Boolean).join(" | ");
}

function pickKeys(source: AnyObj, keys: string[]) {
  const out: AnyObj = {};
  for (const key of keys) {
    if (key in source) out[key] = source[key];
  }
  return out;
}

const PROFILE_MANAGED_BY_MAP: Record<string, string> = {
  myself: "Myself",
  brother: "Brother",
  sister: "Sister",
  parents: "Parents",
  guardian: "Guardian",
  others: "Others",
  my_self: "Myself",
  mother: "Parents",
  father: "Parents",
  son: "Others",
  daughter: "Others",
};

function normalizeProfileManagedBy(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return undefined;
  const mapped = PROFILE_MANAGED_BY_MAP[raw.toLowerCase()];
  return mapped ?? raw;
}

const LEGACY_CREATE_FIELDS = [
  "accountId",
  "email",
  "firstName",
  "lastName",
  "fullName",
  "phone",
  "phoneNormalized",
  "dateOfBirth",
  "gender",
  "country",
  "state",
  "city",
  "zipcode",
  "visaStatus",
  "salary",
  "occupation",
  "about",
  "lookingFor",
  "fatherName",
  "motherName",
  "siblings",
  "siblingsOccupation",
  "fatherOccupation",
  "motherOccupation",
  "gotra",
  "grandfatherName",
  "grandmotherName",
  "photoKeys",
  "primaryPhotoKey",
  "identityFingerprint",
  "sharePhoneWithMatches",
  "completionScore",
] as const;

const EXTENDED_PROFILE_FIELDS = [
  "raisedIn",
  "profileManagedBy",
  "career",
  "education",
  "heightCm",
  "siblingsDetails",
  "promptOneQuestion",
  "promptOneAnswer",
  "promptTwoQuestion",
  "promptTwoAnswer",
  "promptThreeQuestion",
  "promptThreeAnswer",
] as const;

function extractUnknownInputField(message: string, inputType: "CreateProfileInput" | "UpdateProfileInput") {
  const patterns = [
    new RegExp(`Field ['"]([^'"]+)['"] is not defined by type ['"]${inputType}['"]`, "i"),
    new RegExp(`contains a field that is not defined for input object type ['"]${inputType}['"]`, "i"),
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match?.[1]) return match[1];
  }

  // Some GraphQL messages don't include the field name; handle common new fields safely.
  const compatFields = [
    "raisedIn",
    "profileManagedBy",
    "career",
    "education",
    "heightCm",
    "siblingsDetails",
    "promptOneQuestion",
    "promptOneAnswer",
    "promptTwoQuestion",
    "promptTwoAnswer",
    "promptThreeQuestion",
    "promptThreeAnswer",
  ];
  return compatFields.find((key) => message.includes(key)) ?? null;
}

async function createProfileCompat(payload: AnyObj) {
  const working = { ...payload };
  let reducedToStable = false;
  let reducedToMinimal = false;
  const stableCreateFields = [...LEGACY_CREATE_FIELDS];
  const minimalCreateFields = [
    "accountId",
    "email",
    "fullName",
    "phone",
    "phoneNormalized",
    "country",
    "photoKeys",
    "primaryPhotoKey",
    "sharePhoneWithMatches",
    "completionScore",
  ];

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const res = await client.models.Profile.create(working as any);
    if (!res.errors?.length) return res;

    const message = flattenErrorMessage(res.errors);
    const badField = extractUnknownInputField(message, "CreateProfileInput");

    if (badField && badField in working) {
      delete working[badField];
      continue;
    }

    if (!reducedToStable && /CreateProfileInput/i.test(message)) {
      const reduced = pickKeys(working, stableCreateFields);
      Object.keys(working).forEach((k) => delete working[k]);
      Object.assign(working, reduced);
      reducedToStable = true;
      continue;
    }

    if (!reducedToMinimal && /CreateProfileInput/i.test(message)) {
      const reduced = pickKeys(working, minimalCreateFields);
      Object.keys(working).forEach((k) => delete working[k]);
      Object.assign(working, reduced);
      reducedToMinimal = true;
      continue;
    }

    throw new Error(message || "Unable to create profile.");
  }

  throw new Error("Unable to create profile due to schema mismatch. Please sync Amplify backend.");
}

async function updateProfileCompat(payload: AnyObj) {
  const working = { ...payload };
  let reducedToStable = false;
  let reducedToMinimal = false;
  const stableUpdateFields = [
    "id",
    "firstName",
    "lastName",
    "fullName",
    "phone",
    "phoneNormalized",
    "dateOfBirth",
    "gender",
    "country",
    "state",
    "city",
    "zipcode",
    "visaStatus",
    "salary",
    "occupation",
    "about",
    "lookingFor",
    "fatherName",
    "motherName",
    "siblings",
    "siblingsOccupation",
    "fatherOccupation",
    "motherOccupation",
    "gotra",
    "grandfatherName",
    "grandmotherName",
    "photoKeys",
    "primaryPhotoKey",
    "completionScore",
    "sharePhoneWithMatches",
    "identityFingerprint",
  ];
  const minimalUpdateFields = ["id", "completionScore"];

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const res = await client.models.Profile.update(working as any);
    if (!res.errors?.length) return res;

    const message = flattenErrorMessage(res.errors);
    const badField = extractUnknownInputField(message, "UpdateProfileInput");

    if (badField && badField in working && badField !== "id") {
      delete working[badField];
      continue;
    }

    if (!reducedToStable && /UpdateProfileInput/i.test(message)) {
      const reduced = pickKeys(working, stableUpdateFields);
      Object.keys(working).forEach((k) => delete working[k]);
      Object.assign(working, reduced);
      reducedToStable = true;
      continue;
    }

    if (!reducedToMinimal && /UpdateProfileInput/i.test(message)) {
      const reduced = pickKeys(working, minimalUpdateFields);
      Object.keys(working).forEach((k) => delete working[k]);
      Object.assign(working, reduced);
      reducedToMinimal = true;
      continue;
    }

    throw new Error(message || "Unable to update profile.");
  }

  throw new Error("Unable to update profile due to schema mismatch. Please sync Amplify backend.");
}

async function updateExtendedFieldsBestEffort(id: string, fields: AnyObj) {
  const entries = Object.entries(fields).filter(([key, value]) => key !== "id" && value !== undefined);
  const applied: AnyObj = {};

  for (const [key, value] of entries) {
    const res = await client.models.Profile.update({ id, [key]: value } as any);
    if (!res.errors?.length) {
      applied[key] = value;
      continue;
    }

    const message = flattenErrorMessage(res.errors);
    if (/input object type|not defined|invalid value|does not exist in .*enum/i.test(message)) {
      continue;
    }
    throw new Error(message || `Unable to update field ${key}`);
  }

  return applied;
}

export function normalizePhone(phone: string): string {
  const only = phone.replace(/[^\d+]/g, "").trim();
  if (!only) return "";
  if (only.startsWith("+")) return only;
  return `+${only}`;
}

export function buildIdentityFingerprint(data: {
  fullName?: string | null;
  dateOfBirth?: string | null;
  fatherName?: string | null;
  motherName?: string | null;
  gotra?: string | null;
  phoneNormalized?: string | null;
}): string {
  return [
    data.fullName ?? "",
    data.dateOfBirth ?? "",
    data.fatherName ?? "",
    data.motherName ?? "",
    data.gotra ?? "",
    data.phoneNormalized ?? "",
  ]
    .join("|")
    .trim()
    .toLowerCase();
}

export async function getCurrentAccount() {
  const now = Date.now();
  if (currentAccountCache && currentAccountCache.expiresAt > now) {
    return currentAccountCache.value;
  }

  if (currentAccountPromise) {
    return currentAccountPromise;
  }

  currentAccountPromise = (async () => {
    const user = await getCurrentUser();
    const attrs = await fetchUserAttributes().catch(() => ({} as AnyObj));

    const value = {
      user,
      username: user.username,
      accountId: user.userId,
      email: attrs.email ?? user?.signInDetails?.loginId ?? "",
      phone: attrs.phone_number ?? "",
    };
    currentAccountCache = {
      value,
      expiresAt: Date.now() + CURRENT_ACCOUNT_TTL_MS,
    };
    return value;
  })();

  try {
    return await currentAccountPromise;
  } catch (error) {
    currentAccountCache = null;
    invalidateMyProfileCache();
    throw error;
  } finally {
    currentAccountPromise = null;
  }
}

export async function getMyProfile() {
  const { accountId, email, username, phone } = await getCurrentAccount();
  const now = Date.now();
  if (
    myProfileCache &&
    myProfileCache.accountId === accountId &&
    myProfileCache.expiresAt > now
  ) {
    return myProfileCache.value;
  }

  if (myProfilePromise && myProfilePromiseAccountId === accountId) {
    return myProfilePromise;
  }

  myProfilePromiseAccountId = accountId;
  myProfilePromise = (async () => {
    const byAccount = await client.models.Profile.list({
      filter: { accountId: { eq: accountId } } as any,
      limit: 1,
    });

    const byAccountItems = (byAccount.data ?? []).filter(Boolean) as AnyObj[];
    const hit = byAccountItems[0] ?? null;
    if (hit) {
      cacheMyProfileValue(accountId, hit);
      return hit;
    }

    let candidate: AnyObj | null = null;

    // Backward-compatible fallback by email.
    if (email) {
      const byEmail = await client.models.Profile.list({
        filter: { email: { eq: email.toLowerCase() } } as any,
        limit: 2,
      });
      candidate = ((byEmail.data ?? []).filter(Boolean) as AnyObj[])[0] ?? null;
      if (candidate?.accountId && candidate.accountId !== accountId) {
        // keep scanning; mismatched account records can exist from previous attempts
        candidate = null;
      }
    }

    // Fallback by normalized phone.
    if (!candidate && phone) {
      const normalizedPhone = normalizePhone(phone);
      if (normalizedPhone) {
        const byPhone = await client.models.Profile.list({
          filter: { phoneNormalized: { eq: normalizedPhone } } as any,
          limit: 2,
        });
        candidate = ((byPhone.data ?? []).filter(Boolean) as AnyObj[])[0] ?? null;
      }
    }

    // Final fallback by owner/creator metadata for old schemas without accountId/email.
    if (!candidate) {
      const all = await client.models.Profile.list({ limit: 120 });
      const list = (all.data ?? []).filter(Boolean) as AnyObj[];

      const ownerMatched = list.filter((item) => {
        const owner = String(item.owner ?? "").toLowerCase();
        const createdBy = String(item.createdByUserId ?? "").toLowerCase();
        const uname = String(username ?? "").toLowerCase();
        const uid = String(accountId ?? "").toLowerCase();
        return (owner && (owner === uname || owner === uid)) || (createdBy && (createdBy === uname || createdBy === uid));
      });

      if (ownerMatched.length > 0) {
        candidate = ownerMatched.sort((a, b) => {
          const ta = String(a.updatedAt ?? a.createdAt ?? "");
          const tb = String(b.updatedAt ?? b.createdAt ?? "");
          return tb.localeCompare(ta);
        })[0];
      }
    }

    if (candidate && !candidate.accountId) {
      await client.models.Profile.update({
        id: candidate.id,
        accountId,
      } as any);
      const patched = { ...candidate, accountId };
      cacheMyProfileValue(accountId, patched);
      return patched;
    }

    cacheMyProfileValue(accountId, candidate);
    return candidate;
  })();

  try {
    return await myProfilePromise;
  } finally {
    myProfilePromise = null;
    myProfilePromiseAccountId = "";
  }
}

export async function getProfileById(profileId: string) {
  const cached = profileByIdCache.get(profileId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const res = await client.models.Profile.get({ id: profileId });
  const value = res.data ?? null;
  cacheProfileById(profileId, value);
  return value;
}

export async function resolvePhotoUrls(photoKeys: string[] | null | undefined) {
  const keys = (Array.isArray(photoKeys) ? photoKeys : []).filter(
    (key): key is string => typeof key === "string" && key.trim().length > 0
  );

  const urls = await Promise.all(keys.map(async (key) => {
    if (key.startsWith("http://") || key.startsWith("https://")) return key;

    const cached = photoUrlCache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.url;
    }

    const inFlight = photoUrlPromiseCache.get(key);
    if (inFlight) return inFlight;

    const pending = (async () => {
      try {
        const u = await getUrl({ path: key });
        const url = u.url.toString();
        photoUrlCache.set(key, {
          url,
          expiresAt: Date.now() + PHOTO_URL_TTL_MS,
        });
        return url;
      } catch {
        return null;
      } finally {
        photoUrlPromiseCache.delete(key);
      }
    })();
    photoUrlPromiseCache.set(key, pending);
    return pending;
  }));

  return urls.filter((url): url is string => typeof url === "string" && url.length > 0);
}

export async function uploadProfilePhotos(accountId: string, files: File[]) {
  const uploaded: string[] = [];

  for (const file of files) {
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const path = `users/${accountId}/photos/${stamp}.${ext}`;

    await uploadData({
      path,
      data: file,
      options: { contentType: file.type || "image/jpeg" },
    }).result;

    uploaded.push(path);
  }

  return uploaded;
}

export async function findDuplicatePerson(params: {
  phoneNormalized?: string;
  identityFingerprint?: string;
  currentAccountId?: string;
}) {
  const checks: AnyObj[] = [];
  if (params.phoneNormalized) {
    checks.push({ phoneNormalized: { eq: params.phoneNormalized } });
  }
  if (params.identityFingerprint) {
    checks.push({ identityFingerprint: { eq: params.identityFingerprint } });
  }

  if (!checks.length) return null;

  const res = await client.models.Profile.list({
    filter: { or: checks } as any,
    limit: 50,
  });

  const items = (res.data ?? []).filter(Boolean) as AnyObj[];
  return items.find((p: AnyObj) => p.accountId !== params.currentAccountId) ?? null;
}

export async function createProfileForCurrentUser(input: AnyObj) {
  const { accountId, email } = await getCurrentAccount();

  const existingMine = await getMyProfile();
  if (existingMine) {
    const err = new Error("A profile already exists for this account.");
    (err as AnyObj).code = "PROFILE_EXISTS";
    throw err;
  }

  const phoneNormalized = normalizePhone(input.phone || "");
  const fullName = `${input.firstName ?? ""} ${input.lastName ?? ""}`.trim() || input.fullName || "";
  const identityFingerprint = buildIdentityFingerprint({
    fullName,
    dateOfBirth: input.dateOfBirth,
    fatherName: input.fatherName,
    motherName: input.motherName,
    gotra: input.gotra,
    phoneNormalized,
  });

  const duplicate = await findDuplicatePerson({
    phoneNormalized,
    identityFingerprint,
    currentAccountId: accountId,
  });

  if (duplicate) {
    const err = new Error("A profile for this individual already exists. Please log in.");
    (err as AnyObj).code = "DUPLICATE_PERSON";
    throw err;
  }

  const payload: AnyObj = {
    accountId,
    email: (input.email || email || "").toLowerCase(),
    firstName: input.firstName,
    lastName: input.lastName,
    fullName,
    phone: input.phone,
    phoneNormalized,
    dateOfBirth: input.dateOfBirth || null,
    gender: input.gender,
    country: input.country,
    state: input.state || null,
    city: input.city || null,
    zipcode: input.zipcode || null,
    raisedIn: input.raisedIn || null,
    profileManagedBy: normalizeProfileManagedBy(input.profileManagedBy) || "Myself",
    education: input.education || null,
    career: input.career || null,
    heightCm: Number.isFinite(Number(input.heightCm)) ? Number(input.heightCm) : null,
    fatherName: input.fatherName || null,
    motherName: input.motherName || null,
    siblings: input.siblings || null,
    siblingsOccupation: input.siblingsOccupation || null,
    siblingsDetails: input.siblingsDetails || null,
    fatherOccupation: input.fatherOccupation || null,
    motherOccupation: input.motherOccupation || null,
    gotra: input.gotra || null,
    grandfatherName: input.grandfatherName || null,
    grandmotherName: input.grandmotherName || null,
    visaStatus: input.visaStatus || null,
    salary: input.salary || null,
    occupation: input.occupation || null,
    about: input.about || null,
    lookingFor: input.lookingFor || null,
    promptOneQuestion: input.promptOneQuestion || null,
    promptOneAnswer: input.promptOneAnswer || null,
    promptTwoQuestion: input.promptTwoQuestion || null,
    promptTwoAnswer: input.promptTwoAnswer || null,
    promptThreeQuestion: input.promptThreeQuestion || null,
    promptThreeAnswer: input.promptThreeAnswer || null,
    photoKeys: input.photoKeys || [],
    primaryPhotoKey: input.photoKeys?.[0] ?? null,
    identityFingerprint,
    sharePhoneWithMatches: false,
  };

  payload.completionScore = calculateCompletion(payload);
  const legacyCreatePayload = pickKeys(payload, [...LEGACY_CREATE_FIELDS]);

  const { data } = await createProfileCompat(legacyCreatePayload);
  if (!data) throw new Error("Unable to create profile.");

  const optionalUpdate: AnyObj = {
    id: data.id,
    ...pickKeys(payload, [...EXTENDED_PROFILE_FIELDS]),
  };

  const nonNullOptionalKeys = Object.entries(optionalUpdate).filter(
    ([key, value]) => key !== "id" && value !== null && value !== ""
  );

  if (nonNullOptionalKeys.length > 0) {
    await updateExtendedFieldsBestEffort(data.id, optionalUpdate);
  }

  cacheMyProfileValue(accountId, {
    ...payload,
    ...data,
    id: data.id,
  });
  return data;
}

export async function saveMyProfileUpdates(update: AnyObj) {
  const mineById = update.id ? await getProfileById(update.id).catch(() => null) : null;
  const mine = mineById ?? (await getMyProfile());
  if (!mine) throw new Error("Profile not found. Please create profile first.");

  const { accountId } = await getCurrentAccount();
  if (mine.accountId && mine.accountId !== accountId) {
    throw new Error("Profile not found for this account. Please log in again.");
  }

  const next = { ...mine, ...update };
  next.profileManagedBy = normalizeProfileManagedBy(next.profileManagedBy) ?? next.profileManagedBy;

  if (update.phone) {
    next.phoneNormalized = normalizePhone(update.phone);
  }

  if (update.firstName || update.lastName || update.fullName) {
    const fullName = `${next.firstName ?? ""} ${next.lastName ?? ""}`.trim() || next.fullName;
    next.fullName = fullName;
  }

  next.identityFingerprint = buildIdentityFingerprint({
    fullName: next.fullName,
    dateOfBirth: next.dateOfBirth,
    fatherName: next.fatherName,
    motherName: next.motherName,
    gotra: next.gotra,
    phoneNormalized: next.phoneNormalized,
  });

  const duplicate = await findDuplicatePerson({
    phoneNormalized: next.phoneNormalized,
    identityFingerprint: next.identityFingerprint,
    currentAccountId: mine.accountId,
  });

  if (duplicate) {
    const err = new Error("A profile for this individual already exists. Please use your original account.");
    (err as AnyObj).code = "DUPLICATE_PERSON";
    throw err;
  }

  next.completionScore = calculateCompletion(next);

  const mergedUpdatePayload = {
    id: mine.id,
    ...update,
    profileManagedBy: next.profileManagedBy,
    heightCm: Number.isFinite(Number(next.heightCm)) ? Number(next.heightCm) : null,
    fullName: next.fullName,
    phoneNormalized: next.phoneNormalized,
    identityFingerprint: next.identityFingerprint,
    completionScore: next.completionScore,
    primaryPhotoKey: Array.isArray(next.photoKeys) ? next.photoKeys[0] ?? null : null,
  };

  const legacyUpdatePayload = pickKeys(mergedUpdatePayload, [
    "id",
    ...LEGACY_CREATE_FIELDS,
  ] as string[]);
  const { data } = await updateProfileCompat(legacyUpdatePayload);
  if (!data) throw new Error("Unable to update profile.");

  const extendedPayload = pickKeys(mergedUpdatePayload, [...EXTENDED_PROFILE_FIELDS]);
  const hasExtended = Object.values(extendedPayload).some((value) => value !== undefined);
  if (hasExtended) {
    const applied = await updateExtendedFieldsBestEffort(mine.id, extendedPayload);
    const updated = { ...mine, ...next, ...data, ...applied };
    cacheMyProfileValue(accountId, updated);
    return updated;
  }

  const updated = { ...mine, ...next, ...data };
  cacheMyProfileValue(accountId, updated);
  return updated;
}

export async function isCurrentUserPhoneVerified() {
  const attrs = await fetchUserAttributes();
  return attrs.phone_number_verified === "true";
}

export async function sendPhoneVerificationCode(phone: string) {
  const normalized = normalizePhone(phone);
  if (!normalized) throw new Error("Please enter a valid phone number.");

  await updateUserAttribute({
    userAttribute: {
      attributeKey: "phone_number",
      value: normalized,
    },
  });

  const out = await sendUserAttributeVerificationCode({
    userAttributeKey: "phone_number",
  });

  return {
    normalized,
    destination: out.destination ?? "",
  };
}

export async function confirmPhoneVerificationCode(code: string) {
  if (!code.trim()) throw new Error("Please enter verification code.");
  await confirmUserAttribute({
    userAttributeKey: "phone_number",
    confirmationCode: code.trim(),
  });
  return isCurrentUserPhoneVerified();
}

function makePairKey(a: string, b: string) {
  return [a, b].sort().join("#");
}

async function upsertSwipe(params: {
  fromUserId: string;
  toUserId: string;
  fromProfileId: string;
  toProfileId: string;
  decision: "LIKE" | "REJECT";
}) {
  const existing = await client.models.Swipe.list({
    filter: {
      and: [
        { fromUserId: { eq: params.fromUserId } },
        { toUserId: { eq: params.toUserId } },
      ],
    } as any,
    limit: 1,
  });

  const prev = existing.data?.[0];

  if (prev) {
    const res = await client.models.Swipe.update({
      id: prev.id,
      decision: params.decision,
      fromProfileId: params.fromProfileId,
      toProfileId: params.toProfileId,
    });

    if (res.errors?.length) {
      throw new Error(res.errors.map((e: AnyObj) => e.message).join(", "));
    }

    return res.data;
  }

  const created = await client.models.Swipe.create(params as any);

  if (created.errors?.length) {
    throw new Error(created.errors.map((e: AnyObj) => e.message).join(", "));
  }

  return created.data;
}

export async function likeProfile(targetProfileId: string) {
  const { accountId } = await getCurrentAccount();
  const me = await getMyProfile();
  const target = await getProfileById(targetProfileId);

  if (!me || !target || !target.accountId) throw new Error("Profile unavailable");
  if (target.accountId === accountId) throw new Error("Cannot like your own profile");

  await upsertSwipe({
    fromUserId: accountId,
    toUserId: target.accountId,
    fromProfileId: me.id,
    toProfileId: target.id,
    decision: "LIKE",
  });

  const reverse = await client.models.Swipe.list({
    filter: {
      and: [
        { fromUserId: { eq: target.accountId } },
        { toUserId: { eq: accountId } },
        { decision: { eq: "LIKE" } },
      ],
    } as any,
    limit: 1,
  });

  const matched = Boolean(reverse.data?.length);
  let matchRecord: AnyObj | null = null;

  if (matched) {
    const pairKey = makePairKey(accountId, target.accountId);
    const existing = await client.models.Match.list({
      filter: { pairKey: { eq: pairKey } } as any,
      limit: 1,
    });

    const prev = existing.data?.[0];

    if (prev) {
      const updated = await client.models.Match.update({
        id: prev.id,
        isActive: true,
        blockedByUserId: null,
        unmatchedByUserId: null,
      } as any);

      if (updated.errors?.length) {
        throw new Error(updated.errors.map((e: AnyObj) => e.message).join(", "));
      }
      matchRecord = updated.data;
    } else {
      const created = await client.models.Match.create({
        pairKey,
        userAId: accountId,
        userBId: target.accountId,
        profileAId: me.id,
        profileBId: target.id,
        isActive: true,
      } as any);

      if (created.errors?.length) {
        throw new Error(created.errors.map((e: AnyObj) => e.message).join(", "));
      }
      matchRecord = created.data;
    }
  }

  return { matched, match: matchRecord };
}

export async function rejectProfile(targetProfileId: string) {
  const { accountId } = await getCurrentAccount();
  const me = await getMyProfile();
  const target = await getProfileById(targetProfileId);

  if (!me || !target || !target.accountId) throw new Error("Profile unavailable");

  await upsertSwipe({
    fromUserId: accountId,
    toUserId: target.accountId,
    fromProfileId: me.id,
    toProfileId: target.id,
    decision: "REJECT",
  });

  const pairKey = makePairKey(accountId, target.accountId);
  const existing = await client.models.Match.list({
    filter: { pairKey: { eq: pairKey } } as any,
    limit: 1,
  });

  const prev = existing.data?.[0];
  if (prev?.isActive) {
    await client.models.Match.update({
      id: prev.id,
      isActive: false,
      unmatchedByUserId: accountId,
    } as any);
  }
}

export async function undoRejectProfile(targetProfileId: string) {
  const { accountId } = await getCurrentAccount();
  const target = await getProfileById(targetProfileId);
  if (!target?.accountId) throw new Error("Profile unavailable");

  const res = await client.models.Swipe.list({
    filter: {
      and: [
        { fromUserId: { eq: accountId } },
        { toUserId: { eq: target.accountId } },
        { decision: { eq: "REJECT" } },
      ],
    } as any,
    limit: 1,
  });

  const swipe = (res.data ?? []).filter(Boolean)[0];
  if (!swipe?.id) return false;

  const deleted = await client.models.Swipe.delete({ id: swipe.id } as any);
  if (deleted.errors?.length) {
    throw new Error(deleted.errors.map((e: AnyObj) => e.message).join(", "));
  }
  return true;
}

export function getVerificationBadge(profile: AnyObj) {
  const idDone = Boolean(profile?.idVerified);
  const selfieDone = Boolean(profile?.selfieVerified);

  if (idDone && selfieDone) {
    return { type: "BLUE", label: "Verified", missing: null };
  }

  if (idDone || selfieDone) {
    return {
      type: "GREEN",
      label: "Partially Verified",
      missing: idDone ? "Selfie" : "ID",
    };
  }

  return { type: "NONE", label: "Not verified", missing: "ID + Selfie" };
}

function ageFromDob(dob?: string | null) {
  if (!dob) return null;
  const date = new Date(dob);
  if (Number.isNaN(date.getTime())) return null;

  const now = new Date();
  let age = now.getFullYear() - date.getFullYear();
  const m = now.getMonth() - date.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < date.getDate())) age -= 1;
  return age;
}

function parseNumber(input: unknown) {
  if (typeof input === "number" && Number.isFinite(input)) return input;
  if (typeof input !== "string") return null;
  const cleaned = input.replace(/[^\d.]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function parseHeightCm(profile: AnyObj) {
  return parseNumber(profile.heightCm ?? profile.height ?? null);
}

function norm(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function includesText(value: unknown, query: string) {
  if (!query) return true;
  return norm(value).includes(query);
}

function isWithinRadiusBand(me: AnyObj, candidate: AnyObj, radiusKm?: number) {
  if (!radiusKm || radiusKm <= 0) return true;
  const meCountry = norm(me.country);
  const meState = norm(me.state);
  const meCity = norm(me.city);
  const otherCountry = norm(candidate.country);
  const otherState = norm(candidate.state);
  const otherCity = norm(candidate.city);

  const sameCity = meCity && otherCity && meCity === otherCity && meState === otherState && meCountry === otherCountry;
  const sameState = meState && otherState && meState === otherState && meCountry === otherCountry;
  const sameCountry = meCountry && otherCountry && meCountry === otherCountry;

  if (radiusKm <= 50) return Boolean(sameCity);
  if (radiusKm <= 250) return Boolean(sameCity || sameState);
  if (radiusKm <= 2000) return Boolean(sameCity || sameState || sameCountry);
  return true;
}

function locationTier(me: AnyObj, candidate: AnyObj) {
  const meCountry = norm(me.country);
  const meState = norm(me.state);
  const meCity = norm(me.city);
  const otherCountry = norm(candidate.country);
  const otherState = norm(candidate.state);
  const otherCity = norm(candidate.city);

  if (meCity && meState && meCountry && meCity === otherCity && meState === otherState && meCountry === otherCountry) {
    return 0;
  }
  if (meState && meCountry && meState === otherState && meCountry === otherCountry) {
    return 1;
  }
  if (meCountry && meCountry === otherCountry) {
    return 2;
  }
  return 3;
}

function ageSortDistance(age: number | null, min?: number, max?: number) {
  if (!age) return 999;
  if (typeof min === "number" && age < min) return min - age;
  if (typeof max === "number" && age > max) return age - max;
  return 0;
}

export type FeedFilters = {
  radiusKm?: number;
  locationQuery?: string;
  minAge?: number;
  maxAge?: number;
  minHeightCm?: number;
  maxHeightCm?: number;
  raisedIn?: string;
  education?: string;
  career?: string;
};

export async function listFeedProfiles(
  filters: FeedFilters = {},
  opts: { ignoreFilters?: boolean } = {}
) {
  const { accountId } = await getCurrentAccount();
  const me = await getMyProfile();

  if (!me) return [];

  const [mySwipes, all] = await Promise.all([
    client.models.Swipe.list({
      filter: { fromUserId: { eq: accountId } } as any,
      limit: 250,
    }),
    client.models.Profile.list({ limit: 220 }),
  ]);

  const swipeItems = (mySwipes.data ?? []).filter(Boolean) as AnyObj[];
  const swipedUserIds = new Set(swipeItems.map((s: AnyObj) => s.toUserId));
  const ignoreFilters = Boolean(opts.ignoreFilters);
  const locationQuery = norm(filters.locationQuery);
  const raisedIn = norm(filters.raisedIn);
  const education = norm(filters.education);
  const career = norm(filters.career);

  const allProfiles = (all.data ?? []).filter(Boolean) as AnyObj[];

  const items = allProfiles
    .filter((p: AnyObj) => p.accountId && p.accountId !== accountId)
    .filter((p: AnyObj) => !swipedUserIds.has(p.accountId))
    .filter((p: AnyObj) => {
      if (!me.gender || !p.gender) return true;
      if (me.gender === "MALE") return p.gender === "FEMALE";
      if (me.gender === "FEMALE") return p.gender === "MALE";
      return true;
    })
    .filter((p: AnyObj) => {
      if (ignoreFilters) return true;

      const age = ageFromDob(p.dateOfBirth);
      const height = parseHeightCm(p);
      const minAge = typeof filters.minAge === "number" ? filters.minAge : undefined;
      const maxAge = typeof filters.maxAge === "number" ? filters.maxAge : undefined;
      const minHeight = typeof filters.minHeightCm === "number" ? filters.minHeightCm : undefined;
      const maxHeight = typeof filters.maxHeightCm === "number" ? filters.maxHeightCm : undefined;

      if (typeof minAge === "number" && (age === null || age < minAge)) return false;
      if (typeof maxAge === "number" && (age === null || age > maxAge)) return false;
      if (typeof minHeight === "number" && (height === null || height < minHeight)) return false;
      if (typeof maxHeight === "number" && (height === null || height > maxHeight)) return false;
      if (raisedIn && !includesText(p.raisedIn, raisedIn)) return false;
      if (education && !includesText(p.education, education)) return false;
      if (career && !(includesText(p.career, career) || includesText(p.occupation, career))) return false;
      if (locationQuery) {
        const searchable = `${p.city ?? ""} ${p.state ?? ""} ${p.country ?? ""}`.toLowerCase();
        if (!searchable.includes(locationQuery)) return false;
      }
      if (!isWithinRadiusBand(me, p, filters.radiusKm)) return false;
      return true;
    })
    .sort((a: AnyObj, b: AnyObj) => {
      const tierDiff = locationTier(me, a) - locationTier(me, b);
      if (tierDiff !== 0) return tierDiff;

      const ageA = ageFromDob(a.dateOfBirth);
      const ageB = ageFromDob(b.dateOfBirth);
      const ageDiff =
        ageSortDistance(ageA, filters.minAge, filters.maxAge) -
        ageSortDistance(ageB, filters.minAge, filters.maxAge);
      if (ageDiff !== 0) return ageDiff;

      const aVerified = Number(Boolean(a.idVerified && a.selfieVerified));
      const bVerified = Number(Boolean(b.idVerified && b.selfieVerified));
      if (bVerified !== aVerified) return bVerified - aVerified;
      return (b.completionScore ?? 0) - (a.completionScore ?? 0);
    })
    .slice(0, 40);

  const withResolvedImage = await Promise.all(
    items.map(async (p: AnyObj) => {
      let imageUrl: string | null = null;
      const key = Array.isArray(p.photoKeys) ? p.photoKeys[0] : null;
      if (key) {
        imageUrl = (await resolvePhotoUrls([key]))[0] ?? null;
      }

      return {
        ...p,
        _imageUrl: imageUrl,
        _age: ageFromDob(p.dateOfBirth),
      };
    })
  );

  return withResolvedImage;
}

export async function listMyMatches() {
  const { accountId } = await getCurrentAccount();
  const me = await getMyProfile();
  if (!me) return [];

  const [asUserA, asUserB] = await Promise.all([
    client.models.Match.list({
      filter: {
        and: [{ userAId: { eq: accountId } }, { isActive: { eq: true } }],
      } as any,
      limit: 150,
    }),
    client.models.Match.list({
      filter: {
        and: [{ userBId: { eq: accountId } }, { isActive: { eq: true } }],
      } as any,
      limit: 150,
    }),
  ]);

  const mine = [...(asUserA.data ?? []), ...(asUserB.data ?? [])]
    .filter(Boolean)
    .filter((m: AnyObj) => m.isActive && !m.blockedByUserId) as AnyObj[];

  const enriched = await Promise.all(
    mine.map(async (match: AnyObj) => {
      const otherProfileId = match.userAId === accountId ? match.profileBId : match.profileAId;
      const otherUserId = match.userAId === accountId ? match.userBId : match.userAId;
      const other = await getProfileById(otherProfileId);

      let photo: string | null = null;
      const key = other?.photoKeys?.[0];
      if (key) {
        photo = (await resolvePhotoUrls([key]))[0] ?? null;
      }

      const msgRes = await client.models.Message.list({
        filter: { matchId: { eq: match.id } } as any,
        limit: 60,
      });

      const sorted = (msgRes.data ?? []).sort((a: AnyObj, b: AnyObj) => {
        return (a.createdAt ?? "").localeCompare(b.createdAt ?? "");
      });

      const lastMessage = sorted[sorted.length - 1] ?? null;

      const canSeePhone = Boolean(me.sharePhoneWithMatches && other?.sharePhoneWithMatches);

      return {
        ...match,
        otherProfile: other,
        otherUserId,
        photo,
        lastMessage,
        canSeePhone,
      };
    })
  );

  return enriched;
}

export async function listMatchMessages(matchId: string) {
  const res = await client.models.Message.list({
    filter: { matchId: { eq: matchId } } as any,
    limit: 250,
  });

  return (res.data ?? []).sort((a: AnyObj, b: AnyObj) => {
    return (a.createdAt ?? "").localeCompare(b.createdAt ?? "");
  });
}

export async function sendMatchMessage(match: AnyObj, text: string) {
  const content = text.trim();
  if (!content) return;

  const { accountId } = await getCurrentAccount();
  const recipientUserId = match.userAId === accountId ? match.userBId : match.userAId;

  const created = await client.models.Message.create({
    matchId: match.id,
    senderUserId: accountId,
    recipientUserId,
    content,
    isRead: false,
  } as any);

  if (created.errors?.length) {
    throw new Error(created.errors.map((e: AnyObj) => e.message).join(", "));
  }

  return created.data;
}

export async function unmatch(matchId: string) {
  const { accountId } = await getCurrentAccount();
  const updated = await client.models.Match.update({
    id: matchId,
    isActive: false,
    unmatchedByUserId: accountId,
  } as any);

  if (updated.errors?.length) {
    throw new Error(updated.errors.map((e: AnyObj) => e.message).join(", "));
  }

  return updated.data;
}

export async function blockMatch(matchId: string) {
  const { accountId } = await getCurrentAccount();
  const updated = await client.models.Match.update({
    id: matchId,
    isActive: false,
    blockedByUserId: accountId,
  } as any);

  if (updated.errors?.length) {
    throw new Error(updated.errors.map((e: AnyObj) => e.message).join(", "));
  }

  return updated.data;
}
