"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getMyProfile } from "@/lib/matrimony";
import { calculateCompletion } from "@/lib/profileCompletion";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const profile = await getMyProfile();
        if (!profile) {
          router.push("/complete-profile");
          return;
        }

        const completion = calculateCompletion(profile);
        if (completion < 75) {
          router.push("/complete-profile");
        }
      } catch {
        router.push("/login");
      }
    })();
  }, [router]);

  return <>{children}</>;
}
