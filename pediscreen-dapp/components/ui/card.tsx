'use client';

export function Card({
  className = '',
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-2xl border border-gray-200 bg-white shadow-sm ${className}`}
      {...props}
    />
  );
}

export function CardHeader({
  className = '',
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`p-6 pb-2 ${className}`} {...props} />;
}

export function CardTitle({
  className = '',
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`text-xl font-semibold leading-none tracking-tight text-gray-900 ${className}`}
      {...props}
    />
  );
}

export function CardContent({
  className = '',
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`p-6 pt-4 ${className}`} {...props} />;
}
