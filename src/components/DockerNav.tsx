import { Home, Plus, User, Settings } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface DockerNavProps {
  onUploadClick: () => void;
}

const DockerNav = ({ onUploadClick }: DockerNavProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { 
      id: 'home', 
      icon: Home, 
      label: 'Home', 
      path: '/',
      active: location.pathname === '/'
    },
    { 
      id: 'create', 
      icon: Plus, 
      label: 'Create', 
      path: null,
      active: false 
    },
    { 
      id: 'profile', 
      icon: User, 
      label: 'Profile', 
      path: '/profile',
      active: location.pathname === '/profile'
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
    } else {
      onUploadClick();
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border z-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-around items-center py-2">
          {navItems.map((item) => (
            <Button
              key={item.id}
              onClick={() => handleNavClick(item)}
              variant="ghost"
              size="sm"
              className={`
                group relative flex flex-col items-center space-y-1 transition-all duration-300
                ${item.id === 'create' 
                  ? 'bg-primary text-primary-foreground rounded-full -mt-10 w-16 h-16 hover:scale-110 hover:shadow-lg hover:shadow-primary/40' 
                  : item.active 
                    ? 'text-primary transform -translate-y-2' 
                    : 'text-muted-foreground hover:text-primary hover:transform hover:-translate-y-1'
                }
              `}
            >
              {item.id !== 'create' ? (
                <>
                  <item.icon className="w-6 h-6 transition-all duration-300" />
                  <span className={`text-xs transition-all duration-300 ${
                    item.active ? 'opacity-100 font-semibold' : 'opacity-70'
                  }`}>
                    {item.label}
                  </span>
                  {item.active && (
                    <div className="absolute -bottom-2 w-1 h-1 bg-primary rounded-full" />
                  )}
                </>
              ) : (
                <item.icon className="w-8 h-8" />
              )}
            </Button>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default DockerNav;
