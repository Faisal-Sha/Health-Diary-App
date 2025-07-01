import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './AuthForm.css';

const AuthForm = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    familyName: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login, register, error } = useAuth();

  // Enhanced form interactions
  useEffect(() => {
    const inputs = document.querySelectorAll('input[type="email"], input[type="password"], input[type="text"]');
    
    const handleFocus = (e) => {
      const wrapper = e.target.closest('.input-wrapper');
      if (wrapper) {
        wrapper.style.transform = 'translateY(-2px)';
        wrapper.style.transition = 'transform 0.3s ease';
      }
    };

    const handleBlur = (e) => {
      const wrapper = e.target.closest('.input-wrapper');
      if (wrapper) {
        wrapper.style.transform = 'translateY(0)';
      }
    };

    const handleInput = (e) => {
      const icon = e.target.nextElementSibling;
      if (icon && icon.classList.contains('input-icon')) {
        icon.style.transform = 'translateY(-50%) scale(1.1)';
        setTimeout(() => {
          icon.style.transform = 'translateY(-50%) scale(1)';
        }, 150);
      }
    };

    inputs.forEach(input => {
      input.addEventListener('focus', handleFocus);
      input.addEventListener('blur', handleBlur);
      input.addEventListener('input', handleInput);
    });

    // Cleanup event listeners
    return () => {
      inputs.forEach(input => {
        input.removeEventListener('focus', handleFocus);
        input.removeEventListener('blur', handleBlur);
        input.removeEventListener('input', handleInput);
      });
    };
  }, [isLogin]); // Re-run when switching between login/register

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    // Update button text and style during loading
    const submitBtn = e.target.querySelector('.login-btn');
    const originalText = submitBtn.textContent;
    
    try {
      if (isLogin) {
        submitBtn.textContent = 'SIGNING IN...';
        submitBtn.style.background = 'linear-gradient(135deg, #6B73FF, #9644FF)';
        await login(formData.email, formData.password);
      } else {
        submitBtn.textContent = 'CREATING ACCOUNT...';
        submitBtn.style.background = 'linear-gradient(135deg, #6B73FF, #9644FF)';
        
        // Registration validation
        if (formData.password !== formData.confirmPassword) {
          alert('Passwords do not match');
          return;
        }
        if (formData.password.length < 6) {
          alert('Password must be at least 6 characters');
          return;
        }
        if (!formData.familyName.trim()) {
          alert('Family name is required');
          return;
        }
        
        await register(formData.email, formData.password, formData.familyName);
      }
    } catch (error) {
      console.error('Authentication error:', error);
    } finally {
      setIsLoading(false);
      // Reset button
      submitBtn.textContent = originalText;
      submitBtn.style.background = 'linear-gradient(135deg, #4A90E2, #50C9C3)';
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setFormData({
      email: '',
      password: '',
      confirmPassword: '',
      familyName: ''
    });
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleSocialLogin = (provider) => {
    // Placeholder for social login implementation
    alert(`Social login with ${provider} would be implemented here`);
  };

  return (
    <div className="auth-container">
      {/* Geometric background */}
      <div className="geometric-bg">
        <div className="geo-shape"></div>
        <div className="geo-shape"></div>
        <div className="geo-shape"></div>
        <div className="geo-shape"></div>
        <div class="grid-overlay"></div>
      </div>

      <div className="login-container">
        {/* Branding Panel */}
        <div className="branding-panel">
          <div className="brand-pattern"></div>
          <div className="brand-logo">🏠</div>
          <h1 className="brand-title">Family Health</h1>
          <p className="brand-subtitle">
            Track your family's wellness journey with our comprehensive health diary platform.
          </p>
          
          <div className="brand-features">
            <div className="feature-item">
              <div className="feature-icon">📊</div>
              Health Analytics
            </div>
            <div className="feature-item">
              <div className="feature-icon">👨‍👩‍👧‍👦</div>
              Family Profiles
            </div>
            <div className="feature-item">
              <div className="feature-icon">🔒</div>
              Secure & Private
            </div>
          </div>
        </div>

        {/* Login Panel */}
        <div className="login-panel">
          <div className="form-header">
            <h2 className="form-title">
              {isLogin ? 'Sign in to continue to your account' : 'Create your family account'}
            </h2>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <div className="input-wrapper">
                <input
                  type="email"
                  id="email"
                  name="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  required
                />
                
              </div>
            </div>

            {!isLogin && (
              <div className="form-group">
                <label htmlFor="familyName">Family Name</label>
                <div className="input-wrapper">
                  <input
                    type="text"
                    id="familyName"
                    name="familyName"
                    placeholder="Enter your family name"
                    value={formData.familyName}
                    onChange={handleInputChange}
                    disabled={isLoading}
                    required
                  />
    
                </div>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  required
                />
                
                <span 
                  className="password-toggle" 
                  onClick={togglePasswordVisibility}
                  role="button"
                  tabIndex={0}
                >
                  {showPassword ? '🙈' : '👀'}
                </span>
              </div>
            </div>

            {!isLogin && (
              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <div className="input-wrapper">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="confirmPassword"
                    name="confirmPassword"
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    disabled={isLoading}
                    required
                  />
                  <span className="input-icon">🔒</span>
                </div>
              </div>
            )}

            {isLogin && (
              <div className="form-options">
                <label className="remember-me">
                  <input type="checkbox" id="remember" />
                  Remember me
                </label>
                <a href="#" className="forgot-password">Forgot password?</a>
              </div>
            )}

            <button type="submit" className="login-btn" disabled={isLoading}>
              {isLogin ? 'SIGN IN' : 'CREATE ACCOUNT'}
            </button>

            <div className="divider">
              <span>Or continue with</span>
            </div>

            <div className="social-login">
              <button 
                type="button" 
                className="social-btn" 
                style={{color: '#4267B2'}} 
                title="Continue with Facebook"
                onClick={() => handleSocialLogin('Facebook')}
              >
                📘
              </button>
              <button 
                type="button" 
                className="social-btn" 
                style={{color: '#DB4437'}} 
                title="Continue with Google"
                onClick={() => handleSocialLogin('Google')}
              >
                🔍
              </button>
              <button 
                type="button" 
                className="social-btn" 
                style={{color: '#0077B5'}} 
                title="Continue with LinkedIn"
                onClick={() => handleSocialLogin('LinkedIn')}
              >
                💼
              </button>
            </div>

            <div className="signup-link">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button 
                type="button" 
                onClick={toggleMode}
                disabled={isLoading}
                className="toggle-link"
              >
                {isLogin ? 'Sign up' : 'Sign in'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AuthForm;