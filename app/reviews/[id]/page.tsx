import { createClient } from "@/utils/supabase/server";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ReviewDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: review } = await supabase
    .from("reviews")
    .select("*, books(title, author), meetings(title, date)")
    .eq("id", id)
    .single();

  if (!review) notFound();

  const book = review.books as { title: string; author: string } | null;
  const meeting = review.meetings as { title: string; date: string } | null;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center gap-2 text-sm text-neutral-400">
        <Link href="/reviews" className="hover:text-neutral-600 transition-colors">독후감</Link>
        <span>/</span>
        <span>{review.author_name}</span>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                {book && <Badge variant="secondary">{book.title}</Badge>}
                {meeting && <Badge variant="outline">{meeting.title}</Badge>}
              </div>
              <h1 className="text-xl font-bold mt-2">{review.author_name}</h1>
              <p className="text-xs text-neutral-400 mt-1">
                {format(new Date(review.created_at), "yyyy년 M월 d일 HH:mm", { locale: ko })}
              </p>
            </div>
          </div>
          <div className="border-t pt-4">
            <p className="text-sm text-neutral-700 whitespace-pre-wrap leading-relaxed">{review.content}</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Link href="/reviews" className="text-sm text-neutral-400 hover:text-neutral-600 transition-colors">목록으로</Link>
        <Link href="/reviews/new" className="text-sm px-3 py-1.5 bg-neutral-900 text-white rounded-md hover:bg-neutral-700 transition-colors">내 독후감 쓰기</Link>
      </div>
    </div>
  );
}
