"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachWeekOfInterval,
  isToday,
  getDay,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type MeetingBasic = { id: number; date: string; title: string };

const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

export default function MeetingsCalendar({ meetings }: { meetings: MeetingBasic[] }) {
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const router = useRouter();

  const meetingMap = new Map<string, { id: number; title: string }>();
  for (const m of meetings) meetingMap.set(m.date, { id: m.id, title: m.title });

  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const weeks = eachWeekOfInterval({ start: monthStart, end: monthEnd }, { weekStartsOn: 0 });

  return (
    <div>
      {/* Month header */}
      <div className="flex items-center justify-between mb-5">
        <h2
          className="text-3xl text-[#1C1A17]"
          style={{ fontFamily: "var(--font-playfair)", fontStyle: "italic" }}
        >
          {format(month, "yyyy년 M월")}
        </h2>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
            className="p-1.5 hover:bg-[#E5DDD0] rounded-md cursor-pointer transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-[#5C5348]" />
          </button>
          <button
            onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
            className="p-1.5 hover:bg-[#E5DDD0] rounded-md cursor-pointer transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-[#5C5348]" />
          </button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="border border-[#DDD5C8] rounded-xl overflow-hidden">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 bg-[#EDE6DA] border-b border-[#DDD5C8]">
          {WEEKDAYS.map((d, i) => (
            <div
              key={d}
              className={cn(
                "text-center text-[10px] font-bold tracking-widest py-2.5",
                i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-[#8B7B6B]"
              )}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Weeks */}
        {weeks.map((weekStart, wi) => {
          const weekDays = Array.from({ length: 7 }, (_, i) => {
            const d = new Date(weekStart);
            d.setDate(d.getDate() + i);
            return d;
          });

          return (
            <div
              key={wi}
              className={cn("grid grid-cols-7", wi < weeks.length - 1 && "border-b border-[#DDD5C8]")}
            >
              {weekDays.map((day) => {
                const dateStr = format(day, "yyyy-MM-dd");
                const isCurrentMonth = day.getMonth() === month.getMonth();
                const meeting = isCurrentMonth ? meetingMap.get(dateStr) : undefined;
                const today = isToday(day);
                const dow = getDay(day);

                return (
                  <div
                    key={dateStr}
                    onClick={() => meeting && router.push(`/meetings/${meeting.id}`)}
                    className={cn(
                      "min-h-[76px] p-2 border-r border-[#DDD5C8] last:border-r-0 transition-colors",
                      !isCurrentMonth && "bg-[#F5F0E8]/50",
                      meeting && "cursor-pointer hover:bg-[#EDE6DA]"
                    )}
                  >
                    <span
                      className={cn(
                        "text-sm inline-flex w-6 h-6 items-center justify-center rounded-full",
                        !isCurrentMonth && "text-[#C8BEB4]",
                        isCurrentMonth && dow === 0 && "text-red-400",
                        isCurrentMonth && dow === 6 && "text-blue-400",
                        isCurrentMonth && dow !== 0 && dow !== 6 && "text-[#3C3530]",
                        today && "bg-[#1C1A17] !text-white font-bold"
                      )}
                    >
                      {format(day, "d")}
                    </span>

                    {meeting && (
                      <div className="mt-1.5 pl-0.5">
                        <p className="text-[9px] font-bold tracking-[0.1em] uppercase text-[#8B3A2A] leading-snug line-clamp-2">
                          {meeting.title}
                        </p>
                        <div className="mt-1 h-[2px] w-7 bg-[#8B3A2A] rounded-full" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
