"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

type Candidate = {
  id: number;
  title: string;
  author: string;
  proposed_by: string;
  notes: string | null;
  status: "pending" | "selected" | "rejected";
  created_at: string;
};

const STATUS_LABEL = { pending: "대기", selected: "선정", rejected: "탈락" } as const;
const STATUS_VARIANT = { pending: "secondary", selected: "default", rejected: "outline" } as const;

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [form, setForm] = useState({ title: "", author: "", proposed_by: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    const res = await fetch("/api/candidates");
    setCandidates(await res.json());
  }

  useEffect(() => { load(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const res = await fetch("/api/candidates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      toast.success("도서 후보가 등록되었습니다!");
      setForm({ title: "", author: "", proposed_by: "", notes: "" });
      setShowForm(false);
      load();
    } else {
      const { error } = await res.json();
      toast.error(error);
    }
    setSubmitting(false);
  }

  const pending = candidates.filter((c) => c.status === "pending");
  const selected = candidates.filter((c) => c.status === "selected");
  const rejected = candidates.filter((c) => c.status === "rejected");

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">도서 후보</h1>
          <p className="text-sm text-neutral-400 mt-1">다음에 읽고 싶은 책을 제안해보세요</p>
        </div>
        <Button onClick={() => setShowForm((p) => !p)} variant={showForm ? "outline" : "default"}>
          {showForm ? "취소" : "책 제안하기"}
        </Button>
      </div>

      {/* 제안 폼 */}
      {showForm && (
        <Card>
          <CardContent className="p-5">
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>책 제목 *</Label>
                  <Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="책 제목" />
                </div>
                <div className="space-y-1">
                  <Label>저자 *</Label>
                  <Input value={form.author} onChange={(e) => setForm((p) => ({ ...p, author: e.target.value }))} placeholder="저자" />
                </div>
              </div>
              <div className="space-y-1">
                <Label>제안자 이름 *</Label>
                <Input value={form.proposed_by} onChange={(e) => setForm((p) => ({ ...p, proposed_by: e.target.value }))} placeholder="이름" maxLength={20} />
              </div>
              <div className="space-y-1">
                <Label>추천 이유 (선택)</Label>
                <Textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} placeholder="이 책을 추천하는 이유..." rows={3} className="resize-none" />
              </div>
              <Button type="submit" disabled={submitting}>{submitting ? "등록 중..." : "제안하기"}</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* 대기 */}
      <CandidateSection title="제안된 책" candidates={pending} />

      {/* 선정 */}
      {selected.length > 0 && <CandidateSection title="선정된 책" candidates={selected} />}

      {/* 탈락 */}
      {rejected.length > 0 && <CandidateSection title="탈락된 책" candidates={rejected} muted />}
    </div>
  );
}

function CandidateSection({ title, candidates, muted }: { title: string; candidates: Candidate[]; muted?: boolean }) {
  return (
    <section>
      <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-3">{title} ({candidates.length})</h2>
      {candidates.length === 0 ? (
        <Card>
          <CardContent className="p-5 text-sm text-neutral-400">없습니다.</CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {candidates.map((c) => (
            <Card key={c.id} className={muted ? "opacity-60" : ""}>
              <CardContent className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={STATUS_VARIANT[c.status]} className="text-xs">{STATUS_LABEL[c.status]}</Badge>
                      <span className="font-medium text-sm">{c.title}</span>
                      <span className="text-neutral-400 text-xs">{c.author}</span>
                    </div>
                    <p className="text-xs text-neutral-400">제안: {c.proposed_by}</p>
                    {c.notes && <p className="text-sm text-neutral-500 mt-1">{c.notes}</p>}
                  </div>
                  <span className="text-xs text-neutral-400 flex-shrink-0">
                    {format(new Date(c.created_at), "M/d", { locale: ko })}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
