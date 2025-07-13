"use client";

import React from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title: string;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, title }) => {
  if (!isOpen) return null;
  return (
    <div className="bg-opacity-50 fixed top-0 right-0 left-0 z-50 flex h-[calc(100%-1rem)] max-h-full w-full items-center justify-center overflow-x-hidden overflow-y-auto bg-black/20">
      <div className="relative max-h-full w-full max-w-2xl p-4">
        {/* Modal content */}
        <div className="relative rounded-lg bg-white shadow-sm">
          {/* Modal header */}

          <div className="flex items-center justify-between rounded-t border-b border-gray-200 p-4 md:p-5">
            <h3 className="text-lg font-medium text-gray-900">{title}</h3>

            <button
              type="button"
              className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg bg-transparent text-sm text-gray-400 hover:bg-gray-200 hover:text-gray-900"
              onClick={onClose}
            >
              <svg
                className="h-3 w-3"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 14 14"
              >
                <path
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"
                />
              </svg>
            </button>
          </div>

          {/* Modal body */}
          <div className="space-y-4 p-4 md:p-5">{children}</div>
        </div>
      </div>
    </div>
  );
};

export default Modal;
