'use client';

export function Checkbox({
  id,
  checked,
  onCheckedChange,
  disabled,
  className = '',
  ...props
}: {
  id?: string;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'checked' | 'onChange'>) {
  return (
    <input
      type="checkbox"
      id={id}
      checked={checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      disabled={disabled}
      className={`h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 ${className}`}
      {...props}
    />
  );
}
