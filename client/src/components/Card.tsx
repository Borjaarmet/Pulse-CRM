import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export default function Card({ children, className }: CardProps) {
  return (
    <div className={cn(
      "bg-card rounded-xl p-6 shadow-sm border border-border/50",
      "hover:shadow-md hover:border-border transition-all duration-300",
      "card-hover",
      className
    )}>
      {children}
    </div>
  );
}
