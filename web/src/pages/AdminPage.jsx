import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Tabs } from '../components/ui/Tabs';

export default function AdminPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Mock admin data fetch since backend admin router hasn't been built completely
    setTimeout(() => {
      setData({
        usersCount: 125,
        sessionsCount: 3420,
        averageScore: 0.68,
        activeOrg: 'Demo Institution'
      });
      setLoading(false);
    }, 1000);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-surface-500">Loading admin data...</div>
      </div>
    );
  }

  const overviewTab = (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm font-medium text-surface-500 mb-1">Total Users</p>
          <p className="text-3xl font-bold font-display text-primary-400">{data.usersCount}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm font-medium text-surface-500 mb-1">Total Sessions</p>
          <p className="text-3xl font-bold font-display text-accent-400">{data.sessionsCount}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm font-medium text-surface-500 mb-1">Avg Competency Score</p>
          <p className="text-3xl font-bold font-display text-emerald-400">{(data.averageScore * 100).toFixed(1)}%</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm font-medium text-surface-500 mb-1">Active Organization</p>
          <p className="text-xl font-bold font-display text-surface-200 mt-2">{data.activeOrg}</p>
        </CardContent>
      </Card>
    </div>
  );

  const usersTab = (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Recent Users (Stub)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-surface-400 py-8 text-center border-2 border-dashed border-surface-800 rounded-xl">
          User table will render here. Data pending API integration.
        </div>
      </CardContent>
    </Card>
  );

  const tabs = [
    { id: 'overview', label: 'Overview', content: overviewTab },
    { id: 'users', label: 'Users & Org', content: usersTab },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 animate-slide-up">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-surface-400">Manage organization settings and view high-level analytics.</p>
      </div>

      <Tabs tabs={tabs} defaultTab="overview" />
    </div>
  );
}
