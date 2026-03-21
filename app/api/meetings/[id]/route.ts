import { isAdminAuthenticated } from "@/lib/auth";
import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [meetingRes, attendeesRes, reviewsRes] = await Promise.all([
    supabase.from("meetings").select("*, books(*)").eq("id", id).single(),
    supabase.from("attendees").select("*").eq("meeting_id", id).order("created_at"),
    supabase.from("reviews").select("*, books(title, author)").eq("meeting_id", id).order("created_at", { ascending: false }),
  ]);
  if (meetingRes.error) return NextResponse.json({ error: meetingRes.error.message }, { status: 404 });
  return NextResponse.json({ meeting: meetingRes.data, attendees: attendeesRes.data ?? [], reviews: reviewsRes.data ?? [] });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "권한 없음" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const supabase = await createClient();
  const { data, error } = await supabase.from("meetings").update(body).eq("id", id).select("*, books(id, title, author)").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "권한 없음" }, { status: 401 });
  const { id } = await params;
  const supabase = await createClient();
  const { error } = await supabase.from("meetings").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
