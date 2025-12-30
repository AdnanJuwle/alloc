import { useState, useEffect } from 'react';
import { Calendar, TrendingDown, PieChart } from 'lucide-react';
import { SpendingPeriod } from '../types';
import { electronAPI } from '../utils/electron-api';

export function SpendingView() {
  const [period, setPeriod] = useState<'weekly' | 'monthly'>('monthly');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [spendingData, setSpendingData] = useState<SpendingPeriod | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSpendingData();
  }, [period, selectedYear, selectedMonth]);

  const loadSpendingData = async () => {
    setLoading(true);
    try {
      const data = await electronAPI.getSpendingPeriod(period, selectedYear, selectedMonth);
      setSpendingData({
        period: data.period,
        startDate: data.startDate,
        endDate: data.endDate,
        totalSpending: data.totalSpending,
        byCategory: data.byCategory,
      });
    } catch (error) {
      console.error('Error loading spending data:', error);
    } finally {
      setLoading(false);
    }
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const getWeekStart = () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday.toISOString().split('T')[0];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getCategoryColor = (index: number) => {
    const colors = [
      '#007aff', '#34c759', '#ff9500', '#ff3b30', '#af52de',
      '#ff2d55', '#5856d6', '#5ac8fa', '#ffcc00', '#8e8e93'
    ];
    return colors[index % colors.length];
  };

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h2>Spending Analysis</h2>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className={period === 'monthly' ? 'btn btn-primary' : 'btn btn-secondary'}
                onClick={() => setPeriod('monthly')}
                style={{ padding: '0.5rem 1rem' }}
              >
                Monthly
              </button>
              <button
                className={period === 'weekly' ? 'btn btn-primary' : 'btn btn-secondary'}
                onClick={() => setPeriod('weekly')}
                style={{ padding: '0.5rem 1rem' }}
              >
                Weekly
              </button>
            </div>
            {period === 'monthly' && (
              <>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #e5e5ea' }}
                >
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #e5e5ea' }}
                >
                  {monthNames.map((name, idx) => (
                    <option key={idx + 1} value={idx + 1}>{name}</option>
                  ))}
                </select>
              </>
            )}
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <p>Loading...</p>
          </div>
        ) : spendingData ? (
          <div>
            <div style={{ 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '12px',
              padding: '1.5rem',
              color: 'white',
              marginBottom: '1.5rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <Calendar size={20} />
                <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>
                  {formatDate(spendingData.startDate)} - {formatDate(spendingData.endDate)}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                <TrendingDown size={24} />
                <div style={{ fontSize: '2rem', fontWeight: 700 }}>
                  ₹{spendingData.totalSpending.toLocaleString()}
                </div>
              </div>
              <div style={{ fontSize: '0.875rem', opacity: 0.9, marginTop: '0.25rem' }}>
                Total spending for this {period}
              </div>
            </div>

            {spendingData.byCategory.length > 0 ? (
              <div>
                <h3 style={{ marginBottom: '1rem', fontSize: '1rem', fontWeight: 600 }}>
                  Spending by Category
                </h3>
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  {spendingData.byCategory.map((item, index) => (
                    <div
                      key={item.categoryId}
                      style={{
                        border: '1px solid #e5e5ea',
                        borderRadius: '8px',
                        padding: '1rem',
                        background: 'white',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div
                            style={{
                              width: '12px',
                              height: '12px',
                              borderRadius: '50%',
                              background: getCategoryColor(index),
                            }}
                          />
                          <div style={{ fontWeight: 600 }}>{item.categoryName}</div>
                        </div>
                        <div style={{ fontWeight: 600 }}>
                          ₹{item.amount.toLocaleString()}
                        </div>
                      </div>
                      <div style={{
                        width: '100%',
                        height: '8px',
                        background: '#e5e5ea',
                        borderRadius: '4px',
                        overflow: 'hidden',
                      }}>
                        <div style={{
                          width: `${item.percentage}%`,
                          height: '100%',
                          background: getCategoryColor(index),
                          transition: 'width 0.3s ease',
                        }} />
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#8e8e93', marginTop: '0.25rem' }}>
                        {item.percentage.toFixed(1)}% of total spending
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <PieChart size={48} style={{ color: '#8e8e93', marginBottom: '1rem' }} />
                <h3>No spending data</h3>
                <p>Record expenses with categories to see spending breakdown</p>
              </div>
            )}
          </div>
        ) : (
          <div className="empty-state">
            <h3>No spending data available</h3>
            <p>Record expenses with categories to see your spending analysis</p>
          </div>
        )}
      </div>
    </div>
  );
}


