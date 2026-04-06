import type { LucideIcon } from 'lucide-react';

type TabTitleProps = {
  icon: LucideIcon;
  title: string;
};

export function TabTitle({ icon: Icon, title }: TabTitleProps) {
  return (
    <div className="flex items-center gap-3">
      <Icon size={28} className="text-primary-1" />
      <h1 className="h2-b text-fg-primary">{title}</h1>
    </div>
  );
}
