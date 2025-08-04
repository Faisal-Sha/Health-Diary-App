import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/authStore';
import { 
  BookOpen, 
  Users, 
  BarChart3, 
  Plus,
  Calendar,
  Heart,
  TrendingUp,
  Smile
} from 'lucide-react';
import { Link } from 'react-router-dom';

const quickActions = [
  {
    title: 'New Diary Entry',
    description: 'Record your daily health and mood',
    icon: Plus,
    href: '/entries/new',
    color: 'bg-gradient-wellness'
  },
  {
    title: 'View Calendar',
    description: 'Browse your entries by date',
    icon: Calendar,
    href: '/entries?view=calendar',
    color: 'bg-gradient-accent'
  },
  {
    title: 'Add Family Member',
    description: 'Manage family health profiles',
    icon: Users,
    href: '/family/new',
    color: 'bg-gradient-wellness'
  }
];

const stats = [
  {
    title: 'Total Entries',
    value: '24',
    change: '+12%',
    icon: BookOpen,
    color: 'text-primary'
  },
  {
    title: 'Family Members',
    value: '4',
    change: 'New',
    icon: Users,
    color: 'text-success'
  },
  {
    title: 'Average Mood',
    value: '4.2/5',
    change: '+0.3',
    icon: Smile,
    color: 'text-warning'
  },
  {
    title: 'Streak Days',
    value: '7',
    change: '+2',
    icon: TrendingUp,
    color: 'text-accent-foreground'
  }
];

export default function Dashboard() {
  const { user } = useAuthStore();

  return (
    <div className="min-h-screen bg-gradient-calm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Welcome back, {user?.familyName}! 👋
          </h1>
          <p className="text-muted-foreground">
            Here's your wellness overview for today.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title} className="shadow-soft border-border hover:shadow-wellness transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        {stat.title}
                      </p>
                      <p className="text-2xl font-bold text-foreground">
                        {stat.value}
                      </p>
                      <p className={`text-sm ${stat.color}`}>
                        {stat.change} from last week
                      </p>
                    </div>
                    <div className="bg-gradient-accent p-3 rounded-lg">
                      <Icon className={`h-6 w-6 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Quick Actions */}
          <div className="lg:col-span-1">
            <Card className="shadow-soft border-border">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Heart className="h-5 w-5 mr-2 text-primary" />
                  Quick Actions
                </CardTitle>
                <CardDescription>
                  Jump into your most common tasks
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <Link key={action.title} to={action.href}>
                      <div className="flex items-center p-3 rounded-lg border border-border hover:bg-muted transition-colors cursor-pointer">
                        <div className={`${action.color} p-2 rounded-lg mr-3`}>
                          <Icon className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            {action.title}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {action.description}
                          </p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* Recent Entries */}
          <div className="lg:col-span-2">
            <Card className="shadow-soft border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center">
                      <BookOpen className="h-5 w-5 mr-2 text-primary" />
                      Recent Entries
                    </CardTitle>
                    <CardDescription>
                      Your latest health diary entries
                    </CardDescription>
                  </div>
                  <Link to="/entries">
                    <Button variant="outline" size="sm">
                      View All
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[1, 2, 3].map((entry) => (
                    <div key={entry} className="flex items-center p-4 rounded-lg border border-border hover:bg-muted transition-colors">
                      <div className="bg-gradient-wellness p-2 rounded-lg mr-4">
                        <BookOpen className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-foreground">
                          Daily Health Check - Day {entry}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          Feeling great today! Had a good workout and healthy meals.
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(Date.now() - entry * 24 * 60 * 60 * 1000).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center space-x-1">
                          <Smile className="h-4 w-4 text-success" />
                          <span className="text-sm font-medium">Good</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}