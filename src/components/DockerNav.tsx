import { Home, Plus, User, Settings, Play } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

interface DockerNavProps {
  onUploadClick: () => void;
  onExploreClick?: () => void;
}

const DockerNav = ({ onUploadClick, onExploreClick }: DockerNavProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { 
      id: 'home', 
      icon: Home, 
      label: 'Home', 
      path: '/app',
      active: location.pathname === '/app'
    },
    { 
      id: 'explore', 
      icon: Play, 
      label: 'Explore', 
      path: null,
      action: 'explore',
      active: false 
    },
    { 
      id: 'create', 
      icon: Plus, 
      label: 'Create', 
      path: null,
      action: 'upload',
      active: false 
    },
    { 
      id: 'profile', 
      icon: User, 
      label: 'Profile', 
      path: '/profile',
      active: location.pathname === '/profile' || location.pathname.startsWith('/profile/')
    },
    { 
      id: 'settings', 
      icon: Settings, 
      label: 'Settings', 
      path: '/settings',
      active: location.pathname === '/settings'
    },
  ];

  const handleNavClick = (item: typeof navItems[0]) => {
    if (item.path) {
      navigate(item.path);
    } else if (item.action === 'upload') {
      onUploadClick();
    } else if (item.action === 'explore' && onExploreClick) {
      onExploreClick();
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border z-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-around items-center py-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item)}
              className={`
                relative flex flex-col items-center justify-center p-2
                ${item.id === 'create' 
                  ? 'bg-primary text-primary-foreground rounded-full -mt-10 w-16 h-16' 
                  : item.active 
                    ? 'text-primary' 
                    : 'text-muted-foreground'
                }
              `}
            >
              {item.id !== 'create' ? (
                <div className="flex flex-col items-center">
                  <item.icon className="w-5 h-5" />
                  <span className={`text-xs mt-0.5 ${
                    item.active ? 'font-medium' : ''
                  }`}>
                    {item.label}
                  </span>
                  {item.active && (
                    <div className="absolute -bottom-0.5 w-1.5 h-1.5 bg-primary rounded-full" />
                  )}
                </div>
              ) : (
                <item.icon className="w-8 h-8" />
              )}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default DockerNav;
