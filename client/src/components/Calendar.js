import React, { useMemo, useState } from 'react';
import "./Calendar.css";
import DiaryEntry from "./DiaryEntry.js";

function Calendar({getDatesWithEntries, getEntriesForDate, selectedDate, setSelectedDate, handleDeleteEntry}) {

    // State for current month/year being viewed
    const [currentDate, setCurrentDate] = useState(new Date());
    // Get current month and year
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const calendarDays = useMemo(() => {
        const firstDay = new Date(currentYear, currentMonth, 1);
        const lastDay = new Date(currentYear, currentMonth + 1, 0);

        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());//start from Sunday

        const days = [];
        const today = new Date();

        for (let i = 0; i < 42; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);

            const dateString = date.toLocaleDateString();
            const dayEntries = getEntriesForDate(dateString);

            const isCurrentMonth = date.getMonth() === currentMonth;
            const isToday = date.toDateString() === today.toDateString();
            const isSelected = selectedDate === dateString;

            let averageMood = 'neutral';
            if (dayEntries.length > 0) {
                const moodSum = dayEntries.reduce((sum, entry) => {
                    return sum + (entry.mood === 'positive' ? 3 : entry.mood === 'negative' ? 1 : 2);
                }, 0);
                const avgScore = moodSum / dayEntries.length;
                averageMood = avgScore > 2.5 ? 'positive' : avgScore < 1.5 ? 'negative' : 'neutral';
            }

            days.push({
                date: date,
                dateString: dateString,
                dayNumber: date.getDate(),
                entries: dayEntries,
                isCurrentMonth: isCurrentMonth,
                isToday: isToday,
                isSelected: isSelected,
                hasEntries: dayEntries.length > 0,
                averageMood: averageMood
            });

        }

        return days;
    }, [currentMonth, currentYear, getDatesWithEntries, getEntriesForDate, selectedDate]);

    const goToPreviousMonth = () => {
        setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
    }

    const goToNextMonth = () => {
        setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
    }

    const goToToday = () => {
        setCurrentDate(new Date());
        setSelectedDate(new Date().toLocaleDateString());
    };

    return (
        <div className="calendar-section">
            {/*Calendar Header with Navigation*/}
            <div className = "calendar-header">
                <h3>📅 Calendar View</h3>
                <div className="calendar-nav">
                    <button className="nav-btn" onClick={goToPreviousMonth}>← Previous</button>
                    <div className="current-month">{monthNames[currentMonth]} {currentYear}</div>
                    <button className="nav-btn" onClick={goToNextMonth}>Next →</button>
                    <button className="today-btn" onClick={goToToday}>Today</button>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="calendar-container">
                {/* Weekday Headers */}
                <div className="calendar-weekdays">
                    {weekDays.map((day) => (
                        <div key={day} className="weekday-header">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Calendar Days Grid */}
                <div className="calendar-grid">
                {calendarDays.map((day, index) => {
                    // Create preview text for tooltip
                    const previewText = day.hasEntries 
                        ? `${day.entries.length} entries: ${day.entries[0].text.slice(0, 50)}${day.entries[0].text.length > 50 ? '...' : ''}`
                        : '';
                    
                    return (
                        <div 
                            key={index}
                            className={`calendar-day 
                                ${day.isCurrentMonth ? '' : 'other-month'} 
                                ${day.isToday ? 'today' : ''} 
                                ${day.isSelected ? 'selected' : ''} 
                                ${day.hasEntries ? 'has-entries' : ''}
                                mood-${day.averageMood}
                            `}
                            onClick={() => setSelectedDate(day.dateString)}
                            title={previewText} // Native tooltip as fallback
                        >
                            <div className="day-number">
                                {day.dayNumber}
                            </div>
                            
                            {/* Mood indicator dot */}
                            {day.hasEntries && (
                                <div className={`mood-indicator mood-${day.averageMood}`}></div>
                            )}
                            
                            {/* Entry count */}
                            {day.hasEntries && (
                                <div className="entry-count">
                                    {day.entries.length} {day.entries.length === 1 ? 'entry' : 'entries'}
                                </div>
                            )}
                        </div>
                    )})}
                </div>
            </div>

            {/* Selected Day Entries */}
            {selectedDate && getEntriesForDate(selectedDate).length > 0 && (
                <div className="selected-day-entries">
                    <h4>Entries for {selectedDate}</h4>
                    <div className="entries-list">
                        {getEntriesForDate(selectedDate).map((entry) => (
                            <DiaryEntry 
                                key={entry.id}
                                entry={entry}
                                deleteEntry={handleDeleteEntry}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Empty state for selected date with no entries */}
            {selectedDate && getEntriesForDate(selectedDate).length === 0 && (
                <div className="selected-day-entries empty-state">
                    <h4>No entries for {selectedDate}</h4>
                    <p>Click "Start Voice Entry" or type to add your first entry for this day!</p>
                </div>
            )}
        </div>
    )

}

export default Calendar;