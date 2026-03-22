import { createClient } from "@/utils/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import MotionPage from "@/components/motion-page";

export const dynamic = "force-dynamic";

export default async function DiscussionPage() {
  const supabase = await createClient();

  const { data: questions } = await supabase
    .from("discussion_questions")
    .select("*, meetings(title, date), books(title, author)")
    .eq("is_public", true)
    .order("created_at", { ascending: false });

  return (
    <MotionPage>
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">토론 질문</h1>
        <p className="text-sm text-neutral-400 mt-1">독후감을 기반으로 AI가 생성한 토론 질문입니다.</p>
      </div>

      {!questions || questions.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-neutral-400 text-sm">
            공개된 토론 질문이 없습니다. 모임 전날 운영자가 생성합니다.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {questions.map((q) => {
            const qList: string[] = JSON.parse(q.questions);
            const meeting = q.meetings as { title: string; date: string } | null;
            const book = q.books as { title: string; author: string } | null;
            return (
              <div key={q.id} className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  {meeting && <Badge variant="outline">{meeting.title}</Badge>}
                  {book && <span className="text-xs text-neutral-400">{book.title} — {book.author}</span>}
                </div>
                <div className="space-y-2">
                  {qList.map((question, i) => (
                    <Card key={i}>
                      <CardContent className="px-5 py-4">
                        <div className="flex gap-3">
                          <span className="text-sm font-bold text-neutral-300 flex-shrink-0 w-5">{i + 1}.</span>
                          <p className="text-sm text-neutral-700 leading-relaxed">{question}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
    </MotionPage>
  );
}
