import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "bg-primary/15 text-primary border border-primary/20",
        gold:
          "bg-accent/20 text-accent-foreground border border-accent/40 font-semibold",
        secondary:
          "bg-secondary text-secondary-foreground border border-border/40",
        destructive:
          "bg-destructive/15 text-destructive border border-destructive/20",
        outline:
          "border border-border text-foreground",
        success:
          "bg-emerald-500/15 text-emerald-700 border border-emerald-500/25 dark:text-emerald-400",
        warning:
          "bg-amber-500/15 text-amber-700 border border-amber-500/25 dark:text-amber-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  icon?: React.ReactNode;
}

export function Badge({ className, variant, icon, children, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      {icon && <span className="[&_svg]:size-3">{icon}</span>}
      <span>{children}</span>
    </div>
  );
}

export { badgeVariants };
