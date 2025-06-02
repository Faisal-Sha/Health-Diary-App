import React from 'react';
import './Summary.css';

function Summary({Entries}) {
    return (
        <div className="summary-section">
            <h3>Quick Summary</h3>
            <div className="summary-stats">
                    <div className="stat">
                      <span className="stat-number">{Entries.length}</span>
                      <span className="stat-label">Total Entries</span>
                    </div>
                    <div className="stat">
                      <span className="stat-number">
                          {Entries.filter(e => e.mood === 'positive').length}
                      </span>
                      <span className="stat-label">Good Days</span>
                    </div>
                    <div className="stat">
                      <span className="stat-number">
                        {Entries.filter(e => e.symptoms.length > 0).length}
                      </span>
                      <span className="stat-label">Days with Symptoms</span>
                    </div>
            </div>
          </div>
    )


}

export default Summary;