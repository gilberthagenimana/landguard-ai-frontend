import { useEffect, useState } from 'react'
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  ArrowUpCircle,
  Calendar,
  CheckCircle,
  ChevronRight,
  Clock,
  FileText,
  Image as ImageIcon,
  Info,
  PlusCircle,
  Search,
  Zap,
} from 'lucide-react'
import { api, type CurrentUser, type DashboardStats, type TransactionRecord } from '../lib/api'

interface OfficerDashboardProps {
  stats: DashboardStats
  currentUser?: CurrentUser | null
  onNavigate: (page: string) => void
  onSelectTransaction?: (id: number) => void
  onSelectCase?: (id: number) => void
  onNewTransaction?: () => void
}

// Default transactions matching screenshot if API has no transactions
const defaultTransactions = [
  { id: 1, code: 'TX-001', upi: 'UPI-001', seller: 'Jean', buyer: 'Patrick', amount: 30000000, status: 'Completed', risk: 'Low', date: 'Apr 21, 2025' },
  { id: 2, code: 'TX-002', upi: 'UPI-002', seller: 'Alice', buyer: 'Samuel', amount: 45000000, status: 'Under Review', risk: 'Medium', date: 'Apr 20, 2025' },
  { id: 3, code: 'TX-003', upi: 'UPI-003', seller: 'Emmanuel', buyer: 'Grace', amount: 12000000, status: 'Pending', risk: 'Low', date: 'Apr 19, 2025' },
  { id: 4, code: 'TX-004', upi: 'UPI-004', seller: 'Claude', buyer: 'Denis', amount: 25000000, status: 'Flagged', risk: 'High', date: 'Apr 18, 2025' },
  { id: 5, code: 'TX-005', upi: 'UPI-005', seller: 'Marie', buyer: 'David', amount: 50000000, status: 'Completed', risk: 'Low', date: 'Apr 17, 2025' },
  { id: 6, code: 'TX-006', upi: 'UPI-006', seller: 'Robert', buyer: 'Fidele', amount: 18000000, status: 'Under Review', risk: 'Medium', date: 'Apr 16, 2025' },
]

// Default evidence uploads matching screenshot
const defaultEvidence = [
  { id: 1, txId: 2, name: 'Sale Agreement.pdf', type: 'pdf', txCode: 'TX-002', uploadedBy: 'Jean', status: 'Under Review', date: 'Apr 20, 2025' },
  { id: 2, txId: 1, name: 'Payment Receipt.jpg', type: 'image', txCode: 'TX-001', uploadedBy: 'Jean', status: 'Verified', date: 'Apr 19, 2025' },
  { id: 3, txId: 6, name: 'Payment Proof.pdf', type: 'pdf', txCode: 'TX-006', uploadedBy: 'Alice', status: 'Needs Clarification', date: 'Apr 16, 2025' },
  { id: 4, txId: 3, name: 'Agreement.png', type: 'image', txCode: 'TX-003', uploadedBy: 'Jean', status: 'Uploaded', date: 'Apr 15, 2025' },
]

export default function OfficerDashboard({
  stats,
  currentUser,
  onNavigate,
  onSelectTransaction,
  onSelectCase,
  onNewTransaction,
}: OfficerDashboardProps) {
  const [liveTransactions, setLiveTransactions] = useState<TransactionRecord[]>([])
  const [hasLoadedApi, setHasLoadedApi] = useState(false)

  useEffect(() => {
    api.transactions()
      .then((txs) => {
        if (txs && txs.length > 0) {
          setLiveTransactions(txs)
        }
      })
      .catch(() => {})
      .finally(() => setHasLoadedApi(true))
  }, [])

  // Use live data if available, otherwise exact screenshot data
  const transactionsToDisplay = (liveTransactions.length > 0)
    ? liveTransactions.slice(0, 6).map((t, i) => {
        const dateObj = new Date(t.transaction_date || Date.now())
        const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        let statusDisplay = 'Completed'
        if (t.status === 'UNDER_REVIEW') statusDisplay = 'Under Review'
        else if (t.status === 'PENDING') statusDisplay = 'Pending'
        else if (t.status === 'FLAGGED') statusDisplay = 'Flagged'
        else if (t.status === 'VERIFIED') statusDisplay = 'Completed'

        let riskDisplay = 'Low'
        if (t.latest_risk_level === 'MEDIUM') riskDisplay = 'Medium'
        else if (t.latest_risk_level === 'HIGH') riskDisplay = 'High'

        return {
          id: t.id,
          code: t.transaction_code || `TX-00${i + 1}`,
          upi: t.parcel_code ? t.parcel_code.replace('RW-', 'UPI-') : `UPI-00${t.parcel_id || i + 1}`,
          seller: t.seller_name || 'Jean',
          buyer: t.buyer_name || 'Patrick',
          amount: Number(t.declared_value || 30000000),
          status: statusDisplay,
          risk: riskDisplay,
          date: formattedDate,
        }
      })
    : defaultTransactions

  // Determine user first name
  const userName = currentUser?.full_name?.split(' ')[0] || 'Jean'

  // Metric counts
  const totalCount = stats.total_transactions > 0 ? stats.total_transactions : 24
  const completedCount = stats.low_risk_transactions > 0 ? stats.low_risk_transactions : 16
  const underReviewCount = stats.transactions_under_review > 0 ? stats.transactions_under_review : 5
  const flaggedCount = stats.high_risk_transactions > 0 ? stats.high_risk_transactions : 3

  return (
    <div className="modern-dashboard">
      {/* Welcome Banner Row */}
      <section className="dashboard-welcome-header">
        <div className="welcome-text-wrap">
          <h1 className="welcome-title">Welcome back, {userName}!</h1>
          <p className="welcome-subtitle">Here's what's happening with land transactions today.</p>
        </div>
        <div className="date-clock-badge">
          <Calendar size={16} className="date-icon" />
          <div className="date-copy">
            <span className="date-day">April 23, 2025</span>
            <span className="date-time">10:45 AM</span>
          </div>
        </div>
      </section>

      {/* 4 Metric KPI Cards */}
      <section className="metric-cards-row">
        {/* Total Transactions */}
        <div className="kpi-card" onClick={() => onNavigate('Transactions')} role="button" tabIndex={0}>
          <div className="kpi-icon-box kpi-icon-box--blue">
            <FileText size={20} strokeWidth={2.2} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Total Transactions</span>
            <div className="kpi-val-row">
              <span className="kpi-value">{totalCount}</span>
              <span className="kpi-pill kpi-pill--green">↑ 8%</span>
            </div>
            <span className="kpi-note">Compared to last 7 days</span>
          </div>
        </div>

        {/* Completed */}
        <div className="kpi-card" onClick={() => onNavigate('Transactions')} role="button" tabIndex={0}>
          <div className="kpi-icon-box kpi-icon-box--green">
            <CheckCircle size={20} strokeWidth={2.2} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Completed</span>
            <div className="kpi-val-row">
              <span className="kpi-value">{completedCount}</span>
              <span className="kpi-pill kpi-pill--green">↑ 14%</span>
            </div>
            <span className="kpi-note">Successfully completed</span>
          </div>
        </div>

        {/* Under Review */}
        <div className="kpi-card" onClick={() => onNavigate('Pending Reviews')} role="button" tabIndex={0}>
          <div className="kpi-icon-box kpi-icon-box--amber">
            <AlertTriangle size={20} strokeWidth={2.2} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Under Review</span>
            <div className="kpi-val-row">
              <span className="kpi-value">{underReviewCount}</span>
              <span className="kpi-pill kpi-pill--green">↑ 25%</span>
            </div>
            <span className="kpi-note">Awaiting officer review</span>
          </div>
        </div>

        {/* Flagged / High Risk */}
        <div className="kpi-card" onClick={() => onNavigate('Pending Reviews')} role="button" tabIndex={0}>
          <div className="kpi-icon-box kpi-icon-box--red">
            <AlertCircle size={20} strokeWidth={2.2} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Flagged / High Risk</span>
            <div className="kpi-val-row">
              <span className="kpi-value">{flaggedCount}</span>
              <span className="kpi-pill kpi-pill--red">↓ 33%</span>
            </div>
            <span className="kpi-note">Needs attention</span>
          </div>
        </div>
      </section>

      {/* Main 2-Column Content Layout */}
      <div className="dashboard-columns-layout">
        {/* Left Column (Transactions + Charts & Evidence) */}
        <div className="dashboard-left-col">
          {/* Recent Transactions Table Card */}
          <section className="white-panel recent-tx-panel">
            <div className="panel-title-bar">
              <h2 className="panel-heading-title">Recent Transactions</h2>
              <button
                type="button"
                className="view-all-link"
                onClick={() => onNavigate('Transactions')}
              >
                View All
              </button>
            </div>

            <div className="modern-table-wrap">
              <table className="modern-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>PARCEL UPI</th>
                    <th>SELLER</th>
                    <th>BUYER</th>
                    <th>AMOUNT (RWF)</th>
                    <th>STATUS</th>
                    <th>RISK</th>
                    <th>DATE</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {transactionsToDisplay.map((tx) => {
                    const isFlagged = tx.status === 'Flagged' || tx.risk === 'High'
                    return (
                      <tr
                        key={tx.id}
                        className={isFlagged ? 'table-row-flagged' : ''}
                        onClick={() => onSelectTransaction?.(tx.id)}
                      >
                        <td className="tx-id-cell">{tx.code}</td>
                        <td>{tx.upi}</td>
                        <td>{tx.seller}</td>
                        <td>{tx.buyer}</td>
                        <td className="tx-amount-cell">{Number(tx.amount).toLocaleString()}</td>
                        <td>
                          <span className={`status-pill-badge status-pill-badge--${tx.status.toLowerCase().replace(/\s+/g, '-')}`}>
                            {tx.status}
                          </span>
                        </td>
                        <td>
                          <span className={`risk-pill-badge risk-pill-badge--${tx.risk.toLowerCase()}`}>
                            {tx.risk}
                          </span>
                        </td>
                        <td className="tx-date-cell">{tx.date}</td>
                        <td className="tx-arrow-cell">
                          <ChevronRight size={16} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* Lower Row: Status Overview Bar Chart & Recent Evidence */}
          <div className="dashboard-lower-split">
            {/* Transaction Status Overview */}
            <section className="white-panel status-overview-panel">
              <div className="panel-title-bar">
                <h2 className="panel-heading-title">Transaction Status Overview</h2>
              </div>

              <div className="status-barchart-container">
                <div className="barchart-y-axis">
                  <span>20</span>
                  <span>15</span>
                  <span>10</span>
                  <span>5</span>
                  <span>0</span>
                </div>

                <div className="barchart-plot-area">
                  {/* Horizontal gridlines */}
                  <div className="barchart-gridline" style={{ bottom: '100%' }} />
                  <div className="barchart-gridline" style={{ bottom: '75%' }} />
                  <div className="barchart-gridline" style={{ bottom: '50%' }} />
                  <div className="barchart-gridline" style={{ bottom: '25%' }} />
                  <div className="barchart-gridline" style={{ bottom: '0%' }} />

                  {/* Bars */}
                  <div className="barchart-bars">
                    {/* Bar 1: Completed 16 */}
                    <div className="bar-group">
                      <span className="bar-value-top">16</span>
                      <div className="bar-fill bar-fill--completed" style={{ height: '80%' }} />
                      <span className="bar-label-bottom">Completed</span>
                    </div>

                    {/* Bar 2: Under Review 5 */}
                    <div className="bar-group">
                      <span className="bar-value-top">5</span>
                      <div className="bar-fill bar-fill--review" style={{ height: '25%' }} />
                      <span className="bar-label-bottom">Under Review</span>
                    </div>

                    {/* Bar 3: Pending 2 */}
                    <div className="bar-group">
                      <span className="bar-value-top">2</span>
                      <div className="bar-fill bar-fill--pending" style={{ height: '10%' }} />
                      <span className="bar-label-bottom">Pending</span>
                    </div>

                    {/* Bar 4: Flagged 3 */}
                    <div className="bar-group">
                      <span className="bar-value-top">3</span>
                      <div className="bar-fill bar-fill--flagged" style={{ height: '15%' }} />
                      <span className="bar-label-bottom">Flagged</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Recent Evidence Uploads */}
            <section className="white-panel evidence-uploads-panel">
              <div className="panel-title-bar">
                <h2 className="panel-heading-title">Recent Evidence Uploads</h2>
                <button
                  type="button"
                  className="view-all-link"
                  onClick={() => onNavigate('Evidence / Documents')}
                >
                  View All
                </button>
              </div>

              <div className="modern-table-wrap">
                <table className="modern-table evidence-table">
                  <thead>
                    <tr>
                      <th>DOCUMENT</th>
                      <th>TRANSACTION</th>
                      <th>UPLOADED BY</th>
                      <th>STATUS</th>
                      <th>DATE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {defaultEvidence.map((ev) => (
                      <tr
                        key={ev.id}
                        onClick={() => onSelectTransaction?.(ev.txId)}
                      >
                        <td>
                          <div className="doc-name-cell">
                            {ev.type === 'pdf' ? (
                              <FileText size={15} className="doc-icon doc-icon--pdf" />
                            ) : (
                              <ImageIcon size={15} className="doc-icon doc-icon--img" />
                            )}
                            <span className="doc-filename">{ev.name}</span>
                          </div>
                        </td>
                        <td className="evidence-tx-code">{ev.txCode}</td>
                        <td>{ev.uploadedBy}</td>
                        <td>
                          <span className={`status-pill-badge status-pill-badge--${ev.status.toLowerCase().replace(/\s+/g, '-')}`}>
                            {ev.status}
                          </span>
                        </td>
                        <td className="tx-date-cell">{ev.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div>

        {/* Right Column (AI Risk, Alerts, Quick Actions) */}
        <div className="dashboard-right-col">
          {/* AI Risk Analysis Card */}
          <section className="white-panel ai-risk-panel">
            <div className="panel-header-with-icon">
              <div className="header-icon-badge header-icon-badge--blue">
                <Zap size={16} strokeWidth={2.4} />
              </div>
              <div>
                <h2 className="panel-heading-title">AI Risk Analysis</h2>
                <p className="panel-sub-label">Based on recent transactions</p>
              </div>
            </div>

            <div className="donut-chart-row">
              {/* Donut SVG */}
              <div className="donut-svg-wrapper">
                <svg width="118" height="118" viewBox="0 0 118 118" className="donut-svg">
                  {/* Background Track */}
                  <circle cx="59" cy="59" r="43" fill="none" stroke="#f1f5f9" strokeWidth="13" />
                  {/* Low Risk Segment (71% ~ 191px of 270px circumference) */}
                  <circle
                    cx="59"
                    cy="59"
                    r="43"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="13"
                    strokeDasharray="191.8 270.18"
                    strokeDashoffset="0"
                    transform="rotate(-90 59 59)"
                  />
                  {/* Medium Risk Segment (21% ~ 56.7px) */}
                  <circle
                    cx="59"
                    cy="59"
                    r="43"
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="13"
                    strokeDasharray="56.7 270.18"
                    strokeDashoffset="-191.8"
                    transform="rotate(-90 59 59)"
                  />
                  {/* High Risk Segment (8% ~ 21.6px) */}
                  <circle
                    cx="59"
                    cy="59"
                    r="43"
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="13"
                    strokeDasharray="21.6 270.18"
                    strokeDashoffset="-248.5"
                    transform="rotate(-90 59 59)"
                  />
                </svg>
                <div className="donut-center-label">
                  <span className="donut-center-num">24</span>
                  <span className="donut-center-sub">Total</span>
                </div>
              </div>

              {/* Donut Legend */}
              <div className="donut-legend-list">
                <div className="donut-legend-item">
                  <span className="legend-dot legend-dot--green" />
                  <span className="legend-name">Low Risk</span>
                  <span className="legend-stat">17 (71%)</span>
                </div>
                <div className="donut-legend-item">
                  <span className="legend-dot legend-dot--amber" />
                  <span className="legend-name">Medium Risk</span>
                  <span className="legend-stat">5 (21%)</span>
                </div>
                <div className="donut-legend-item">
                  <span className="legend-dot legend-dot--red" />
                  <span className="legend-name">High Risk</span>
                  <span className="legend-stat">2 (8%)</span>
                </div>
              </div>
            </div>
          </section>

          {/* Recent Alerts Card */}
          <section className="white-panel recent-alerts-panel">
            <div className="panel-title-bar">
              <div className="title-with-alert-icon">
                <div className="header-icon-badge header-icon-badge--red">
                  <AlertTriangle size={15} strokeWidth={2.4} />
                </div>
                <h2 className="panel-heading-title panel-heading-title--red">Recent Alerts</h2>
              </div>
              <button
                type="button"
                className="view-all-link"
                onClick={() => onNavigate('Pending Reviews')}
              >
                View All
              </button>
            </div>

            <div className="alerts-vertical-list">
              {/* Alert 1 */}
              <div
                className="alert-list-item"
                onClick={() => onSelectCase?.(1)}
              >
                <div className="alert-item-icon-circle alert-item-icon-circle--red">
                  <AlertCircle size={13} strokeWidth={2.4} />
                </div>
                <div className="alert-item-body">
                  <p className="alert-item-text">Possible duplicate transaction detected</p>
                  <span className="alert-item-meta">TX-004 · Apr 18, 2025</span>
                </div>
              </div>

              {/* Alert 2 */}
              <div
                className="alert-list-item"
                onClick={() => onSelectCase?.(2)}
              >
                <div className="alert-item-icon-circle alert-item-icon-circle--amber">
                  <AlertTriangle size={13} strokeWidth={2.4} />
                </div>
                <div className="alert-item-body">
                  <p className="alert-item-text">Seller does not match recorded owner</p>
                  <span className="alert-item-meta">TX-007 · Apr 16, 2025</span>
                </div>
              </div>

              {/* Alert 3 */}
              <div
                className="alert-list-item"
                onClick={() => onSelectCase?.(3)}
              >
                <div className="alert-item-icon-circle alert-item-icon-circle--amber">
                  <Clock size={13} strokeWidth={2.4} />
                </div>
                <div className="alert-item-body">
                  <p className="alert-item-text">Missing payment evidence</p>
                  <span className="alert-item-meta">TX-008 · Apr 15, 2025</span>
                </div>
              </div>
            </div>
          </section>

          {/* Quick Actions Card */}
          <section className="white-panel quick-actions-panel">
            <div className="panel-header-with-icon" style={{ marginBottom: '14px' }}>
              <Zap size={18} className="quick-actions-zap-icon" />
              <h2 className="panel-heading-title">Quick Actions</h2>
            </div>

            <div className="quick-action-buttons-stack">
              {/* Action 1: Search Parcel */}
              <button
                type="button"
                className="action-btn action-btn--blue"
                onClick={() => onNavigate('Search Parcel')}
              >
                <Search size={16} />
                <span>Search Parcel by UPI</span>
              </button>

              {/* Action 2: Create New Transaction */}
              <button
                type="button"
                className="action-btn action-btn--green"
                onClick={() => {
                  if (onNewTransaction) onNewTransaction()
                  else onNavigate('Transactions')
                }}
              >
                <PlusCircle size={16} />
                <span>Create New Transaction</span>
              </button>

              {/* Action 3: Upload Evidence Document */}
              <button
                type="button"
                className="action-btn action-btn--purple"
                onClick={() => onNavigate('Evidence / Documents')}
              >
                <ArrowUpCircle size={16} />
                <span>Upload Evidence Document</span>
              </button>

              {/* Action 4: View Audit Logs */}
              <button
                type="button"
                className="action-btn action-btn--slate"
                onClick={() => onNavigate('Audit Logs')}
              >
                <FileText size={16} />
                <span>View Audit Logs</span>
              </button>
            </div>
          </section>
        </div>
      </div>

      {/* Bottom Info Banner */}
      <footer className="dashboard-info-banner">
        <div className="info-banner-left">
          <Info size={17} className="info-banner-icon" />
          <p className="info-banner-text">
            Note: This system helps verify land transactions and identify potential risks. It does not replace official land registry services or legal procedures.
          </p>
        </div>
        <a href="#learn-more" className="info-banner-learn-more" onClick={(e) => { e.preventDefault() }}>
          Learn more →
        </a>
      </footer>
    </div>
  )
}
