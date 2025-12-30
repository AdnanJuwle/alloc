import { useState, useEffect } from 'react';
import { Activity, TrendingUp, TrendingDown, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { PlanHealth } from '../types';
import { electronAPI } from '../utils/electron-api';

export function PlanHealth() {
  const [health, setHealth] = useState<PlanHealth | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHealth();
  }, []);

  const loadHealth = async () => {
    setLoading(true);
    try {
      const data = await electronAPI.calculatePlanHealth();
      setHealth(data);
    } catch (error) {
      console.error('Error loading plan health:', error);
    } finally {
      setLoading(false);
    }
  };

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return '#34c759';
      case 'warning':
        return '#ff9500';
      case 'critical':
        return '#ff3b30';
      default:
        return '#8e8e93';
    }
  };

  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle size={24} style={{ color: '#34c759' }} />;
      case 'warning':
        return <AlertCircle size={24} style={{ color: '#ff9500' }} />;
      case 'critical':
        return <XCircle size={24} style={{ color: '#ff3b30' }} />;
      default:
        return <Activity size={24} style={{ color: '#8e8e93' }} />;
    }
  };

  const getHealthLabel = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'Healthy';
      case 'warning':
        return 'Warning';
      case 'critical':
        return 'Critical';
      default:
        return 'Unknown';
    }
  };

  if (loading) {
    return (
      <div className="card">
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <p>Loading plan health...</p>
        </div>
      </div>
    );
  }

  if (!health) {
    return (
      <div className="card">
        <div className="empty-state">
          <h3>Unable to calculate plan health</h3>
          <p>Please ensure you have goals and income scenarios configured</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Overall Health Status */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ 
          background: `linear-gradient(135deg, ${getHealthColor(health.healthStatus)}15 0%, ${getHealthColor(health.healthStatus)}05 100%)`,
          borderRadius: '12px',
          padding: '2rem',
          textAlign: 'center',
          border: `2px solid ${getHealthColor(health.healthStatus)}40`,
        }}>
          <div style={{ marginBottom: '1rem' }}>
            {getHealthIcon(health.healthStatus)}
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem', color: getHealthColor(health.healthStatus) }}>
            {getHealthLabel(health.healthStatus)}
          </div>
          <div style={{ fontSize: '0.875rem', color: '#8e8e93' }}>
            Overall Plan Health Status
          </div>
        </div>
      </div>

      {/* Health Metrics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <TrendingUp size={20} style={{ color: '#007aff' }} />
            <div style={{ color: '#8e8e93', fontSize: '0.875rem' }}>Allocation Efficiency</div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 600, color: health.allocationEfficiency >= 80 ? '#34c759' : health.allocationEfficiency >= 60 ? '#ff9500' : '#ff3b30' }}>
            {health.allocationEfficiency.toFixed(1)}%
          </div>
          <div style={{ fontSize: '0.75rem', color: '#8e8e93', marginTop: '0.25rem' }}>
            % of income allocated to goals
          </div>
        </div>

        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <AlertCircle size={20} style={{ color: '#ff9500' }} />
            <div style={{ color: '#8e8e93', fontSize: '0.875rem' }}>Fragility Score</div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 600, color: health.fragilityScore < 30 ? '#34c759' : health.fragilityScore < 60 ? '#ff9500' : '#ff3b30' }}>
            {health.fragilityScore.toFixed(1)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#8e8e93', marginTop: '0.25rem' }}>
            Lower is better (0-100)
          </div>
        </div>

        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <Activity size={20} style={{ color: '#34c759' }} />
            <div style={{ color: '#8e8e93', fontSize: '0.875rem' }}>Slack Months</div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 600, color: health.slackMonths > 2 ? '#34c759' : health.slackMonths > 0 ? '#ff9500' : '#ff3b30' }}>
            {health.slackMonths.toFixed(1)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#8e8e93', marginTop: '0.25rem' }}>
            Buffer before deadlines
          </div>
        </div>

        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <TrendingDown size={20} style={{ color: '#ff3b30' }} />
            <div style={{ color: '#8e8e93', fontSize: '0.875rem' }}>Deviations (3 months)</div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 600, color: health.deviationCount === 0 ? '#34c759' : health.deviationCount < 3 ? '#ff9500' : '#ff3b30' }}>
            {health.deviationCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#8e8e93', marginTop: '0.25rem' }}>
            Missed contributions
          </div>
        </div>
      </div>

      {/* Goals Status */}
      <div className="card">
        <div className="card-header">
          <h2>Goals Status</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div style={{ textAlign: 'center', padding: '1.5rem' }}>
            <div style={{ fontSize: '3rem', fontWeight: 700, color: '#34c759', marginBottom: '0.5rem' }}>
              {health.onTrackGoals}
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.25rem' }}>On Track</div>
            <div style={{ fontSize: '0.875rem', color: '#8e8e93' }}>Goals meeting targets</div>
          </div>
          <div style={{ textAlign: 'center', padding: '1.5rem' }}>
            <div style={{ fontSize: '3rem', fontWeight: 700, color: '#ff3b30', marginBottom: '0.5rem' }}>
              {health.behindGoals}
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.25rem' }}>Behind Schedule</div>
            <div style={{ fontSize: '0.875rem', color: '#8e8e93' }}>Goals needing attention</div>
          </div>
        </div>
      </div>
    </div>
  );
}

