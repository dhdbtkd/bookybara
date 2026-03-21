"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import Link from "next/link";

type Meeting = { id: number; title: string; date: string; location: string | null; summary: string | null; books: { title: string; author: string; cover_url: string | null } | null };
type Attendee = { id: number; name: string; created_at: string };
type Review = { id: number; author_name: string; content: string; created_at: string; books: { title: string; author: string } | null };

export default function MeetingDetailPage() {
  const { id } = useParams();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch(`/api/meetings/${id}`);
    const data = await res.json();
    setMeeting(data.meeting);
    setAttendees(data.attendees);
    setReviews(data.reviews);
    setLoading(false);
  }

  useEffect(() => { load(); }, [id]);

  async function addAttendee(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    const res = await fetch(`/api/meetings/${id}/attendees`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName }),
    });
    if (res.ok) {
      setNewName("");
      load();
    } else {
      const { error } = await res.json();
      toast.error(error);
    }
  }

  if (loading) return <div className="text-sm text-neutral-400">불러오는 중...</div>;
  if (!meeting) return <div className="text-sm text-neutral-400">모임을 찾을 수 없습니다.</div>;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-2 text-sm text-neutral-400">
        <Link href="/meetings" className="hover:text-neutral-600 transition-colors">일정</Link>
        <span>/</span>
        <span>{meeting.title}</span>
      </div>

      {/* 모임 정보 */}
      <Card>
        <CardContent className="p-6">
          {meeting.books?.cover_url && (
            <img src={meeting.books.cover_url} alt={meeting.books.title} className="w-20 h-28 object-cover rounded shadow-sm mb-4" />
          )}
          <h1 className="text-2xl font-bold">{meeting.title}</h1>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge>{format(new Date(meeting.date), "yyyy년 M월 d일 (EEE)", { locale: ko })}</Badge>
            {meeting.location && <Badge variant="outline">{meeting.location}</Badge>}
          </div>
          {meeting.books && (
            <p className="text-neutral-500 mt-3 text-sm">{meeting.books.title} — {meeting.books.author}</p>
          )}
          {meeting.summary && (
            <p className="text-sm text-neutral-600 mt-3 whitespace-pre-wrap leading-relaxed">{meeting.summary}</p>
          )}
        </CardContent>
      </Card>

      {/* 참석자 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">참석자 ({attendees.length}명)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {attendees.map((a) => (
              <Badge key={a.id} variant="secondary">{a.name}</Badge>
            ))}
            {attendees.length === 0 && <p className="text-sm text-neutral-400">아직 참석자가 없습니다.</p>}
          </div>
          <Separator />
          <form onSubmit={addAttendee} className="flex gap-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="이름 입력"
              className="flex-1"
              maxLength={20}
            />
            <Button type="submit" size="sm">참석 등록</Button>
          </form>
        </CardContent>
      </Card>

      {/* 독후감 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold">독후감 ({reviews.length}개)</h2>
          <Link
            href={`/reviews/new?meetingId=${id}&bookId=${meeting.books ? "" : ""}`}
            className="text-sm px-3 py-1.5 bg-neutral-900 text-white rounded-md hover:bg-neutral-700 transition-colors"
          >
            독후감 쓰기
          </Link>
        </div>
        {reviews.length > 0 ? (
          <div className="space-y-3">
            {reviews.map((r) => (
              <Link key={r.id} href={`/reviews/${r.id}`} className="block group cursor-pointer">
                <Card className="hover:border-neutral-300 transition-colors">
                  <CardContent className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <span className="font-medium text-sm">{r.author_name}</span>
                        <p className="text-sm text-neutral-500 mt-1 line-clamp-2">{r.content}</p>
                      </div>
                      <span className="text-xs text-neutral-400 flex-shrink-0">
                        {format(new Date(r.created_at), "M/d", { locale: ko })}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-6 text-neutral-400 text-sm text-center">아직 독후감이 없습니다.</CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
