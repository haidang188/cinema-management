interface DateItem {
    value: string;
    day: string;
    month: string;
    weekday: string;
}

interface DateSelectorProps {
    dates: DateItem[];
    selectedDate: string;
    today: string;
    startDate: Date;
    onPreviousWeek: () => void;
    onNextWeek: () => void;
    onDateClick: (date: DateItem) => void;
    onCalendarChange: (
        event: React.ChangeEvent<HTMLInputElement>
    ) => void;
}

function DateSelector({
                          dates,
                          selectedDate,
                          today,
                          startDate,
                          onPreviousWeek,
                          onNextWeek,
                          onDateClick,
                          onCalendarChange
                      }: DateSelectorProps) {

    return (
        <div className="date-selector">

            <button
                className="week-arrow"
                onClick={onPreviousWeek}
                disabled={startDate <= new Date(`${today}T00:00:00`)}
            >
                ‹
            </button>

            <div className="date-list">

                {dates.map((date) => (

                    <button
                        key={date.value}
                        className={`date-item ${
                            selectedDate === date.value
                                ? "active"
                                : ""
                        }`}
                        onClick={() => onDateClick(date)}
                    >

                        <span className="date-number">
                            {date.day}/{date.month}
                        </span>

                        <span className="date-weekday">
                            {date.weekday}
                        </span>

                    </button>

                ))}

            </div>

            <button
                className="week-arrow"
                onClick={onNextWeek}
            >
                ›
            </button>

            <div className="calendar-wrapper">

                <label
                    htmlFor="calendar"
                    className="calendar-button"
                >
                    📅
                </label>

                <input
                    id="calendar"
                    type="date"
                    min={today}
                    value={selectedDate}
                    onChange={onCalendarChange}
                />

            </div>

        </div>
    );
}

export default DateSelector;