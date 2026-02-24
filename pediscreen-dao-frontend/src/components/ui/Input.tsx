import React, { type InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

export function Input({ className = "", ...rest }: InputProps) {
  return (
    <input
      className={`block w-full rounded-xl border border-gray-300 px-4 py-2.5 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 ${className}`}
      {...rest}
    />
  );
}
