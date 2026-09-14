"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowDown, ArrowUpRight, MapPin, Users, FileText } from "lucide-react";
import styles from "./home-hero.module.css";

const BookScene = dynamic(() => import("./home-book-scene"), { ssr: false });

type Props = {
  book: { id: number; title: string; author: string; coverUrl: string | null } | null;
  meeting: { id: number; date: string; location: string | null; dday: string | null } | null;
  attendees: number;
  reviews: number;
};

export default function HomeHero({ book, meeting, attendees, reviews }: Props) {
  return (
    <section className={styles.hero} aria-labelledby="featured-book-title">
      <svg className={styles.ribbon} viewBox="0 0 1440 840" preserveAspectRatio="none" aria-hidden="true">
        <path d="M-120 740C80 250 270 1030 485 605S535 -15 774 289s303 414 407 77S1420 96 1540 290" />
        <path className={styles.orangeRibbon} d="M310 960C470 630 630 895 799 715s191-203 317-45 221 108 411-74" />
      </svg>
      <div className={styles.inner}>
        <div className={styles.visual}>
          <div className={styles.scene} role="img" aria-label={book ? `이번 모임 도서, ${book.title}의 입체 표지` : "함께 읽을 책을 기다리는 책피바라의 책"}>
            <div className={styles.fallback} aria-hidden="true"><span>BOOK<br />YBARA</span><small>우리들의 독서모임</small></div>
            <BookScene coverUrl={book?.coverUrl ? `/api/books/${book.id}/cover` : null} />
          </div>
          <div className={styles.bookLabel}>
            <span className={styles.tag}>{meeting ? "이번에 함께 읽어요" : "다음 이야기를 기다리며"}</span>
            <h1 id="featured-book-title">{book?.title ?? "우리의 다음 책은 무엇일까요?"}</h1>
            <span className={styles.author}>{book ? `${book.author} 지음` : "읽고 싶은 책을 책 리스트에 남겨주세요."}</span>
          </div>
          <div className={styles.actions}>
            <Link className={styles.primary} href={meeting ? `/meetings/${meeting.id}` : "/meetings"}>
              {meeting ? "모임 상세 보기" : "우리 모임 둘러보기"}<span><ArrowUpRight size={20} /></span>
            </Link>
            <Link className={styles.secondary} href={meeting ? `/reviews/new?meetingId=${meeting.id}` : "/reviews/new"}>독후감 쓰기 <ArrowUpRight size={16} /></Link>
          </div>
        </div>
        <div className={styles.footer}>
          {meeting ? <Link href={`/meetings/${meeting.id}`} className={styles.meeting}>
            <span className={styles.dday}>{meeting.dday}</span>
            <div><span className={styles.meetingLabel}>다음 모임에서 만나요</span><strong>{meeting.date}</strong></div>
            {meeting.location && <span className={styles.location}><MapPin size={15} />{meeting.location}</span>}
            <span className={styles.stats}><span><Users size={15} />{attendees}명</span><span><FileText size={15} />독후감 {reviews}개</span></span>
            <ArrowUpRight size={21} className={styles.meetingArrow} />
          </Link> : <Link href="/candidates" className={styles.meeting}><strong>다음에 함께 읽고 싶은 책이 있나요?</strong><span>책 추천하기</span><ArrowUpRight size={21} /></Link>}
          <a href="#home-content" className={styles.scroll}>우리의 책장<ArrowDown size={18} /></a>
        </div>
      </div>
    </section>
  );
}
