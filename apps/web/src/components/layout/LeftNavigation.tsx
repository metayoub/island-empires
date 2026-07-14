import { NavLink } from 'react-router-dom';

function navItemClassName({ isActive }: { isActive: boolean }): string {
  return `flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-bold transition-all duration-150 ${
    isActive
      ? 'border-primary bg-primary text-white shadow-md'
      : 'border-transparent text-muted hover:border-border hover:bg-surface-strong/80 hover:text-text'
  }`;
}

const navSections = [
  {
    title: 'City',
    items: [
      { to: '/', label: 'City', icon: 'C', end: true },
      { to: '/overview', label: 'City Overview', icon: 'O' },
      { to: '/research', label: 'Research', icon: 'R' },
    ],
  },
  {
    title: 'World',
    items: [
      { to: '/map', label: 'World Map', icon: 'M' },
      { to: '/transport', label: 'Transport', icon: 'T' },
      { to: '/marketplace', label: 'Marketplace', icon: '$' },
      { to: '/inventory', label: 'Inventory', icon: 'I' },
      { to: '/rankings', label: 'Rankings', icon: '#' },
      { to: '/search', label: 'Search', icon: '/' },
      { to: '/events', label: 'Events', icon: 'E' },
      { to: '/scouting', label: 'Scouting', icon: 'S' },
      { to: '/alliances', label: 'Alliance', icon: 'A' },
      { to: '/messages', label: 'Messages', icon: '@' },
      { to: '/reports', label: 'Reports', icon: '!' },
      { to: '/notifications', label: 'Notifications', icon: 'N' },
    ],
  },
  {
    title: 'Help',
    items: [
      { to: '/guide', label: 'Guide', icon: '?' },
      { to: '/support-project', label: 'Support Project', icon: '+' },
      { to: '/account/settings', label: 'Account', icon: 'A' },
      { to: '/logout', label: 'Logout', icon: 'L' },
    ],
  },
];

export function LeftNavigation() {
  return (
    <aside className="game-surface game-frame rounded-lg p-4 lg:min-h-[620px]">
      <div className="mb-5 rounded-md border border-border/80 bg-surface/70 p-3 shadow-inner">
        <p className="text-[11px] font-black uppercase tracking-wide text-muted">Capital</p>
        <p className="mt-1 truncate text-base font-black text-text">Island Seat</p>
        <p className="text-xs font-semibold text-primary">Mediterranean Empire</p>
      </div>
      <nav className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
        {navSections.map((section) => (
          <div key={section.title} className="flex shrink-0 gap-2 lg:block lg:space-y-2">
            <p className="hidden px-2 text-[11px] font-black uppercase tracking-wide text-muted lg:block">
              {section.title}
            </p>
            {section.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={'end' in item ? item.end : false}
                className={navItemClassName}
              >
                <span className="flex h-6 w-6 items-center justify-center rounded bg-surface/90 text-xs font-black text-primary shadow-sm">
                  {item.icon}
                </span>
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
}
