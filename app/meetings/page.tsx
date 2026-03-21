import { createClient } from "@/utils/supabase/server";
import MeetingsView from "./_meetings-view";

export const dynamic = "force-dynamic";

type BookBasic = { title: string; author: string; cover_url: string | null; cover_url_hires: string | null };

export default async function MeetingsPage() {
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  const { data: meetings } = await supabase
    .from("meetings")
    .select("*, meeting_books(books(title, author, cover_url, cover_url_hires))")
    .order("date", { ascending: false });

  function toBooks(m: any): BookBasic[] {
    return (m.meeting_books ?? []).map((mb: any) => mb.books).filter(Boolean);
  }

  const upcoming = [...(meetings?.filter((m) => m.date >= today) ?? [])].reverse().map((m) => ({
    ...m,
    books: toBooks(m),
    location: m.location ?? null,
  }));
  const past = (meetings?.filter((m) => m.date < today) ?? []).map((m) => ({
    ...m,
    books: toBooks(m),
    location: m.location ?? null,
  }));
  const calendarMeetings = (meetings ?? []).map((m) => ({ id: m.id, date: m.date, title: m.title }));

  return (
    <div className="-mx-4 -mt-4 md:-mt-8">
      {/* ── Page header ── */}
      <div className="px-4 sm:px-8 pt-10 pb-8 border-b border-[#DDD5C8]">
        <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-[#8B3A2A] mb-3">
          독서 모임 스케줄
        </p>
        <h1 className="text-[2.8rem] leading-tight text-[#1C1A17] font-bold">모임 일정</h1>
        <p className="text-sm text-[#6B5E52] mt-3 max-w-md leading-relaxed">
          모임 일정과 지난 기록을 확인하세요.
        </p>
      </div>

      <MeetingsView meetings={calendarMeetings} upcoming={upcoming} past={past} />
    </div>
  );
}
