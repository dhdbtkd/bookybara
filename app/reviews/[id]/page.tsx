import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import MotionPage from "@/components/motion-page";
import ReviewDetailClient from "./_review-detail-client";

export const dynamic = "force-dynamic";

export default async function ReviewDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: review } = await supabase
    .from("reviews")
    .select("*, books(title, author, cover_url, cover_url_hires), meetings(id, title, date)")
    .eq("id", id)
    .single();

  if (!review) notFound();

  return (
    <MotionPage>
      <ReviewDetailClient review={review} />
    </MotionPage>
  );
}
