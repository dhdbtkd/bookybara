import Anthropic from "@anthropic-ai/sdk";
import { isAdminAuthenticated } from "@/lib/auth";
import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const anthropic = new Anthropic();

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
  const { meeting_id } = await req.json();
  if (!meeting_id) return NextResponse.json({ error: "meeting_id 필요" }, { status: 400 });

  const supabase = await createClient();

  const { data: meeting } = await supabase
    .from("meetings")
    .select("*, books(title, author)")
    .eq("id", meeting_id)
    .single();
  if (!meeting) return NextResponse.json({ error: "일정 없음" }, { status: 404 });

  const { data: reviews } = await supabase.from("reviews").select("author_name, content").eq("meeting_id", meeting_id);
  const reviewsText =
    reviews && reviews.length > 0
      ? reviews.map((r) => `[${r.author_name}] ${r.content}`).join("\n\n")
      : "아직 독후감이 없습니다.";

  const bookInfo = meeting.books
    ? `"${meeting.books.title}" (저자: ${meeting.books.author})`
    : meeting.title;

  const prompt = `독서모임에서 ${bookInfo}를 읽었습니다.

제출된 독후감들:
${reviewsText}

위 독후감들을 바탕으로 독서모임 토론에 활용할 수 있는 질문 5개를 생성해주세요.
질문은 다양한 관점(주제, 인물, 사회적 맥락, 개인적 경험 연결 등)을 다루어야 합니다.

반드시 JSON 배열 형식으로만 답변해주세요:
["질문1", "질문2", "질문3", "질문4", "질문5"]`;

  const message = await anthropic.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return NextResponse.json({ error: "AI 응답 파싱 실패" }, { status: 500 });

  const questionList: string[] = JSON.parse(jsonMatch[0]);
  const { data, error } = await supabase
    .from("discussion_questions")
    .insert({ meeting_id, book_id: meeting.book_id, questions: JSON.stringify(questionList), is_public: false })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "권한 없음" }, { status: 401 });
  const { id, is_public } = await req.json();
  const supabase = await createClient();
  const { data, error } = await supabase.from("discussion_questions").update({ is_public }).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
