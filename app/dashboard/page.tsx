'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

export default function DashboardPage() {
  const [userName, setUserName] = useState('Student');
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    // Update time
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours();
      const greeting = hours < 12 ? 'Good Morning' : hours < 18 ? 'Good Afternoon' : 'Good Evening';
      setCurrentTime(greeting);
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-heading font-bold">
          {currentTime}, {userName}
        </h1>
        <p className="text-muted-foreground">Here's what's happening with your studies today</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-border bg-card hover:bg-accent/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasks Due Today</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground mt-1">
              All caught up! 🎉
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card hover:bg-accent/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Study Hours This Week</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <rect width="20" height="14" x="2" y="5" rx="2" />
              <path d="M2 10h20" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0h</div>
            <p className="text-xs text-muted-foreground mt-1">
              Start your first session
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card hover:bg-accent/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Exams</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground mt-1">
              No exams scheduled
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Schedule */}
        <Card className="border-border bg-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="font-heading">Today's Schedule</CardTitle>
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                View All
              </Button>
            </div>
            <CardDescription>Your study sessions for today</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="py-8 text-center space-y-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  className="h-6 w-6 text-muted-foreground"
                >
                  <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                  <line x1="16" x2="16" y1="2" y2="6" />
                  <line x1="8" x2="8" y1="2" y2="6" />
                  <line x1="3" x2="21" y1="10" y2="10" />
                </svg>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">No study sessions scheduled for today</p>
              </div>
              <Button variant="outline" size="sm">
                + Schedule Session
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Tasks */}
        <Card className="border-border bg-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="font-heading">Upcoming Tasks</CardTitle>
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                View All
              </Button>
            </div>
            <CardDescription>Your pending assignments and tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="py-8 text-center space-y-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  className="h-6 w-6 text-muted-foreground"
                >
                  <path d="M9 11l3 3L22 4" />
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                </svg>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">No tasks yet</p>
              </div>
              <Button variant="outline" size="sm">
                + Add Task
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Exam Dates CTA */}
      <Card className="border-primary/50 bg-gradient-to-br from-card to-accent/20">
        <CardContent className="flex items-center gap-6 p-6">
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-6 w-6 text-primary"
            >
              <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
              <line x1="16" x2="16" y1="2" y2="6" />
              <line x1="8" x2="8" y1="2" y2="6" />
              <line x1="3" x2="21" y1="10" y2="10" />
              <path d="m9 16 2 2 4-4" />
            </svg>
          </div>
          <div className="flex-1 space-y-1">
            <h3 className="text-lg font-heading font-semibold">Add Your Exam Dates</h3>
            <p className="text-sm text-muted-foreground">
              Enable AI-powered spaced repetition and exam preparation timelines by adding your exam schedule
            </p>
          </div>
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90 flex-shrink-0">
            + Add Exams
          </Button>
        </CardContent>
      </Card>

      {/* Progress Overview */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="font-heading">Weekly Progress</CardTitle>
          <CardDescription>Track your study goals and task completion</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Study Goal</span>
                <Badge variant="secondary" className="text-xs">This Week</Badge>
              </div>
              <span className="font-medium">0 / 20 hours</span>
            </div>
            <Progress value={0} className="h-2" />
            <p className="text-xs text-muted-foreground">Keep it up! Start tracking your study time.</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Tasks Completed</span>
                <Badge variant="secondary" className="text-xs">This Week</Badge>
              </div>
              <span className="font-medium">0 / 0</span>
            </div>
            <Progress value={0} className="h-2" />
            <p className="text-xs text-muted-foreground">Add tasks to start tracking your progress.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
