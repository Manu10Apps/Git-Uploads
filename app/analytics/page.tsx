'use client';

import React, { useEffect, useState } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Users, Eye, Clock, ArrowUp } from 'lucide-react';

interface AnalyticsStats {
  period: { days: number; startDate: string; endDate: string };
  summary: {
    totalPageviews: number;
    uniqueVisitors: number;
    uniqueSessions: number;
    avgSessionDuration: number;
    avgScrollDepth: number;
  };
  topPages: Array<{ url: string; title: string; views: number }>;
  trafficByCountry: Array<{ country: string; views: number }>;
  trafficByDevice: Array<{ device: string; views: number }>;
  trafficByBrowser: Array<{ browser: string; views: number }>;
  hourlyTraffic: Array<any>;
}

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6'];

export default function AnalyticsDashboard() {
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/analytics/stats?days=${days}`);
        const data = await response.json();
        setStats(data);
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [days]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-950">
        <div className="text-white">Loading analytics...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-950">
        <div className="text-white">Failed to load analytics</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold mb-4">Analytics Dashboard</h1>
          <div className="flex flex-wrap gap-2">
            {[7, 30, 90].map(d => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-4 py-2 rounded-lg transition ${
                  days === d
                    ? 'bg-[#667684] text-white'
                    : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                }`}
              >
                Last {d} days
              </button>
            ))}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <SummaryCard
            icon={<Eye className="w-6 h-6" />}
            label="Pageviews"
            value={stats.summary.totalPageviews.toLocaleString()}
            color="text-blue-400"
          />
          <SummaryCard
            icon={<Users className="w-6 h-6" />}
            label="Unique Visitors"
            value={stats.summary.uniqueVisitors.toLocaleString()}
            color="text-green-400"
          />
          <SummaryCard
            icon={<TrendingUp className="w-6 h-6" />}
            label="Sessions"
            value={stats.summary.uniqueSessions.toLocaleString()}
            color="text-purple-400"
          />
          <SummaryCard
            icon={<Clock className="w-6 h-6" />}
            label="Avg Duration"
            value={`${stats.summary.avgSessionDuration}s`}
            color="text-yellow-400"
          />
          <SummaryCard
            icon={<ArrowUp className="w-6 h-6" />}
            label="Avg Scroll Depth"
            value={`${stats.summary.avgScrollDepth}%`}
            color="text-red-400"
          />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Top Pages */}
          <ChartCard title="Top Pages">
            <div className="space-y-3">
              {stats.topPages.map((page, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex-1 truncate">
                    <p className="text-sm font-medium truncate">{page.title || page.url}</p>
                    <p className="text-xs text-neutral-400 truncate">{page.url}</p>
                  </div>
                  <span className="text-sm font-semibold text-red-400 ml-2">{page.views}</span>
                </div>
              ))}
            </div>
          </ChartCard>

          {/* Device Type Pie Chart */}
          <ChartCard title="Traffic by Device">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats.trafficByDevice}
                  dataKey="views"
                  nameKey="device"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                >
                  {stats.trafficByDevice.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Traffic by Country */}
          <ChartCard title="Top Countries">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.trafficByCountry.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="country" stroke="#999" fontSize={12} />
                <YAxis stroke="#999" />
                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.1)' }} />
                <Bar dataKey="views" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Traffic by Browser */}
          <ChartCard title="Top Browsers">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.trafficByBrowser}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="browser" stroke="#999" fontSize={12} />
                <YAxis stroke="#999" />
                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.1)' }} />
                <Bar dataKey="views" fill="#06b6d4" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Hourly Traffic */}
          {stats.hourlyTraffic.length > 0 && (
            <ChartCard title="Hourly Traffic (Last 24h)" className="lg:col-span-2">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={stats.hourlyTraffic}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis 
                    dataKey="hour" 
                    stroke="#999" 
                    fontSize={12}
                    tick={(props) => {
                      const { x, y, payload } = props;
                      const hour = new Date(payload.value).getHours();
                      return (
                        <text x={x} y={y} textAnchor="middle" fill="#999" fontSize={12}>
                          {hour}h
                        </text>
                      );
                    }}
                  />
                  <YAxis stroke="#999" />
                  <Tooltip 
                    labelFormatter={(label) => new Date(label).toLocaleString()}
                    contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                  />
                  <Line type="monotone" dataKey="count" stroke="#f97316" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          )}
        </div>
      </div>
    </div>
  );
}

interface SummaryCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}

function SummaryCard({ icon, label, value, color }: SummaryCardProps) {
  return (
    <div className="bg-neutral-800 rounded-lg p-4 border border-neutral-700">
      <div className={`${color} mb-2`}>{icon}</div>
      <p className="text-neutral-400 text-sm mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

interface ChartCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

function ChartCard({ title, children, className }: ChartCardProps) {
  return (
    <div className={`bg-neutral-800 rounded-lg p-6 border border-neutral-700 ${className || ''}`}>
      <h2 className="text-lg font-semibold mb-4">{title}</h2>
      {children}
    </div>
  );
}
