import React, { ReactNode, useState } from 'react';
import { useMediaQuery } from '../../../hooks/useMediaQuery';
import { TopBar } from './TopBar';
import { SideNav } from './SideNav';
import { BottomNav } from './BottomNav';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (isMobile) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <TopBar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        
        {/* Mobile Sidebar */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-50 bg-black bg-opacity-50"
            onClick={() => setSidebarOpen(false)}
          >
            <div
              className="fixed left-0 top-0 bottom-0 w-64 bg-white shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <SideNav />
            </div>
          </div>
        )}

        <main className="flex-1 pb-16 safe-area-bottom">
          <div className="p-4">{children}</div>
        </main>

        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <SideNav />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 overflow-y-auto">
          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
