"use client";

import { useState, useRef, useEffect } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { BookOpen, Plus, ChevronDown, ChevronUp, Search, Loader2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type BookResult = {
  title: string;
  authors: string[];
  translators: string[];
  publisher: string;
  published_at: string | null;
  thumbnail: string | null;
  isbn: string;
  description: string | null;
  price: number;
};

type ReadBook = {
  id: number;
  title: string;
  author: string;
  cover_url: string | null;
  description: string | null;
  meetings: { id: number; date: string; title: string }[];
};

type Candidate = {
  id: number;
  title: string;
  author: string;
  proposed_by: string;
  notes: string | null;
  status: "pending" | "selected" | "rejected";
  created_at: string;
};

const EMPTY_FORM = { title: "", author: "", proposed_by: "", notes: "" };

export default function BooksView({
  readBooks,
  candidates,
}: {
  readBooks: ReadBook[];
  candidates: Candidate[];
}) {
  const [tab, setTab] = useState<"read" | "candidates">("read");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [list, setList] = useState<Candidate[]>(candidates);
  const [showRejected, setShowRejected] = useState(false);

  // 책 검색
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<BookResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedBook, setSelectedBook] = useState<BookResult | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleSearchChange(q: string) {
    setSearchQuery(q);
    setSelectedBook(null);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!q.trim()) { setSearchResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/search-book?query=${encodeURIComponent(q)}`);
        const data = await res.json();
        setSearchResults(Array.isArray(data) ? data : []);
      } catch { setSearchResults([]); }
      finally { setSearching(false); }
    }, 400);
  }

  function selectBook(book: BookResult) {
    setSelectedBook(book);
    setSearchResults([]);
    setSearchQuery(book.title);
    setForm((p) => ({
      ...p,
      title: book.title,
      author: book.authors.join(", "),
      notes: p.notes, // 추천 이유는 유지
    }));
  }

  function resetModal() {
    setForm(EMPTY_FORM);
    setSearchQuery("");
    setSearchResults([]);
    setSelectedBook(null);
  }

  const pending = list.filter((c) => c.status === "pending");
  const rejected = list.filter((c) => c.status === "rejected");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.author.trim() || !form.proposed_by.trim()) {
      toast.error("제목, 저자, 제안자는 필수입니다.");
      return;
    }
    setSubmitting(true);
    const res = await fetch("/api/candidates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const created = await res.json();
      setList((prev) => [created, ...prev]);
      resetModal();
      setModalOpen(false);
      setTab("candidates");
      toast.success("책이 제안되었습니다!");
    } else {
      const { error } = await res.json();
      toast.error(error ?? "오류가 발생했습니다.");
    }
    setSubmitting(false);
  }

  return (
    <>
      {/* Tab bar + 제안하기 버튼 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-1 bg-neutral-100 rounded-lg p-1">
          <TabBtn active={tab === "read"} onClick={() => setTab("read")}>
            읽은 책 <span className="ml-1 text-[10px] opacity-60">{readBooks.length}</span>
          </TabBtn>
          <TabBtn active={tab === "candidates"} onClick={() => setTab("candidates")}>
            후보 도서 <span className="ml-1 text-[10px] opacity-60">{pending.length}</span>
          </TabBtn>
        </div>
        {tab === "candidates" && (
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1C1A17] text-white text-xs font-semibold rounded-lg hover:bg-[#8B3A2A] transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            책 제안하기
          </button>
        )}
      </div>

      {/* ── Tab: 읽은 책 ── */}
      {tab === "read" && (
        <div>
          {readBooks.length === 0 ? (
            <EmptyState text="아직 읽은 책이 없습니다." />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {readBooks.map((book) => {
                const lastMeeting = book.meetings.sort((a, b) => b.date.localeCompare(a.date))[0];
                return (
                  <div key={book.id} className="group">
                    <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-[#E8DDD0] shadow-sm mb-2">
                      {book.cover_url ? (
                        <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <BookOpen className="w-8 h-8 text-[#B8A898]" />
                        </div>
                      )}
                      {lastMeeting && (
                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                          <p className="text-white text-[10px] font-medium leading-snug">{lastMeeting.title}</p>
                          <p className="text-white/70 text-[9px]">
                            {format(new Date(lastMeeting.date + "T00:00:00"), "yyyy.M.d", { locale: ko })}
                          </p>
                        </div>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-[#1C1A17] leading-snug line-clamp-2">{book.title}</p>
                    <p className="text-xs text-neutral-400 mt-0.5">{book.author}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: 후보 도서 ── */}
      {tab === "candidates" && (
        <div className="space-y-6">
          {/* Pending */}
          <div>
            {pending.length === 0 ? (
              <EmptyState text="제안된 후보 도서가 없습니다. 첫 번째로 제안해보세요!" />
            ) : (
              <div className="space-y-2">
                {pending.map((c) => <CandidateRow key={c.id} candidate={c} />)}
              </div>
            )}
          </div>

          {/* Rejected (collapsed) */}
          {rejected.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setShowRejected((p) => !p)}
                className="flex items-center gap-2 text-xs text-neutral-400 hover:text-neutral-600 cursor-pointer mb-3"
              >
                {showRejected ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                선정되지 않은 책 ({rejected.length})
              </button>
              {showRejected && (
                <div className="space-y-2 opacity-50">
                  {rejected.map((c) => <CandidateRow key={c.id} candidate={c} />)}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── 제안 모달 ── */}
      <Dialog open={modalOpen} onOpenChange={(o) => { setModalOpen(o); if (!o) resetModal(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">책 제안하기</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">

            {/* 책 검색 */}
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <Search className="w-3 h-3" /> 책 검색
              </Label>
              <div className="relative">
                <Input
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="제목 또는 저자로 검색..."
                  className="pr-8"
                  autoComplete="off"
                />
                {searching && (
                  <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-neutral-400" />
                )}
                {searchQuery && !searching && (
                  <button type="button" onClick={() => { setSearchQuery(""); setSearchResults([]); setSelectedBook(null); }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 cursor-pointer">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* 검색 결과 드롭다운 */}
              {searchResults.length > 0 && (
                <div className="border border-neutral-200 rounded-xl overflow-hidden shadow-lg bg-white max-h-72 overflow-y-auto">
                  {searchResults.map((book, i) => (
                    <button
                      key={`${book.isbn}-${i}`}
                      type="button"
                      onClick={() => selectBook(book)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-neutral-50 text-left cursor-pointer border-b border-neutral-100 last:border-b-0 transition-colors"
                    >
                      {book.thumbnail ? (
                        <img src={book.thumbnail} alt={book.title} className="w-8 h-11 object-cover rounded flex-shrink-0" />
                      ) : (
                        <div className="w-8 h-11 rounded bg-[#E8DDD0] flex-shrink-0 flex items-center justify-center">
                          <BookOpen className="w-3.5 h-3.5 text-[#B8A898]" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-[#1C1A17] leading-snug truncate">{book.title}</p>
                        <p className="text-xs text-neutral-400 truncate">{book.authors.join(", ")} · {book.publisher}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* 선택된 책 미리보기 */}
              {selectedBook && (
                <div className="flex items-center gap-3 p-2.5 bg-[#F8F5F0] rounded-lg border border-[#E8DDD0]">
                  {selectedBook.thumbnail && (
                    <img src={selectedBook.thumbnail} alt={selectedBook.title} className="w-8 h-11 object-cover rounded flex-shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#1C1A17] truncate">{selectedBook.title}</p>
                    <p className="text-[10px] text-neutral-400">{selectedBook.authors.join(", ")} · {selectedBook.publisher}</p>
                    {selectedBook.published_at && (
                      <p className="text-[10px] text-neutral-400">{selectedBook.published_at.slice(0, 7)} 출판</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="h-px bg-neutral-100" />

            {/* 제목·저자 (자동입력 or 수동) */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">책 제목 *</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="책 제목"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">저자 *</Label>
                <Input
                  value={form.author}
                  onChange={(e) => setForm((p) => ({ ...p, author: e.target.value }))}
                  placeholder="저자"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">제안자 이름 *</Label>
              <Input
                value={form.proposed_by}
                onChange={(e) => setForm((p) => ({ ...p, proposed_by: e.target.value }))}
                placeholder="이름"
                maxLength={20}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">추천 이유 (선택)</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder="이 책을 추천하는 이유를 간단히 써주세요."
                rows={3}
                className="resize-none text-sm"
              />
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)} className="cursor-pointer">취소</Button>
              <Button type="submit" disabled={submitting} className="cursor-pointer">
                {submitting ? "등록 중..." : "제안하기"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 rounded-md text-sm font-medium transition-all cursor-pointer",
        active ? "bg-white text-[#1C1A17] shadow-sm" : "text-neutral-500 hover:text-neutral-700"
      )}
    >
      {children}
    </button>
  );
}

function CandidateRow({ candidate: c }: { candidate: Candidate }) {
  return (
    <div className="flex items-start gap-4 p-4 bg-white rounded-xl border border-neutral-100">
      <div className="w-9 h-12 rounded-md bg-[#E8DDD0] flex-shrink-0 flex items-center justify-center">
        <BookOpen className="w-4 h-4 text-[#B8A898]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-[#1C1A17] leading-snug">{c.title}</p>
        <p className="text-xs text-neutral-400 mt-0.5">{c.author}</p>
        {c.notes && <p className="text-xs text-neutral-500 mt-1.5 leading-relaxed">{c.notes}</p>}
        <p className="text-[10px] text-neutral-300 mt-1.5">
          {c.proposed_by} · {format(new Date(c.created_at), "M월 d일", { locale: ko })}
        </p>
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="py-16 text-center text-sm text-neutral-400">{text}</div>
  );
}
