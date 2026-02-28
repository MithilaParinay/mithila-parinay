import { type ClientSchema, a, defineData } from "@aws-amplify/backend";

const schema = a.schema({
  Profile: a
    .model({
      accountId: a.string().required(),
      email: a.string().required(),
      firstName: a.string(),
      lastName: a.string(),
      fullName: a.string().required(),
      phone: a.string().required(),
      phoneNormalized: a.string().required(),
      dateOfBirth: a.date(),
      gender: a.enum(["MALE", "FEMALE", "OTHER"]),

      country: a.string().required(),
      state: a.string(),
      city: a.string(),
      zipcode: a.string(),
      raisedIn: a.string(),
      visaStatus: a.string(),

      salary: a.string(),
      career: a.string(),
      education: a.string(),
      heightCm: a.integer(),
      occupation: a.string(),
      about: a.string(),
      lookingFor: a.string(),
      profileManagedBy: a.enum(["Myself", "Brother", "Sister", "Parents", "Guardian", "Others"]),

      fatherName: a.string(),
      motherName: a.string(),
      siblings: a.string(),
      siblingsOccupation: a.string(),
      siblingsDetails: a.string(),
      fatherOccupation: a.string(),
      motherOccupation: a.string(),
      gotra: a.string(),
      grandfatherName: a.string(),
      grandmotherName: a.string(),

      promptOneQuestion: a.string(),
      promptOneAnswer: a.string(),
      promptTwoQuestion: a.string(),
      promptTwoAnswer: a.string(),
      promptThreeQuestion: a.string(),
      promptThreeAnswer: a.string(),

      identityFingerprint: a.string(),

      photoKeys: a.string().array(),
      primaryPhotoKey: a.string(),

      completionScore: a.integer().default(0),
      sharePhoneWithMatches: a.boolean().default(false),

      idVerified: a.boolean().default(false),
      selfieVerified: a.boolean().default(false),
      isVerified: a.boolean().default(false),
    })
    .authorization((allow) => [allow.owner(), allow.authenticated().to(["read"])]),

  VerificationRequest: a
    .model({
      profileId: a.string().required(),
      createdByUserId: a.string().required(),

      country: a.string(),
      isOutsideIndia: a.boolean(),

      status: a.enum([
        "DRAFT",
        "SUBMITTED",
        "IN_REVIEW",
        "APPROVED",
        "REJECTED",
        "NEEDS_MORE_INFO",
      ]),

      idType: a.enum(["DL", "PAN", "VOTER_ID", "PASSPORT", "AADHAR"]),
      idNumber: a.string(),

      selfieCheckStatus: a.enum(["PENDING", "PASS", "FAIL"]),
      selfieCheckReason: a.string(),

      visaDocKey: a.string(),
      idFrontKey: a.string(),
      idBackKey: a.string(),
      selfieKey: a.string(),
      payStubKey: a.string(),
      offerLetterKey: a.string(),

      reviewNotes: a.string(),
    })
    .authorization((allow) => [
      allow.owner(),
      allow.groups(["ADMIN"]).to(["read", "update"]),
    ]),

  Swipe: a
    .model({
      fromUserId: a.string().required(),
      toUserId: a.string().required(),
      fromProfileId: a.string().required(),
      toProfileId: a.string().required(),
      decision: a.enum(["LIKE", "REJECT"]),
    })
    .authorization((allow) => [allow.owner(), allow.authenticated().to(["read"])]),

  Match: a
    .model({
      pairKey: a.string().required(),
      userAId: a.string().required(),
      userBId: a.string().required(),
      profileAId: a.string().required(),
      profileBId: a.string().required(),
      isActive: a.boolean().default(true),
      blockedByUserId: a.string(),
      unmatchedByUserId: a.string(),
    })
    .authorization((allow) => [
      allow.owner(),
      allow.authenticated().to(["read", "update"]),
    ]),

  Message: a
    .model({
      matchId: a.string().required(),
      senderUserId: a.string().required(),
      recipientUserId: a.string().required(),
      content: a.string().required(),
      isRead: a.boolean().default(false),
    })
    .authorization((allow) => [allow.owner(), allow.authenticated().to(["read"])]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "userPool",
  },
});
