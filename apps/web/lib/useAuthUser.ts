"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "aws-amplify/auth";

export function useAuthUser() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    getCurrentUser()
      .then(setUser)
      .catch(() => setUser(null));
  }, []);

  return user;
}