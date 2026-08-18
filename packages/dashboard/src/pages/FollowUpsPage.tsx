import React, { useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../services/api';
import { FollowUpTask, FollowUpOutcome } from '../types';
import { CheckCircle, AlertTriangle, Clock, Calendar, CheckSquare } from 'lucide-react';
import { Link } from 'react-router-dom';

export const FollowUpsPage: React.FC = () => {
  const { t } = useLanguage();
  const [tasks, setTasks] = useState<FollowUpTask[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modals for completing or escalating
  const [activeTask, setActiveTask] = useState<FollowUpTask | null>(null);
  const [actionType, setActionType] = useState<'COMPLETE' | 'ESCALATE' | null>(null);
  const [outcome, setOutcome] = useState<FollowUpOutcome>('COMPLETED');
  const [notes, setNotes] = useState<string>('');
  const [escalateReason, setEscalateReason] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const data = await api.listFollowUps();
      setTasks(data);
    } catch (err) {
      console.error('Failed to load follow-up tasks', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleAction = async () => {
    if (!activeTask || !actionType) return;
    setSubmitting(true);
    try {
      if (actionType === 'COMPLETE') {
        await api.completeFollowUp(activeTask.id, { outcome, notes });
      } else if (actionType === 'ESCALATE') {
        await api.escalateFollowUp(activeTask.id, { reason: escalateReason });
      }
      setActionType(null);
      setActiveTask(null);
      setNotes('');
      setEscalateReason('');
      fetchTasks();
    } catch (err) {
      console.error('Follow-up action failed', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">{t('followUpTitle')}</h1>
        <p className="page-subtitle">{t('followUpSubtitle')}</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Scheduled Post-Discharge Checks</h2>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('thCaseId')}</th>
                <th>{t('taskType')}</th>
                <th>{t('assignedStaff')}</th>
                <th>{t('dueDate')}</th>
                <th>{t('thStatus')}</th>
                <th>{t('thActions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '36px' }}>
                    {t('loading')}
                  </td>
                </tr>
              ) : tasks.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '36px' }}>
                    No follow-up tasks found.
                  </td>
                </tr>
              ) : (
                tasks.map((task) => {
                  const isOverdue = !task.outcome && !task.escalated && new Date(task.dueDate) < new Date();

                  return (
                    <tr key={task.id}>
                      <td style={{ fontWeight: 700, color: 'var(--primary-500)' }}>
                        <Link to={`/cases/${task.caseId}`}>{task.case?.caseId || task.caseId}</Link>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{t(`type_${task.type}` as any) || task.type}</div>
                        {task.notes && (
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            "{task.notes}"
                          </div>
                        )}
                      </td>
                      <td>
                        <div>{task.owner?.name || '—'}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {task.owner?.phone || ''}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                          <Calendar size={14} style={{ color: 'var(--text-secondary)' }} />
                          <span style={{ color: isOverdue ? 'var(--status-danger-border)' : 'inherit', fontWeight: isOverdue ? 700 : 400 }}>
                            {new Date(task.dueDate).toLocaleDateString()}
                          </span>
                        </div>
                      </td>
                      <td>
                        {task.outcome ? (
                          <span className="status-badge status-success">
                            <CheckCircle size={12} />
                            <span>{t(`outcome_${task.outcome}` as any) || task.outcome}</span>
                          </span>
                        ) : task.escalated ? (
                          <span className="status-badge status-danger">
                            <AlertTriangle size={12} />
                            <span>Escalated</span>
                          </span>
                        ) : isOverdue ? (
                          <span className="status-badge status-danger">
                            <Clock size={12} />
                            <span>Overdue</span>
                          </span>
                        ) : (
                          <span className="status-badge status-pending">
                            <Clock size={12} />
                            <span>Scheduled</span>
                          </span>
                        )}
                      </td>
                      <td>
                        {!task.outcome && !task.escalated && (
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              onClick={() => {
                                setActiveTask(task);
                                setActionType('COMPLETE');
                              }}
                              className="btn btn-success btn-sm"
                            >
                              <CheckSquare size={13} />
                              <span>{t('completeTask')}</span>
                            </button>

                            <button
                              onClick={() => {
                                setActiveTask(task);
                                setActionType('ESCALATE');
                              }}
                              className="btn btn-danger btn-sm"
                            >
                              <AlertTriangle size={13} />
                              <span>{t('escalateTask')}</span>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Completion / Escalation Modal */}
      {actionType && activeTask && (
        <div className="modal-overlay" onClick={() => !submitting && setActionType(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '17px', fontWeight: 700 }}>
                {actionType === 'COMPLETE' ? t('completeTask') : t('escalateTask')}
              </h3>
            </div>

            <div className="modal-body">
              {actionType === 'COMPLETE' ? (
                <>
                  <div className="form-group">
                    <label className="form-label">{t('outcomeLabel')}</label>
                    <select
                      className="form-control"
                      value={outcome}
                      onChange={(e) => setOutcome(e.target.value as FollowUpOutcome)}
                    >
                      <option value="COMPLETED">{t('outcome_COMPLETED')}</option>
                      <option value="PATIENT_NOT_FOUND">{t('outcome_PATIENT_NOT_FOUND')}</option>
                      <option value="PATIENT_REFUSED">{t('outcome_PATIENT_REFUSED')}</option>
                      <option value="REFERRED_ONWARD">{t('outcome_REFERRED_ONWARD')}</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">{t('outcomeNotes')}</label>
                    <textarea
                      className="form-control"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Enter maternal blood pressure, neonatal observations, breastfeeding status..."
                    />
                  </div>
                </>
              ) : (
                <div className="form-group">
                  <label className="form-label">{t('escalateReason')}</label>
                  <textarea
                    className="form-control"
                    value={escalateReason}
                    onChange={(e) => setEscalateReason(e.target.value)}
                    placeholder="Describe reason for escalation (e.g. uncontactable after 3 attempts, patient relocated, red flag symptoms)..."
                  />
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                onClick={() => setActionType(null)}
                disabled={submitting}
                className="btn btn-secondary btn-sm"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleAction}
                disabled={submitting}
                className="btn btn-primary btn-sm"
              >
                {submitting ? t('loading') : t('confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
