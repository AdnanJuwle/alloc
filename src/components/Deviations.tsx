import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, XCircle, TrendingDown, Calendar } from 'lucide-react';
import { electronAPI } from '../utils/electron-api';
import { ConsequenceProjection } from '../types';

interface Deviation {
  goalId: number;
  goalName: string;
  type: 'missed_contribution' | 'under_contribution' | 'overspend' | 'income_drop';
  date: string;
  plannedAmount: number;
  actualAmount: number;
  shortfall: number;
  acknowledged: boolean;
}

export function Deviations() {
  const [deviations, setDeviations] = useState<Deviation[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [consequences, setConsequences] = useState<Map<number, ConsequenceProjection>>(new Map());

  useEffect(() => {
    loadDeviations();
  }, [selectedYear, selectedMonth]);

  const loadDeviations = async () => {
    const data = await electronAPI.detectDeviations(selectedYear, selectedMonth);
    setDeviations(data);
  };

  const loadConsequences = async (deviationsToProcess: Deviation[]) => {
    const newConsequences = new Map<number, ConsequenceProjection>();
    const unacknowledged = deviationsToProcess.filter(d => !d.acknowledged);
    
    for (const deviation of unacknowledged) {
      const deviationDate = new Date(deviation.date);
      const consequence = await electronAPI.calculateConsequence(
        deviation.goalId,
        deviation.shortfall,
        deviationDate.getFullYear(),
        deviationDate.getMonth() + 1
      );
      if (consequence) {
        newConsequences.set(deviation.goalId, consequence);
      }
    }
    setConsequences(newConsequences);
  };

  useEffect(() => {
    if (deviations.length > 0) {
      loadConsequences(deviations);
    } else {
      setConsequences(new Map());
    }
  }, [deviations]);

  const handleAcknowledge = async (deviation: Deviation) => {
    const deviationDate = new Date(deviation.date);
    await electronAPI.acknowledgeDeviation(
      deviation.goalId,
      deviationDate.getFullYear(),
      deviationDate.getMonth() + 1
    );
    await loadDeviations(); // Reload to refresh acknowledged status
  };

  const unacknowledgedDeviations = deviations.filter(d => !d.acknowledged);
  const acknowledgedDeviations = deviations.filter(d => d.acknowledged);

  const getDeviationIcon = (type: string) => {
    switch (type) {
      case 'missed_contribution':
        return <XCircle size={20} style={{ color: '#ff3b30' }} />;
      case 'under_contribution':
        return <AlertCircle size={20} style={{ color: '#ff9500' }} />;
      default:
        return <AlertCircle size={20} style={{ color: '#ff9500' }} />;
    }
  };

  const getDeviationLabel = (type: string) => {
    switch (type) {
      case 'missed_contribution':
        return 'Missed Contribution';
      case 'under_contribution':
        return 'Under Contribution';
      case 'overspend':
        return 'Overspend';
      case 'income_drop':
        return 'Income Drop';
      default:
        return 'Deviation';
    }
  };

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 3 }, (_, i) => currentYear - 1 + i);

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h2>Deviation Tracking</h2>
        </div>

        <div style={{ marginBottom: '2rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Year</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            >
              {years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Month</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            >
              {months.map((month, index) => (
                <option key={index + 1} value={index + 1}>{month}</option>
              ))}
            </select>
          </div>
        </div>

        {unacknowledgedDeviations.length > 0 && (
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: '#ff3b30' }}>
              Unacknowledged Deviations ({unacknowledgedDeviations.length})
            </h3>
            <div style={{ display: 'grid', gap: '1rem' }}>
              {unacknowledgedDeviations.map((deviation, index) => (
                <div
                  key={index}
                  style={{
                    border: '2px solid #ff3b30',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    background: '#fff5f5',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                      {getDeviationIcon(deviation.type)}
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '1.125rem' }}>
                          {deviation.goalName}
                        </div>
                        <div style={{ fontSize: '0.875rem', color: '#8e8e93', marginTop: '0.25rem' }}>
                          {getDeviationLabel(deviation.type)}
                        </div>
                      </div>
                    </div>
                    <button
                      className="btn btn-primary"
                      onClick={() => handleAcknowledge(deviation)}
                      style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}
                    >
                      Acknowledge
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', fontSize: '0.875rem', marginBottom: '1rem' }}>
                    <div>
                      <div style={{ color: '#8e8e93', marginBottom: '0.25rem' }}>Planned</div>
                      <div style={{ fontWeight: 600 }}>₹{deviation.plannedAmount.toLocaleString()}</div>
                    </div>
                    <div>
                      <div style={{ color: '#8e8e93', marginBottom: '0.25rem' }}>Actual</div>
                      <div style={{ fontWeight: 600 }}>₹{deviation.actualAmount.toLocaleString()}</div>
                    </div>
                    <div>
                      <div style={{ color: '#8e8e93', marginBottom: '0.25rem' }}>Shortfall</div>
                      <div style={{ fontWeight: 600, color: '#ff3b30' }}>
                        ₹{deviation.shortfall.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Consequence Projection */}
                  {consequences.has(deviation.goalId) && (() => {
                    const consequence = consequences.get(deviation.goalId)!;
                    return (
                      <div style={{
                        marginTop: '1rem',
                        padding: '1rem',
                        background: '#fff3cd',
                        borderRadius: '8px',
                        border: '1px solid #ffcc00',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                          <TrendingDown size={16} style={{ color: '#ff9500' }} />
                          <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Impact Projection</div>
                        </div>
                        <div style={{ display: 'grid', gap: '0.5rem', fontSize: '0.875rem' }}>
                          <div>
                            <span style={{ color: '#8e8e93' }}>New Required Monthly: </span>
                            <span style={{ fontWeight: 600, color: '#ff9500' }}>
                              ₹{consequence.newRequiredMonthly.toLocaleString()}
                            </span>
                            <span style={{ color: '#8e8e93', marginLeft: '0.5rem' }}>
                              (was ₹{consequence.originalRequiredMonthly.toLocaleString()})
                            </span>
                          </div>
                          {consequence.deadlineShiftMonths && consequence.deadlineShiftMonths > 0 && (
                            <div>
                              <span style={{ color: '#8e8e93' }}>Deadline Shift: </span>
                              <span style={{ fontWeight: 600, color: '#ff3b30' }}>
                                +{consequence.deadlineShiftMonths} months
                              </span>
                              {consequence.projectedDeadline && (
                                <span style={{ color: '#8e8e93', marginLeft: '0.5rem' }}>
                                  (New: {new Date(consequence.projectedDeadline).toLocaleDateString()})
                                </span>
                              )}
                            </div>
                          )}
                          {consequence.impact.canCatchUp && (
                            <div style={{ color: '#34c759', fontSize: '0.75rem' }}>
                              ✓ Can catch up without deadline shift
                            </div>
                          )}
                          {consequence.affectedGoals.length > 0 && (
                            <div style={{ marginTop: '0.5rem' }}>
                              <div style={{ color: '#8e8e93', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                                Affected Goals:
                              </div>
                              {consequence.affectedGoals.map(ag => (
                                <div key={ag.goalId} style={{ fontSize: '0.75rem', color: '#8e8e93' }}>
                                  • {ag.goalName} ({ag.impact})
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ))}
            </div>
          </div>
        )}

        {acknowledgedDeviations.length > 0 && (
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: '#8e8e93' }}>
              Acknowledged Deviations ({acknowledgedDeviations.length})
            </h3>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {acknowledgedDeviations.map((deviation, index) => (
                <div
                  key={index}
                  style={{
                    border: '1px solid #e5e5ea',
                    borderRadius: '8px',
                    padding: '1rem',
                    background: 'white',
                    opacity: 0.7,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <CheckCircle size={16} style={{ color: '#34c759' }} />
                    <span style={{ fontWeight: 600 }}>{deviation.goalName}</span>
                    <span style={{ fontSize: '0.75rem', color: '#8e8e93' }}>
                      {getDeviationLabel(deviation.type)}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#8e8e93' }}>
                    Planned: ₹{deviation.plannedAmount.toLocaleString()} • 
                    Actual: ₹{deviation.actualAmount.toLocaleString()} • 
                    Shortfall: ₹{deviation.shortfall.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {deviations.length === 0 && (
          <div className="empty-state">
            <CheckCircle size={48} style={{ color: '#34c759', marginBottom: '1rem' }} />
            <h3>No deviations found</h3>
            <p>All contributions are on track for {months[selectedMonth - 1]} {selectedYear}</p>
          </div>
        )}
      </div>
    </div>
  );
}

