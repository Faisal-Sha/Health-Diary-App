import React from 'react';
import "./Calendar.css";
import DiaryEntry from "./DiaryEntry.js";

function Calendar({getDatesWithEntries, getEntriesForDate, selectedDate, setSelectedDate, handleDeleteEntry}) {
    return (
        <div className="calendar-section">
              <h3>📅 Calendar View</h3>
              <div className="calendar-grid">
                {getDatesWithEntries().map((date) => {
                  const dayEntries = getEntriesForDate(date);
                  const averageMood = dayEntries.reduce((sum, entry) => {
                    return sum + (entry.mood === 'positive' ? 3 : entry.mood === 'negative' ? 1 : 2);
                  }, 0) 
                  
                  return (
                    <div 
                      key={date} 
                      className={`calendar-day ${selectedDate === date ? 'selected' : ''}`}
                      onClick={() => setSelectedDate(date)}
                    >
                      <div className="calendar-date">{date}</div>
                      <div className={`mood-indicator mood-${averageMood > 2.5 ? 'positive' : averageMood < 1.5 ? 'negative' : 'neutral'}`}></div>
                      <div className="entry-count">{dayEntries.length} entries</div>
                    </div>
                  );
                })}
              </div>
              
              {/* Show entries for selected date */}
              {selectedDate && (
                <div className="selected-day-entries">
                  <h4>Entries for {selectedDate}</h4>
                  {getEntriesForDate(selectedDate).map((entry) => (
                    <DiaryEntry 
                      entry = {entry}
                      deleteEntry={handleDeleteEntry}
                    />
                  ))}
                </div>
              )}
        </div>
    )


}

export default Calendar;