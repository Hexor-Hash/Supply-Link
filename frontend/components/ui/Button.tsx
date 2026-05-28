import { cva, type VariantProps } from "class-variance-authority";
import { ReactNode } from "react";
import { clsx } from "clsx";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed",
  {
    variants: {
      variant: {
        primary: "bg-violet-600 hover:bg-violet-700 text-white focus:ring-violet-500",
        secondary: "bg-[var(--muted-bg)] hover:bg-[var(--muted-bg-hover)] text-[var(--foreground)] border border-[var(--card-border)] focus:ring-violet-500",
        destructive: "bg-red-600 hover:bg-red-700 text-white focus:ring-red-500",
        ghost: "hover:bg-[var(--muted-bg)] text-[var(--foreground)] focus:ring-violet-500",
      },
      size: {
        sm: "px-3 py-1.5 text-sm",
        md: "px-4 py-2 text-base",
        lg: "px-6 py-3 text-lg",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  children: ReactNode;
}

export function Button({ variant, size, className, ...props }: ButtonProps) {
  return (
    <button
      className={clsx(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
