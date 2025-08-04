import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Heart, 
  Shield, 
  Users, 
  BarChart3, 
  Calendar,
  BookOpen,
  ArrowRight
} from 'lucide-react';

const features = [
  {
    icon: BookOpen,
    title: 'Personal Health Diary',
    description: 'Keep track of your daily health entries, moods, and wellness journey.'
  },
  {
    icon: Users,
    title: 'Family Profiles',
    description: 'Manage health records for your entire family in one secure place.'
  },
  {
    icon: BarChart3,
    title: 'Analytics & Insights',
    description: 'Visualize your health trends and get insights into your wellness patterns.'
  },
  {
    icon: Calendar,
    title: 'Calendar View',
    description: 'Navigate through your entries with an intuitive calendar interface.'
  },
  {
    icon: Shield,
    title: 'Secure & Private',
    description: 'Your health data is encrypted and stored securely with privacy in mind.'
  },
  {
    icon: Heart,
    title: 'Wellness Focused',
    description: 'Designed with your mental and physical wellbeing as the top priority.'
  }
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-calm">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-wellness opacity-5"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center animate-fade-up">
            <div className="flex justify-center mb-8">
              <div className="bg-gradient-wellness p-4 rounded-2xl shadow-wellness">
                <Heart className="h-12 w-12 text-white" />
              </div>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
              Your Personal{' '}
              <span className="bg-gradient-wellness bg-clip-text text-transparent">
                Health Diary
              </span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              Track your wellness journey, manage family health records, and gain insights 
              into your health patterns with our beautiful and intuitive health diary app.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register">
                <Button 
                  size="lg" 
                  className="bg-gradient-wellness hover:opacity-90 text-lg px-8 py-3 shadow-wellness"
                >
                  Start Your Journey
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/login">
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="text-lg px-8 py-3"
                >
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Everything you need for wellness tracking
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Comprehensive health management tools designed to help you and your family 
              maintain better health awareness and make informed wellness decisions.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card 
                  key={feature.title} 
                  className="border-border hover:shadow-soft transition-all duration-300 hover:scale-105"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <CardContent className="p-6">
                    <div className="bg-gradient-accent p-3 rounded-lg w-fit mb-4">
                      <Icon className="h-6 w-6 text-accent-foreground" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-wellness">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to start your health journey?
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Join thousands of users who are already taking control of their wellness.
          </p>
          <Link to="/register">
            <Button 
              size="lg" 
              variant="secondary"
              className="text-lg px-8 py-3 bg-white text-primary hover:bg-white/90"
            >
              Get Started Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}