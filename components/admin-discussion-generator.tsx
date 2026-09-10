"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Sparkles, Eye, EyeOff, ChevronDown, Search, BookOpen, Pencil, Trash2, Check, X, RefreshCw, ShieldCheck } from "lucide-react";
import { Icon } from "@iconify/react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

// ── 타입 ──
type Book = { id: number; title: string; author: string; cover_url?: string | null; cover_url_hires?: string | null };
type Meeting = { id: number; title: string; date: string; books: Book[] };
type Review = { id: number; author_name: string; content: string; book_id: number | null };
type Discussion = {
  id: number; questions: string; is_public: boolean;
  meeting_id: number | null;
  meetings: { title: string } | null;
};

// ── 모델 목록 (input 가격 기준: $/MTok) ──
type ModelInfo = {
  value: string;
  label: string;
  badge?: string;
  inputPrice: number;
  outputPrice: number;
  /** provider 전환 시 고를 모델. 목록 순서가 바뀌어도 안 깨지도록 위치 대신 플래그로 지정한다. */
  default?: boolean;
  /** 자체 서버 목록에서만 채운다. 제공자별 소제목을 붙이기 위한 값. */
  group?: string;
  /** 실호출 확인 결과. 확인 전이면 undefined. */
  available?: boolean | null;
  reason?: string;
};

/** /api/discussion/models 응답 한 건. */
type OracleModel = {
  id: string;
  label: string;
  ownedBy: string;
  group: string;
  available: boolean | null;
  reason?: string;
};

type Provider = "claude" | "claude-oracle" | "openai";

// metered=false 는 토큰당 과금이 아니라 구독으로 나가는 경로다.
const PROVIDERS: Record<Provider, { label: string; icon: string; env: string; metered: boolean }> = {
  claude:          { label: "Anthropic", icon: "simple-icons:anthropic", env: "ANTHROPIC_API_KEY",                   metered: true  },
  "claude-oracle": { label: "Oracle",    icon: "simple-icons:oracle",    env: "CLIPROXY_BASE_URL / CLIPROXY_API_KEY", metered: false },
  openai:          { label: "OpenAI",    icon: "simple-icons:openai",    env: "OPENAI_API_KEY",                      metered: true  },
};

/** 자체 서버 목록을 못 받았을 때, 그리고 목록에 있으면 기본으로 고를 모델. */
const ORACLE_DEFAULT_MODEL = "claude-opus-5";

const MODELS: Record<Provider, ModelInfo[]> = {
  claude: [
    { value: "claude-opus-5",     label: "Claude Opus 5",     badge: "권장",     inputPrice: 5,  outputPrice: 25, default: true },
    { value: "claude-fable-5",    label: "Claude Fable 5",    badge: "최고성능", inputPrice: 10, outputPrice: 50 },
    { value: "claude-sonnet-5",   label: "Claude Sonnet 5",   inputPrice: 2,  outputPrice: 10 },
    { value: "claude-sonnet-4-6", label: "Claude Sonnet 4.6", inputPrice: 3,  outputPrice: 15 },
    { value: "claude-haiku-4-5",  label: "Claude Haiku 4.5",  badge: "빠름",     inputPrice: 1,  outputPrice: 5  },
  ],
  // 자체 서버는 목록을 /api/discussion/models 에서 받아온다(ORACLE_DEFAULT_MODEL 참고).
  // 서버가 내려갔을 때만 이 폴백을 쓴다. 구독으로 나가므로 토큰 단가는 0 이다.
  "claude-oracle": [
    { value: ORACLE_DEFAULT_MODEL, label: "Claude Opus 5", badge: "권장", inputPrice: 0, outputPrice: 0, default: true },
  ],
  openai: [
    { value: "gpt-5.4",      label: "GPT-5.4",       inputPrice: 2.50,  outputPrice: 15.00 },
    { value: "gpt-5.4-mini", label: "GPT-5.4 mini",  badge: "권장",     inputPrice: 0.75,  outputPrice: 4.50, default: true },
    { value: "gpt-5.4-nano", label: "GPT-5.4 nano",  badge: "빠름",     inputPrice: 0.20,  outputPrice: 1.25  },
    { value: "gpt-4o",       label: "GPT-4o",         inputPrice: 5.00,  outputPrice: 22.50 },
    { value: "gpt-4o-mini",  label: "GPT-4o mini",   inputPrice: 0.075, outputPrice: 0.30  },
  ],
};

function estimateCost(text: string, modelInfo: ModelInfo): number {
  return (text.length * 1.5 / 1_000_000) * modelInfo.inputPrice;
}

function buildPromptPreview(
  meeting: Meeting | null,
  selectedBook: Book | null,
  reviews: Review[],
  selectedIds: Set<number>
): string {
  if (!meeting) return "";
  const selected = reviews.filter((r) => selectedIds.has(r.id));
  const bookInfo = selectedBook
    ? `"${selectedBook.title}" (저자: ${selectedBook.author})`
    : `"${meeting.title}"`;
  const reviewsText =
    selected.length > 0
      ? selected.map((r) => `[${r.author_name}]\n${r.content}`).join("\n\n---\n\n")
      : "아직 독후감이 없습니다.";
  return `독서모임에서 ${bookInfo}를 읽었습니다.

제출된 독후감 (${selected.length}편):
${reviewsText}

위 독후감들을 바탕으로 독서모임 토론에 활용할 수 있는 질문 5개를 생성해주세요.
질문은 다양한 관점(주제, 인물, 사회적 맥락, 개인적 경험 연결 등)을 다루어야 합니다.

반드시 JSON 배열 형식으로만 답변해주세요:
["질문1", "질문2", "질문3", "질문4", "질문5"]`;
}

// ── 질문 카드 (수정/삭제 포함) ──────────────────────────────
function DiscussionCard({
  d,
  onTogglePublic,
  onSaveQuestions,
  onDelete,
}: {
  d: Discussion;
  onTogglePublic: (id: number, current: boolean) => Promise<void>;
  onSaveQuestions: (id: number, questions: string[]) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}) {
  const [qs, setQs] = useState<string[]>(() => JSON.parse(d.questions));
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editText, setEditText] = useState("");

  function startEdit(i: number) {
    setEditingIdx(i);
    setEditText(qs[i]);
  }

  function cancelEdit() {
    setEditingIdx(null);
    setEditText("");
  }

  async function saveEdit(i: number) {
    if (!editText.trim()) return;
    const next = qs.map((q, idx) => idx === i ? editText.trim() : q);
    setQs(next);
    setEditingIdx(null);
    await onSaveQuestions(d.id, next);
  }

  async function deleteQuestion(i: number) {
    const next = qs.filter((_, idx) => idx !== i);
    setQs(next);
    await onSaveQuestions(d.id, next);
    toast.success("질문이 삭제되었습니다.");
  }

  return (
    <div className="bg-white rounded-xl border border-[#E8DDD0] p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[9px] font-bold tracking-widest uppercase text-neutral-400 mb-0.5">모임</p>
          <p className="font-semibold text-sm text-[#1C1A17]">{d.meetings?.title ?? "—"}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn(
            "text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full",
            d.is_public ? "bg-[#2A6B5E]/10 text-[#2A6B5E]" : "bg-neutral-100 text-neutral-400"
          )}>
            {d.is_public ? "공개" : "비공개"}
          </span>
          <button
            onClick={() => onTogglePublic(d.id, d.is_public)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-neutral-200 hover:bg-neutral-50 transition-colors cursor-pointer text-neutral-500"
          >
            {d.is_public ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            {d.is_public ? "비공개로" : "공개로"}
          </button>
          <button
            onClick={() => { if (confirm("이 모임의 토론 질문을 모두 삭제할까요?")) onDelete(d.id); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-neutral-200 hover:bg-[#8B3A2A]/5 hover:border-[#8B3A2A]/30 hover:text-[#8B3A2A] transition-colors cursor-pointer text-neutral-500"
          >
            <Trash2 className="w-3 h-3" />
            삭제
          </button>
        </div>
      </div>

      <ol className="space-y-2">
        {qs.map((q, i) => (
          <li key={i} className="group flex gap-3 text-sm">
            <span className="text-[#8B3A2A] font-bold flex-shrink-0 pt-0.5">{i + 1}.</span>
            {editingIdx === i ? (
              <div className="flex-1 space-y-2">
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  rows={3}
                  autoFocus
                  className="w-full text-sm text-neutral-700 border border-[#C8956C] rounded-lg px-3 py-2 resize-none outline-none focus:ring-1 focus:ring-[#C8956C] leading-relaxed"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => saveEdit(i)}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-[#1C1A17] text-white text-xs font-medium cursor-pointer hover:bg-[#8B3A2A] transition-colors"
                  >
                    <Check className="w-3 h-3" />저장
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-lg border border-neutral-200 text-xs text-neutral-500 cursor-pointer hover:bg-neutral-50 transition-colors"
                  >
                    <X className="w-3 h-3" />취소
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-start justify-between gap-2">
                <span className="leading-relaxed text-neutral-600">{q}</span>
                <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => startEdit(i)}
                    className="p-1.5 rounded-md hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600 cursor-pointer transition-colors"
                    title="수정"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => deleteQuestion(i)}
                    className="p-1.5 rounded-md hover:bg-red-50 text-neutral-300 hover:text-red-400 cursor-pointer transition-colors"
                    title="삭제"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ol>
      {qs.length === 0 && (
        <p className="text-xs text-neutral-400 text-center py-3">모든 질문이 삭제되었습니다.</p>
      )}
    </div>
  );
}

export default function AdminDiscussionGenerator({
  meetings,
  discussions: initialDiscussions,
}: {
  meetings: Meeting[];
  discussions: Discussion[];
}) {
  const [tab, setTab] = useState<"generate" | "list">("generate");
  const [discussions, setDiscussions] = useState<Discussion[]>(initialDiscussions);
  useEffect(() => { setDiscussions(initialDiscussions); }, [initialDiscussions]);

  // ── 선택 상태 ──
  const [meetingId, setMeetingId] = useState("");
  const [selectedBookId, setSelectedBookId] = useState<number | null>(null);

  // ── 독후감 (meeting 전체) ──
  const [allReviews, setAllReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);

  // ── AI 설정 ──
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [provider, setProvider] = useState<Provider>("claude");
  const [model, setModel] = useState("claude-opus-5");
  const [generating, setGenerating] = useState(false);

  // ── 자체 서버 모델 목록 ──
  // 서버에 로그인된 계정이 바뀌면 쓸 수 있는 모델도 바뀐다. 코드에 박지 않고 받아온다.
  const [oracleModels, setOracleModels] = useState<OracleModel[] | null>(null);
  const [oracleError, setOracleError] = useState<string | null>(null);
  const [loadingOracle, setLoadingOracle] = useState(false);
  const [probing, setProbing] = useState(false);
  const [mode, setMode] = useState<"append" | "replace">("append");

  // ── 모달 ──
  const [meetingPickerOpen, setMeetingPickerOpen] = useState(false);
  const [meetingSearch, setMeetingSearch] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);

  // ── 환율 ──
  const [currencyKRW, setCurrencyKRW] = useState(false);
  const [usdToKrw, setUsdToKrw] = useState<number | null>(null);
  useEffect(() => {
    if (!currencyKRW || usdToKrw !== null) return;
    fetch("https://open.er-api.com/v6/latest/USD")
      .then((r) => r.json())
      .then((data) => setUsdToKrw(data?.rates?.KRW ?? null))
      .catch(() => setUsdToKrw(null));
  }, [currencyKRW, usdToKrw]);

  function formatCost(usd: number) {
    if (!currencyKRW || usdToKrw === null) return usd < 0.001 ? "<$0.001" : `$${usd.toFixed(4)}`;
    const krw = usd * usdToKrw;
    return krw < 1 ? "<₩1" : `₩${Math.round(krw).toLocaleString()}`;
  }
  function formatInputPrice(usdPerMTok: number) {
    if (!currencyKRW || usdToKrw === null) return `$${usdPerMTok}/MTok`;
    return `₩${Math.round(usdPerMTok * usdToKrw).toLocaleString()}/MTok`;
  }

  const selectedMeeting = meetings.find((m) => String(m.id) === meetingId) ?? null;
  // 한 모임 = 한 행이므로 첫 매치가 그 모임의 질문 카드다.
  const existingDiscussion = meetingId
    ? discussions.find((d) => d.meeting_id === Number(meetingId)) ?? null
    : null;
  const existingCount = existingDiscussion ? (JSON.parse(existingDiscussion.questions) as string[]).length : 0;
  const selectedBook = selectedMeeting?.books.find((b) => b.id === selectedBookId) ?? null;

  // 모임 변경 → 독후감 로드, 책 초기화
  useEffect(() => {
    if (!meetingId) { setAllReviews([]); setSelectedIds(new Set()); setSelectedBookId(null); return; }
    setLoadingReviews(true);
    setSelectedBookId(null);
    fetch(`/api/meetings/${meetingId}`)
      .then((r) => r.json())
      .then((data) => {
        const rv: Review[] = data.reviews ?? [];
        setAllReviews(rv);
        setSelectedIds(new Set(rv.map((r: Review) => r.id)));
      })
      .finally(() => setLoadingReviews(false));
  }, [meetingId]);

  // 책 선택 변경 → 해당 책의 독후감만 선택
  useEffect(() => {
    if (selectedBookId === null) {
      setSelectedIds(new Set(allReviews.map((r) => r.id)));
    } else {
      const bookReviews = allReviews.filter((r) => r.book_id === selectedBookId);
      setSelectedIds(new Set(bookReviews.map((r) => r.id)));
    }
  }, [selectedBookId, allReviews]);

  // 자체 서버 목록 조회. probe=1 이면 각 모델에 실제로 찔러보고 사용 가능 여부까지 채운다.
  const loadOracleModels = useCallback(async (probe: boolean) => {
    const setBusy = probe ? setProbing : setLoadingOracle;
    setBusy(true);
    try {
      const res = await fetch(`/api/discussion/models${probe ? "?probe=1" : ""}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? `HTTP ${res.status}`);
      setOracleModels(body.models as OracleModel[]);
      setOracleError(null);
      return body.models as OracleModel[];
    } catch (e) {
      // 목록을 못 받아도 폴백 모델로 생성은 되어야 한다. 막지 않고 알리기만 한다.
      setOracleError(e instanceof Error ? e.message : String(e));
      return null;
    } finally {
      setBusy(false);
    }
  }, []);

  // 자체 서버를 처음 고르는 순간 한 번만 받아온다.
  useEffect(() => {
    if (provider !== "claude-oracle" || oracleModels || loadingOracle) return;
    loadOracleModels(false);
  }, [provider, oracleModels, loadingOracle, loadOracleModels]);

  // 현재 provider 에서 고를 수 있는 모델. 자체 서버는 받아온 목록이 있으면 그걸 쓴다.
  const modelOptions: ModelInfo[] = useMemo(() => {
    if (provider !== "claude-oracle" || !oracleModels) return MODELS[provider];
    if (oracleModels.length === 0) return MODELS[provider];
    return oracleModels.map((m) => ({
      value: m.id,
      label: m.label,
      badge: m.id === ORACLE_DEFAULT_MODEL ? "권장" : undefined,
      inputPrice: 0,
      outputPrice: 0,
      default: m.id === ORACLE_DEFAULT_MODEL,
      group: m.group,
      available: m.available,
      reason: m.reason,
    }));
  }, [provider, oracleModels]);

  // 고를 수 있는 목록이 바뀌면(provider 전환, 자체 서버 목록 도착) 기본 모델로 맞춘다.
  // 이미 고른 모델이 새 목록에도 있으면 그대로 둔다.
  useEffect(() => {
    setModel((current) => {
      if (modelOptions.some((m) => m.value === current)) return current;
      return (modelOptions.find((m) => m.default) ?? modelOptions[0])?.value ?? "";
    });
  }, [modelOptions]);

  // 현재 표시할 독후감 (책 선택 시 필터)
  const visibleReviews = selectedBookId !== null
    ? allReviews.filter((r) => r.book_id === selectedBookId)
    : allReviews;

  const filteredMeetings = useMemo(() => {
    const q = meetingSearch.trim().toLowerCase();
    const filtered = q
      ? meetings.filter((m) =>
          m.title.toLowerCase().includes(q) ||
          m.books.some((b) => b.title.toLowerCase().includes(q)) ||
          format(new Date(m.date), "yyyy.M.d").includes(q)
        )
      : [...meetings];
    return filtered.sort((a, b) => b.date.localeCompare(a.date));
  }, [meetings, meetingSearch]);

  function toggleReview(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selectedIds.size === visibleReviews.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(visibleReviews.map((r) => r.id)));
  }

  async function generate() {
    if (!meetingId) { toast.error("모임을 선택해주세요."); return; }
    setGenerating(true);
    toast.info("AI가 토론 질문을 생성 중입니다...");
    const res = await fetch("/api/discussion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        meeting_id: Number(meetingId),
        book_id: selectedBookId ?? undefined,
        review_ids: selectedIds.size > 0 ? [...selectedIds] : undefined,
        provider,
        model,
        mode,
      }),
    });
    if (res.ok) {
      const saved = await res.json();
      const card = { ...saved, meetings: selectedMeeting ? { title: selectedMeeting.title } : null };
      // 한 모임은 한 행이다. 이미 있으면 새로 쌓지 않고 그 자리에서 갱신한다.
      setDiscussions((prev) =>
        prev.some((d) => d.id === card.id) ? prev.map((d) => (d.id === card.id ? card : d)) : [card, ...prev]
      );
      toast.success(existingDiscussion ? "토론 질문이 갱신되었습니다." : "토론 질문 생성 완료!");
      setTab("list");
    } else {
      const text = await res.text();
      let message = "오류가 발생했습니다.";
      try { message = JSON.parse(text)?.error ?? message; } catch {}
      toast.error(message);
    }
    setGenerating(false);
  }

  async function saveQuestions(id: number, newQuestions: string[]) {
    const res = await fetch("/api/discussion", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, questions: newQuestions }),
    });
    if (res.ok) {
      // 질문을 전부 지우면 서버가 행째로 지운다. 목록에서도 카드를 뺀다.
      if (newQuestions.length === 0) setDiscussions((prev) => prev.filter((d) => d.id !== id));
      else setDiscussions((prev) =>
        prev.map((d) => d.id === id ? { ...d, questions: JSON.stringify(newQuestions) } : d)
      );
    } else {
      toast.error("저장 실패");
    }
  }

  async function deleteDiscussion(id: number) {
    const res = await fetch(`/api/discussion?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setDiscussions((prev) => prev.filter((d) => d.id !== id));
      toast.success("삭제되었습니다.");
    } else {
      toast.error("삭제 실패");
    }
  }

  async function togglePublic(id: number, current: boolean) {
    const res = await fetch("/api/discussion", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, is_public: !current }),
    });
    if (res.ok) {
      setDiscussions((prev) => prev.map((d) => d.id === id ? { ...d, is_public: !current } : d));
      toast.success(current ? "비공개로 변경" : "공개로 변경");
    }
  }

  const promptPreview = buildPromptPreview(selectedMeeting, selectedBook, visibleReviews, selectedIds);

  const canGenerate =
    !!meetingId &&
    !loadingReviews &&
    (visibleReviews.length === 0 || selectedIds.size > 0) &&
    !!model;

  return (
    <div className="space-y-6">
      {/* ── 탭 헤더 ── */}
      <div className="flex gap-1 bg-neutral-100 rounded-lg p-1 w-fit">
        {([
          { id: "generate", label: "질문 생성" },
          { id: "list",     label: `생성 목록 ${discussions.length > 0 ? `(${discussions.length})` : ""}` },
        ] as const).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "px-5 py-2 rounded-md text-sm font-medium transition-all cursor-pointer",
              tab === t.id ? "bg-white text-[#1C1A17] shadow-sm" : "text-neutral-500 hover:text-neutral-700"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── 생성 탭 ── */}
      {tab === "generate" && (
        <div className="bg-white rounded-xl border border-[#E8DDD0] overflow-hidden">

          {/* 1. 모임 선택 */}
          <div className="p-5 border-b border-[#F0EAE0]">
            <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-neutral-400 mb-3">1. 모임 선택</p>
            <button
              type="button"
              onClick={() => { setMeetingSearch(""); setMeetingPickerOpen(true); }}
              className="w-full flex items-center justify-between border border-neutral-200 rounded-lg px-3 py-2.5 text-sm bg-white hover:border-neutral-400 transition-colors cursor-pointer text-left"
            >
              {selectedMeeting ? (
                <span className="text-[#1C1A17] font-medium truncate">
                  {format(new Date(selectedMeeting.date), "yyyy.M.d", { locale: ko })} — {selectedMeeting.title}
                </span>
              ) : (
                <span className="text-neutral-400">모임을 선택하세요</span>
              )}
              <ChevronDown className="w-4 h-4 text-neutral-400 flex-shrink-0 ml-2" />
            </button>
          </div>

          {/* 2. 책 선택 (책이 2권 이상일 때만) */}
          {selectedMeeting && selectedMeeting.books.length >= 2 && (
            <div className="p-5 border-b border-[#F0EAE0]">
              <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-neutral-400 mb-3">2. 책 선택</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedBookId(null)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all cursor-pointer",
                    selectedBookId === null
                      ? "border-[#1C1A17] bg-[#1C1A17] text-white"
                      : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-400"
                  )}
                >
                  전체
                </button>
                {selectedMeeting.books.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setSelectedBookId(b.id)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all cursor-pointer",
                      selectedBookId === b.id
                        ? "border-[#1C1A17] bg-[#1C1A17] text-white"
                        : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-400"
                    )}
                  >
                    {(b.cover_url_hires ?? b.cover_url) && (
                      <img
                        src={b.cover_url_hires ?? b.cover_url!}
                        alt={b.title}
                        className="w-5 h-7 object-cover rounded-sm flex-shrink-0"
                      />
                    )}
                    <span className="truncate max-w-[160px]">{b.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 3. 독후감 선택 */}
          <div className="p-5 border-b border-[#F0EAE0]">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-neutral-400">
                {(selectedMeeting?.books?.length ?? 0) >= 2 ? "3." : "2."} 독후감 선택
              </p>
              {visibleReviews.length > 0 && (
                <button type="button" onClick={toggleAll} className="text-xs text-[#8B3A2A] hover:underline cursor-pointer">
                  {selectedIds.size === visibleReviews.length ? "전체 해제" : "전체 선택"}
                </button>
              )}
            </div>

            {!meetingId ? (
              <p className="text-xs text-neutral-300 py-2">모임을 먼저 선택해주세요.</p>
            ) : loadingReviews ? (
              <p className="text-xs text-neutral-400 py-2">불러오는 중...</p>
            ) : visibleReviews.length === 0 ? (
              <p className="text-xs text-neutral-400 py-2">
                {selectedBookId !== null ? "이 책에 해당하는 독후감이 없습니다." : "이 모임에 독후감이 없습니다."} 독후감 없이 진행합니다.
              </p>
            ) : (
              <div>
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                  {visibleReviews.map((r) => {
                    const selected = selectedIds.has(r.id);
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => toggleReview(r.id)}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-2.5 rounded-lg border text-sm transition-all cursor-pointer truncate",
                          selected
                            ? "border-neutral-400 text-[#1C1A17] font-semibold"
                            : "border-neutral-200 text-neutral-300 font-normal"
                        )}
                      >
                        <span className={cn("flex-shrink-0 w-3.5 h-3.5 rounded-sm border flex items-center justify-center",
                          selected ? "border-[#1C1A17] bg-[#1C1A17]" : "border-neutral-200"
                        )}>
                          {selected && <svg viewBox="0 0 10 8" className="w-2 h-2 text-white fill-none stroke-current stroke-[1.5]"><polyline points="1,4 4,7 9,1"/></svg>}
                        </span>
                        {r.author_name}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-neutral-400 mt-2">{selectedIds.size}/{visibleReviews.length}편 선택됨</p>
              </div>
            )}
          </div>

          {/* 4. AI 설정 */}
          <div className="p-5 border-b border-[#F0EAE0]">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-neutral-400">
                {(selectedMeeting?.books?.length ?? 0) >= 2 ? "4." : "3."} AI 설정
              </p>
              <button
                type="button"
                onClick={() => setCurrencyKRW((v) => !v)}
                className="flex items-center gap-1 text-[10px] font-bold tracking-widest uppercase px-2 py-1 rounded-md border border-neutral-200 hover:border-neutral-400 transition-colors cursor-pointer text-neutral-500"
              >
                {currencyKRW ? "₩ KRW" : "$ USD"}
                {currencyKRW && usdToKrw === null && <span className="text-neutral-300 ml-1">로딩중</span>}
                {currencyKRW && usdToKrw !== null && (
                  <span className="text-neutral-300 ml-1 normal-case font-normal">≈{Math.round(usdToKrw).toLocaleString()}원</span>
                )}
              </button>
            </div>
            <div className="space-y-4">
              <div className="flex gap-1 bg-neutral-100 rounded-lg p-1 w-fit">
                {(Object.keys(PROVIDERS) as Provider[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setProvider(p)}
                    className={cn(
                      "flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-all cursor-pointer",
                      provider === p ? "bg-white text-[#1C1A17] shadow-sm" : "text-neutral-500 hover:text-neutral-700"
                    )}
                  >
                    <Icon icon={PROVIDERS[p].icon} className="w-3.5 h-3.5" />
                    {PROVIDERS[p].label}
                    {!PROVIDERS[p].metered && (
                      <span className="text-[9px] font-bold tracking-widest uppercase text-[#8B3A2A]">구독</span>
                    )}
                  </button>
                ))}
              </div>

              {provider === "claude-oracle" && (
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => loadOracleModels(false)}
                    disabled={loadingOracle || probing}
                    className="flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-md border border-neutral-200 hover:border-neutral-400 transition-colors cursor-pointer text-neutral-500 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <RefreshCw className={cn("w-3 h-3", loadingOracle && "animate-spin")} />
                    목록 새로고침
                  </button>
                  <button
                    type="button"
                    onClick={() => loadOracleModels(true)}
                    disabled={loadingOracle || probing}
                    className="flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-md border border-neutral-200 hover:border-neutral-400 transition-colors cursor-pointer text-neutral-500 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ShieldCheck className={cn("w-3 h-3", probing && "animate-pulse")} />
                    {probing ? "확인 중" : "사용 가능 확인"}
                  </button>
                  <span className="text-[11px] text-neutral-400">
                    {oracleModels
                      ? `서버가 서빙하는 모델 ${oracleModels.length}개`
                      : loadingOracle
                        ? "목록 불러오는 중…"
                        : "목록 미조회"}
                  </span>
                </div>
              )}

              {oracleError && provider === "claude-oracle" && (
                <p className="text-[11px] text-[#8B3A2A] bg-[#8B3A2A]/5 border border-[#8B3A2A]/20 rounded-lg px-3 py-2">
                  {oracleError} — 아래 폴백 목록으로 계속 생성할 수 있습니다.
                </p>
              )}

              <div className="space-y-1.5">
                {modelOptions.map((m, i) => {
                  const reviewsText = visibleReviews.filter((r) => selectedIds.has(r.id)).map((r) => r.content).join(" ");
                  const cost = estimateCost(reviewsText, m);
                  const isSelected = model === m.value;
                  // 확인 결과 거절된 모델은 고르지 못하게 막는다. 고르면 생성이 실패한다.
                  const blocked = m.available === false;
                  // 제공자가 바뀌는 지점에만 소제목을 넣는다.
                  const heading = m.group && m.group !== modelOptions[i - 1]?.group ? m.group : null;
                  return (
                    <div key={m.value}>
                      {heading && (
                        <p className="text-[9px] font-bold tracking-widest uppercase text-neutral-400 mt-3 mb-1.5 first:mt-0">
                          {heading}
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() => setModel(m.value)}
                        disabled={blocked}
                        title={blocked ? m.reason : undefined}
                        className={cn(
                          "w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg border text-left transition-all cursor-pointer",
                          blocked
                            ? "border-neutral-200 bg-neutral-50 text-neutral-400 cursor-not-allowed"
                            : isSelected
                              ? "border-[#1C1A17] bg-[#1C1A17] text-white"
                              : "border-neutral-200 bg-white hover:border-neutral-400 text-[#1C1A17]"
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Icon
                            icon={PROVIDERS[provider].icon}
                            className={cn("w-4 h-4 flex-shrink-0", isSelected && !blocked ? "text-white/70" : "text-neutral-400")}
                          />
                          <span className="text-sm font-medium truncate">{m.label}</span>
                          {m.badge && !blocked && (
                            <span className={cn(
                              "text-[9px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded-full flex-shrink-0",
                              isSelected ? "bg-white/20 text-white" : "bg-neutral-100 text-neutral-500"
                            )}>
                              {m.badge}
                            </span>
                          )}
                          {m.available === true && (
                            <Check className="w-3 h-3 flex-shrink-0 text-[#2A6B5E]" />
                          )}
                          {blocked && (
                            <span className="text-[9px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded-full flex-shrink-0 bg-[#8B3A2A]/10 text-[#8B3A2A]">
                              사용 불가
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                          <div className="text-right w-[88px]">
                            {PROVIDERS[provider].metered ? (
                              <>
                                <p className={cn("text-[10px]", isSelected ? "text-white/60" : "text-neutral-400")}>
                                  입력 {formatInputPrice(m.inputPrice)}
                                </p>
                                <p className={cn("text-[10px] mt-0.5", isSelected ? "text-white/40" : "text-neutral-300")}>예상 비용</p>
                                <p className={cn("text-[11px] font-semibold", isSelected ? "text-white" : "text-[#8B3A2A]")}>
                                  {reviewsText.length > 0 ? `≈ ${formatCost(cost)}` : "—"}
                                </p>
                              </>
                            ) : (
                              <>
                                <p className={cn("text-[10px]", isSelected && !blocked ? "text-white/60" : "text-neutral-400")}>자체 서버</p>
                                <p className={cn("text-[10px] mt-0.5", isSelected && !blocked ? "text-white/40" : "text-neutral-300")}>추가 비용</p>
                                <p className={cn("text-[11px] font-semibold", isSelected && !blocked ? "text-white" : "text-[#8B3A2A]")}>없음</p>
                              </>
                            )}
                          </div>
                          {isSelected && !blocked && <div className="w-1.5 h-1.5 rounded-full bg-white flex-shrink-0" />}
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>

              <p className="text-[11px] text-neutral-400">
                API 키는 서버 환경변수({PROVIDERS[provider].env})에서 읽어옵니다.
              </p>
            </div>
          </div>

          {/* 액션 버튼 */}
          {existingCount > 0 && (
            <div className="px-5 pb-1 flex items-center gap-3 flex-wrap">
              <span className="text-xs text-neutral-500">
                이 모임에 질문 {existingCount}개가 이미 있습니다.
              </span>
              <div className="flex gap-1 bg-neutral-100 rounded-lg p-1">
                {([
                  { v: "append",  label: "이어붙이기" },
                  { v: "replace", label: "덮어쓰기" },
                ] as const).map((o) => (
                  <button
                    key={o.v}
                    type="button"
                    onClick={() => setMode(o.v)}
                    className={cn(
                      "px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer",
                      mode === o.v ? "bg-white text-[#1C1A17] shadow-sm" : "text-neutral-500 hover:text-neutral-700"
                    )}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              <span className="text-[11px] text-neutral-400">
                {mode === "append"
                  ? "기존 질문 뒤에 추가합니다. 중복은 자동으로 걸러집니다."
                  : "기존 질문을 버리고 새로 만든 질문으로 교체합니다."}
              </span>
            </div>
          )}

          <div className="p-5 flex items-center gap-3">
            <Button
              onClick={generate}
              disabled={generating || !canGenerate}
              className="bg-[#1C1A17] hover:bg-[#8B3A2A] transition-colors cursor-pointer gap-1.5"
            >
              <Sparkles className="w-4 h-4" />
              {generating ? "생성 중..." : existingCount > 0 ? (mode === "append" ? "질문 이어붙이기" : "질문 덮어쓰기") : "AI 질문 생성"}
            </Button>
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              disabled={!canGenerate}
              className="flex items-center gap-1.5 px-4 py-2 text-sm border border-neutral-200 rounded-lg text-neutral-500 hover:border-neutral-400 hover:text-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <Eye className="w-4 h-4" />
              프롬프트 미리보기
            </button>
          </div>
        </div>
      )}

      {/* ── 목록 탭 ── */}
      {tab === "list" && (
        <div className="space-y-3">
          {discussions.map((d) => (
            <DiscussionCard key={d.id} d={d} onTogglePublic={togglePublic} onSaveQuestions={saveQuestions} onDelete={deleteDiscussion} />
          ))}
          {discussions.length === 0 && (
            <div className="bg-white/60 rounded-xl border border-dashed border-[#DDD5C8] px-6 py-8 text-center">
              <p className="text-sm text-neutral-400">생성된 토론 질문이 없습니다.</p>
            </div>
          )}
        </div>
      )}

      {/* ── 모임 선택 모달 ── */}
      <Dialog open={meetingPickerOpen} onOpenChange={setMeetingPickerOpen}>
        <DialogContent className="sm:max-w-none w-[min(1200px,95vw)] max-h-[88vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-8 pt-7 pb-4 border-b border-neutral-100">
            <DialogTitle className="text-xl font-bold">모임 선택</DialogTitle>
          </DialogHeader>
          <div className="px-8 py-4 border-b border-neutral-100">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 pointer-events-none" />
              <input
                type="text"
                placeholder="모임명, 도서명, 날짜로 검색..."
                value={meetingSearch}
                onChange={(e) => setMeetingSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:border-[#1C1A17] bg-white"
                autoFocus
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto min-h-0 p-6">
            {filteredMeetings.length === 0 ? (
              <p className="text-sm text-neutral-400 text-center py-12">검색 결과가 없습니다.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {filteredMeetings.map((m) => {
                  const firstBook = m.books[0] ?? null;
                  const isSelected = meetingId === String(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => { setMeetingId(String(m.id)); setMeetingPickerOpen(false); }}
                      className={cn(
                        "flex items-center gap-4 px-5 py-4 rounded-xl text-left transition-colors cursor-pointer border",
                        isSelected
                          ? "bg-[#F0EAE0] border-[#C8B8A8]"
                          : "bg-white border-neutral-100 hover:bg-neutral-50 hover:border-neutral-200"
                      )}
                    >
                      <div className="flex-shrink-0 w-[44px] h-[62px] bg-[#E8DDD0] overflow-hidden rounded shadow-sm">
                        {(firstBook?.cover_url_hires ?? firstBook?.cover_url) ? (
                          <img src={firstBook!.cover_url_hires ?? firstBook!.cover_url!} alt={firstBook!.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <BookOpen className="w-4 h-4 text-[#B8A898]" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] text-neutral-400 mb-0.5">
                          {format(new Date(m.date), "yyyy년 M월 d일", { locale: ko })}
                        </p>
                        <p className="text-sm font-semibold text-[#1C1A17] truncate">{m.title}</p>
                        {m.books.length > 0 && (
                          <p className="text-xs text-neutral-400 truncate mt-0.5">{m.books.map((b) => b.title).join(", ")}</p>
                        )}
                      </div>
                      {isSelected && <div className="w-2 h-2 rounded-full bg-[#8B3A2A] flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <div className="px-8 py-4 border-t border-neutral-100 flex justify-between items-center">
            <span className="text-xs text-neutral-400">전체 {meetings.length}개 모임 · 날짜 최신순</span>
            <button onClick={() => setMeetingPickerOpen(false)} className="text-sm text-neutral-500 hover:text-neutral-800 cursor-pointer">닫기</button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── 프롬프트 미리보기 모달 ── */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">프롬프트 미리보기</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto min-h-0">
            <pre className="text-xs text-neutral-700 whitespace-pre-wrap leading-relaxed bg-neutral-50 rounded-lg p-4 border border-neutral-200">
              {promptPreview || "모임을 선택하면 프롬프트를 미리볼 수 있습니다."}
            </pre>
          </div>
          <div className="pt-3 border-t border-neutral-100 flex justify-between items-center text-xs text-neutral-400">
            <span>{PROVIDERS[provider].label} · {model} · 독후감 {selectedIds.size}편 포함</span>
            <button onClick={() => setPreviewOpen(false)} className="text-neutral-500 hover:text-neutral-800 cursor-pointer">닫기</button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
