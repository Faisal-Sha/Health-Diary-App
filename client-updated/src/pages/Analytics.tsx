import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { BarChart3, TrendingUp, Calendar, Heart } from 'lucide-react';
import { useEntryStore } from '@/stores/entryStore';
import { useFamilyStore } from '@/stores/familyStore';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, subMonths } from 'date-fns';

const MOOD_COLORS = {
  happy: '#10b981',
  neutral: '#6b7280',
  sad: '#3b82f6',
  anxious: '#f59e0b',
  excited: '#8b5cf6',
};

export default function Analytics() {
  const { entries } = useEntryStore();
  const { members } = useFamilyStore();

  const analytics = useMemo(() => {
    // Entry distribution by confidence level
    const confidenceCounts = entries.reduce((acc, entry) => {
      const level = entry.ai_confidence > 80 ? 'high' : entry.ai_confidence > 50 ? 'medium' : 'low';
      acc[level] = (acc[level] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const confidenceData = Object.entries(confidenceCounts).map(([level, count]) => ({
      level: level.charAt(0).toUpperCase() + level.slice(1),
      count,
      color: level === 'high' ? '#10b981' : level === 'medium' ? '#f59e0b' : '#ef4444',
    }));

    // Entries over time (last 6 months)
    const sixMonthsAgo = subMonths(new Date(), 6);
    const timeData = [];
    
    for (let i = 5; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(new Date(), i));
      const monthEnd = endOfMonth(subMonths(new Date(), i));
      const monthEntries = entries.filter(entry => {
        const entryDate = new Date(entry.date);
        return entryDate >= monthStart && entryDate <= monthEnd;
      });
      
      timeData.push({
        month: format(monthStart, 'MMM yyyy'),
        entries: monthEntries.length,
      });
    }

    // Weekly pattern (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const weeklyData = Array.from({ length: 7 }, (_, i) => {
      const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i];
      const dayEntries = entries.filter(entry => {
        const entryDate = new Date(entry.date);
        return entryDate.getDay() === i && entryDate >= thirtyDaysAgo;
      });
      
      return {
        day: dayName,
        entries: dayEntries.length,
      };
    });

    // Family member stats
    const familyStats = members.map(member => {
      const memberEntries = entries.filter(entry => entry.user_id === member.id);
      return {
        name: member.name,
        entries: memberEntries.length,
        role: member.role,
      };
    });

    // Recent activity
    const recentEntries = entries.slice(0, 5);

    return {
      totalEntries: entries.length,
      confidenceData,
      timeData,
      weeklyData,
      familyStats,
      recentEntries,
      averageEntriesPerWeek: entries.length > 0 ? (entries.length / Math.max(1, Math.ceil(entries.length / 7))).toFixed(1) : '0',
      averageConfidence: entries.length > 0 ? (entries.reduce((sum, entry) => sum + entry.ai_confidence, 0) / entries.length).toFixed(1) : '0',
    };
  }, [entries, members]);

  if (entries.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-calm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Analytics & Insights</h1>
            <p className="text-muted-foreground">Visualize your health trends and patterns</p>
          </div>

          <Card className="text-center py-12 shadow-soft border-border">
            <CardContent className="flex flex-col items-center">
              <BarChart3 className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Data Yet</h3>
              <p className="text-muted-foreground text-lg">
                Start creating diary entries to see your health insights and trends.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-calm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Analytics & Insights</h1>
          <p className="text-muted-foreground">Visualize your health trends and patterns</p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="shadow-soft border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Entries</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalEntries}</div>
            </CardContent>
          </Card>

          <Card className="shadow-soft border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg per Week</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.averageEntriesPerWeek}</div>
            </CardContent>
          </Card>

          <Card className="shadow-soft border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg AI Confidence</CardTitle>
              <Heart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.averageConfidence}%</div>
            </CardContent>
          </Card>

          <Card className="shadow-soft border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Family Members</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{members.length}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* AI Confidence Distribution */}
          <Card className="shadow-soft border-border">
            <CardHeader>
              <CardTitle>AI Analysis Confidence</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={analytics.confidenceData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ level, count, percent }) => `${level}: ${count} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {analytics.confidenceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Weekly Pattern */}
          <Card className="shadow-soft border-border">
            <CardHeader>
              <CardTitle>Weekly Activity Pattern</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="entries" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Entries Over Time */}
          <Card className="shadow-soft border-border">
            <CardHeader>
              <CardTitle>Entries Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analytics.timeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="entries" stroke="#8b5cf6" strokeWidth={3} dot={{ fill: '#8b5cf6' }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Family Activity */}
          <Card className="shadow-soft border-border">
            <CardHeader>
              <CardTitle>Family Member Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {analytics.familyStats.length > 0 ? (
                <div className="space-y-4">
                  {analytics.familyStats.map((member, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{member.name}</p>
                        <p className="text-sm text-muted-foreground">{member.role}</p>
                      </div>
                      <Badge variant="secondary">
                        {member.entries} entries
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No family members added yet
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}