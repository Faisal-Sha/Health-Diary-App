import React from 'react';
import './HeroSection.css';

function HeroSection() {
    return(
        <div className = "hero-container">
            {/* Animated background */}
            <div className="hero-bg">
                <div className="floating-shapes">
                    <div className="shape shape-1"></div>
                    <div className="shape shape-2"></div>
                    <div className="shape shape-3"></div>
                    <div className="shape shape-4"></div>
                    <div className="shape shape-5"></div>
                </div>
            </div>

            {/* Main hero content */}
            <div className="hero-content">
                <div className="hero-badge">
                    <span className="badge-icon">🚀</span>
                    <span className="badge-text">Advanced AI Technology</span>
                </div>

                <h1 className="hero-title">
                    <span className="title-line-1">AI-Powered</span>
                    <span className="title-line-2">Health Intelligence</span>
                    <span className="title-highlight">Platform</span>
                </h1>

                <p className="hero-subtitle">
                    Revolutionary health analytics combining <strong>GPT-4 AI</strong>, 
                    <strong> statistical analysis</strong>, and <strong>medical research</strong> 
                    to provide personalized health insights you've never seen before.
                </p>

                {/* Technology stack showcase */}
                <div className="tech-stack">
                    <div className="tech-item">
                        <span className="tech-icon">🧠</span>
                        <span className="tech-name">GPT-4</span>
                    </div>
                    <div className="tech-item">
                        <span className="tech-icon">📊</span>
                        <span className="tech-name">Statistical Analysis</span>
                    </div>
                    <div className="tech-item">
                        <span className="tech-icon">🎤</span>
                        <span className="tech-name">Voice AI</span>
                    </div>
                    <div className="tech-item">
                        <span className="tech-icon">⚡</span>
                        <span className="tech-name">Real-time</span>
                    </div>
                </div>

                {/* Call to action */}
                <div className="hero-cta">
                    <button className="cta-primary">
                        <span className="cta-icon">✨</span>
                        Experience AI Health Analysis
                    </button>
                    <button className="cta-secondary">
                        <span className="cta-icon">🔬</span>
                        View Technology Demo
                    </button>
                </div>

                {/* Stats showcase */}
                <div className="hero-stats">
                    <div className="stat-item">
                        <div className="stat-number">15+</div>
                        <div className="stat-label">Health Metrics</div>
                    </div>
                    <div className="stat-item">
                        <div className="stat-number">AI</div>
                        <div className="stat-label">Pattern Detection</div>
                    </div>
                    <div className="stat-item">
                        <div className="stat-number">Real-time</div>
                        <div className="stat-label">Insights</div>
                    </div>
                    <div className="stat-item">
                        <div className="stat-number">Medical</div>
                        <div className="stat-label">Research Based</div>
                    </div>
                </div>
            </div>

            {/* Scroll indicator */}
            <div className="scroll-indicator">
                <div className="scroll-arrow">
                    <span>↓</span>
                </div>
                <p>Scroll to explore features</p>
            </div>
        </div>
    )
}

export default HeroSection;