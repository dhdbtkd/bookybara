import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { isAdminAuthenticated } from "@/lib/auth";
import { MissingEnvError, requireEnv } from "@/lib/env";
import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// claude 는 Anthropic 에 직접, claude-oracle 은 자체 서버(CLIProxyAPI)를 거쳐 호출한다.
// 둘 다 Anthropic 프로토콜이라 요청/응답 형태는 동일하고 접속 지점과 키만 다르다.
export const PROVIDERS = ["claude", "claude-oracle", "openai"] as const;
export type Provider = (typeof PROVIDERS)[number];

const PROVIDER_LABEL: Record<Provider, string> = {
  claude: "Anthropic",
  "claude-oracle": "Oracle",
  openai: "OpenAI",
};

const DEFAULT_MODEL: Record<Provider, string> = {
  claude: "claude-opus-5",
  "claude-oracle": "claude-opus-5",
  openai: "gpt-4o",
};

function isProvider(v: unknown): v is Provider {
  return PROVIDERS.includes(v as Provider);
}

export const MODES = ["append", "replace"] as const;
export type Mode = (typeof MODES)[number];

function isMode(v: unknown): v is Mode {
  return MODES.includes(v as Mode);
}

/** 공백/문장부호 차이만 있는 질문을 같은 것으로 본다. */
function normalize(q: string): string {
  return q.trim().replace(/\s+/g, " ").replace(/[?？.]+$/, "");
}

function mergeQuestions(prev: string[], next: string[]): string[] {
  const seen = new Set(prev.map(normalize));
  return [...prev, ...next.filter((q) => !seen.has(normalize(q)))];
}

type Completion = { text: string; inputTokens: number; outputTokens: number };

async function complete(provider: Provider, model: string, prompt: string): Promise<Completion> {
  if (provider === "openai") {
    const openai = new OpenAI({ apiKey: requireEnv("OPENAI_API_KEY") });
    const res = await openai.chat.completions.create({
      model,
      messages: [{ role: "user", content: prompt }],
    });
    return {
      text: res.choices[0]?.message?.content ?? "",
      inputTokens: res.usage?.prompt_tokens ?? 0,
      outputTokens: res.usage?.completion_tokens ?? 0,
    };
  }

  const anthropic =
    provider === "claude-oracle"
      ? new Anthropic({
          apiKey: requireEnv("CLIPROXY_API_KEY"),
          // SDK 가 /v1/messages 를 붙이므로 오리진까지만 준다.
          baseURL: requireEnv("CLIPROXY_BASE_URL"),
        })
      : new Anthropic({ apiKey: requireEnv("ANTHROPIC_API_KEY") });

  const res = await anthropic.messages.create({
    model,
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });
  // 자체 서버를 거치면 thinking 블록이 앞에 붙어 온다. 첫 블록만 보면 본문을 통째로 놓친다.
  return {
    text: res.content.filter((b) => b.type === "text").map((b) => b.text).join(""),
    inputTokens: res.usage.input_tokens,
    outputTokens: res.usage.output_tokens,
  };
}

export function buildPrompt(
  bookInfo: string,
  reviews: { author_name: string; content: string }[]
): string {
  const reviewsText =
    reviews.length > 0
      ? reviews.map((r) => `[${r.author_name}]\n${r.content}`).join("\n\n---\n\n")
      : "아직 독후감이 없습니다.";

  return `독서모임에서 ${bookInfo}를 읽었습니다.

제출된 독후감 (${reviews.length}편):
${reviewsText}

위 독후감들을 바탕으로 독서모임 토론에 활용할 수 있는 질문 5개를 생성해주세요.
질문은 다양한 관점(주제, 인물, 사회적 맥락, 개인적 경험 연결 등)을 다루어야 합니다.

반드시 JSON 배열 형식으로만 답변해주세요:
["질문1", "질문2", "질문3", "질문4", "질문5"]`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const meetingId = searchParams.get("meetingId");
  const isAdmin = await isAdminAuthenticated();
  const supabase = await createClient();

  let query = supabase
    .from("discussion_questions")
    .select("*, meetings(title, date), books(title, author)")
    .order("created_at", { ascending: false });

  if (!isAdmin) query = query.eq("is_public", true);
  if (meetingId) query = query.eq("meeting_id", meetingId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "권한 없음" }, { status: 401 });

  const { meeting_id, review_ids, provider = "claude", model, mode = "append" } = await req.json();
  if (!meeting_id) return NextResponse.json({ error: "meeting_id 필요" }, { status: 400 });
  if (!isProvider(provider)) {
    return NextResponse.json({ error: `지원하지 않는 provider: ${provider}` }, { status: 400 });
  }
  if (!isMode(mode)) return NextResponse.json({ error: `지원하지 않는 mode: ${mode}` }, { status: 400 });

  const supabase = await createClient();

  const { data: meeting } = await supabase
    .from("meetings")
    .select("*, meeting_books(books(id, title, author))")
    .eq("id", meeting_id)
    .single();
  if (!meeting) return NextResponse.json({ error: "일정 없음" }, { status: 404 });
  const meetingFirstBook = ((meeting.meeting_books ?? []) as any[]).map((mb) => mb.books).filter(Boolean)[0] ?? null;

  // 선택된 독후감만 가져오기 (review_ids 없으면 전체)
  let reviewQuery = supabase
    .from("reviews")
    .select("author_name, content")
    .eq("meeting_id", meeting_id);
  if (review_ids && review_ids.length > 0) {
    reviewQuery = reviewQuery.in("id", review_ids);
  }
  const { data: reviews } = await reviewQuery;

  const bookInfo = meetingFirstBook
    ? `"${meetingFirstBook.title}" (저자: ${meetingFirstBook.author})`
    : `"${meeting.title}"`;

  const prompt = buildPrompt(bookInfo, reviews ?? []);

  const usedModel = model || DEFAULT_MODEL[provider];

  let completion: Completion;
  try {
    completion = await complete(provider, usedModel, prompt);
  } catch (e) {
    if (e instanceof MissingEnvError) {
      return NextResponse.json({ error: e.message }, { status: 500 });
    }
    // 자체 서버(oracle)는 내려갈 수 있다. 어느 경로가 실패했는지 드러낸다.
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: `${PROVIDER_LABEL[provider]} 호출 실패: ${detail}` },
      { status: 502 }
    );
  }
  const { text, inputTokens, outputTokens } = completion;

  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return NextResponse.json({ error: "AI 응답 파싱 실패", raw: text }, { status: 500 });

  const questionList: string[] = JSON.parse(jsonMatch[0]);

  // 한 모임은 한 행으로 유지한다. is_public 이 행 단위라 여러 행이면 공개 여부가 모호해지고,
  // 공개 페이지에서도 같은 모임의 질문이 여러 덩어리로 갈라져 보인다.
  // (기존 중복 행이 남아 있을 수 있어 single() 대신 가장 오래된 한 건을 집는다.)
  const { data: existingRows } = await supabase
    .from("discussion_questions")
    .select("id, questions")
    .eq("meeting_id", meeting_id)
    .order("created_at", { ascending: true })
    .limit(1);
  const existing = existingRows?.[0] ?? null;

  let questions = questionList;
  if (existing && mode === "append") {
    let prev: string[] = [];
    try { prev = JSON.parse(existing.questions ?? "[]"); } catch { prev = []; }
    questions = mergeQuestions(prev, questionList);
  }

  // 재생성이 공개 상태를 건드리지 않도록 is_public 은 그대로 둔다.
  const write = existing
    ? supabase
        .from("discussion_questions")
        .update({ questions: JSON.stringify(questions), book_id: meetingFirstBook?.id ?? null })
        .eq("id", existing.id)
        .select()
        .single()
    : supabase
        .from("discussion_questions")
        .insert({
          meeting_id,
          book_id: meetingFirstBook?.id ?? null,
          questions: JSON.stringify(questions),
          is_public: false,
        })
        .select()
        .single();

  const [{ data, error }] = await Promise.all([
    write,
    supabase.from("ai_generation_logs").insert({
      meeting_id,
      provider,
      model: usedModel,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      review_count: (reviews ?? []).length,
    }),
  ]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: existing ? 200 : 201 });
}

export async function DELETE(req: NextRequest) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "권한 없음" }, { status: 401 });
  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "id 필요" }, { status: 400 });

  const supabase = await createClient();
  const { error } = await supabase.from("discussion_questions").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id });
}

export async function PATCH(req: NextRequest) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "권한 없음" }, { status: 401 });
  const { id, is_public, questions } = await req.json();
  const supabase = await createClient();

  // 마지막 질문까지 지우면 빈 행이 남아 카드만 떠 있었다. 행째로 지운다.
  if (Array.isArray(questions) && questions.length === 0) {
    const { error } = await supabase.from("discussion_questions").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ id, deleted: true });
  }

  const update: Record<string, unknown> = {};
  if (is_public !== undefined) update.is_public = is_public;
  if (questions !== undefined) update.questions = JSON.stringify(questions);
  const { data, error } = await supabase
    .from("discussion_questions")
    .update(update)
    .eq("id", id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
