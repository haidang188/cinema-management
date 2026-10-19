import { useRef } from "react";
import type { DateItem } from "./showtimeTypes";

interface DateSelectorProps {
    dates: DateItem[];
    selectedDate: string;
    today: string;
    canGoBack: boolean;
    onPreviousWeek: () => void;
    onNextWeek: () => void;
    onDateClick: (value: string) => void;
    onCalendarChange: (value: string) => void;
}

function DateSelector({
                          dates,
                          selectedDate,
                          today,
                          canGoBack,
                          onPreviousWeek,
                          onNextWeek,
                          onDateClick,
                          onCalendarChange
                      }: DateSelectorProps) {

    const calendarRef = useRef<HTMLInputElement>(null);

    const openCalendar = () => {
        const input = calendarRef.current;

        if (!input) {
            return;
        }

        if (typeof input.showPicker === "function") {
            input.showPicker();
        } else {
            input.focus();
            input.click();
        }
    };

    return (
        <div className="st-date-row">

            <button
                type="button"
                className="st-nav"
                onClick={onPreviousWeek}
                disabled={!canGoBack}
                aria-label="Tuần trước"
            >
                ‹
            </button>

            <div className="st-dates" role="tablist" aria-label="Chọn ngày chiếu">
                {dates.map((date) => (
                    <button
                        type="button"
                        role="tab"
                        aria-selected={selectedDate === date.value}
                        key={date.value}
                        className={`st-date${selectedDate === date.value ? " selected" : ""}`}
                        onClick={() => onDateClick(date.value)}
                    >
                        <span className="st-date-value">{date.day}/{date.month}</span>
                        <span className="st-date-day">{date.weekday}</span>
                    </button>
                ))}
            </div>

            <button
                type="button"
                className="st-nav"
                onClick={onNextWeek}
                aria-label="Tuần sau"
            >
                ›
            </button>

            <div className="st-calendar">
                <button
                    type="button"
                    className="st-nav"
                    onClick={openCalendar}
                    aria-label="Chọn ngày khác"
                    title="Chọn ngày khác"
                >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <rect x="3" y="5" width="18" height="16" rx="2" />
                        <path d="M3 10h18M8 3v4M16 3v4" />
                    </svg>
                </button>

                <input
                    ref={calendarRef}
                    type="date"
                    min={today}
                    value={selectedDate}
                    onChange={(event) => onCalendarChange(event.target.value)}
                    tabIndex={-1}
                    aria-hidden="true"
                />
            </div>

        </div>
    );
}

export default DateSelector;
