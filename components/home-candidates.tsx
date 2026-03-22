"use client";

import Link from "next/link";
import { BookOpen, Star } from "lucide-react";
import { motion } from "motion/react";

type Candidate = {
  id: number;
  title: string;
  author: string;
  cover_url: string | null;
  proposed_by: string;
  created_at: string;
};

function getBadge(index: number, createdAt: string): { label: string; isNew: boolean } {
  const daysSince = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24);
  if (daysSince < 7) return { label: "새로 추가됨", isNew: true };
  return { label: `후보 #${index + 1}`, isNew: false };
}

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function HomeCandidates({ candidates }: { candidates: Candidate[] }) {
  return (
    <section className="-mx-4 mt-0 py-12 px-4 sm:px-8 pb-14">
      {/* 헤더 */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
        className="flex items-center gap-4 mb-8"
      >
        <h2 className="text-2xl sm:text-3xl font-bold text-[#1C1A17] whitespace-nowrap leading-tight">
          아직 읽지 않은 후보 책들
        </h2>
        <div className="flex-1 h-px bg-neutral-200 hidden sm:block" />
        <Link
          href="/candidates?tab=candidates"
          className="text-[11px] font-bold tracking-[0.15em] uppercase text-neutral-400 hover:text-[#1C1A17] transition-colors whitespace-nowrap flex-shrink-0"
        >
          전체 후보 보기 →
        </Link>
      </motion.div>

      {candidates.length === 0 ? (
        <p className="text-sm text-neutral-400 py-6">아직 후보가 없어요.</p>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          className="flex gap-5 overflow-x-auto pb-2 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0"
        >
          {candidates.map((c, i) => {
            const badge = getBadge(i, c.created_at);
            return (
              <motion.div
                key={c.id}
                variants={cardVariants}
                whileHover={{ y: -5, boxShadow: "0 12px 32px rgba(28,26,23,0.12)" }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="flex-shrink-0 w-[280px] sm:w-[320px] bg-white border border-neutral-200 rounded-2xl p-4 flex gap-4 cursor-pointer"
              >
                {/* 썸네일 */}
                <div className="flex-shrink-0 w-[88px] h-[120px] bg-[#E8DDD0] overflow-hidden rounded-xl">
                  {c.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.cover_url} alt={c.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen className="w-6 h-6 text-[#B8A898]" />
                    </div>
                  )}
                </div>

                {/* 내용 */}
                <div className="flex flex-col min-w-0 flex-1">
                  {/* 배지 */}
                  <div className="flex items-center gap-1.5 mb-2">
                    <Star className="w-3 h-3 text-[#C8956C] flex-shrink-0" fill="currentColor" />
                    <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-[#C8956C]">
                      {badge.label}
                    </span>
                  </div>

                  {/* 제목 */}
                  <p
                    className="text-[17px] font-bold text-[#1C1A17] leading-snug line-clamp-2 mb-1"
                    style={{ fontFamily: "var(--font-playfair)" }}
                  >
                    {c.title}
                  </p>

                  {/* 저자 */}
                  <p className="text-xs text-neutral-400 mb-auto" style={{ fontStyle: "italic" }}>
                    {c.author}
                  </p>

                  {/* 투표 버튼 */}
                  <Link
                    href="/candidates?tab=candidates"
                    className="mt-3 block text-center py-2 border border-neutral-300 text-[10px] font-bold tracking-[0.15em] uppercase text-neutral-500 hover:border-[#1C1A17] hover:text-[#1C1A17] transition-colors rounded-full"
                  >
                    Vote for this
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </section>
  );
}
