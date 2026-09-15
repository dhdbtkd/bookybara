"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const ERRORS: Record<string, string> = {
  missing_code: "구글 로그인이 중간에 끊겼습니다. 다시 시도해주세요.",
  exchange_failed: "구글 로그인 세션을 만들지 못했습니다. 다시 시도해주세요.",
};

export default function AdminLogin({ signedInAs }: { signedInAs?: string | null }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const error = searchParams.get("error");

  async function handleGoogle() {
    setGoogleLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/admin` },
    });
    if (error) {
      toast.error("구글 로그인을 시작하지 못했습니다.");
      setGoogleLoading(false);
    }
  }

  async function handleSignOut() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.refresh();
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      router.refresh();
    } else {
      const { error } = await res.json().catch(() => ({ error: null }));
      toast.error(error ?? "로그인에 실패했습니다.");
      setLoading(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto mt-16">
      <Card>
        <CardHeader>
          <CardTitle>관리자 로그인</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <p className="text-xs text-brick bg-brick/10 border border-brick/20 rounded-lg px-3 py-2">
              {ERRORS[error] ?? "로그인 중 문제가 생겼습니다."}
            </p>
          )}

          {/* 관리자 목록에 없는 계정으로 들어온 경우 — 왜 막혔는지 알려준다 */}
          {signedInAs && (
            <div className="text-xs text-stone-700 bg-parchment border border-sand rounded-lg px-3 py-2 space-y-2">
              <p>
                <span className="font-semibold text-ink">{signedInAs}</span> 으로 로그인했지만
                관리자 계정이 아닙니다.
              </p>
              <button onClick={handleSignOut} className="underline underline-offset-2 cursor-pointer tap">
                다른 계정으로 로그인
              </button>
            </div>
          )}

          <Button
            type="button"
            variant="outline"
            onClick={handleGoogle}
            disabled={googleLoading}
            className="w-full h-11 gap-2 cursor-pointer tap"
          >
            <GoogleMark />
            {googleLoading ? "구글로 이동 중..." : "구글로 로그인"}
          </Button>

          {showPassword ? (
            <form onSubmit={handleLogin} className="space-y-3 pt-1">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs text-stone-700">비밀번호</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호 입력"
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full cursor-pointer tap" disabled={loading}>
                {loading ? "확인 중..." : "비밀번호로 로그인"}
              </Button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setShowPassword(true)}
              className="w-full text-center text-xs text-stone-600 hover:text-ink cursor-pointer tap"
            >
              비밀번호로 로그인
            </button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden>
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.7v3h3.9c2.3-2.1 3.5-5.2 3.5-8.9z" />
      <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.1-4 1.1-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.4 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.4a12 12 0 0 0 0 10.8l4-3.1z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.5 1.8l3.4-3.4A12 12 0 0 0 1.4 6.6l4 3.1C6.3 6.9 8.9 4.8 12 4.8z" />
    </svg>
  );
}
