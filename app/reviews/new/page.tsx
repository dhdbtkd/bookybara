"use client";

import { useEffect, useState, useCallback, useRef, useId, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { BookOpen, CalendarDays, MapPin, ChevronLeft, ChevronDown, Save } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Draft = { authorName: string; content: string; savedAt: string };
function draftKey(meetingId: string, bookId: string) {
  return `reading_club_draft_${meetingId}_${bookId}`;
}

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
  const [activeIndex, setActiveIndex] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const listId = useId();
  const selected = meetings.find((m) => String(m.id) === selectedId);
  const today = new Date().toISOString().split("T")[0];

  const openMenu = useCallback((preferLast = false) => {
    const selectedIndex = meetings.findIndex((m) => String(m.id) === selectedId);
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : preferLast ? meetings.length - 1 : 0);
    setOpen(true);
  }, [meetings, selectedId]);

  const closeMenu = useCallback((restoreFocus = false) => {
    setOpen(false);
    if (restoreFocus) requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => optionRefs.current[activeIndex]?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open, activeIndex]);

  function moveFocus(nextIndex: number) {
    if (meetings.length === 0) return;
    const wrapped = (nextIndex + meetings.length) % meetings.length;
    setActiveIndex(wrapped);
    optionRefs.current[wrapped]?.focus();
  }

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={compact ? "모임 변경" : "모임 선택"}
        onClick={() => open ? closeMenu() : openMenu()}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            openMenu(event.key === "ArrowUp");
          }
        }}
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
          <div className="fixed inset-0 z-40" aria-hidden="true" onMouseDown={() => closeMenu()} />
          <div
            id={listId}
            role="listbox"
            aria-label="모임 목록"
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                closeMenu(true);
              } else if (event.key === "ArrowDown") {
                event.preventDefault();
                moveFocus(activeIndex + 1);
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                moveFocus(activeIndex - 1);
              } else if (event.key === "Home") {
                event.preventDefault();
                moveFocus(0);
              } else if (event.key === "End") {
                event.preventDefault();
                moveFocus(meetings.length - 1);
              } else if (event.key === "Tab") {
                closeMenu();
              }
            }}
            className={cn(
            "absolute z-50 mt-1 bg-white border border-neutral-200 rounded-xl shadow-lg overflow-y-auto min-w-[240px] max-h-64",
            compact ? "left-0" : "w-full"
          )}>
            {meetings.map((m, index) => (
              <button
                key={m.id}
                ref={(node) => { optionRefs.current[index] = node; }}
                type="button"
                role="option"
                aria-selected={String(m.id) === selectedId}
                tabIndex={index === activeIndex ? 0 : -1}
                onFocus={() => setActiveIndex(index)}
                onClick={() => { onChange(String(m.id)); closeMenu(true); }}
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
  const [savedIndicator, setSavedIndicator] = useState(false);
  const [restoreDraft, setRestoreDraft] = useState<Draft | null>(null);
  const [pendingMeetingId, setPendingMeetingId] = useState<string | null>(null);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [editorInitialText, setEditorInitialText] = useState<string | undefined>(undefined);
  const [editorKey, setEditorKey] = useState(0);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedIndicatorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      const initId = initMeetingId ?? (upcoming[0] ? String(upcoming[0].id) : past[0] ? String(past[0].id) : "");
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

  const saveDraft = useCallback((showIndicator = true) => {
    if (!selectedMeetingId || !selectedBookId) return;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    const key = draftKey(selectedMeetingId, selectedBookId);
    if (!content.trim() && !authorName.trim()) {
      localStorage.removeItem(key);
      return;
    }
    const draft: Draft = { authorName, content, savedAt: new Date().toISOString() };
    localStorage.setItem(key, JSON.stringify(draft));
    if (!showIndicator) return;
    setSavedIndicator(true);
    if (savedIndicatorTimer.current) clearTimeout(savedIndicatorTimer.current);
    savedIndicatorTimer.current = setTimeout(() => setSavedIndicator(false), 2000);
  }, [authorName, content, selectedBookId, selectedMeetingId]);

  function applyMeetingChange(id: string) {
    setRestoreDraft(null);
    setEditorInitialText(undefined);
    setEditorKey((key) => key + 1);
    setContent("");
    setCharCount(0);
    setPendingMeetingId(null);
    setSelectedMeetingId(id);
  }

  function requestMeetingChange(id: string) {
    if (id === selectedMeetingId) return;
    if (content.trim() || authorName.trim()) {
      saveDraft(false);
      setPendingMeetingId(id);
      return;
    }
    applyMeetingChange(id);
  }

  function handleBack() {
    saveDraft(false);
    router.back();
  }

  // Check for existing draft when meetingId + bookId are set
  useEffect(() => {
    if (!selectedMeetingId || !selectedBookId) return;
    const key = draftKey(selectedMeetingId, selectedBookId);
    const raw = localStorage.getItem(key);
    if (!raw) return;
    try {
      const draft: Draft = JSON.parse(raw);
      if (draft.content?.trim()) setRestoreDraft(draft);
    } catch {
      // ignore
    }
  }, [selectedMeetingId, selectedBookId]);

  // Autosave to localStorage (debounced 3s), then synchronously flush on exit.
  useEffect(() => {
    if (!selectedMeetingId || !selectedBookId) return;
    if (!content.trim() && !authorName.trim()) return;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => saveDraft(), 3000);
    return () => { if (autosaveTimer.current) clearTimeout(autosaveTimer.current); };
  }, [content, authorName, selectedMeetingId, selectedBookId, saveDraft]);

  useEffect(() => {
    const onPageHide = () => saveDraft(false);
    window.addEventListener("pagehide", onPageHide);
    return () => window.removeEventListener("pagehide", onPageHide);
  }, [saveDraft]);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const onResize = () => setKeyboardOpen(window.innerHeight - viewport.height > 150);
    viewport.addEventListener("resize", onResize);
    return () => viewport.removeEventListener("resize", onResize);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    if (!authorName.trim()) { toast.error("작성자를 선택해주세요."); return; }
    if (!selectedBookId) { toast.error("책을 선택해주세요."); return; }
    if (!content.trim()) { toast.error("독후감 내용을 입력해주세요."); return; }

    setSubmitting(true);
    saveDraft(false);
    try {
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

      if (!res.ok) {
        const payload = await res.json().catch(() => null) as { error?: string } | null;
        throw new Error(payload?.error ?? "잠시 후 다시 시도해주세요.");
      }

      localStorage.removeItem(draftKey(selectedMeetingId, selectedBookId));
      toast.success("독후감이 등록되었습니다!");
      router.push(selectedMeetingId ? `/meetings/${selectedMeetingId}` : "/reviews");
    } catch (error) {
      const description = error instanceof Error && error.message !== "Failed to fetch"
        ? error.message
        : "네트워크 연결을 확인하고 다시 시도해주세요.";
      toast.error("독후감을 등록하지 못했습니다.", {
        description,
        action: {
          label: "다시 등록",
          onClick: () => document.querySelector<HTMLFormElement>("#review-form")?.requestSubmit(),
        },
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="pt-10 text-center text-sm text-neutral-400">불러오는 중...</div>;

  // ── 임시저장 복원 모달 (step에 무관하게 표시) ──
  const restoreDraftModal = restoreDraft && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full space-y-4">
        <p className="text-sm font-semibold text-[#1C1A17]">임시저장된 내용이 있어요</p>
        <p className="text-xs text-neutral-500">
          {format(new Date(restoreDraft.savedAt), "M월 d일 HH:mm")} 에 저장된 초안이 있습니다. 이어서 작성할까요?
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setAuthorName(restoreDraft.authorName);
              setCustomName(!attendees.some((attendee) => attendee.name === restoreDraft.authorName));
              setContent(restoreDraft.content);
              setCharCount(restoreDraft.content.length);
              setEditorInitialText(restoreDraft.content);
              setEditorKey((k) => k + 1);
              setStep("write");
              setRestoreDraft(null);
            }}
            className="flex-1 py-2 rounded-xl bg-[#1C1A17] text-white text-sm font-medium hover:bg-[#8B3A2A] transition-colors cursor-pointer"
          >
            이어서 작성
          </button>
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem(draftKey(selectedMeetingId, selectedBookId));
              setRestoreDraft(null);
            }}
            className="flex-1 py-2 rounded-xl border border-neutral-200 text-sm text-neutral-500 hover:bg-neutral-50 transition-colors cursor-pointer"
          >
            새로 작성
          </button>
        </div>
      </div>
    </div>
  );

  const selectedMeeting = meetings.find((m) => String(m.id) === selectedMeetingId) ?? null;
  // Books available for this meeting: meeting's book if set, else all books
  const meetingBooks: Book[] = selectedMeeting?.books ?? [];
  const booksForPicker = meetingBooks.length > 0 ? meetingBooks : allBooks;
  const selectedBook = booksForPicker.find((b) => String(b.id) === selectedBookId) ?? null;
  const attendees = selectedMeeting?.attendees ?? [];
  const pendingMeeting = meetings.find((m) => String(m.id) === pendingMeetingId) ?? null;

  const meetingChangeDialog = (
    <Dialog open={pendingMeetingId !== null} onOpenChange={(open) => !open && setPendingMeetingId(null)}>
      <DialogContent showCloseButton={false} className="p-5 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-[#1C1A17]">모임을 변경할까요?</DialogTitle>
          <DialogDescription className="leading-relaxed">
            지금 작성한 내용은 현재 모임의 초안으로 저장됩니다.
            {pendingMeeting && <span className="mt-1 block font-medium text-neutral-700">{pendingMeeting.title}으로 이동합니다.</span>}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="-mx-5 -mb-5 px-5 sm:-mx-6 sm:-mb-6 sm:px-6">
          <Button type="button" variant="outline" onClick={() => setPendingMeetingId(null)}>계속 작성</Button>
          <Button type="button" className="bg-[#1C1A17] hover:bg-[#8B3A2A]" onClick={() => pendingMeetingId && applyMeetingChange(pendingMeetingId)}>
            초안 저장 후 변경
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // ── Step: book selection ──
  if (step === "book") {
    return (
      <div className="w-full flex flex-col flex-1 min-h-0 gap-5">
        {restoreDraftModal}
        {meetingChangeDialog}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button type="button" aria-label="이전 화면으로 돌아가기" onClick={handleBack} className="p-1 text-neutral-400 hover:text-neutral-700 cursor-pointer transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <p className="text-xs text-neutral-400 uppercase tracking-widest font-semibold">독후감 쓰기</p>
        </div>

        {/* 모임 선택 */}
        <div className="flex-shrink-0 space-y-1.5">
          <p className="text-xs font-semibold text-neutral-400 uppercase tracking-widest">모임</p>
          <MeetingSelector meetings={meetings} selectedId={selectedMeetingId} onChange={requestMeetingChange} />
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
      {restoreDraftModal}
      {meetingChangeDialog}
      <div className="flex items-center gap-2 flex-shrink-0">
        <button type="button" aria-label="이전 화면으로 돌아가기" onClick={handleBack} className="p-1 text-neutral-400 hover:text-neutral-700 cursor-pointer transition-colors">
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
          <MeetingSelector meetings={meetings} selectedId={selectedMeetingId} onChange={requestMeetingChange} compact />

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
            <div className="flex items-center gap-2">
              {savedIndicator && (
                <span className="flex items-center gap-1 text-[10px] text-neutral-400 animate-pulse">
                  <Save className="w-3 h-3" />임시저장됨
                </span>
              )}
              <span className="text-xs text-neutral-400">{charCount.toLocaleString()}자</span>
            </div>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white min-h-[50dvh]">
            <ReviewEditor key={editorKey} onChange={handleEditorChange} initialText={editorInitialText} />
          </div>
          <p className="text-xs text-neutral-400 hidden sm:block">책을 읽고 느낀 점, 인상적인 구절, 생각 등을 자유롭게 써주세요.</p>
        </div>
      </form>

      {/* 플로팅 버튼 바 */}
      <div className={cn("fixed bottom-6 left-0 right-0 z-50 justify-center px-4 pointer-events-none", keyboardOpen ? "hidden" : "flex")} style={{ bottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}>
        <div className="flex items-center gap-2 bg-white/80 backdrop-blur-md border border-white/60 shadow-xl shadow-black/10 rounded-2xl px-2 py-2 pointer-events-auto">
          <Button type="button" variant="ghost" onClick={handleBack} className="cursor-pointer rounded-xl text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 px-5">
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
