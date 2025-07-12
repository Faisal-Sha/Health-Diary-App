import React, { useMemo, useState } from 'react';
import "./Calendar.css";
import DiaryEntry from "./DiaryEntry.js";

function Calendar({getDatesWithEntries, getEntriesForDate, selectedDate, setSelectedDate, handleDeleteEntry, onEntryUpdated}) {

    // State for current month/year being viewed
    const [currentDate, setCurrentDate] = useState(new Date());
    
    // NEW: State for view mode (month or week)
    const [viewMode, setViewMode] = useState('month');
    
    // Get current month and year
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // UPDATED: Generate days based on view mode
    const calendarDays = useMemo(() => {
        const days = [];
        const today = new Date();
        
        if (viewMode === 'week') {
            // WEEK VIEW: Generate 7 days for the current week
            
            // Find the Sunday of the week containing currentDate
            const startOfWeek = new Date(currentDate);
            startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
            
            for (let i = 0; i < 7; i++) {
                const date = new Date(startOfWeek);
                date.setDate(startOfWeek.getDate() + i);
                
                const dateString = date.toLocaleDateString();
                const dayEntries = getEntriesForDate(dateString);
                
                const isCurrentMonth = date.getMonth() === currentMonth;
                const isToday = date.toDateString() === today.toDateString();
                const isSelected = selectedDate === dateString;
                
                // Calculate average mood
                // Calculate average mood using AI mood scores
                let averageMood = 'neutral';
                if (dayEntries.length > 0) {
                    // Use AI mood scores if available, otherwise fall back to mood strings
                    const moodSum = dayEntries.reduce((sum, entry) => {
                        if (entry.aiData && entry.aiData.moodScore) {
                            return sum + entry.aiData.moodScore;
                        } else {
                            // Fallback to string-based mood
                            return sum + (entry.mood === 'positive' ? 8 : entry.mood === 'negative' ? 3 : 5);
                        }
                    }, 0);
                    const avgScore = moodSum / dayEntries.length;
                    averageMood = avgScore > 6.5 ? 'positive' : avgScore < 4.5 ? 'negative' : 'neutral';
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
            
        } else {
            // MONTH VIEW: Generate 42 days (existing logic)
            
            const firstDay = new Date(currentYear, currentMonth, 1);
            const startDate = new Date(firstDay);
            startDate.setDate(startDate.getDate() - firstDay.getDay()); // Start from Sunday

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
                    // Use AI mood scores if available, otherwise fall back to mood strings
                    const moodSum = dayEntries.reduce((sum, entry) => {
                        if (entry.aiData && entry.aiData.moodScore) {
                            return sum + entry.aiData.moodScore;
                        } else {
                            // Fallback to string-based mood
                            return sum + (entry.mood === 'positive' ? 8 : entry.mood === 'negative' ? 3 : 5);
                        }
                    }, 0);
                    const avgScore = moodSum / dayEntries.length;
                    averageMood = avgScore > 6.5 ? 'positive' : avgScore < 4.5 ? 'negative' : 'neutral';
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
        }
        
        return days;
    }, [currentMonth, currentYear, currentDate, viewMode, getDatesWithEntries, getEntriesForDate, selectedDate]);

    // UPDATED: Navigation based on view mode
    const goToPrevious = () => {
        if (viewMode === 'week') {
            // Go back 1 week (7 days)
            const newDate = new Date(currentDate);
            newDate.setDate(currentDate.getDate() - 7);
            setCurrentDate(newDate);
        } else {
            // Go back 1 month
            setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
        }
    };

    const goToNext = () => {
        if (viewMode === 'week') {
            // Go forward 1 week (7 days)
            const newDate = new Date(currentDate);
            newDate.setDate(currentDate.getDate() + 7);
            setCurrentDate(newDate);
        } else {
            // Go forward 1 month
            setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
        }
    };

    const goToToday = () => {
        setCurrentDate(new Date());
        setSelectedDate(new Date().toLocaleDateString());
    };

    // NEW: Toggle between month and week view
    const toggleViewMode = () => {
        setViewMode(viewMode === 'month' ? 'week' : 'month');
    };

    // NEW: Generate header text based on view mode
    const getHeaderText = () => {
        if (viewMode === 'week') {
            // For week view, show date range
            const startOfWeek = new Date(currentDate);
            startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
            
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6);
            
            const startMonth = monthNames[startOfWeek.getMonth()];
            const endMonth = monthNames[endOfWeek.getMonth()];
            
            if (startOfWeek.getMonth() === endOfWeek.getMonth()) {
                // Same month: "June 1-7, 2025"
                return `${startMonth} ${startOfWeek.getDate()}-${endOfWeek.getDate()}, ${startOfWeek.getFullYear()}`;
            } else {
                // Different months: "May 29 - June 4, 2025"
                return `${startMonth} ${startOfWeek.getDate()} - ${endMonth} ${endOfWeek.getDate()}, ${startOfWeek.getFullYear()}`;
            }
        } else {
            // Month view: "June 2025"
            return `${monthNames[currentMonth]} ${currentYear}`;
        }
    };

    return (
        <div className="calendar-section">
            {/*Calendar Header with Navigation*/}
            <div className="calendar-header">
                <h3>📅 Calendar View</h3>
                <div className="calendar-nav">
                    <button className="nav-btn" onClick={goToPrevious}>← Previous {viewMode === 'week' ? 'Week' : 'Month'}</button>
                    <div className="current-period">{getHeaderText()}</div>
                    <button className="nav-btn" onClick={goToNext}>Next {viewMode === 'week' ? 'Week' : 'Month'} →</button>
                    <button className="today-btn" onClick={goToToday}>Today</button>
                    
                    {/* View Mode Toggle */}
                    <button className="view-toggle-btn" onClick={toggleViewMode}>{viewMode === 'month' ? '📅 Week View' : '🗓️ Month View'}</button>
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

                {/* Calendar Days Grid - UPDATED: Different class for week view */}
                <div className={`calendar-grid ${viewMode === 'week' ? 'week-view' : 'month-view'}`}>
                    {calendarDays.map((day, index) => (
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
                    ))}
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
                                onEntryUpdated={onEntryUpdated}
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