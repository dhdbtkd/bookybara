"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { BookOpen, CalendarDays, MapPin, ChevronLeft, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

const ReviewEditor = dynamic(() => import("./_review-editor"), { ssr: false });

type Book = { id: number; title: string; author: string; cover_url: string | null; cover_url_hires: string | null };
type Attendee = { id: number; name: string };
type MeetingItem = {
  id: number; title: string; date: string; location: string | null;
  books: Book[];
  attendees: Attendee[];
};

// ── Meeting dropdown selector ──
function MeetingSelector({ meetings, selectedId, onChange, compact }: {
  meetings: MeetingItem[];
  selectedId: string;
  onChange: (id: string) => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = meetings.find((m) => String(m.id) === selectedId);
  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-1.5 cursor-pointer transition-colors",
          compact
            ? "text-xs text-neutral-400 hover:text-neutral-600"
            : "w-full text-left px-3 py-2.5 rounded-xl border border-neutral-200 bg-white hover:border-neutral-300 text-sm"
        )}
      >
        <CalendarDays className={cn("flex-shrink-0", compact ? "w-3 h-3" : "w-4 h-4 text-neutral-400")} />
        <span className={cn("truncate", !compact && "flex-1")}>
          {selected
            ? `${format(new Date(selected.date + "T00:00:00"), "M월 d일 (EEE)", { locale: ko })} · ${selected.title}`
            : "모임 선택"}
        </span>
        <ChevronDown className={cn("flex-shrink-0", compact ? "w-3 h-3" : "w-4 h-4 text-neutral-400")} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className={cn(
            "absolute z-50 mt-1 bg-white border border-neutral-200 rounded-xl shadow-lg overflow-y-auto min-w-[240px] max-h-64",
            compact ? "left-0" : "w-full"
          )}>
            {meetings.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => { onChange(String(m.id)); setOpen(false); }}
                className={cn(
                  "w-full text-left px-4 py-2.5 text-sm hover:bg-[#F8F5F0] transition-colors cursor-pointer flex items-center gap-2",
                  String(m.id) === selectedId && "bg-[#F8F5F0]"
                )}
              >
                <span className={cn("text-[10px] font-bold tracking-wide flex-shrink-0", m.date >= today ? "text-[#C8956C]" : "text-neutral-300")}>
                  {m.date >= today ? "예정" : "완료"}
                </span>
                <span className={cn("truncate", String(m.id) === selectedId && "font-medium text-[#1C1A17]")}>
                  {format(new Date(m.date + "T00:00:00"), "M/d", { locale: ko })} {m.title}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Author picker ──
function AuthorPicker({
  attendees, submittedNames, authorName, customName, loading, onSelect, onCustom, onBackToList,
}: {
  attendees: Attendee[];
  submittedNames: Set<string>;
  authorName: string;
  customName: boolean;
  loading: boolean;
  onSelect: (name: string) => void;
  onCustom: () => void;
  onBackToList: () => void;
}) {
  if (loading) {
    return (
      <div className="flex flex-wrap gap-2">
        {[80, 60, 72, 56].map((w) => (
          <Skeleton key={w} width={w} height={32} borderRadius={9999} />
        ))}
      </div>
    );
  }

  const available = attendees.filter((a) => !submittedNames.has(a.name));

  if (attendees.length > 0 && !customName) {
    return (
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {available.map((a) => (
            <button key={a.id} type="button" onClick={() => onSelect(a.name)}
              className={cn(
                "px-3 py-1.5 rounded-full text-sm font-medium border transition-all cursor-pointer",
                authorName === a.name
                  ? "bg-[#1C1A17] text-white border-[#1C1A17]"
                  : "bg-white text-neutral-400 border-neutral-200 hover:border-neutral-400 hover:text-neutral-600"
              )}>
              {a.name}
            </button>
          ))}
          {available.length === 0 && <p className="text-sm text-neutral-400">참석자 전원이 이미 독후감을 제출했습니다.</p>}
        </div>
        <button type="button" onClick={onCustom} className="text-xs text-neutral-400 hover:text-neutral-600 underline underline-offset-2 cursor-pointer">
          목록에 없어요 (직접 입력)
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <Input value={authorName} onChange={(e) => onSelect(e.target.value)} placeholder="이름 입력" maxLength={20} autoFocus={customName} className="focus-visible:ring-neutral-900" />
      {attendees.length > 0 && (
        <button type="button" onClick={onBackToList} className="text-xs text-neutral-400 hover:text-neutral-600 underline underline-offset-2 cursor-pointer">
          참석자 목록에서 선택
        </button>
      )}
    </div>
  );
}

function NewReviewForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initMeetingId = searchParams.get("meetingId");

  const [meetings, setMeetings] = useState<MeetingItem[]>([]);
  const [selectedMeetingId, setSelectedMeetingId] = useState("");
  const [submittedNames, setSubmittedNames] = useState<Set<string>>(new Set());
  const [allBooks, setAllBooks] = useState<Book[]>([]);
  const [selectedBookId, setSelectedBookId] = useState("");
  const [step, setStep] = useState<"book" | "write">("write");
  const [authorName, setAuthorName] = useState("");
  const [customName, setCustomName] = useState(false);
  const [content, setContent] = useState("");
  const [charCount, setCharCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingAttendees, setLoadingAttendees] = useState(false);

  // Initial load: all meetings + all books (fallback)
  useEffect(() => {
    Promise.all([
      fetch("/api/meetings").then((r) => r.json()),
      fetch("/api/books").then((r) => r.json()),
    ]).then(([ms, bs]: [MeetingItem[], Book[]]) => {
      // Sort: upcoming ascending, then past descending
      const today = new Date().toISOString().split("T")[0];
      const upcoming = ms.filter((m) => m.date >= today).sort((a, b) => a.date.localeCompare(b.date));
      const past = ms.filter((m) => m.date < today).sort((a, b) => b.date.localeCompare(a.date));
      const sorted = [...upcoming, ...past];
      setMeetings(sorted);
      setAllBooks(bs);

      // Auto-select meeting
      let initId = initMeetingId ?? (upcoming[0] ? String(upcoming[0].id) : past[0] ? String(past[0].id) : "");
      setSelectedMeetingId(initId);
      setLoading(false);
    });
  }, [initMeetingId]);

  // When selected meeting changes → load reviews + auto-select book
  useEffect(() => {
    if (!selectedMeetingId || meetings.length === 0) return;

    const m = meetings.find((x) => String(x.id) === selectedMeetingId);
    setAuthorName("");
    setCustomName(false);
    setLoadingAttendees(true);

    if (m?.books && m.books.length > 0) {
      setSelectedBookId(String(m.books[0].id));
      setStep(m.books.length === 1 ? "write" : "book");
    } else {
      setSelectedBookId("");
      setStep("book");
    }

    fetch(`/api/meetings/${selectedMeetingId}`)
      .then((r) => r.json())
      .then(({ reviews }) => {
        setSubmittedNames(new Set((reviews ?? []).map((r: { author_name: string }) => r.author_name)));
        setLoadingAttendees(false);
      });
  }, [selectedMeetingId, meetings]);

  const handleEditorChange = useCallback((text: string) => {
    setContent(text);
    setCharCount(text.length);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!authorName.trim()) { toast.error("작성자를 선택해주세요."); return; }
    if (!selectedBookId) { toast.error("책을 선택해주세요."); return; }
    if (!content.trim()) { toast.error("독후감 내용을 입력해주세요."); return; }

    setSubmitting(true);
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        book_id: Number(selectedBookId),
        meeting_id: selectedMeetingId ? Number(selectedMeetingId) : null,
        author_name: authorName.trim(),
        content,
      }),
    });

    if (res.ok) {
      toast.success("독후감이 등록되었습니다!");
      router.push(selectedMeetingId ? `/meetings/${selectedMeetingId}` : "/reviews");
    } else {
      const { error } = await res.json();
      toast.error(error ?? "오류가 발생했습니다.");
      setSubmitting(false);
    }
  }

  if (loading) return <div className="pt-10 text-center text-sm text-neutral-400">불러오는 중...</div>;

  const selectedMeeting = meetings.find((m) => String(m.id) === selectedMeetingId) ?? null;
  // Books available for this meeting: meeting's book if set, else all books
  const meetingBooks: Book[] = selectedMeeting?.books ?? [];
  const booksForPicker = meetingBooks.length > 0 ? meetingBooks : allBooks;
  const selectedBook = booksForPicker.find((b) => String(b.id) === selectedBookId) ?? null;
  const attendees = selectedMeeting?.attendees ?? [];

  // ── Step: book selection ──
  if (step === "book") {
    return (
      <div className="w-full flex flex-col flex-1 min-h-0 gap-5">
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={() => router.back()} className="p-1 text-neutral-400 hover:text-neutral-700 cursor-pointer transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <p className="text-xs text-neutral-400 uppercase tracking-widest font-semibold">독후감 쓰기</p>
        </div>

        {/* 모임 선택 */}
        <div className="flex-shrink-0 space-y-1.5">
          <p className="text-xs font-semibold text-neutral-400 uppercase tracking-widest">모임</p>
          <MeetingSelector meetings={meetings} selectedId={selectedMeetingId} onChange={setSelectedMeetingId} />
        </div>

        <div className="flex-shrink-0">
          <h1 className="text-xl font-bold text-[#1C1A17]">어떤 책을 읽으셨나요?</h1>
        </div>

        {booksForPicker.length === 0 ? (
          <p className="text-sm text-neutral-400">이 모임에 지정된 책이 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {booksForPicker.map((b) => (
              <button key={b.id} type="button" onClick={() => { setSelectedBookId(String(b.id)); setStep("write"); }} className="w-full text-left cursor-pointer">
                <div className="flex items-center gap-4 p-4 rounded-xl border-2 border-neutral-100 bg-white hover:border-neutral-300 hover:shadow-sm transition-all">
                  {b.cover_url_hires ?? b.cover_url ? (
                    <img src={b.cover_url_hires ?? b.cover_url!} alt={b.title} className="w-14 h-20 object-cover rounded-md shadow-sm flex-shrink-0" />
                  ) : (
                    <div className="w-14 h-20 rounded-md bg-neutral-100 flex-shrink-0 flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-neutral-300" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-base leading-snug">{b.title}</p>
                    <p className="text-sm text-neutral-400 mt-0.5">{b.author}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Step: write ──
  return (
    <div className="w-full flex flex-col gap-4">
      <div className="flex items-center gap-2 flex-shrink-0">
        <button onClick={() => router.back()} className="p-1 text-neutral-400 hover:text-neutral-700 cursor-pointer transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <p className="text-xs text-neutral-400 uppercase tracking-widest font-semibold">독후감 쓰기</p>
      </div>

      {/* 컨텍스트 카드: 책 + 모임 (둘 다 변경 가능) */}
      <div className="bg-[#F8F5F0] rounded-2xl p-3 sm:p-4 flex gap-3 sm:gap-4 items-start flex-shrink-0">
        {selectedBook?.cover_url_hires ?? selectedBook?.cover_url ? (
          <img src={selectedBook.cover_url_hires ?? selectedBook.cover_url!} alt={selectedBook.title} className="w-10 h-14 sm:w-12 sm:h-[68px] object-cover rounded-md shadow flex-shrink-0" />
        ) : (
          <div className="w-10 h-14 sm:w-12 sm:h-[68px] rounded-md bg-[#E8DDD0] flex-shrink-0 flex items-center justify-center">
            <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-[#C8BEB4]" />
          </div>
        )}
        <div className="flex-1 min-w-0 space-y-1.5">
          {/* 책 (2권 이상이거나 미지정이면 변경 가능) */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              {selectedBook ? (
                <>
                  <p className="font-semibold text-[#1C1A17] leading-snug truncate">{selectedBook.title}</p>
                  <p className="text-xs text-neutral-500">{selectedBook.author}</p>
                </>
              ) : (
                <button type="button" onClick={() => setStep("book")} className="text-sm text-[#8B3A2A] hover:underline cursor-pointer">책 선택하기 →</button>
              )}
            </div>
            {(booksForPicker.length > 1 || !selectedBook) && (
              <button type="button" onClick={() => setStep("book")} className="text-xs text-neutral-400 hover:text-neutral-600 flex-shrink-0 underline underline-offset-2 cursor-pointer pt-0.5">
                변경
              </button>
            )}
          </div>

          {/* 모임 (드롭다운으로 변경 가능) */}
          <MeetingSelector meetings={meetings} selectedId={selectedMeetingId} onChange={setSelectedMeetingId} compact />

          {selectedMeeting?.location && (
            <span className="flex items-center gap-1 text-xs text-neutral-400">
              <MapPin className="w-3 h-3" />
              {selectedMeeting.location}
            </span>
          )}
        </div>
      </div>

      <form id="review-form" onSubmit={handleSubmit} className="flex flex-col gap-4 pb-24">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-neutral-700">작성자</label>
          <AuthorPicker
            attendees={attendees}
            submittedNames={submittedNames}
            authorName={authorName}
            customName={customName}
            loading={loadingAttendees}
            onSelect={setAuthorName}
            onCustom={() => { setAuthorName(""); setCustomName(true); }}
            onBackToList={() => { setAuthorName(""); setCustomName(false); }}
          />
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-neutral-700">독후감</label>
            <span className="text-xs text-neutral-400">{charCount.toLocaleString()}자</span>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white min-h-[50dvh]">
            <ReviewEditor onChange={handleEditorChange} />
          </div>
          <p className="text-xs text-neutral-400 hidden sm:block">책을 읽고 느낀 점, 인상적인 구절, 생각 등을 자유롭게 써주세요.</p>
        </div>
      </form>

      {/* 플로팅 버튼 바 */}
      <div className="fixed bottom-6 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none" style={{ bottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}>
        <div className="flex items-center gap-2 bg-white/80 backdrop-blur-md border border-white/60 shadow-xl shadow-black/10 rounded-2xl px-2 py-2 pointer-events-auto">
          <Button type="button" variant="ghost" onClick={() => router.back()} className="cursor-pointer rounded-xl text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 px-5">
            취소
          </Button>
          <Button
            type="submit"
            form="review-form"
            disabled={submitting || !authorName || !content.trim() || !selectedBookId}
            className="cursor-pointer rounded-xl px-6 bg-[#1C1A17] hover:bg-[#8B3A2A] transition-colors shadow-none"
          >
            {submitting ? "등록 중..." : "등록하기"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function NewReviewPage() {
  return (
    <Suspense>
      <NewReviewForm />
    </Suspense>
  );
}
