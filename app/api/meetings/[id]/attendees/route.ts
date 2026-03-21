import { isAdminAuthenticated } from "@/lib/auth";
import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// 개별 참석자 추가 (멤버 선택)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { name, member_id } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "이름을 입력해주세요." }, { status: 400 });
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("attendees")
    .insert({ meeting_id: Number(id), name: name.trim(), member_id: member_id ?? null })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

// 멤버 목록 기반으로 참석자 일괄 설정 (관리자)
// member_ids 배열로 받아서 기존 attendees(member_id 있는 것) 교체
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "권한 없음" }, { status: 401 });
  const { id } = await params;
  const { member_ids }: { member_ids: number[] } = await req.json();
  const supabase = await createClient();

  // 기존 member_id 기반 attendees 삭제 (직접 입력한 것은 유지)
  await supabase.from("attendees").delete().eq("meeting_id", Number(id)).not("member_id", "is", null);

  if (member_ids.length === 0) return NextResponse.json({ ok: true });

  // 선택된 멤버들 정보 조회
  const { data: members } = await supabase.from("members").select("id, name").in("id", member_ids);
  if (!members) return NextResponse.json({ ok: true });

  // 참석자로 삽입
  const rows = members.map((m) => ({ meeting_id: Number(id), name: m.name, member_id: m.id }));
  const { error } = await supabase.from("attendees").insert(rows);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

// 개별 참석자 삭제 (관리자)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "권한 없음" }, { status: 401 });
  const { id: meetingId } = await params;
  const { searchParams } = new URL(req.url);
  const attendeeId = searchParams.get("attendeeId");
  if (!attendeeId) return NextResponse.json({ error: "attendeeId 필요" }, { status: 400 });
  const supabase = await createClient();
  const { error } = await supabase.from("attendees").delete().eq("id", attendeeId).eq("meeting_id", meetingId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
