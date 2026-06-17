import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-ocean text-white hover:bg-teal-700 focus-visible:ring-teal-500 disabled:bg-slate-400",
  secondary:
    "bg-white text-slate-800 border border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700 dark:hover:bg-slate-700",
  danger:
    "bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-500",
  ghost:
    "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  icon?: ReactNode;
}

export function Button({
  variant = "primary",
  icon,
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 dark:focus-visible:ring-offset-slate-950 ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
