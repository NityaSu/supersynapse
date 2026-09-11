"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

function initialsFrom(email: string) {
  const local = email.split("@")[0] ?? "U";
  return local.slice(0, 2).toUpperCase();
}

export function UserMenu() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    if (!supabase) return;
    void supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
    });
  }, []);

  async function signOut() {
    const supabase = createBrowserSupabaseClient();
    if (supabase) await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2.5 rounded-[10px] border border-line bg-canvas p-2.5">
      <Avatar size="sm" initials={email ? initialsFrom(email) : "SS"} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-semibold">
          {email ?? "Signed in"}
        </div>
        <button
          type="button"
          className="cursor-pointer border-0 bg-transparent p-0 text-[11px] text-ink-muted hover:text-ink"
          onClick={() => void signOut()}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
