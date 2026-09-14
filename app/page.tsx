import { createClient } from "@/utils/supabase/server";
import { format, differenceInCalendarDays } from "date-fns";
import { ko } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import HomeHero from "@/components/home-hero";
import HomeReadBooks from "@/components/home-read-books";
import HomeCandidates from "@/components/home-candidates";
import HomeInstallBanner from "@/components/home-install-banner";
import { HomeSection } from "./_home-hero-animation";

export const dynamic = "force-dynamic";

type CategoryInfo = { name: string; color: string };
type BookInfo = {
  id: number;
  title: string;
  author: string;
  cover_url: string | null;
  cover_url_hires: string | null;
  description: string | null;
  book_categories: CategoryInfo | CategoryInfo[] | null;
};

function getDday(dateStr: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  const diff = differenceInCalendarDays(target, today);
  if (diff === 0) return "D-Day";
  if (diff > 0) return `D-${diff}`;
  return `D+${Math.abs(diff)}`;
}

export default async function HomePage() {
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  const { data: nextMeeting } = await supabase
    .from("meetings")
    .select("id, title, date, location, meeting_books(books(id, title, author, cover_url, cover_url_hires, description, category_id, book_categories(name, color)))")
    .gte("date", today)
    .order("date", { ascending: true })
    .limit(1)
    .single();

  const [{ count: attendeeCount }, { count: reviewCount }, { data: announcements }, { data: allBooks }, { data: pendingCandidates }] =
    await Promise.all([
      nextMeeting
        ? supabase.from("attendees").select("*", { count: "exact", head: true }).eq("meeting_id", nextMeeting.id)
        : Promise.resolve({ count: 0 }),
      nextMeeting
        ? supabase.from("reviews").select("*", { count: "exact", head: true }).eq("meeting_id", nextMeeting.id)
        : Promise.resolve({ count: 0 }),
      supabase
        .from("announcements")
        .select("*")
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("books")
        .select("id, title, author, cover_url, cover_url_hires, meeting_books(meetings(id, date))")
        .order("created_at", { ascending: false }),
      supabase
        .from("book_candidates")
        .select("id, title, author, cover_url, proposed_by, created_at")
        .eq("status", "pending")
        .order("created_at", { ascending: false }),
    ]);

  // 완독된 책 (과거 모임만 있는 책)
  const readBooks = (allBooks ?? [])
    .map((b) => ({ ...b, meetings: ((b.meeting_books ?? []) as any[]).map((mb) => mb.meetings).filter(Boolean) as { id: number; date: string }[] }))
    .filter((b) => b.meetings.length > 0 && b.meetings.every((m) => m.date < today))
    .sort((a, b) => {
      const aMax = Math.max(...a.meetings.map((m) => new Date(m.date).getTime()));
      const bMax = Math.max(...b.meetings.map((m) => new Date(m.date).getTime()));
      return bMax - aMax;
    });

  const bookInfo = ((nextMeeting?.meeting_books ?? []) as any[]).map((mb) => mb.books).filter(Boolean)[0] as BookInfo | null ?? null;
  const dday = nextMeeting ? getDday(nextMeeting.date) : null;

  return (
    <div>
      <HomeHero
        book={bookInfo ? {
          id: bookInfo.id,
          title: bookInfo.title,
          author: bookInfo.author,
          coverUrl: bookInfo.cover_url_hires ?? bookInfo.cover_url,
        } : null}
        meeting={nextMeeting ? {
          id: nextMeeting.id,
          date: format(new Date(nextMeeting.date), "M월 d일 (EEE)", { locale: ko }),
          location: nextMeeting.location,
          dday,
        } : null}
        attendees={attendeeCount ?? 0}
        reviews={reviewCount ?? 0}
      />
      <div id="home-content" className="scroll-mt-20" />

      {/* ── 공지사항 ── */}
      {announcements && announcements.length > 0 && (
        <HomeSection className="mt-10">
          <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-3">
            공지사항
          </h2>
          <div className="space-y-2">
            {announcements.map((a) => (
              <Card key={a.id}>
                <CardContent className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {a.is_pinned && <Badge variant="secondary" className="text-xs">고정</Badge>}
                        <span className="font-medium text-sm">{a.title}</span>
                      </div>
                      <p className="text-sm text-neutral-500 mt-1 whitespace-pre-wrap">{a.content}</p>
                    </div>
                    <span className="text-xs text-neutral-400 flex-shrink-0 pt-0.5">
                      {format(new Date(a.created_at), "M/d", { locale: ko })}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </HomeSection>
      )}

      <HomeReadBooks books={readBooks} />
      <HomeCandidates candidates={(pendingCandidates ?? []) as any} />
      <HomeInstallBanner />
    </div>
  );
}
