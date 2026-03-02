"use client";

import { useEffect, useState } from "react";
import { getMyProfile } from "@/lib/matrimony";

export function useProfile() {
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    getMyProfile().then(setProfile).catch(() => setProfile(null));
  }, []);

  return profile;
}
