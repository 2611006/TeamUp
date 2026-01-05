import { Home, Users, UserPlus, FolderKanban, User, Bell, Sparkles, Crown, Search } from 'lucide-react';
import { UserProfile } from '../services/firestore';

interface LeftSidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  userProfile?: UserProfile | null;
}

const LeftSidebar = ({ currentPage, onNavigate, userProfile }: LeftSidebarProps) => {
  const navItems = [
    { id: 'feed', label: 'Home Feed', icon: Home },
    { id: 'discover', label: 'Discover People', icon: Users },
    { id: 'discover-teams', label: 'Discover Teams', icon: Search },
    { id: 'build', label: 'Build a Team', icon: UserPlus },
    { id: 'teams', label: 'My Teams', icon: FolderKanban },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'profile', label: 'My Profile', icon: User },
  ];

  const displayName = userProfile?.fullName || 'User';
  const displayRole = userProfile?.primaryRole || 'Team Member';
  const displayAvatar = userProfile?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName)}`;

  return (
    <aside className="w-72 flex-shrink-0 space-y-4">
      <div className="card-base overflow-hidden">
        <div className="h-16 bg-gradient-to-r from-primary to-primary/80" />
        <div className="px-4 pb-4">
          <div className="-mt-8 flex flex-col items-center">
            <img src={displayAvatar} alt={displayName} className="avatar w-16 h-16 border-4 border-card" />
            <h3 className="mt-2 font-display font-bold text-foreground">{displayName}</h3>
            <p className="text-sm text-muted-foreground">{displayRole}</p>
            {userProfile?.isTeamLeader ? (
              <div className="mt-3 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-accent/10 text-accent">
                <Crown className="w-3 h-3" />
                <span>Team Leader</span>
              </div>
            ) : userProfile?.teamId ? (
              <div className="mt-3 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                <FolderKanban className="w-3 h-3" />
                <span>In a Team</span>
              </div>
            ) : (
              <div className="mt-3 flex items-center gap-1 ai-badge">
                <Sparkles className="w-3 h-3" />
                <span>Available</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <nav className="card-base p-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`nav-item w-full ${currentPage === item.id ? 'nav-item-active' : ''}`}
          >
            <item.icon className="w-5 h-5" />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="card-base p-4">
        <p className="text-sm text-muted-foreground italic leading-relaxed">
          "Teams fail because of poor composition, not poor ideas."
        </p>
        <p className="mt-2 text-xs text-primary font-medium">— TeamUp Philosophy</p>
      </div>
    </aside>
  );
};

export default LeftSidebar;