import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export default function Card({ children, className }: CardProps) {
  return (
    <div className={cn(
      "bg-card rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-200",
      className
    )}>
      {children}
    </div>
  );
}
