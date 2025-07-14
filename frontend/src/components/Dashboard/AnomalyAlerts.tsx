"use client";

import React, { useState } from "react";
import { LuTriangleAlert, LuCheck, LuX, LuClock, LuTrendingUp } from "react-icons/lu";
import { formatCurrency } from "~/utils/constants";
import moment from "moment";

interface AnomalyAlert {
  _id: string;
  transactionId: string;
  type: "income" | "expense";
  amount: number;
  category?: string;
  source?: string;
  date: string;
  zScore: number;
  severity: "critical" | "warning" | "info";
  confidence: "high" | "medium" | "low";
  message: string;
  isResolved: boolean;
  createdAt: string;
}

interface AnomalyStatistics {
  totalAnomalies: number;
  criticalAnomalies: number;
  warningAnomalies: number;
  unresolvedAnomalies: number;
  mostAnomalousCategory: {
    name: string;
    count: number;
  } | null;
  averageZScore: number;
}

interface AnomalyAlertsProps {
  alerts: AnomalyAlert[];
  statistics: AnomalyStatistics;
  onResolveAlert?: (alertId: string) => void;
  onDismissAlert?: (alertId: string) => void;
  showAll?: boolean;
}

const AnomalyAlerts: React.FC<AnomalyAlertsProps> = ({
  alerts,
  statistics,
  onResolveAlert,
  onDismissAlert,
  showAll = false
}) => {
  const [expandedAlert, setExpandedAlert] = useState<string | null>(null);

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <LuTriangleAlert className="text-red-500" />;
      case 'warning':
        return <LuTriangleAlert className="text-yellow-500" />;
      default:
        return <LuTrendingUp className="text-blue-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'border-red-200 bg-red-50';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
      default:
        return 'border-blue-200 bg-blue-50';
    }
  };

  const getConfidenceBadge = (confidence: string) => {
    const colors = {
      high: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-gray-100 text-gray-800'
    };
    
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${colors[confidence as keyof typeof colors]}`}>
        {confidence} confidence
      </span>
    );
  };

  const displayedAlerts = showAll ? alerts : alerts.slice(0, 5);
  const unresolvedAlerts = alerts.filter(alert => !alert.isResolved);

  if (alerts.length === 0) {
    return (
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h5 className="text-lg font-semibold">Anomaly Detection</h5>
          <div className="flex items-center text-green-600">
            <LuCheck className="mr-1" />
            <span className="text-sm">All Good</span>
          </div>
        </div>
        <div className="text-center py-8 text-gray-500">
          <LuCheck className="mx-auto text-4xl mb-2 text-green-500" />
          <p>No anomalies detected in your recent transactions.</p>
          <p className="text-sm mt-1">Your spending patterns look normal!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h5 className="text-lg font-semibold">Anomaly Alerts</h5>
        {unresolvedAlerts.length > 0 && (
          <div className="flex items-center bg-red-100 text-red-700 px-2 py-1 rounded-full text-sm">
            <LuTriangleAlert className="mr-1" size={14} />
            {unresolvedAlerts.length} unresolved
          </div>
        )}
      </div>

      {/* Statistics Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-700">{statistics.totalAnomalies}</div>
          <div className="text-xs text-gray-500">Total</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600">{statistics.criticalAnomalies}</div>
          <div className="text-xs text-gray-500">Critical</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-yellow-600">{statistics.warningAnomalies}</div>
          <div className="text-xs text-gray-500">Warning</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{statistics.averageZScore.toFixed(1)}</div>
          <div className="text-xs text-gray-500">Avg Z-Score</div>
        </div>
      </div>

      {/* Most Anomalous Category */}
      {statistics.mostAnomalousCategory && (
        <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex items-center text-orange-700">
            <LuTrendingUp className="mr-2" size={16} />
            <span className="text-sm">
              Most anomalous category: <strong>{statistics.mostAnomalousCategory.name}</strong> 
              ({statistics.mostAnomalousCategory.count} alerts)
            </span>
          </div>
        </div>
      )}

      {/* Alert List */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {displayedAlerts.map((alert) => (
          <div
            key={alert._id}
            className={`border rounded-lg p-4 transition-all duration-200 ${getSeverityColor(alert.severity)} ${
              alert.isResolved ? 'opacity-60' : ''
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3 flex-1">
                <div className="flex-shrink-0 mt-1">
                  {getSeverityIcon(alert.severity)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="font-medium text-gray-900">
                      {formatCurrency(alert.amount)}
                    </span>
                    <span className="text-sm text-gray-500">
                      {alert.type === 'expense' ? alert.category : alert.source}
                    </span>
                    {getConfidenceBadge(alert.confidence)}
                    {alert.isResolved && (
                      <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                        Resolved
                      </span>
                    )}
                  </div>
                  
                  <p className="text-sm text-gray-700 mb-2">
                    {expandedAlert === alert._id ? alert.message : alert.message.substring(0, 100)}
                    {alert.message.length > 100 && expandedAlert !== alert._id && (
                      <button
                        onClick={() => setExpandedAlert(alert._id)}
                        className="text-blue-600 hover:text-blue-800 ml-1"
                      >
                        ...read more
                      </button>
                    )}
                    {expandedAlert === alert._id && alert.message.length > 100 && (
                      <button
                        onClick={() => setExpandedAlert(null)}
                        className="text-blue-600 hover:text-blue-800 ml-1"
                      >
                        show less
                      </button>
                    )}
                  </p>

                  <div className="flex items-center text-xs text-gray-500 space-x-4">
                    <span>Z-Score: {alert.zScore.toFixed(2)}</span>
                    <span>
                      <LuClock className="inline mr-1" size={12} />
                      {moment(alert.date).format('MMM DD, YYYY')}
                    </span>
                    <span>
                      Detected: {moment(alert.createdAt).fromNow()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              {!alert.isResolved && (
                <div className="flex items-center space-x-2 ml-4">
                  {onResolveAlert && (
                    <button
                      onClick={() => onResolveAlert(alert._id)}
                      className="p-1 text-green-600 hover:text-green-800 hover:bg-green-100 rounded transition-colors"
                      title="Mark as resolved"
                    >
                      <LuCheck size={16} />
                    </button>
                  )}
                  {onDismissAlert && (
                    <button
                      onClick={() => onDismissAlert(alert._id)}
                      className="p-1 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
                      title="Dismiss alert"
                    >
                      <LuX size={16} />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Show More Button */}
      {!showAll && alerts.length > 5 && (
        <div className="mt-4 text-center">
          <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
            Show {alerts.length - 5} more alerts
          </button>
        </div>
      )}
    </div>
  );
};

export default AnomalyAlerts;