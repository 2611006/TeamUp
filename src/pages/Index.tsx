import { useState, useEffect } from 'react';
import { Zap, Menu, X, Bell, Search } from 'lucide-react';
import LeftSidebar from '../components/LeftSidebar';
import RightSidebar from '../components/RightSidebar';
import HomeFeed from '../components/pages/HomeFeed';
import BuildTeam from '../components/pages/BuildTeam';
import DiscoverPeople from '../components/pages/DiscoverPeople';
import DiscoverTeams from '../components/pages/DiscoverTeams';
import MyTeams from '../components/pages/MyTeams';
import Profile from '../components/pages/Profile';
import Notifications from '../components/pages/Notifications';
import TeamWorkspace from '../components/pages/TeamWorkspace';
import Auth from '../components/pages/Auth';
import ProfileSetup from '../components/pages/ProfileSetup';
import { useAuth } from '../contexts/AuthContext';
import { getProfile, subscribeToNotifications, UserProfile, Notification } from '../services/firestore';
import { isFirebaseConfigured } from '../lib/firebase';

const Index = () => {
  const { user, loading: authLoading, logout } = useAuth();
  const [currentPage, setCurrentPage] = useState('feed');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [needsProfileSetup, setNeedsProfileSetup] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user && isFirebaseConfigured()) {
      checkProfile();
      
      // Subscribe to notifications for unread count
      const unsubscribe = subscribeToNotifications(user.uid, (notifications) => {
        const unread = notifications.filter(n => !n.read).length;
        setUnreadCount(unread);
      });

      return () => unsubscribe();
    }
  }, [user]);

  const checkProfile = async () => {
    if (!user) return;
    const userProfile = await getProfile(user.uid);
    if (!userProfile || !userProfile.primaryRole) {
      setNeedsProfileSetup(true);
    } else {
      setProfile(userProfile);
      setNeedsProfileSetup(false);
    }
  };

  const handleNavigate = (page: string) => {
    setCurrentPage(page);
    setSelectedUserId(null);
    setSelectedTeamId(null);
    setMobileMenuOpen(false);
    setEditingProfile(false);
  };

  const handleViewProfile = (userId: string) => {
    setSelectedUserId(userId);
    setCurrentPage('viewProfile');
  };

  const handleViewWorkspace = (teamId: string) => {
    setSelectedTeamId(teamId);
    setCurrentPage('workspace');
  };

  const handleEditProfile = () => {
    setEditingProfile(true);
  };

  // Show auth if not logged in (only when Firebase is configured)
  if (isFirebaseConfigured() && !authLoading && !user) {
    return <Auth onAuthSuccess={() => {}} />;
  }

  // Show loading
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-primary/80 w-fit mx-auto mb-4">
            <Zap className="w-6 h-6 text-primary-foreground" />
          </div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show profile setup if needed
  if ((needsProfileSetup || editingProfile) && user) {
    return (
      <ProfileSetup 
        existingProfile={editingProfile ? profile : null}
        onComplete={() => { 
          setNeedsProfileSetup(false); 
          setEditingProfile(false);
          checkProfile(); 
        }} 
      />
    );
  }

  const renderContent = () => {
    switch (currentPage) {
      case 'feed':
        return <HomeFeed onNavigate={handleNavigate} onViewProfile={handleViewProfile} />;
      case 'build':
        return <BuildTeam onNavigate={handleNavigate} />;
      case 'discover':
        return <DiscoverPeople onViewProfile={handleViewProfile} />;
      case 'discover-teams':
        return <DiscoverTeams onNavigate={handleNavigate} />;
      case 'teams':
        return <MyTeams onNavigate={handleNavigate} onViewWorkspace={handleViewWorkspace} />;
      case 'notifications':
        return <Notifications />;
      case 'profile':
        return <Profile isOwnProfile={true} userProfile={profile} onEditProfile={handleEditProfile} />;
      case 'viewProfile':
        return <Profile userId={selectedUserId || undefined} isOwnProfile={false} />;
      case 'workspace':
        return <TeamWorkspace teamId={selectedTeamId || ''} onBack={() => handleNavigate('teams')} />;
      default:
        return <HomeFeed onNavigate={handleNavigate} onViewProfile={handleViewProfile} />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-primary to-primary/80">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-xl text-foreground">TeamUp</span>
          </div>

          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search people, teams, skills..."
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-secondary/50 border-none text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => handleNavigate('notifications')}
              className="p-2 rounded-lg hover:bg-secondary transition-colors relative"
            >
              <Bell className="w-5 h-5 text-muted-foreground" />
              {unreadCount > 0 && (
                <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-accent-foreground text-xs font-bold flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            {user && (
              <button 
                onClick={logout}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Logout
              </button>
            )}
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-secondary transition-colors"
            >
              {mobileMenuOpen ? <X className="w-5 h-5 text-foreground" /> : <Menu className="w-5 h-5 text-foreground" />}
            </button>
          </div>
        </div>
      </header>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-30 bg-background/95 backdrop-blur-sm md:hidden pt-16">
          <div className="p-4">
            <LeftSidebar currentPage={currentPage} onNavigate={handleNavigate} userProfile={profile} />
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          <div className="hidden md:block">
            <div className="sticky top-24">
              <LeftSidebar currentPage={currentPage} onNavigate={handleNavigate} userProfile={profile} />
            </div>
          </div>
          <main className="flex-1 min-w-0">{renderContent()}</main>
          <div className="hidden lg:block">
            <div className="sticky top-24">
              <RightSidebar onViewProfile={handleViewProfile} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;