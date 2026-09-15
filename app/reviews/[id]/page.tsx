import { cache } from "react";
import type { Metadata } from "next";
import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import MotionPage from "@/components/motion-page";
import ReviewDetailClient from "./_review-detail-client";

export const dynamic = "force-dynamic";

// generateMetadata 와 페이지가 같은 조회를 두 번 하지 않도록 한 요청 안에서 공유한다.
const getReview = cache(async (id: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("reviews")
    .select("*, books(title, author, cover_url, cover_url_hires), meetings(id, title, date)")
    .eq("id", id)
    .single();
  return data;
});

function excerpt(text: string, max = 150) {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max)}…` : flat;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const review = await getReview(id);
  if (!review) return { title: "독후감을 찾을 수 없습니다", robots: { index: false, follow: false } };

  const bookTitle = review.books?.title;
  const title = bookTitle ? `${bookTitle} 독후감 – ${review.author_name}` : `${review.author_name}의 독후감`;
  const description = excerpt(review.content ?? "");
  const cover = review.books?.cover_url_hires ?? review.books?.cover_url ?? null;

  return {
    title,
    description,
    alternates: { canonical: `/reviews/${id}` },
    openGraph: {
      type: "article",
      title,
      description,
      url: `/reviews/${id}`,
      publishedTime: review.created_at ?? undefined,
      authors: [review.author_name],
      images: cover ? [{ url: cover, alt: bookTitle ?? title }] : undefined,
    },
    twitter: { card: cover ? "summary" : "summary_large_image", title, description },
  };
}

export default async function ReviewDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const review = await getReview(id);

  if (!review) notFound();

  return (
    <MotionPage>
      <ReviewDetailClient review={review} />
    </MotionPage>
  );
}
