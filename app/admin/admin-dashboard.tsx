"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import AdminDiscussionGenerator from "@/components/admin-discussion-generator";
import MemberMultiSelect from "@/components/member-multi-select";
import DatePicker from "@/components/date-picker";
import CategorySelect from "@/components/category-select";
import {
  LayoutDashboard, CalendarDays, BookOpen, Users, BookMarked,
  FileText, Megaphone, Sparkles, LogOut, Plus, Trash2,
  ChevronDown, ChevronUp, BookCopy, Eye, EyeOff, Check, Search, CheckCircle2, Loader2, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

type Book = { id: number; title: string; author: string; cover_url: string | null; category_id: number | null };
type Category = { id: number; name: string; color: string };
type Member = { id: number; name: string };
type Meeting = {
  id: number; title: string; date: string; location: string | null;
  book_id: number | null; books: { title: string } | null;
  attendees?: { id: number; name: string; member_id: number | null }[];
};
type Review = { id: number; author_name: string; content: string; books: { title: string } | null };
type Announcement = { id: number; title: string; content: string; is_pinned: boolean };
type Candidate = { id: number; title: string; author: string; proposed_by: string; status: string };
type Discussion = { id: number; questions: string; is_public: boolean; meeting_id: number | null; meetings: { title: string } | null };

const MENU = [
  { id: "dashboard", label: "대시보드", icon: LayoutDashboard },
  { id: "meetings", label: "모임 관리", icon: CalendarDays },
  { id: "books", label: "도서 관리", icon: BookOpen },
  { id: "members", label: "멤버 관리", icon: Users },
  { id: "candidates", label: "도서 후보", icon: BookMarked },
  { id: "reviews", label: "독후감", icon: FileText },
  { id: "announcements", label: "공지사항", icon: Megaphone },
  { id: "discussion", label: "토론 질문 AI", icon: Sparkles },
] as const;

type SectionId = (typeof MENU)[number]["id"];

function useDebouncedCallback<T extends unknown[]>(
  callback: (...args: T) => void,
  delay: number
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = useRef(callback);
  useEffect(() => { callbackRef.current = callback; });
  return useCallback((...args: T) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => callbackRef.current(...args), delay);
  }, [delay]);
}

export default function AdminDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") as SectionId | null;
  const active: SectionId = tabParam && MENU.some((m) => m.id === tabParam) ? tabParam : "dashboard";

  function handleSetActive(id: SectionId) {
    router.replace(`/admin?tab=${id}`, { scroll: false });
  }

  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [discussions, setDiscussions] = useState<Discussion[]>([]);

  const [bookForm, setBookForm] = useState({ title: "", author: "", cover_url: "", cover_url_hires: "", description: "", category_id: "", isbn: "" });
  const [bookSearch, setBookSearch] = useState("");
  const [bookSearchResults, setBookSearchResults] = useState<{ title: string; authors: string[]; thumbnail: string | null; description: string | null; isbn: string }[]>([]);
  const [bookSearching, setBookSearching] = useState(false);
  const [bookSearchOpen, setBookSearchOpen] = useState(false);
  const [bookGoogleFetching, setBookGoogleFetching] = useState(false);
  const [bookDetailResult, setBookDetailResult] = useState<{ found: boolean; hiresUrl: string; descriptionLength: number; source: string | null } | null>(null);
  const bookSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryColor, setNewCategoryColor] = useState("#6B7280");
  const [newMemberName, setNewMemberName] = useState("");
  const [meetingForm, setMeetingForm] = useState({ title: "", date: "", location: "", book_id: "" });
  const [meetingAttendees, setMeetingAttendees] = useState<number[]>([]);
  const [annForm, setAnnForm] = useState({ title: "", content: "", is_pinned: false });
  const [selectedMeetingId, setSelectedMeetingId] = useState("");
  const [newMeetingBookModalOpen, setNewMeetingBookModalOpen] = useState(false);

  async function loadAll() {
    const [b, cat, mem, m, r, a, c, d] = await Promise.all([
      fetch("/api/books").then((r) => r.json()),
      fetch("/api/categories").then((r) => r.json()),
      fetch("/api/members").then((r) => r.json()),
      fetch("/api/meetings").then((r) => r.json()),
      fetch("/api/reviews").then((r) => r.json()),
      fetch("/api/announcements").then((r) => r.json()),
      fetch("/api/candidates").then((r) => r.json()),
      fetch("/api/discussion").then((r) => r.json()),
    ]);
    setBooks(b); setCategories(cat); setMembers(mem); setMeetings(m);
    setReviews(r); setAnnouncements(a); setCandidates(c); setDiscussions(d);
  }

  useEffect(() => { loadAll(); }, []);

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.refresh();
  }

  // ── Categories ──
  async function addCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    const res = await fetch("/api/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newCategoryName, color: newCategoryColor }) });
    if (res.ok) { toast.success("카테고리 추가 완료"); setNewCategoryName(""); setNewCategoryColor("#6B7280"); loadAll(); }
    else { const { error } = await res.json(); toast.error(error); }
  }
  async function deleteCategory(id: number) {
    if (!confirm("카테고리를 삭제할까요?")) return;
    await fetch(`/api/categories/${id}`, { method: "DELETE" });
    toast.success("삭제 완료"); loadAll();
  }

  // ── Books ──
  function handleBookSearchChange(q: string) {
    setBookSearch(q);
    setBookSearchOpen(true);
    if (bookSearchTimer.current) clearTimeout(bookSearchTimer.current);
    if (!q.trim()) { setBookSearchResults([]); setBookSearching(false); return; }
    setBookSearching(true);
    bookSearchTimer.current = setTimeout(async () => {
      const res = await fetch(`/api/search-book?query=${encodeURIComponent(q)}`);
      const data = res.ok ? await res.json() : [];
      setBookSearchResults(data);
      setBookSearching(false);
    }, 400);
  }

  async function selectBookFromSearch(book: { title: string; authors: string[]; thumbnail: string | null; description: string | null; isbn: string }) {
    setBookForm((p) => ({
      ...p,
      title: book.title,
      author: book.authors.join(", "),
      cover_url: book.thumbnail ?? "",
      cover_url_hires: "",
      description: book.description ?? "",
      isbn: book.isbn ?? "",
    }));
    setBookSearch(book.title);
    setBookSearchOpen(false);
    setBookSearchResults([]);
    setBookDetailResult(null);

    if (!book.isbn) return;
    setBookGoogleFetching(true);
    try {
      const res = await fetch(`/api/book-detail?isbn=${encodeURIComponent(book.isbn)}`);
      if (res.ok) {
        const data = await res.json();
        setBookForm((p) => ({
          ...p,
          cover_url_hires: data.hiresUrl ?? "",
          description: data.description || p.description,
        }));
        setBookDetailResult({
          found: !!data.source,
          hiresUrl: data.hiresUrl ?? "",
          descriptionLength: data.description?.length ?? 0,
          source: data.source,
        });
      } else {
        setBookDetailResult({ found: false, hiresUrl: "", descriptionLength: 0, source: null });
      }
    } catch {
      setBookDetailResult({ found: false, hiresUrl: "", descriptionLength: 0, source: null });
    } finally {
      setBookGoogleFetching(false);
    }
  }

  async function addBook(e: React.FormEvent) {
    e.preventDefault();
    const body = { ...bookForm, category_id: bookForm.category_id ? Number(bookForm.category_id) : null };
    const res = await fetch("/api/books", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) { toast.success("책 등록 완료"); setBookForm({ title: "", author: "", cover_url: "", cover_url_hires: "", description: "", category_id: "", isbn: "" }); setBookSearch(""); setBookSearchResults([]); setBookDetailResult(null); loadAll(); }
    else { const { error } = await res.json(); toast.error(error); }
  }
  async function deleteBook(id: number) {
    if (!confirm("책을 삭제하면 관련 독후감도 삭제됩니다.")) return;
    await fetch(`/api/books/${id}`, { method: "DELETE" });
    toast.success("삭제 완료"); loadAll();
  }

  // ── Members ──
  async function addMember(e: React.FormEvent) {
    e.preventDefault();
    if (!newMemberName.trim()) return;
    const res = await fetch("/api/members", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newMemberName }) });
    if (res.ok) { toast.success("멤버 추가 완료"); setNewMemberName(""); loadAll(); }
    else { const { error } = await res.json(); toast.error(error); }
  }
  async function deleteMember(id: number) {
    if (!confirm("멤버를 삭제할까요?")) return;
    await fetch(`/api/members/${id}`, { method: "DELETE" });
    toast.success("삭제 완료"); loadAll();
  }

  // ── Meetings ──
  async function addMeeting(e: React.FormEvent) {
    e.preventDefault();
    const body = { ...meetingForm, book_id: meetingForm.book_id ? Number(meetingForm.book_id) : null };
    const res = await fetch("/api/meetings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) { const { error } = await res.json(); toast.error(error); return; }
    const meeting = await res.json();
    if (meetingAttendees.length > 0) {
      await fetch(`/api/meetings/${meeting.id}/attendees`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ member_ids: meetingAttendees }) });
    }
    toast.success("일정 등록 완료");
    setMeetingForm({ title: "", date: "", location: "", book_id: "" });
    setMeetingAttendees([]);
    loadAll();
  }
  async function deleteMeeting(id: number) {
    if (!confirm("모임을 삭제할까요?")) return;
    await fetch(`/api/meetings/${id}`, { method: "DELETE" });
    toast.success("삭제 완료"); loadAll();
  }
  async function saveMeetingSummary(id: number, summary: string) {
    await fetch(`/api/meetings/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ summary }) });
    loadAll();
  }
  async function saveMeetingBook(meetingId: number, bookId: number | null) {
    await fetch(`/api/meetings/${meetingId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ book_id: bookId }) });
    loadAll();
  }
  async function saveMeetingAttendees(meetingId: number, memberIds: number[]) {
    await fetch(`/api/meetings/${meetingId}/attendees`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ member_ids: memberIds }) });
    loadAll();
  }

  // ── Announcements ──
  async function addAnn(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/announcements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(annForm) });
    if (res.ok) { toast.success("공지 등록 완료"); setAnnForm({ title: "", content: "", is_pinned: false }); loadAll(); }
  }
  async function deleteAnn(id: number) {
    await fetch(`/api/announcements/${id}`, { method: "DELETE" });
    toast.success("삭제 완료"); loadAll();
  }

  // ── Candidates ──
  async function updateCandidateStatus(id: number, status: string) {
    await fetch(`/api/candidates/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    toast.success("상태 변경 완료"); loadAll();
  }

  // ── Reviews ──
  async function deleteReview(id: number) {
    if (!confirm("독후감을 삭제할까요?")) return;
    await fetch(`/api/reviews/${id}`, { method: "DELETE" });
    toast.success("삭제 완료"); loadAll();
  }

  // ── Discussion ──
  async function generateDiscussion() {
    if (!selectedMeetingId) { toast.error("모임을 선택해주세요."); return; }
    toast.info("AI가 토론 질문을 생성 중입니다...");
    const res = await fetch("/api/discussion", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ meeting_id: Number(selectedMeetingId) }) });
    if (res.ok) { toast.success("토론 질문 생성 완료!"); loadAll(); }
    else { const { error } = await res.json(); toast.error(error ?? "오류"); }
  }
  async function togglePublic(id: number, current: boolean) {
    await fetch("/api/discussion", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, is_public: !current }) });
    toast.success(current ? "비공개로 변경" : "공개로 변경"); loadAll();
  }

  const today = new Date().toISOString().split("T")[0];
  const upcomingMeetings = meetings.filter((m) => m.date >= today);
  const selectedNewMeetingBook = books.find((b) => String(b.id) === meetingForm.book_id);

  return (
    // 뷰포트 전체 너비로 탈출 (max-w-4xl 컨테이너 이탈)
    <div
      className="flex items-start -mt-8"
      style={{ width: "100vw", marginLeft: "calc(50% - 50vw)", minHeight: "calc(100vh - 3.5rem)" }}
    >
      {/* ── Sidebar ── */}
      <aside className="w-52 bg-[#1C1A17] sticky top-14 h-[calc(100vh-3.5rem)] flex flex-col flex-shrink-0">
        <div className="px-5 py-5 border-b border-white/10">
          <p className="text-[9px] font-bold tracking-[0.22em] uppercase text-white/30 mb-1">독서모임</p>
          <p className="text-white text-lg" style={{ fontFamily: "var(--font-playfair)", fontStyle: "italic" }}>
            관리자
          </p>
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {MENU.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => handleSetActive(id)}
              className={cn(
                "w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all cursor-pointer",
                active === id
                  ? "bg-[#8B3A2A] text-white font-medium"
                  : "text-white/50 hover:text-white/90 hover:bg-white/8"
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-white/10">
          <button
            onClick={logout}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-white/35 hover:text-white/80 hover:bg-white/8 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            로그아웃
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 min-w-0 p-8">

        {/* ── 대시보드 ── */}
        {active === "dashboard" && (
          <div className="space-y-8">
            <SectionHeader
              icon={<LayoutDashboard className="w-5 h-5" />}
              title="대시보드"
              description="독서모임 현황을 한눈에 확인합니다."
            />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "전체 도서", value: books.length, icon: <BookOpen className="w-5 h-5" />, color: "#8B3A2A" },
                { label: "예정된 모임", value: upcomingMeetings.length, icon: <CalendarDays className="w-5 h-5" />, color: "#2A6B5E" },
                { label: "멤버 수", value: members.length, icon: <Users className="w-5 h-5" />, color: "#2A4A8B" },
                { label: "독후감 수", value: reviews.length, icon: <FileText className="w-5 h-5" />, color: "#6B4A2A" },
              ].map(({ label, value, icon, color }) => (
                <div key={label} className="bg-white rounded-xl border border-[#E8DDD0] p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-neutral-400">{label}</span>
                    <span style={{ color }} className="opacity-70">{icon}</span>
                  </div>
                  <p className="text-3xl font-bold text-[#1C1A17]">{value}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl border border-[#E8DDD0] p-5">
                <h3 className="text-sm font-semibold text-[#1C1A17] mb-3">예정된 모임</h3>
                {upcomingMeetings.length > 0 ? (
                  <div className="space-y-2">
                    {upcomingMeetings.slice(0, 3).map((m) => (
                      <div key={m.id} className="flex items-center justify-between text-sm">
                        <span className="text-[#1C1A17] font-medium">{m.title}</span>
                        <span className="text-neutral-400 text-xs">{format(new Date(m.date), "M월 d일 (EEE)", { locale: ko })}</span>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-sm text-neutral-400">예정된 모임이 없습니다.</p>}
              </div>

              <div className="bg-white rounded-xl border border-[#E8DDD0] p-5">
                <h3 className="text-sm font-semibold text-[#1C1A17] mb-3">도서 후보 현황</h3>
                {[
                  { label: "대기중", status: "pending", color: "#8B7B6B" },
                  { label: "선정됨", status: "selected", color: "#2A6B5E" },
                  { label: "탈락", status: "rejected", color: "#8B3A2A" },
                ].map(({ label, status, color }) => {
                  const count = candidates.filter((c) => c.status === status).length;
                  return (
                    <div key={status} className="flex items-center justify-between text-sm mb-1.5">
                      <span className="text-neutral-500">{label}</span>
                      <span className="font-semibold" style={{ color }}>{count}권</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── 모임 관리 ── */}
        {active === "meetings" && (
          <div className="space-y-6">
            <SectionHeader
              icon={<CalendarDays className="w-5 h-5" />}
              title="모임 관리"
              description="모임 일정을 등록하고 참석자, 도서, 요약을 관리합니다."
            />

            <FormCard title="새 모임 등록">
              <form onSubmit={addMeeting} className="space-y-4">
                <Field label="모임 이름 *">
                  <Input value={meetingForm.title} onChange={(e) => setMeetingForm((p) => ({ ...p, title: e.target.value }))} placeholder="예: 3월 독서모임" />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="날짜 *">
                    <DatePicker value={meetingForm.date} onChange={(v) => setMeetingForm((p) => ({ ...p, date: v }))} />
                  </Field>
                  <Field label="장소">
                    <Input value={meetingForm.location} onChange={(e) => setMeetingForm((p) => ({ ...p, location: e.target.value }))} placeholder="장소" />
                  </Field>
                </div>
                <Field label="읽는 책">
                  <button
                    type="button"
                    onClick={() => setNewMeetingBookModalOpen(true)}
                    className="w-full flex items-center gap-2 border rounded-md px-3 py-2 text-sm text-left hover:bg-neutral-50 transition-colors cursor-pointer"
                  >
                    {selectedNewMeetingBook ? (
                      <>
                        {selectedNewMeetingBook.cover_url && (
                          <img src={selectedNewMeetingBook.cover_url} className="w-6 h-8 object-cover rounded-sm flex-shrink-0" alt="" />
                        )}
                        <span className="flex-1 truncate">{selectedNewMeetingBook.title}</span>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setMeetingForm((p) => ({ ...p, book_id: "" })); }}
                          className="text-neutral-400 hover:text-neutral-600 flex-shrink-0 text-xs"
                        >✕</button>
                      </>
                    ) : (
                      <span className="text-neutral-400">책 선택 (선택사항)</span>
                    )}
                  </button>
                </Field>
                <Field label="참석자">
                  <MemberMultiSelect members={members} selected={meetingAttendees} onChange={setMeetingAttendees} />
                </Field>
                <Button type="submit" className="bg-[#1C1A17] hover:bg-[#8B3A2A] transition-colors cursor-pointer">
                  <Plus className="w-4 h-4 mr-1.5" /> 등록
                </Button>
              </form>
            </FormCard>

            <div>
              <p className="text-xs font-bold tracking-widest uppercase text-neutral-400 mb-3">등록된 모임 ({meetings.length})</p>
              <div className="space-y-2">
                {meetings.map((m) => (
                  <MeetingAdminRow
                    key={m.id}
                    meeting={m}
                    members={members}
                    books={books}
                    onDelete={() => deleteMeeting(m.id)}
                    onSaveSummary={(s) => saveMeetingSummary(m.id, s)}
                    onSaveAttendees={(ids) => saveMeetingAttendees(m.id, ids)}
                    onSaveBook={(bookId) => saveMeetingBook(m.id, bookId)}
                  />
                ))}
                {meetings.length === 0 && <EmptyState text="등록된 모임이 없습니다." />}
              </div>
            </div>
          </div>
        )}

        {/* ── 도서 관리 ── */}
        {active === "books" && (
          <div className="space-y-6">
            <SectionHeader
              icon={<BookOpen className="w-5 h-5" />}
              title="도서 관리"
              description="도서와 카테고리를 등록하고 관리합니다."
            />

            <FormCard title="카테고리">
              <form onSubmit={addCategory} className="flex gap-2 items-center mb-3">
                <input type="color" value={newCategoryColor} onChange={(e) => setNewCategoryColor(e.target.value)}
                  className="w-8 h-8 rounded border cursor-pointer flex-shrink-0 p-0.5" title="색상 선택" />
                <Input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="카테고리 이름" className="flex-1" maxLength={20} />
                <Button type="submit" size="sm" className="bg-[#1C1A17] hover:bg-[#8B3A2A] cursor-pointer">추가</Button>
              </form>
              <div className="flex flex-wrap gap-2">
                {categories.map((c) => (
                  <div key={c.id} className="flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium" style={{ backgroundColor: c.color + "22", color: c.color }}>
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
                    {c.name}
                    <button onClick={() => deleteCategory(c.id)} className="ml-1 opacity-50 hover:opacity-100 cursor-pointer text-xs leading-none">✕</button>
                  </div>
                ))}
                {categories.length === 0 && <p className="text-sm text-neutral-400">등록된 카테고리가 없습니다.</p>}
              </div>
            </FormCard>

            <FormCard title="새 도서 등록">
              <form onSubmit={addBook} className="space-y-3">
                {/* Kakao search */}
                <Field label="도서 검색">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
                    <Input
                      value={bookSearch}
                      onChange={(e) => handleBookSearchChange(e.target.value)}
                      onFocus={() => bookSearchResults.length > 0 && setBookSearchOpen(true)}
                      placeholder="제목 또는 저자 검색..."
                      className="pl-9 pr-9"
                    />
                    {bookSearch && (
                      <button type="button" onClick={() => { setBookSearch(""); setBookSearchResults([]); setBookSearchOpen(false); }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 cursor-pointer">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                    {bookSearchOpen && (bookSearching || bookSearchResults.length > 0) && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-neutral-200 rounded-xl shadow-lg overflow-hidden">
                        {bookSearching ? (
                          <div className="flex items-center justify-center gap-2 py-4 text-sm text-neutral-400">
                            <Loader2 className="w-4 h-4 animate-spin" /> 검색 중...
                          </div>
                        ) : (
                          <ul className="max-h-60 overflow-y-auto divide-y divide-neutral-100">
                            {bookSearchResults.map((b, i) => (
                              <li key={i}>
                                <button type="button" onClick={() => selectBookFromSearch(b)}
                                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#F8F5F0] text-left transition-colors cursor-pointer">
                                  {b.thumbnail ? (
                                    <img src={b.thumbnail} alt={b.title} className="w-8 h-11 object-cover rounded flex-shrink-0" />
                                  ) : (
                                    <div className="w-8 h-11 bg-neutral-100 rounded flex-shrink-0" />
                                  )}
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium text-[#1C1A17] truncate">{b.title}</p>
                                    <p className="text-xs text-neutral-500 truncate">{b.authors.join(", ")}</p>
                                  </div>
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="제목 *">
                    <Input value={bookForm.title} onChange={(e) => setBookForm((p) => ({ ...p, title: e.target.value }))} placeholder="책 제목" />
                  </Field>
                  <Field label="저자 *">
                    <Input value={bookForm.author} onChange={(e) => setBookForm((p) => ({ ...p, author: e.target.value }))} placeholder="저자" />
                  </Field>
                </div>
                <Field label="표지 URL">
                  <Input value={bookForm.cover_url} onChange={(e) => setBookForm((p) => ({ ...p, cover_url: e.target.value }))} placeholder="https://..." />
                </Field>

                {/* 도서 상세 조회 결과 */}
                {bookDetailResult && (
                  <div className={`rounded-lg border px-3 py-2.5 text-xs space-y-2 ${bookDetailResult.found ? "border-green-200 bg-green-50" : "border-neutral-200 bg-neutral-50"}`}>
                    <p className="font-semibold text-neutral-500">
                      도서 상세 조회 결과
                      {bookDetailResult.source && (
                        <span className="ml-2 font-normal text-green-600">
                          ({bookDetailResult.source === "naver" ? "네이버" : "Google Books"})
                        </span>
                      )}
                    </p>
                    {bookDetailResult.found ? (
                      <div className="flex gap-3 items-start">
                        <div className="flex gap-2 items-end flex-shrink-0">
                          {bookForm.cover_url && (
                            <div className="text-center">
                              <img src={bookForm.cover_url} alt="" className="w-10 h-14 object-cover rounded shadow-sm" />
                              <p className="text-neutral-400 mt-1">카카오</p>
                            </div>
                          )}
                          {bookDetailResult.hiresUrl ? (
                            <div className="text-center">
                              <img src={bookDetailResult.hiresUrl} alt="" className="w-10 h-14 object-cover rounded shadow-sm" />
                              <p className="text-green-600 mt-1">{bookDetailResult.source === "naver" ? "네이버" : "Google"}</p>
                            </div>
                          ) : (
                            <p className="text-neutral-400">썸네일 없음</p>
                          )}
                        </div>
                        <div className="text-neutral-600">
                          {bookDetailResult.descriptionLength > 0
                            ? <span className="text-green-700">소개 {bookDetailResult.descriptionLength}자 가져옴</span>
                            : <span className="text-neutral-400">소개 없음 (카카오 원문 사용)</span>
                          }
                        </div>
                      </div>
                    ) : (
                      <p className="text-neutral-400">검색 결과 없음 — 카카오 데이터만 사용됩니다.</p>
                    )}
                  </div>
                )}

                <Field label="소개">
                  <Textarea value={bookForm.description} onChange={(e) => setBookForm((p) => ({ ...p, description: e.target.value }))} rows={2} className="resize-none" />
                </Field>
                <Field label="카테고리">
                  <CategorySelect categories={categories} value={bookForm.category_id} onChange={(v) => setBookForm((p) => ({ ...p, category_id: v }))} />
                </Field>
                <Button type="submit" disabled={bookGoogleFetching} className="bg-[#1C1A17] hover:bg-[#8B3A2A] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                  {bookGoogleFetching ? (
                    <><span className="w-4 h-4 mr-1.5 inline-block animate-spin rounded-full border-2 border-white border-t-transparent" /> 정보 가져오는 중...</>
                  ) : (
                    <><Plus className="w-4 h-4 mr-1.5" /> 등록</>
                  )}
                </Button>
              </form>
            </FormCard>

            <div>
              <p className="text-xs font-bold tracking-widest uppercase text-neutral-400 mb-3">등록된 도서 ({books.length})</p>
              <div className="space-y-2">
                {books.map((b) => (
                  <BookAdminRow
                    key={b.id}
                    book={b}
                    categories={categories}
                    onDelete={() => deleteBook(b.id)}
                    onSave={async (updates) => {
                      const res = await fetch(`/api/books/${b.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updates) });
                      if (!res.ok) { const { error } = await res.json(); toast.error(error); }
                    }}
                  />
                ))}
                {books.length === 0 && <EmptyState text="등록된 도서가 없습니다." />}
              </div>
            </div>
          </div>
        )}

        {/* ── 멤버 관리 ── */}
        {active === "members" && (
          <div className="space-y-6">
            <SectionHeader
              icon={<Users className="w-5 h-5" />}
              title="멤버 관리"
              description="독서모임 멤버를 추가하고 관리합니다."
            />
            <FormCard title="새 멤버 추가">
              <form onSubmit={addMember} className="flex gap-2">
                <Input value={newMemberName} onChange={(e) => setNewMemberName(e.target.value)} placeholder="멤버 이름" className="flex-1" maxLength={20} />
                <Button type="submit" className="bg-[#1C1A17] hover:bg-[#8B3A2A] cursor-pointer">
                  <Plus className="w-4 h-4 mr-1.5" /> 추가
                </Button>
              </form>
            </FormCard>

            <div>
              <p className="text-xs font-bold tracking-widest uppercase text-neutral-400 mb-3">멤버 목록 ({members.length}명)</p>
              {members.length > 0 ? (
                <div className="bg-white rounded-xl border border-[#E8DDD0] divide-y divide-[#F0EAE0]">
                  {members.map((m) => (
                    <div key={m.id} className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#E8DDD0] flex items-center justify-center text-xs font-semibold text-[#8B7B6B]">
                          {m.name[0]}
                        </div>
                        <span className="text-sm font-medium text-[#1C1A17]">{m.name}</span>
                      </div>
                      <button onClick={() => deleteMember(m.id)} className="p-1.5 text-neutral-300 hover:text-red-400 transition-colors cursor-pointer rounded-md hover:bg-red-50">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : <EmptyState text="등록된 멤버가 없습니다." />}
            </div>
          </div>
        )}

        {/* ── 도서 후보 ── */}
        {active === "candidates" && (
          <div className="space-y-6">
            <SectionHeader
              icon={<BookMarked className="w-5 h-5" />}
              title="도서 후보"
              description="멤버들이 제안한 도서 후보의 상태를 관리합니다."
            />
            {candidates.length > 0 ? (
              <div className="space-y-2">
                {candidates.map((c) => {
                  const statusMap: Record<string, { label: string; color: string; bg: string }> = {
                    pending: { label: "대기중", color: "#8B7B6B", bg: "#F5F0E8" },
                    selected: { label: "선정됨", color: "#2A6B5E", bg: "#E8F5F2" },
                    rejected: { label: "탈락", color: "#8B3A2A", bg: "#F5E8E8" },
                  };
                  const s = statusMap[c.status] ?? statusMap.pending;
                  return (
                    <div key={c.id} className="bg-white rounded-xl border border-[#E8DDD0] px-5 py-4 flex items-center gap-4">
                      <div className="w-1.5 h-10 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-semibold text-sm text-[#1C1A17]">{c.title}</span>
                          <span className="text-xs text-neutral-400">{c.author}</span>
                        </div>
                        <p className="text-xs text-neutral-400">제안: {c.proposed_by}</p>
                      </div>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0" style={{ color: s.color, backgroundColor: s.bg }}>
                        {s.label}
                      </span>
                      <div className="flex gap-1 flex-shrink-0">
                        {c.status !== "selected" && (
                          <button onClick={() => updateCandidateStatus(c.id, "selected")}
                            className="px-2.5 py-1 text-xs rounded-md border border-[#2A6B5E] text-[#2A6B5E] hover:bg-[#2A6B5E] hover:text-white transition-colors cursor-pointer">
                            선정
                          </button>
                        )}
                        {c.status !== "rejected" && (
                          <button onClick={() => updateCandidateStatus(c.id, "rejected")}
                            className="px-2.5 py-1 text-xs rounded-md border border-neutral-200 text-neutral-400 hover:border-red-300 hover:text-red-400 transition-colors cursor-pointer">
                            탈락
                          </button>
                        )}
                        {c.status !== "pending" && (
                          <button onClick={() => updateCandidateStatus(c.id, "pending")}
                            className="px-2.5 py-1 text-xs rounded-md border border-neutral-200 text-neutral-400 hover:bg-neutral-50 transition-colors cursor-pointer">
                            대기
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : <EmptyState text="도서 후보가 없습니다." />}
          </div>
        )}

        {/* ── 독후감 ── */}
        {active === "reviews" && (
          <div className="space-y-6">
            <SectionHeader
              icon={<FileText className="w-5 h-5" />}
              title="독후감"
              description="제출된 독후감을 조회하고 관리합니다."
            />
            {reviews.length > 0 ? (
              <div className="space-y-2">
                {reviews.map((r) => (
                  <div key={r.id} className="bg-white rounded-xl border border-[#E8DDD0] px-5 py-4 flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {r.books && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#F0EAE0] text-[#8B7B6B]">
                            {r.books.title}
                          </span>
                        )}
                        <span className="font-semibold text-sm text-[#1C1A17]">{r.author_name}</span>
                      </div>
                      <p className="text-sm text-neutral-400 line-clamp-2 leading-relaxed">{r.content}</p>
                    </div>
                    <button onClick={() => deleteReview(r.id)} className="p-1.5 text-neutral-300 hover:text-red-400 transition-colors cursor-pointer rounded-md hover:bg-red-50 flex-shrink-0 mt-0.5">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : <EmptyState text="제출된 독후감이 없습니다." />}
          </div>
        )}

        {/* ── 공지사항 ── */}
        {active === "announcements" && (
          <div className="space-y-6">
            <SectionHeader
              icon={<Megaphone className="w-5 h-5" />}
              title="공지사항"
              description="공지사항을 등록하고 관리합니다."
            />
            <FormCard title="새 공지 등록">
              <form onSubmit={addAnn} className="space-y-3">
                <Field label="제목">
                  <Input value={annForm.title} onChange={(e) => setAnnForm((p) => ({ ...p, title: e.target.value }))} />
                </Field>
                <Field label="내용">
                  <Textarea value={annForm.content} onChange={(e) => setAnnForm((p) => ({ ...p, content: e.target.value }))} rows={3} className="resize-none" />
                </Field>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={annForm.is_pinned} onChange={(e) => setAnnForm((p) => ({ ...p, is_pinned: e.target.checked }))}
                    className="w-4 h-4 rounded border-neutral-300 cursor-pointer" />
                  <span className="text-sm text-neutral-600">상단 고정</span>
                </label>
                <Button type="submit" className="bg-[#1C1A17] hover:bg-[#8B3A2A] transition-colors cursor-pointer">
                  <Plus className="w-4 h-4 mr-1.5" /> 등록
                </Button>
              </form>
            </FormCard>

            <div>
              <p className="text-xs font-bold tracking-widest uppercase text-neutral-400 mb-3">등록된 공지 ({announcements.length})</p>
              {announcements.length > 0 ? (
                <div className="bg-white rounded-xl border border-[#E8DDD0] divide-y divide-[#F0EAE0]">
                  {announcements.map((a) => (
                    <div key={a.id} className="flex items-start justify-between px-5 py-4 gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          {a.is_pinned && (
                            <span className="text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full bg-[#8B3A2A]/10 text-[#8B3A2A]">고정</span>
                          )}
                          <span className="font-semibold text-sm text-[#1C1A17]">{a.title}</span>
                        </div>
                        <p className="text-sm text-neutral-400 line-clamp-1">{a.content}</p>
                      </div>
                      <button onClick={() => deleteAnn(a.id)} className="p-1.5 text-neutral-300 hover:text-red-400 transition-colors cursor-pointer rounded-md hover:bg-red-50 flex-shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : <EmptyState text="등록된 공지가 없습니다." />}
            </div>
          </div>
        )}

        {/* ── 토론 질문 AI ── */}
        {active === "discussion" && (
          <div className="space-y-6">
            <SectionHeader
              icon={<Sparkles className="w-5 h-5" />}
              title="토론 질문 AI"
              description="모임·독후감을 선택하고 AI로 토론 질문을 생성합니다."
            />
            <AdminDiscussionGenerator meetings={meetings as any} discussions={discussions as any} />
          </div>
        )}
      </main>

      {/* ── 새 모임 등록 - 책 선택 모달 ── */}
      <BookPickerModal
        open={newMeetingBookModalOpen}
        books={books}
        selectedBookId={meetingForm.book_id}
        onSelect={(id) => { setMeetingForm((p) => ({ ...p, book_id: id ? String(id) : "" })); setNewMeetingBookModalOpen(false); }}
        onClose={() => setNewMeetingBookModalOpen(false)}
      />
    </div>
  );
}

// ── Book picker modal ──
function BookPickerModal({
  open, books, selectedBookId, onSelect, onClose,
}: {
  open: boolean;
  books: Book[];
  selectedBookId: string;
  onSelect: (id: number | null) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");

  const filtered = books.filter((b) => {
    const q = query.toLowerCase();
    return !q || b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q);
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl max-h-[80vh] flex flex-col gap-4">
        <DialogHeader>
          <DialogTitle>책 선택</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <Input
            className="pl-9"
            placeholder="제목 또는 저자로 검색..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>
        <div className="flex-1 overflow-y-auto min-h-0">
          {filtered.length === 0 ? (
            <p className="text-sm text-neutral-400 text-center py-8">검색 결과가 없습니다.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 pb-1">
              {filtered.map((b) => {
                const isSelected = String(b.id) === selectedBookId;
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => onSelect(b.id)}
                    className={cn(
                      "relative flex items-start gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer",
                      isSelected
                        ? "border-[#8B3A2A] bg-[#8B3A2A]/5 ring-1 ring-[#8B3A2A]/30"
                        : "border-[#E8DDD0] hover:border-[#C8B8A8] bg-white"
                    )}
                  >
                    <div className="w-10 h-14 flex-shrink-0 rounded overflow-hidden bg-[#F0EAE0] shadow-sm">
                      {b.cover_url
                        ? <img src={b.cover_url} alt={b.title} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center"><BookCopy className="w-4 h-4 text-[#C8BEB4]" /></div>}
                    </div>
                    <div className="flex-1 min-w-0 pr-5">
                      <p className="text-sm font-semibold text-[#1C1A17] leading-snug line-clamp-2">{b.title}</p>
                      <p className="text-xs text-neutral-400 mt-0.5 truncate">{b.author}</p>
                    </div>
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#8B3A2A] flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className="pt-2 border-t border-[#F0EAE0] flex justify-between items-center">
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="text-sm text-neutral-400 hover:text-neutral-600 transition-colors cursor-pointer"
          >
            선택 해제
          </button>
          <Button variant="outline" onClick={onClose} className="cursor-pointer">닫기</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Shared UI helpers ──

function SectionHeader({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3 pb-2 border-b border-[#E8DDD0]">
      <div className="w-9 h-9 rounded-lg bg-[#1C1A17] flex items-center justify-center text-white flex-shrink-0 mt-0.5">
        {icon}
      </div>
      <div>
        <h2 className="text-lg font-semibold text-[#1C1A17]">{title}</h2>
        <p className="text-sm text-neutral-400 mt-0.5">{description}</p>
      </div>
    </div>
  );
}

function FormCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-[#E8DDD0] p-5">
      <h3 className="text-xs font-bold tracking-[0.15em] uppercase text-neutral-400 mb-4">{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-neutral-500">{label}</Label>
      {children}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="bg-white/60 rounded-xl border border-dashed border-[#DDD5C8] px-6 py-8 text-center">
      <p className="text-sm text-neutral-400">{text}</p>
    </div>
  );
}

function SavedIndicator({ saved }: { saved: boolean }) {
  return (
    <span className={cn(
      "flex items-center gap-1 text-xs text-[#2A6B5E] transition-opacity duration-500",
      saved ? "opacity-100" : "opacity-0"
    )}>
      <CheckCircle2 className="w-3.5 h-3.5" />
      저장됨
    </span>
  );
}

// ── Meeting row ──
function MeetingAdminRow({
  meeting, members, books, onDelete, onSaveSummary, onSaveAttendees, onSaveBook,
}: {
  meeting: Meeting; members: Member[]; books: Book[];
  onDelete: () => void;
  onSaveSummary: (s: string) => Promise<void>;
  onSaveAttendees: (ids: number[]) => Promise<void>;
  onSaveBook: (bookId: number | null) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [summary, setSummary] = useState("");
  const [currentAttendees, setCurrentAttendees] = useState<number[]>([]);
  const [currentBookId, setCurrentBookId] = useState<number | null>(meeting.book_id);
  const [bookModalOpen, setBookModalOpen] = useState(false);

  const [summarySaved, setSummarySaved] = useState(false);
  const [attendeesSaved, setAttendeesSaved] = useState(false);
  const [bookSaved, setBookSaved] = useState(false);

  useEffect(() => {
    const ids = (meeting.attendees ?? []).filter((a) => a.member_id != null).map((a) => a.member_id!);
    setCurrentAttendees(ids);
    setCurrentBookId(meeting.book_id);
  }, [meeting]);

  const debouncedSaveSummary = useDebouncedCallback(async (val: string) => {
    await onSaveSummary(val);
    setSummarySaved(true);
    setTimeout(() => setSummarySaved(false), 2000);
  }, 1000);

  const debouncedSaveAttendees = useDebouncedCallback(async (ids: number[]) => {
    await onSaveAttendees(ids);
    setAttendeesSaved(true);
    setTimeout(() => setAttendeesSaved(false), 2000);
  }, 800);

  function handleAttendeesChange(ids: number[]) {
    setCurrentAttendees(ids);
    debouncedSaveAttendees(ids);
  }

  async function handleBookSelect(bookId: number | null) {
    setCurrentBookId(bookId);
    setBookModalOpen(false);
    await onSaveBook(bookId);
    setBookSaved(true);
    setTimeout(() => setBookSaved(false), 2000);
  }

  const currentBook = books.find((b) => b.id === currentBookId);

  return (
    <div className="bg-white rounded-xl border border-[#E8DDD0] overflow-visible">
      <div className="flex items-center gap-3 px-4 py-3">
        <button className="flex-1 text-left flex items-center gap-3 cursor-pointer min-w-0" onClick={() => setExpanded((p) => !p)}>
          <div className="w-2 h-2 rounded-full bg-[#8B3A2A] flex-shrink-0" />
          <span className="font-medium text-sm text-[#1C1A17] truncate">{meeting.title}</span>
          <span className="text-xs text-neutral-400 flex-shrink-0">
            {format(new Date(meeting.date), "M/d (EEE)", { locale: ko })}
          </span>
          {currentBook
            ? <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F0EAE0] text-[#8B7B6B] flex-shrink-0">{currentBook.title}</span>
            : <span className="text-[10px] text-neutral-300 flex-shrink-0">책 미지정</span>}
        </button>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={() => setExpanded((p) => !p)} className="p-1.5 hover:bg-neutral-100 rounded-md cursor-pointer text-neutral-400 transition-colors">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button onClick={onDelete} className="p-1.5 hover:bg-red-50 rounded-md cursor-pointer text-neutral-300 hover:text-red-400 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-[#F0EAE0] px-4 py-4 bg-[#FDFAF7] space-y-5 rounded-b-xl">
          {/* 책 선택 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold tracking-widest uppercase text-neutral-400">읽는 책</p>
              <SavedIndicator saved={bookSaved} />
            </div>
            <button
              type="button"
              onClick={() => setBookModalOpen(true)}
              className="w-full flex items-center gap-2.5 border rounded-lg px-3 py-2.5 text-sm text-left hover:bg-white transition-colors cursor-pointer bg-white/60"
            >
              {currentBook ? (
                <>
                  {currentBook.cover_url && (
                    <img src={currentBook.cover_url} className="w-7 h-10 object-cover rounded flex-shrink-0" alt="" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[#1C1A17] text-sm truncate">{currentBook.title}</p>
                    <p className="text-xs text-neutral-400 truncate">{currentBook.author}</p>
                  </div>
                  <span className="text-xs text-[#8B3A2A] flex-shrink-0">변경</span>
                </>
              ) : (
                <span className="text-neutral-400 text-xs">책 선택 (클릭하여 변경)</span>
              )}
            </button>
          </div>

          {/* 참석자 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold tracking-widest uppercase text-neutral-400">참석자</p>
              <SavedIndicator saved={attendeesSaved} />
            </div>
            <MemberMultiSelect members={members} selected={currentAttendees} onChange={handleAttendeesChange} />
          </div>

          {/* 요약 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold tracking-widest uppercase text-neutral-400">모임 요약</p>
              <SavedIndicator saved={summarySaved} />
            </div>
            <Textarea
              value={summary}
              onChange={(e) => { setSummary(e.target.value); debouncedSaveSummary(e.target.value); }}
              placeholder="모임 요약 입력..."
              rows={2}
              className="text-xs resize-none bg-white"
            />
          </div>
        </div>
      )}

      <BookPickerModal
        open={bookModalOpen}
        books={books}
        selectedBookId={currentBookId ? String(currentBookId) : ""}
        onSelect={handleBookSelect}
        onClose={() => setBookModalOpen(false)}
      />
    </div>
  );
}

// ── Book row ──
function BookAdminRow({
  book, categories, onDelete, onSave,
}: {
  book: Book; categories: Category[];
  onDelete: () => void;
  onSave: (updates: Partial<Book & { description: string }>) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [form, setForm] = useState({
    title: book.title, author: book.author,
    cover_url: book.cover_url ?? "", description: "",
    category_id: String(book.category_id ?? ""),
  });
  const [saved, setSaved] = useState(false);

  const cat = categories.find((c) => c.id === book.category_id);

  const debouncedSave = useDebouncedCallback(async (updates: typeof form) => {
    await onSave({
      title: updates.title,
      author: updates.author,
      cover_url: updates.cover_url || null,
      description: updates.description || undefined,
      category_id: updates.category_id ? Number(updates.category_id) : null,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, 1000);

  function updateForm(patch: Partial<typeof form>) {
    const next = { ...form, ...patch };
    setForm(next);
    debouncedSave(next);
  }

  return (
    <div className="bg-white rounded-xl border border-[#E8DDD0] overflow-visible">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-9 h-[52px] flex-shrink-0 rounded-md overflow-hidden bg-[#F0EAE0] shadow-sm">
          {book.cover_url
            ? <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center"><BookCopy className="w-4 h-4 text-[#C8BEB4]" /></div>}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm text-[#1C1A17] truncate">{book.title}</span>
            <span className="text-xs text-neutral-400">{book.author}</span>
            {cat && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: cat.color + "22", color: cat.color }}>
                {cat.name}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={() => setExpanded((p) => !p)}
            className="p-1.5 hover:bg-neutral-100 rounded-md cursor-pointer text-neutral-400 transition-colors">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button onClick={onDelete}
            className="p-1.5 hover:bg-red-50 rounded-md cursor-pointer text-neutral-300 hover:text-red-400 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-[#F0EAE0] px-4 py-4 bg-[#FDFAF7] space-y-3 rounded-b-xl">
          <div className="flex items-center justify-end h-5">
            <SavedIndicator saved={saved} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-neutral-400">제목</Label>
              <Input value={form.title} onChange={(e) => updateForm({ title: e.target.value })} className="h-8 text-xs bg-white" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-neutral-400">저자</Label>
              <Input value={form.author} onChange={(e) => updateForm({ author: e.target.value })} className="h-8 text-xs bg-white" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-neutral-400">표지 URL</Label>
            <Input value={form.cover_url} onChange={(e) => updateForm({ cover_url: e.target.value })} className="h-8 text-xs bg-white" placeholder="https://..." />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-neutral-400">소개</Label>
            <Textarea value={form.description} onChange={(e) => updateForm({ description: e.target.value })} rows={2} className="text-xs resize-none bg-white" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-neutral-400">카테고리</Label>
            <CategorySelect categories={categories} value={form.category_id} onChange={(v) => updateForm({ category_id: v })} />
          </div>
        </div>
      )}
    </div>
  );
}
