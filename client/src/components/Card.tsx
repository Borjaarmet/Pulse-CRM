import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export default function Card({ children, className }: CardProps) {
  return (
    <div className={cn(
      "glass-card rounded-xl p-6 overflow-visible",
      className
    )}>
      {children}
    </div>
  );
}
