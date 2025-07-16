import React from 'react';
import "./FeatureShowcase.css";

function FeatureShowcase({ setCurrentView }) {
    const features = [
      {
        icon: '🧠',
        title: 'AI-Powered Analysis',
        description: 'Advanced GPT-4 integration extracts health insights from your diary entries with medical-grade accuracy.',
        cta: 'Experience AI Analysis →',
        onClick: () => setCurrentView('list')
      },
      {
        icon: '📊',
        title: 'Statistical Pattern Detection',
        description: 'Discover hidden correlations between your lifestyle, mood, sleep, and health metrics using advanced algorithms.',
        cta: 'View Analytics →',
        onClick: () => setCurrentView('analytics')
      },
      {
        icon: '📈',
        title: 'Real-time Health Insights',
        description: 'Get instant personalized recommendations and health trends analysis as you track your daily wellness journey.',
        cta: 'See Live Data →',
        onClick: () => setCurrentView('charts')
      },
      {
        icon: '🎤',
        title: 'Voice-Enabled Logging',
        description: 'Speak your thoughts naturally with our advanced speech-to-text technology for effortless health tracking.',
        cta: 'Try Voice Entry →',
        onClick: () => setCurrentView('list')
      },
      {
        icon: '👨‍👩‍👧‍👦',
        title: 'Family Health Profiles',
        description: 'Track health data for multiple family members with personalized insights and secure profile management.',
        cta: 'Manage Profiles →',
        onClick: () => setCurrentView('list')
      },
      {
        icon: '🔒',
        title: 'Medical-Grade Security',
        description: 'Enterprise-level encryption and privacy protection ensure your sensitive health data stays completely secure.',
        cta: 'Learn More →',
        onClick: () => setCurrentView('charts')
      }
    ];
  
    return (
      <section className="feature-showcase-section">
        <div className="feature-showcase-container">
          <h2 className="feature-showcase-title">
            Revolutionary Health Analytics Platform
          </h2>
          <p className="feature-showcase-subtitle">
            Combining cutting-edge AI technology with medical research to transform 
            how you understand and optimize your health journey.
          </p>
  
          <div className="feature-cards-grid">
            {features.map((feature, index) => (
              <div 
                key={index} 
                className="feature-card"
                onClick={feature.onClick}
              >
                <div className="feature-card-icon">{feature.icon}</div>
                <h3 className="feature-card-title">{feature.title}</h3>
                <p className="feature-card-description">{feature.description}</p>
                <div className="feature-card-cta">{feature.cta}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }
  
export default FeatureShowcase;
