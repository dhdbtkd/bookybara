import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { isAdminAuthenticated } from "@/lib/auth";
import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

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

  const { meeting_id, review_ids, provider = "claude", model } = await req.json();
  if (!meeting_id) return NextResponse.json({ error: "meeting_id 필요" }, { status: 400 });

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

  let text = "";
  let inputTokens = 0;
  let outputTokens = 0;
  const usedModel = model || (provider === "openai" ? "gpt-4o" : "claude-sonnet-4-6");

  if (provider === "openai") {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey === "your_openai_api_key_here") {
      return NextResponse.json({ error: "OPENAI_API_KEY가 설정되지 않았습니다." }, { status: 500 });
    }
    const openai = new OpenAI({ apiKey });
    const res = await openai.chat.completions.create({
      model: usedModel,
      messages: [{ role: "user", content: prompt }],
    });
    text = res.choices[0]?.message?.content ?? "";
    inputTokens = res.usage?.prompt_tokens ?? 0;
    outputTokens = res.usage?.completion_tokens ?? 0;
  } else {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || apiKey === "your_api_key_here") {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY가 설정되지 않았습니다." }, { status: 500 });
    }
    const anthropic = new Anthropic({ apiKey });
    const res = await anthropic.messages.create({
      model: usedModel,
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });
    text = res.content[0].type === "text" ? res.content[0].text : "";
    inputTokens = res.usage.input_tokens;
    outputTokens = res.usage.output_tokens;
  }

  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return NextResponse.json({ error: "AI 응답 파싱 실패", raw: text }, { status: 500 });

  const questionList: string[] = JSON.parse(jsonMatch[0]);

  const [{ data, error }] = await Promise.all([
    supabase
      .from("discussion_questions")
      .insert({
        meeting_id,
        book_id: meetingFirstBook?.id ?? null,
        questions: JSON.stringify(questionList),
        is_public: false,
      })
      .select()
      .single(),
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
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "권한 없음" }, { status: 401 });
  const { id, is_public } = await req.json();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("discussion_questions")
    .update({ is_public })
    .eq("id", id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
