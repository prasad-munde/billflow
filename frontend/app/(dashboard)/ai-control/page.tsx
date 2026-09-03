"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AIControlRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/ai-operator");
  }, [router]);

  return null;
}
