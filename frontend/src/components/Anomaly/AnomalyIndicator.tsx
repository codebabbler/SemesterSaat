"use client";

import React from "react";
import { LuAlertTriangle, LuFlag } from "react-icons/lu";

interface AnomalyIndicatorProps {
  zScore?: number;
  className?: string;
  showTooltip?: boolean;
}

const AnomalyIndicator: React.FC<AnomalyIndicatorProps> = ({
  zScore = 0,
  className = "",
  showTooltip = true,
}) => {
  const getAnomalySeverity = (zScore: number): "low" | "medium" | "high" => {
    const absZScore = Math.abs(zScore);
    if (absZScore >= 3) return "high";
    if (absZScore >= 2) return "medium";
    return "low";
  };

  const getSeverityStyles = (severity: "low" | "medium" | "high") => {
    switch (severity) {
      case "high":
        return "text-red-600 bg-red-100";
      case "medium":
        return "text-orange-600 bg-orange-100";
      case "low":
        return "text-yellow-600 bg-yellow-100";
      default:
        return "text-yellow-600 bg-yellow-100";
    }
  };

  const severity = getAnomalySeverity(zScore);
  const styles = getSeverityStyles(severity);
  
  const tooltipText = showTooltip 
    ? `Anomaly detected (Z-Score: ${zScore.toFixed(2)}, Severity: ${severity.charAt(0).toUpperCase() + severity.slice(1)})`
    : "";

  return (
    <div 
      className={`inline-flex items-center justify-center ${className}`}
      title={tooltipText}
    >
      <div className={`flex items-center justify-center w-6 h-6 rounded-full ${styles}`}>
        <LuFlag className="w-3 h-3" />
      </div>
    </div>
  );
};

export default AnomalyIndicator;