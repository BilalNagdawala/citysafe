"use client";

import React, { useState } from "react";
import clsx from "clsx";
import { Clock, Calendar, Sparkles } from "lucide-react";

export const ALLOWED_MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55] as const;
export const ALLOWED_MINUTE_STRINGS = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"] as const;

export function roundToNearestFiveMinutes(date: Date): Date {
  const result = new Date(date);
  const minutes = result.getMinutes();
  const seconds = result.getSeconds();
  const totalMins = minutes + seconds / 60;
  const rounded = Math.round(totalMins / 5) * 5;
  result.setMinutes(rounded, 0, 0);
  return result;
}

export function formatTime12h(date: Date): string {
  let h = date.getHours();
  const m = date.getMinutes().toString().padStart(2, "0");
  const period = h >= 12 ? "PM" : "AM";
  h = h % 12 === 0 ? 12 : h % 12;
  return `${h}:${m} ${period}`;
}

export function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

interface FiveMinuteTimePickerProps {
  value: Date;
  onChange: (newDate: Date) => void;
  className?: string;
}

export default function FiveMinuteTimePicker({
  value,
  onChange,
  className
}: FiveMinuteTimePickerProps) {
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Derive 12h parts from value
  const hour24 = value.getHours();
  const rawMinutes = value.getMinutes();
  // Ensure minute is strictly rounded to allowed 5-minute interval
  const minute = Math.round(rawMinutes / 5) * 5 % 60;
  const isPM = hour24 >= 12;
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;

  // Local date ISO YYYY-MM-DD
  const year = value.getFullYear();
  const month = (value.getMonth() + 1).toString().padStart(2, "0");
  const day = value.getDate().toString().padStart(2, "0");
  const currentDateStr = `${year}-${month}-${day}`;

  const today = new Date();
  const isToday = isSameDay(value, today);

  const applyTime = (newH12: number, newMin: number, newPM: boolean, baseDate: Date = value) => {
    let h24 = newH12 % 12;
    if (newPM) h24 += 12;
    const next = new Date(baseDate);
    next.setHours(h24, newMin, 0, 0);
    onChange(next);
  };

  const setTravelNow = () => {
    const now = roundToNearestFiveMinutes(new Date());
    onChange(now);
  };

  const setPresetTime = (h24: number, m: number = 0) => {
    const next = new Date(value);
    next.setHours(h24, m, 0, 0);
    onChange(next);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.value) return;
    const [y, m, d] = e.target.value.split("-").map(Number);
    const next = new Date(value);
    next.setFullYear(y, m - 1, d);
    onChange(next);
  };

  // Quick preset checks
  const isNowActive = isToday && Math.abs(value.getTime() - roundToNearestFiveMinutes(today).getTime()) < 3 * 60 * 1000;
  const is6PMActive = isToday && hour24 === 18 && minute === 0;
  const is8PMActive = isToday && hour24 === 20 && minute === 0;
  const is11PMActive = isToday && hour24 === 23 && minute === 0;
  const isMidnightActive = hour24 === 0 && minute === 0;

  const dateLabel = isToday ? "" : value.toLocaleDateString([], { month: "short", day: "numeric" }) + ", ";

  return (
    <div className={clsx("flex flex-col gap-3", className)}>
      {/* Time Analysis Banner */}
      <div className="flex items-center justify-between bg-primary/10 border border-primary/20 rounded-2xl px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary shrink-0 animate-pulse" />
          <span className="text-xs font-bold text-foreground">
            Safety analysis for <span className="text-primary">{dateLabel}{formatTime12h(value)}</span>
          </span>
        </div>
        <button
          type="button"
          onClick={() => setShowDatePicker(!showDatePicker)}
          className={clsx(
            "text-[11px] font-bold px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 border",
            !isToday
              ? "bg-primary text-primary-fg border-primary shadow-xs"
              : "bg-[--background] text-muted-fg border-[--glass-border] hover:bg-muted/50"
          )}
        >
          <Calendar className="w-3.5 h-3.5" />
          {isToday ? "Today" : value.toLocaleDateString([], { month: "short", day: "numeric" })}
        </button>
      </div>

      {/* Optional Date Picker Drawer */}
      {showDatePicker && (
        <div className="p-3 bg-[--background] border border-[--glass-border] rounded-2xl shadow-sm flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-fg">
            <span>Select Journey Date</span>
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                const next = new Date(value);
                next.setFullYear(now.getFullYear(), now.getMonth(), now.getDate());
                onChange(next);
                setShowDatePicker(false);
              }}
              className="text-primary hover:underline text-xs"
            >
              Reset to Today
            </button>
          </div>
          <input
            type="date"
            value={currentDateStr}
            onChange={handleDateChange}
            min={today.toISOString().slice(0, 10)}
            className="w-full bg-[--background] border border-[--glass-border] rounded-xl px-3 py-2 text-sm font-semibold text-foreground outline-none focus:ring-2 ring-primary/20"
          />
        </div>
      )}

      {/* 12-Hour & 5-Minute Selectors */}
      <div className="bg-[--background] border border-[--glass-border] rounded-2xl p-3 shadow-xs flex flex-col gap-3">
        <div className="grid grid-cols-3 gap-2 items-center">
          {/* Hour (1 - 12) */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-fg px-1">
              Hour
            </label>
            <select
              value={hour12}
              onChange={(e) => applyTime(Number(e.target.value), minute, isPM)}
              className="w-full bg-muted/40 hover:bg-muted/60 border border-[--glass-border] rounded-xl px-3 py-2 text-sm font-bold text-foreground outline-none focus:ring-2 ring-primary/30 transition-colors cursor-pointer"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((h) => (
                <option key={`hour-${h}`} value={h} className="bg-[--background] text-foreground">
                  {h}
                </option>
              ))}
            </select>
          </div>

          {/* Minute (00, 05, 10, 15, ..., 55) */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-fg px-1">
              Minute (5m)
            </label>
            <select
              value={minute.toString().padStart(2, "0")}
              onChange={(e) => applyTime(hour12, Number(e.target.value), isPM)}
              className="w-full bg-muted/40 hover:bg-muted/60 border border-[--glass-border] rounded-xl px-3 py-2 text-sm font-bold text-foreground outline-none focus:ring-2 ring-primary/30 transition-colors cursor-pointer"
            >
              {ALLOWED_MINUTE_STRINGS.map((mStr) => (
                <option key={`min-${mStr}`} value={mStr} className="bg-[--background] text-foreground">
                  {mStr}
                </option>
              ))}
            </select>
          </div>

          {/* AM / PM Toggle */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-fg px-1">
              Period
            </label>
            <div className="grid grid-cols-2 bg-muted/40 border border-[--glass-border] rounded-xl p-0.5 h-[38px] items-center">
              <button
                type="button"
                onClick={() => applyTime(hour12, minute, false)}
                className={clsx(
                  "h-full text-xs font-bold rounded-lg transition-all flex items-center justify-center",
                  !isPM
                    ? "bg-primary text-primary-fg shadow-xs"
                    : "text-muted-fg hover:text-foreground"
                )}
              >
                AM
              </button>
              <button
                type="button"
                onClick={() => applyTime(hour12, minute, true)}
                className={clsx(
                  "h-full text-xs font-bold rounded-lg transition-all flex items-center justify-center",
                  isPM
                    ? "bg-primary text-primary-fg shadow-xs"
                    : "text-muted-fg hover:text-foreground"
                )}
              >
                PM
              </button>
            </div>
          </div>
        </div>

        {/* Quick Shortcut Presets */}
        <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar pt-1 border-t border-[--glass-border]/50">
          <button
            type="button"
            onClick={setTravelNow}
            className={clsx(
              "px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all border flex items-center gap-1",
              isNowActive
                ? "bg-primary text-primary-fg border-primary shadow-xs"
                : "bg-muted/30 text-foreground border-[--glass-border] hover:bg-muted/60"
            )}
          >
            <Sparkles className="w-3 h-3 text-amber-400" />
            Travel Now
          </button>
          <button
            type="button"
            onClick={() => setPresetTime(18, 0)}
            className={clsx(
              "px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition-colors border",
              is6PMActive
                ? "bg-primary text-primary-fg border-primary shadow-xs"
                : "bg-muted/30 text-muted-fg border-[--glass-border] hover:bg-muted/60"
            )}
          >
            6:00 PM
          </button>
          <button
            type="button"
            onClick={() => setPresetTime(20, 0)}
            className={clsx(
              "px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition-colors border",
              is8PMActive
                ? "bg-primary text-primary-fg border-primary shadow-xs"
                : "bg-muted/30 text-muted-fg border-[--glass-border] hover:bg-muted/60"
            )}
          >
            8:00 PM
          </button>
          <button
            type="button"
            onClick={() => setPresetTime(23, 0)}
            className={clsx(
              "px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition-colors border",
              is11PMActive
                ? "bg-primary text-primary-fg border-primary shadow-xs"
                : "bg-muted/30 text-muted-fg border-[--glass-border] hover:bg-muted/60"
            )}
          >
            11:00 PM
          </button>
          <button
            type="button"
            onClick={() => setPresetTime(0, 0)}
            className={clsx(
              "px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition-colors border",
              isMidnightActive
                ? "bg-primary text-primary-fg border-primary shadow-xs"
                : "bg-muted/30 text-muted-fg border-[--glass-border] hover:bg-muted/60"
            )}
          >
            Midnight
          </button>
        </div>
      </div>
    </div>
  );
}
