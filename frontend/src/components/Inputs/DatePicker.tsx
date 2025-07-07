"use client";

import React, { useState, useRef, useEffect } from "react";
import { DayPicker } from "react-day-picker";
import { format } from "date-fns";
import { CalendarDays, ChevronDown } from "lucide-react";
import "react-day-picker/dist/style.css";

interface DatePickerProps {
  label: string;
  value: string;
  onChange: (date: string) => void;
  placeholder?: string;
}

const DatePicker: React.FC<DatePickerProps> = ({ 
  label, 
  value, 
  onChange, 
  placeholder = "Select date" 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    value ? new Date(value) : undefined
  );
  const [showAbove, setShowAbove] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      onChange(format(date, "yyyy-MM-dd"));
      setIsOpen(false);
    }
  };

  const handleToggle = () => {
    if (!isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      
      // If there's not enough space below (less than 320px for calendar), show above
      setShowAbove(spaceBelow < 320 && spaceAbove > 320);
    }
    setIsOpen(!isOpen);
  };

  const displayValue = selectedDate ? format(selectedDate, "PPP") : "";

  return (
    <div className="relative" ref={containerRef}>
      <label className="text-[13px] text-slate-800">{label}</label>
      
      <div className="input-box cursor-pointer" onClick={handleToggle}>
        <input
          type="text"
          readOnly
          value={displayValue}
          placeholder={placeholder}
          className="w-full bg-transparent outline-none cursor-pointer"
        />
        <div className="flex items-center gap-2 text-slate-400">
          <CalendarDays size={18} />
          <ChevronDown size={16} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </div>
      </div>

      {isOpen && (
        <div className={`absolute left-0 z-[9999] mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3 ${
          showAbove ? "bottom-full mb-1" : "top-full"
        }`}>
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            className="rdp-custom"
            styles={{
              head_cell: { width: "2.5rem", height: "2.5rem" },
              cell: { width: "2.5rem", height: "2.5rem" },
              button: { width: "2.5rem", height: "2.5rem" },
            }}
          />
        </div>
      )}

      {isOpen && (
        <div 
          className="fixed inset-0 z-[9998]" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default DatePicker;