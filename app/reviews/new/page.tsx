"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { BookOpen, CalendarDays, MapPin, ChevronLeft } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

const ReviewEditor = dynamic(() => import("./_review-editor"), { ssr: false });

type Book = { id: number; title: string; author: string; cover_url: string | null };
type Attendee = { id: number; name: string };
type Review = { author_name: string };
type MeetingDetail = {
  id: number; title: string; date: string; location: string | null;
  book_id: number | null;
  books: Book | Book[] | null;
};

function NewReviewForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const meetingId = searchParams.get("meetingId") ?? "";

  // Context-mode: meetingId provided (from home page)
  const [meeting, setMeeting] = useState<MeetingDetail | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [submittedNames, setSubmittedNames] = useState<Set<string>>(new Set());

  // Standalone-mode: no meetingId
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBookId, setSelectedBookId] = useState("");
  const [step, setStep] = useState<"book" | "write">("book");

  // Shared
  const [authorName, setAuthorName] = useState("");
  const [customName, setCustomName] = useState(false);
  const [content, setContent] = useState("");
  const [charCount, setCharCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (meetingId) {
      fetch(`/api/meetings/${meetingId}`)
        .then((r) => r.json())
        .then(({ meeting, attendees, reviews }) => {
          setMeeting(meeting);
          setAttendees(attendees ?? []);
          setSubmittedNames(new Set((reviews ?? []).map((r: Review) => r.author_name)));
          setLoading(false);
        });
    } else {
      fetch("/api/books")
        .then((r) => r.json())
        .then((b: Book[]) => {
          setBooks(b);
          if (b.length === 1) { setSelectedBookId(String(b[0].id)); setStep("write"); }
          setLoading(false);
        });
    }
  }, [meetingId]);

  const handleEditorChange = useCallback((text: string) => {
    setContent(text);
    setCharCount(text.length);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!authorName.trim()) { toast.error("이름을 선택하거나 입력해주세요."); return; }
    if (!content.trim()) { toast.error("독후감 내용을 입력해주세요."); return; }

    const bookId = meetingId
      ? (() => { const b = meeting?.books; return b ? String(Array.isArray(b) ? b[0]?.id : b?.id) : ""; })()
      : selectedBookId;

    if (!bookId) { toast.error("책 정보가 없습니다."); return; }

    setSubmitting(true);
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        book_id: Number(bookId),
        meeting_id: meetingId ? Number(meetingId) : null,
        author_name: authorName.trim(),
        content,
      }),
    });

    if (res.ok) {
      toast.success("독후감이 등록되었습니다!");
      router.push(meetingId ? `/meetings/${meetingId}` : "/reviews");
    } else {
      const { error } = await res.json();
      toast.error(error ?? "오류가 발생했습니다.");
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto pt-10 text-center text-sm text-neutral-400">불러오는 중...</div>
    );
  }

  // ── Context mode (meetingId provided) ──
  if (meetingId && meeting) {
    const bookRaw = meeting.books;
    const book = bookRaw ? (Array.isArray(bookRaw) ? bookRaw[0] : bookRaw) : null;

    return (
      <div className="w-full flex flex-col flex-1 min-h-0 gap-4">
        {/* 헤더 */}
        <div className="flex items-center gap-2">
          <button onClick={() => router.back()} className="p-1 text-neutral-400 hover:text-neutral-700 cursor-pointer transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <p className="text-xs text-neutral-400 uppercase tracking-widest font-semibold">독후감 쓰기</p>
        </div>

        {/* 모임 & 책 컨텍스트 */}
        <div className="bg-[#F8F5F0] rounded-2xl p-3 sm:p-5 flex gap-3 sm:gap-4 items-start flex-shrink-0">
          {book?.cover_url ? (
            <img src={book.cover_url} alt={book.title} className="w-10 h-14 sm:w-14 sm:h-20 object-cover rounded-md shadow flex-shrink-0" />
          ) : (
            <div className="w-10 h-14 sm:w-14 sm:h-20 rounded-md bg-[#E8DDD0] flex-shrink-0 flex items-center justify-center">
              <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-[#C8BEB4]" />
            </div>
          )}
          <div className="flex-1 min-w-0 space-y-1">
            {book ? (
              <>
                <p className="font-semibold text-[#1C1A17] leading-snug">{book.title}</p>
                <p className="text-sm text-neutral-500">{book.author}</p>
              </>
            ) : (
              <p className="font-semibold text-[#1C1A17]">{meeting.title}</p>
            )}
            <div className="flex items-center gap-3 pt-1">
              <span className="flex items-center gap-1 text-xs text-neutral-400">
                <CalendarDays className="w-3 h-3" />
                {format(new Date(meeting.date), "M월 d일 (EEE)", { locale: ko })}
              </span>
              {meeting.location && (
                <span className="flex items-center gap-1 text-xs text-neutral-400">
                  <MapPin className="w-3 h-3" />
                  {meeting.location}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 작성 폼 */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 gap-4">
          {/* 이름 선택 */}
          <div className="space-y-2 flex-shrink-0">
            <label className="text-sm font-semibold text-neutral-700">작성자</label>
            <AuthorPicker
              attendees={attendees}
              submittedNames={submittedNames}
              authorName={authorName}
              customName={customName}
              onSelect={setAuthorName}
              onCustom={() => { setAuthorName(""); setCustomName(true); }}
              onBackToList={() => { setAuthorName(""); setCustomName(false); }}
            />
          </div>

          {/* 에디터 */}
          <div className="flex flex-col flex-1 min-h-0 gap-1">
            <div className="flex items-center justify-between flex-shrink-0">
              <label className="text-sm font-semibold text-neutral-700">독후감</label>
              <span className="text-xs text-neutral-400">{charCount.toLocaleString()}자</span>
            </div>
            <div className="rounded-xl border border-neutral-200 overflow-auto bg-white flex-1 min-h-[40dvh] sm:min-h-0">
              <ReviewEditor onChange={handleEditorChange} />
            </div>
            <p className="text-xs text-neutral-400 flex-shrink-0 hidden sm:block">책을 읽고 느낀 점, 인상적인 구절, 생각 등을 자유롭게 써주세요.</p>
          </div>

          <div className="flex gap-2 flex-shrink-0 sticky bottom-0 bg-[#F0EAE0] py-3 -mx-4 px-4 border-t border-neutral-200/60 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
            <Button type="button" variant="outline" onClick={() => router.back()} className="cursor-pointer flex-1 sm:flex-none">취소</Button>
            <Button type="submit" disabled={submitting || !authorName || !content.trim()} className="cursor-pointer flex-1 sm:flex-none">
              {submitting ? "등록 중..." : "등록하기"}
            </Button>
          </div>
        </form>
      </div>
    );
  }

  // ── Standalone mode: Step 1 - 책 선택 ──
  if (step === "book") {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <p className="text-xs text-neutral-400 uppercase tracking-widest font-semibold mb-1">독후감 쓰기</p>
          <h1 className="text-2xl font-bold text-[#1C1A17]">어떤 책을 읽으셨나요?</h1>
        </div>

        {books.length === 0 ? (
          <p className="text-sm text-neutral-400">등록된 책이 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {books.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => { setSelectedBookId(String(b.id)); setStep("write"); }}
                className="w-full text-left group cursor-pointer"
              >
                <div className={cn(
                  "flex items-center gap-4 p-4 rounded-xl border-2 transition-all",
                  selectedBookId === String(b.id)
                    ? "border-[#1C1A17] bg-neutral-50"
                    : "border-neutral-100 bg-white hover:border-neutral-300 hover:shadow-sm"
                )}>
                  {b.cover_url ? (
                    <img src={b.cover_url} alt={b.title} className="w-14 h-20 object-cover rounded-md shadow-sm flex-shrink-0" />
                  ) : (
                    <div className="w-14 h-20 rounded-md bg-neutral-100 flex-shrink-0 flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-neutral-300" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-base leading-snug">{b.title}</p>
                    <p className="text-sm text-neutral-400 mt-0.5">{b.author}</p>
                  </div>
                  <div className={cn(
                    "w-5 h-5 rounded-full border-2 flex-shrink-0 transition-colors",
                    selectedBookId === String(b.id)
                      ? "border-[#1C1A17] bg-[#1C1A17]"
                      : "border-neutral-200 group-hover:border-neutral-400"
                  )}>
                    {selectedBookId === String(b.id) && (
                      <div className="w-full h-full rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-white" />
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Standalone mode: Step 2 - 작성 ──
  const selectedBook = books.find((b) => String(b.id) === selectedBookId);

  return (
    <div className="w-full flex flex-col flex-1 min-h-0 gap-4">
      {/* 선택 책 헤더 */}
      <button type="button" onClick={() => setStep("book")} className="w-full text-left cursor-pointer group flex-shrink-0">
        <div className="flex items-center gap-3 p-3 rounded-xl border border-neutral-100 bg-white hover:border-neutral-200 transition-colors">
          {selectedBook?.cover_url ? (
            <img src={selectedBook.cover_url} alt={selectedBook.title} className="w-9 h-[52px] object-cover rounded shadow-sm flex-shrink-0" />
          ) : (
            <div className="w-9 h-[52px] rounded bg-neutral-100 flex-shrink-0 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-neutral-300" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs text-neutral-400 mb-0.5">선택한 책</p>
            <p className="font-semibold text-sm truncate">{selectedBook?.title}</p>
            <p className="text-xs text-neutral-400">{selectedBook?.author}</p>
          </div>
          <span className="text-xs text-neutral-400 group-hover:text-neutral-600 flex-shrink-0">변경 →</span>
        </div>
      </button>

      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 gap-4">
        {/* 이름 */}
        <div className="space-y-2 flex-shrink-0">
          <label className="text-sm font-semibold text-neutral-700">작성자</label>
          <AuthorPicker
            attendees={attendees}
            submittedNames={submittedNames}
            authorName={authorName}
            customName={customName}
            onSelect={setAuthorName}
            onCustom={() => { setAuthorName(""); setCustomName(true); }}
            onBackToList={() => { setAuthorName(""); setCustomName(false); }}
          />
        </div>

        {/* 에디터 */}
        <div className="flex flex-col flex-1 min-h-0 gap-1">
          <div className="flex items-center justify-between flex-shrink-0">
            <label className="text-sm font-semibold text-neutral-700">독후감</label>
            <span className="text-xs text-neutral-400">{charCount.toLocaleString()}자</span>
          </div>
          <div className="rounded-xl border border-neutral-200 overflow-auto bg-white flex-1 min-h-[40dvh] sm:min-h-0">
            <ReviewEditor onChange={handleEditorChange} />
          </div>
          <p className="text-xs text-neutral-400 flex-shrink-0 hidden sm:block">책을 읽고 느낀 점, 인상적인 구절, 생각 등을 자유롭게 써주세요.</p>
        </div>

        <div className="flex gap-2 flex-shrink-0 sticky bottom-0 bg-[#F0EAE0] py-3 -mx-4 px-4 border-t border-neutral-200/60 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <Button type="button" variant="outline" onClick={() => setStep("book")} className="cursor-pointer flex-1 sm:flex-none">이전</Button>
          <Button type="submit" disabled={submitting || !authorName || !content.trim()} className="cursor-pointer flex-1 sm:flex-none">
            {submitting ? "등록 중..." : "등록하기"}
          </Button>
        </div>
      </form>
    </div>
  );
}

// ── Author picker ──
function AuthorPicker({
  attendees, submittedNames, authorName, customName, onSelect, onCustom, onBackToList,
}: {
  attendees: Attendee[];
  submittedNames: Set<string>;
  authorName: string;
  customName: boolean;
  onSelect: (name: string) => void;
  onCustom: () => void;
  onBackToList: () => void;
}) {
  const available = attendees.filter((a) => !submittedNames.has(a.name));

  if (attendees.length > 0 && !customName) {
    return (
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {available.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => onSelect(a.name)}
              className={cn(
                "px-3 py-1.5 rounded-full text-sm font-medium border transition-all cursor-pointer",
                authorName === a.name
                  ? "bg-[#1C1A17] text-white border-[#1C1A17]"
                  : "bg-white text-neutral-400 border-neutral-200 hover:border-neutral-400 hover:text-neutral-600"
              )}
            >
              {a.name}
            </button>
          ))}
          {available.length === 0 && (
            <p className="text-sm text-neutral-400">참석자 전원이 이미 독후감을 제출했습니다.</p>
          )}
        </div>
        <button type="button" onClick={onCustom}
          className="text-xs text-neutral-400 hover:text-neutral-600 underline underline-offset-2 cursor-pointer">
          목록에 없어요 (직접 입력)
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <Input
        value={authorName}
        onChange={(e) => onSelect(e.target.value)}
        placeholder="이름 입력"
        maxLength={20}
        autoFocus={customName}
        className="focus-visible:ring-neutral-900"
      />
      {attendees.length > 0 && (
        <button type="button" onClick={onBackToList}
          className="text-xs text-neutral-400 hover:text-neutral-600 underline underline-offset-2 cursor-pointer">
          참석자 목록에서 선택
        </button>
      )}
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
