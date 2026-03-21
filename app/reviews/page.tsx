"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

type Book = { id: number; title: string; author: string };
type Review = {
  id: number;
  author_name: string;
  content: string;
  created_at: string;
  book_id: number;
  books: { title: string; author: string } | null;
  meetings: { title: string; date: string } | null;
};

export default function ReviewsPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [selectedBook, setSelectedBook] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/books").then((r) => r.json()).then(setBooks);
  }, []);

  useEffect(() => {
    setLoading(true);
    const url = selectedBook === "all" ? "/api/reviews" : `/api/reviews?bookId=${selectedBook}`;
    fetch(url).then((r) => r.json()).then((data) => { setReviews(data); setLoading(false); });
  }, [selectedBook]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">독후감</h1>
        <Link href="/reviews/new" className="px-4 py-2 bg-neutral-900 text-white text-sm rounded-md hover:bg-neutral-700 transition-colors">
          독후감 쓰기
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <select value={selectedBook} onChange={(e) => setSelectedBook(e.target.value)} className="border rounded-md px-3 py-2 text-sm bg-background w-56">
          <option value="all">전체 책</option>
          {books.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}
        </select>
        <span className="text-sm text-neutral-400">{reviews.length}개</span>
      </div>

      {loading ? (
        <div className="text-sm text-neutral-400">불러오는 중...</div>
      ) : reviews.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-neutral-400 text-sm">
            아직 독후감이 없습니다.{" "}
            <Link href="/reviews/new" className="underline">첫 번째로 작성해보세요</Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <Link key={r.id} href={`/reviews/${r.id}`} className="block group cursor-pointer">
              <Card className="hover:border-neutral-300 transition-colors">
                <CardContent className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {r.books && <Badge variant="secondary" className="text-xs">{r.books.title}</Badge>}
                        <span className="font-medium text-sm">{r.author_name}</span>
                      </div>
                      <p className="text-sm text-neutral-600 line-clamp-2">{r.content}</p>
                    </div>
                    <span className="text-xs text-neutral-400 flex-shrink-0 pt-0.5">
                      {format(new Date(r.created_at), "M/d", { locale: ko })}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
