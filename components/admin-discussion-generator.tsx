"use client";

import { useState, useEffect, useMemo } from "react";
import { Sparkles, Eye, EyeOff, ChevronDown, Search, BookOpen } from "lucide-react";
import { Icon } from "@iconify/react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

// ── 타입 ──
type Meeting = { id: number; title: string; date: string; books: { title: string; author: string; cover_url?: string | null } | null };
type Review = { id: number; author_name: string; content: string };
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
  inputPrice: number;   // $ per 1M tokens
  outputPrice: number;
};

const MODELS: Record<"claude" | "openai", ModelInfo[]> = {
  claude: [
    { value: "claude-opus-4-6",            label: "Claude Opus 4.6",          inputPrice: 5,   outputPrice: 25  },
    { value: "claude-opus-4-5",            label: "Claude Opus 4.5",          inputPrice: 5,   outputPrice: 25  },
    { value: "claude-sonnet-4-6",          label: "Claude Sonnet 4.6",        badge: "권장",   inputPrice: 3,   outputPrice: 15  },
    { value: "claude-sonnet-4-5",          label: "Claude Sonnet 4.5",        inputPrice: 3,   outputPrice: 15  },
    { value: "claude-haiku-4-5-20251001",  label: "Claude Haiku 4.5",         badge: "빠름",   inputPrice: 1,   outputPrice: 5   },
  ],
  openai: [
    { value: "gpt-5.4",      label: "GPT-5.4",       inputPrice: 2.50,  outputPrice: 15.00 },
    { value: "gpt-5.4-mini", label: "GPT-5.4 mini",  badge: "권장",  inputPrice: 0.75,  outputPrice: 4.50  },
    { value: "gpt-5.4-nano", label: "GPT-5.4 nano",  badge: "빠름",  inputPrice: 0.20,  outputPrice: 1.25  },
    { value: "gpt-4o",       label: "GPT-4o",        inputPrice: 5.00,  outputPrice: 22.50 },
    { value: "gpt-4o-mini",  label: "GPT-4o mini",   inputPrice: 0.075, outputPrice: 0.30  },
  ],
};

// 한국어 1글자 ≈ 1.5 토큰, 영어는 ≈ 0.25토큰. 독후감은 주로 한국어이므로 1.5 사용
function estimateCost(text: string, modelInfo: ModelInfo): number {
  const tokens = text.length * 1.5;
  return (tokens / 1_000_000) * modelInfo.inputPrice;
}

function buildPromptPreview(
  meeting: Meeting | null,
  reviews: Review[],
  selectedIds: Set<number>
): string {
  if (!meeting) return "";
  const selected = reviews.filter((r) => selectedIds.has(r.id));
  const bookInfo = meeting.books
    ? `"${meeting.books.title}" (저자: ${meeting.books.author})`
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

export default function AdminDiscussionGenerator({
  meetings,
  discussions: initialDiscussions,
}: {
  meetings: Meeting[];
  discussions: Discussion[];
}) {
  const [discussions, setDiscussions] = useState<Discussion[]>(initialDiscussions);

  // 설정
  const [meetingId, setMeetingId] = useState("");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [provider, setProvider] = useState<"claude" | "openai">("claude");
  const [model, setModel] = useState("claude-sonnet-4-6");
  const [generating, setGenerating] = useState(false);

  // 모임 선택 모달
  const [meetingPickerOpen, setMeetingPickerOpen] = useState(false);
  const [meetingSearch, setMeetingSearch] = useState("");

  // 환율
  const [currencyKRW, setCurrencyKRW] = useState(false);
  const [usdToKrw, setUsdToKrw] = useState<number | null>(null);

  useEffect(() => {
    if (!currencyKRW || usdToKrw !== null) return;
    fetch("https://open.er-api.com/v6/latest/USD")
      .then((r) => r.json())
      .then((data) => setUsdToKrw(data?.rates?.KRW ?? null))
      .catch(() => setUsdToKrw(null));
  }, [currencyKRW, usdToKrw]);

  function formatCost(usd: number): string {
    if (!currencyKRW || usdToKrw === null) {
      return usd < 0.001 ? "<$0.001" : `$${usd.toFixed(4)}`;
    }
    const krw = usd * usdToKrw;
    return krw < 1 ? "<₩1" : `₩${Math.round(krw).toLocaleString()}`;
  }

  function formatInputPrice(usdPerMTok: number): string {
    if (!currencyKRW || usdToKrw === null) return `$${usdPerMTok}/MTok`;
    return `₩${Math.round(usdPerMTok * usdToKrw).toLocaleString()}/MTok`;
  }

  // 프롬프트 미리보기 모달
  const [previewOpen, setPreviewOpen] = useState(false);

  const filteredMeetings = useMemo(() => {
    const q = meetingSearch.trim().toLowerCase();
    if (!q) return meetings;
    return meetings.filter((m) =>
      m.title.toLowerCase().includes(q) ||
      m.books?.title.toLowerCase().includes(q) ||
      format(new Date(m.date), "yyyy.M.d").includes(q)
    );
  }, [meetings, meetingSearch]);

  const selectedMeeting = meetings.find((m) => String(m.id) === meetingId) ?? null;

  // 모임 변경 → 독후감 로드
  useEffect(() => {
    if (!meetingId) { setReviews([]); setSelectedIds(new Set()); return; }
    setLoadingReviews(true);
    fetch(`/api/meetings/${meetingId}`)
      .then((r) => r.json())
      .then((data) => {
        const rv: Review[] = data.reviews ?? [];
        setReviews(rv);
        setSelectedIds(new Set(rv.map((r: Review) => r.id)));
      })
      .finally(() => setLoadingReviews(false));
  }, [meetingId]);

  // provider 변경 → 기본 모델 세팅
  useEffect(() => {
    setModel(MODELS[provider][1].value); // 두 번째(권장) 선택
  }, [provider]);

  function toggleReview(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selectedIds.size === reviews.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(reviews.map((r) => r.id)));
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
        review_ids: selectedIds.size > 0 ? [...selectedIds] : undefined,
        provider,
        model,
      }),
    });
    if (res.ok) {
      const created = await res.json();
      setDiscussions((prev) => [{ ...created, meetings: selectedMeeting ? { title: selectedMeeting.title } : null }, ...prev]);
      toast.success("토론 질문 생성 완료!");
    } else {
      const { error } = await res.json();
      toast.error(error ?? "오류가 발생했습니다.");
    }
    setGenerating(false);
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

  const promptPreview = buildPromptPreview(selectedMeeting, reviews, selectedIds);

  return (
    <div className="space-y-6">
      {/* ── 생성 폼 ── */}
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
                {selectedMeeting.books ? ` · ${selectedMeeting.books.title}` : ""}
              </span>
            ) : (
              <span className="text-neutral-400">모임을 선택하세요</span>
            )}
            <ChevronDown className="w-4 h-4 text-neutral-400 flex-shrink-0 ml-2" />
          </button>
        </div>

        {/* 2. 독후감 선택 */}
        <div className="p-5 border-b border-[#F0EAE0]">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-neutral-400">2. 독후감 선택</p>
            {reviews.length > 0 && (
              <button
                type="button"
                onClick={toggleAll}
                className="text-xs text-[#8B3A2A] hover:underline cursor-pointer"
              >
                {selectedIds.size === reviews.length ? "전체 해제" : "전체 선택"}
              </button>
            )}
          </div>

          {!meetingId ? (
            <p className="text-xs text-neutral-300 py-2">모임을 먼저 선택해주세요.</p>
          ) : loadingReviews ? (
            <p className="text-xs text-neutral-400 py-2">불러오는 중...</p>
          ) : reviews.length === 0 ? (
            <p className="text-xs text-neutral-400 py-2">이 모임에 독후감이 없습니다. 독후감 없이 진행합니다.</p>
          ) : (
            <div>
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                {reviews.map((r) => {
                  const selected = selectedIds.has(r.id);
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => toggleReview(r.id)}
                      className={cn(
                        "px-3 py-2.5 rounded-lg border text-sm font-medium text-center transition-all cursor-pointer truncate",
                        selected
                          ? "border-[#1C1A17] bg-[#1C1A17] text-white"
                          : "border-neutral-200 bg-white text-neutral-500 hover:border-neutral-400"
                      )}
                    >
                      {r.author_name}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-neutral-400 mt-2">
                {selectedIds.size}/{reviews.length}편 선택됨
              </p>
            </div>
          )}
        </div>

        {/* 3. Provider + Model */}
        <div className="p-5 border-b border-[#F0EAE0]">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-neutral-400">3. AI 설정</p>
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
            {/* Provider 탭 */}
            <div className="flex gap-1 bg-neutral-100 rounded-lg p-1 w-fit">
              {(["claude", "openai"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setProvider(p)}
                  className={cn(
                    "flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-all cursor-pointer",
                    provider === p ? "bg-white text-[#1C1A17] shadow-sm" : "text-neutral-500 hover:text-neutral-700"
                  )}
                >
                  <Icon
                    icon={p === "claude" ? "simple-icons:anthropic" : "simple-icons:openai"}
                    className="w-3.5 h-3.5"
                  />
                  {p === "claude" ? "Claude" : "OpenAI"}
                </button>
              ))}
            </div>

            {/* 모델 카드 목록 */}
            <div className="space-y-1.5">
              {MODELS[provider].map((m) => {
                const reviewsText = reviews
                  .filter((r) => selectedIds.has(r.id))
                  .map((r) => r.content)
                  .join(" ");
                const cost = estimateCost(reviewsText, m);
                const isSelected = model === m.value;
                return (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setModel(m.value)}
                    className={cn(
                      "w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg border text-left transition-all cursor-pointer",
                      isSelected
                        ? "border-[#1C1A17] bg-[#1C1A17] text-white"
                        : "border-neutral-200 bg-white hover:border-neutral-400 text-[#1C1A17]"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        icon={provider === "claude" ? "simple-icons:anthropic" : "simple-icons:openai"}
                        className={cn("w-4 h-4 flex-shrink-0", isSelected ? "text-white/70" : "text-neutral-400")}
                      />
                      <span className="text-sm font-medium truncate">{m.label}</span>
                      {m.badge && (
                        <span className={cn(
                          "text-[9px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded-full flex-shrink-0",
                          isSelected ? "bg-white/20 text-white" : "bg-neutral-100 text-neutral-500"
                        )}>
                          {m.badge}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                      <div className="text-right w-[88px]">
                        <p className={cn("text-[10px]", isSelected ? "text-white/60" : "text-neutral-400")}>
                          입력 {formatInputPrice(m.inputPrice)}
                        </p>
                        <p className={cn("text-[10px] mt-0.5", isSelected ? "text-white/40" : "text-neutral-300")}>
                          예상 비용
                        </p>
                        <p className={cn("text-[11px] font-semibold", isSelected ? "text-white" : "text-[#8B3A2A]")}>
                          {reviewsText.length > 0 ? `≈ ${formatCost(cost)}` : "—"}
                        </p>
                      </div>
                      {isSelected && (
                        <div className="w-1.5 h-1.5 rounded-full bg-white flex-shrink-0" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* API 키 안내 */}
            <p className="text-[11px] text-neutral-400">
              API 키는 서버 환경변수({provider === "claude" ? "ANTHROPIC_API_KEY" : "OPENAI_API_KEY"})에서 읽어옵니다.
            </p>
          </div>
        </div>

        {/* 4. 액션 버튼 */}
        <div className="p-5 flex items-center gap-3">
          <Button
            onClick={generate}
            disabled={generating || !meetingId}
            className="bg-[#1C1A17] hover:bg-[#8B3A2A] transition-colors cursor-pointer gap-1.5"
          >
            <Sparkles className="w-4 h-4" />
            {generating ? "생성 중..." : "AI 질문 생성"}
          </Button>
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            disabled={!meetingId}
            className="flex items-center gap-1.5 px-4 py-2 text-sm border border-neutral-200 rounded-lg text-neutral-500 hover:border-neutral-400 hover:text-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <Eye className="w-4 h-4" />
            프롬프트 미리보기
          </button>
        </div>
      </div>

      {/* ── 생성된 질문 목록 ── */}
      <div className="space-y-3">
        {discussions.map((d) => {
          const qs: string[] = JSON.parse(d.questions);
          return (
            <div key={d.id} className="bg-white rounded-xl border border-[#E8DDD0] p-5">
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
                    onClick={() => togglePublic(d.id, d.is_public)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-neutral-200 hover:bg-neutral-50 transition-colors cursor-pointer text-neutral-500"
                  >
                    {d.is_public ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    {d.is_public ? "비공개로" : "공개로"}
                  </button>
                </div>
              </div>
              <ol className="space-y-2">
                {qs.map((q, i) => (
                  <li key={i} className="flex gap-3 text-sm text-neutral-600">
                    <span className="text-[#8B3A2A] font-bold flex-shrink-0">{i + 1}.</span>
                    <span className="leading-relaxed">{q}</span>
                  </li>
                ))}
              </ol>
            </div>
          );
        })}
        {discussions.length === 0 && (
          <div className="bg-white/60 rounded-xl border border-dashed border-[#DDD5C8] px-6 py-8 text-center">
            <p className="text-sm text-neutral-400">생성된 토론 질문이 없습니다.</p>
          </div>
        )}
      </div>

      {/* ── 모임 선택 모달 ── */}
      <Dialog open={meetingPickerOpen} onOpenChange={setMeetingPickerOpen}>
        <DialogContent className="max-w-5xl w-full max-h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-8 pt-7 pb-4 border-b border-neutral-100">
            <DialogTitle className="text-xl font-bold">모임 선택</DialogTitle>
          </DialogHeader>

          {/* 검색 */}
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

          {/* 목록 */}
          <div className="flex-1 overflow-y-auto min-h-0 py-3">
            {filteredMeetings.length === 0 ? (
              <p className="text-sm text-neutral-400 text-center py-12">검색 결과가 없습니다.</p>
            ) : (
              filteredMeetings.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setMeetingId(String(m.id));
                    setMeetingPickerOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-5 px-8 py-4 text-left hover:bg-neutral-50 transition-colors cursor-pointer",
                    meetingId === String(m.id) && "bg-[#F0EAE0]"
                  )}
                >
                  {/* 커버 썸네일 */}
                  <div className="flex-shrink-0 w-[52px] h-[72px] bg-[#E8DDD0] overflow-hidden rounded-sm">
                    {m.books?.cover_url ? (
                      <img src={m.books.cover_url} alt={m.books.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen className="w-5 h-5 text-[#B8A898]" />
                      </div>
                    )}
                  </div>

                  {/* 텍스트 */}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-neutral-400 mb-1">
                      {format(new Date(m.date), "yyyy년 M월 d일", { locale: ko })}
                    </p>
                    <p className="text-base font-semibold text-[#1C1A17] truncate">{m.title}</p>
                    {m.books && (
                      <p className="text-sm text-neutral-500 truncate mt-0.5">{m.books.title}</p>
                    )}
                  </div>

                  {meetingId === String(m.id) && (
                    <div className="w-2 h-2 rounded-full bg-[#8B3A2A] flex-shrink-0" />
                  )}
                </button>
              ))
            )}
          </div>

          <div className="px-8 py-4 border-t border-neutral-100 flex justify-between items-center">
            <span className="text-xs text-neutral-400">전체 {meetings.length}개 모임</span>
            <button
              onClick={() => setMeetingPickerOpen(false)}
              className="text-sm text-neutral-500 hover:text-neutral-800 cursor-pointer"
            >
              닫기
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── 프롬프트 미리보기 모달 ── */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">프롬프트 미리보기</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto min-h-0">
            <pre className="text-xs text-neutral-700 whitespace-pre-wrap leading-relaxed bg-neutral-50 rounded-lg p-4 border border-neutral-200">
              {promptPreview || "모임을 선택하면 프롬프트를 미리볼 수 있습니다."}
            </pre>
          </div>
          <div className="pt-3 border-t border-neutral-100 flex justify-between items-center text-xs text-neutral-400">
            <span>
              {provider === "claude" ? "Claude" : "OpenAI"} · {model} · 독후감 {selectedIds.size}편 포함
            </span>
            <button
              onClick={() => setPreviewOpen(false)}
              className="text-neutral-500 hover:text-neutral-800 cursor-pointer"
            >
              닫기
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
