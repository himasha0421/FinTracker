import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  FileText,
  BarChart2,
  MessageSquare,
  Pencil,
  DollarSign,
  MessageCircle,
} from 'lucide-react';

type NavItemProps = {
  href: string;
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
};

const NavItem = ({ href, icon, label, isActive }: NavItemProps) => (
  <li>
    <Link href={href}>
      <div
        className={cn(
          'flex items-center px-4 py-3 text-sm rounded-lg transition-colors',
          isActive
            ? 'bg-primary bg-opacity-20 text-white'
            : 'text-muted-foreground hover:bg-primary hover:bg-opacity-10'
        )}
      >
        <span className="mr-3"> {icon} </span>
        {label}
      </div>
    </Link>
  </li>
);

export default function Sidebar() {
  const [location] = useLocation();

  const navItems = [
    { href: '/', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
    { href: '/transactions', icon: <FileText size={18} />, label: 'Transactions' },
    { href: '/insights', icon: <BarChart2 size={18} />, label: 'Insights' },
    { href: '/recommendations', icon: <MessageSquare size={18} />, label: 'Recommendations' },
    { href: '/notes', icon: <Pencil size={18} />, label: 'Notes' },
    { href: '/investment', icon: <DollarSign size={18} />, label: 'Investment' },
    { href: '/chat', icon: <MessageCircle size={18} />, label: 'AI Assistant' },
  ];

  return (
    <aside className="w-full md:w-64 md:min-h-screen bg-sidebar border-r border-sidebar-border">
      <div className="p-5">
        <h1 className="text-xl font-bold text-sidebar-foreground mb-8"> FinTrack </h1>

        <nav>
          <ul className="space-y-2">
            {navItems.map(item => (
              <NavItem
                key={item.href}
                href={item.href}
                icon={item.icon}
                label={item.label}
                isActive={location === item.href}
              />
            ))}
          </ul>
        </nav>
      </div>
    </aside>
  );
}
