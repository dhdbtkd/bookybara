import { createClient } from "@/utils/supabase/server";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ArchivePage() {
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  const { data: rawMeetings } = await supabase
    .from("meetings")
    .select("*, meeting_books(books(id, title, author, cover_url, cover_url_hires))")
    .lt("date", today)
    .order("date", { ascending: false });

  type BookInfo = { id: number; title: string; author: string; cover_url: string | null; cover_url_hires: string | null };
  const meetings = (rawMeetings ?? []).map((m) => ({
    ...m,
    books: ((m.meeting_books ?? []) as any[]).map((mb) => mb.books).filter(Boolean) as BookInfo[],
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">책 아카이브</h1>
      <p className="text-sm text-neutral-400">지금까지 함께 읽은 책들</p>

      {!meetings || meetings.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-neutral-400 text-sm">아직 완료된 모임이 없습니다.</CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {meetings.map((m) => {
            const book = m.books[0] ?? null;
            return (
              <Card key={m.id}>
                <CardContent className="p-5">
                  <div className="flex gap-4">
                    {(book?.cover_url_hires ?? book?.cover_url) && (
                      <img src={book.cover_url_hires ?? book.cover_url!} alt={book.title} className="w-16 h-24 object-cover rounded shadow-sm flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-bold text-lg">{m.title}</h3>
                          {book && <p className="text-sm text-neutral-500">{book.title} — {book.author}</p>}
                        </div>
                        <span className="text-sm text-neutral-400 flex-shrink-0">
                          {format(new Date(m.date), "yyyy. M. d", { locale: ko })}
                        </span>
                      </div>
                      {m.location && <p className="text-xs text-neutral-400 mt-1">{m.location}</p>}
                      {m.summary && <p className="text-sm text-neutral-600 mt-2 line-clamp-2">{m.summary}</p>}
                      <Link href={`/meetings/${m.id}`} className="inline-block mt-3 text-xs text-neutral-400 hover:text-neutral-600 underline transition-colors">
                        모임 상세 보기
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
