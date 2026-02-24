import React, { type ButtonHTMLAttributes, type ReactNode } from "react";

type ButtonVariant = "primary" | "outline" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
  className?: string;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 border-transparent",
  outline: "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50",
  ghost: "border-transparent bg-transparent text-gray-700 hover:bg-gray-100",
  danger: "border-transparent bg-red-600 text-white hover:bg-red-700",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm rounded-lg",
  md: "px-4 py-2 text-base rounded-xl",
  lg: "px-6 py-3 text-lg rounded-xl",
};

export function Button({
  variant = "primary",
  size = "md",
  children,
  className = "",
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      disabled={disabled}
      {...rest}
    >
      {children}
    </button>
  );
}
