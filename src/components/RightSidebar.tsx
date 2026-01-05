import { useState, useEffect } from 'react';
import { Sparkles, TrendingUp, Zap, Loader2 } from 'lucide-react';
import { getSkillClass } from '../data/mockData';
import { getAvailableUsers, UserProfile } from '../services/firestore';
import { isFirebaseConfigured } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';

interface RightSidebarProps {
  onViewProfile: (userId: string) => void;
}

const RightSidebar = ({ onViewProfile }: RightSidebarProps) => {
  const { user } = useAuth();
  const [suggestedUsers, setSuggestedUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSuggestedUsers();
  }, [user]);

  const loadSuggestedUsers = async () => {
    if (!isFirebaseConfigured() || !user) {
      setLoading(false);
      return;
    }

    try {
      const available = await getAvailableUsers(user.uid);
      // Get top 3 random available users as suggestions
      const shuffled = available.sort(() => 0.5 - Math.random());
      setSuggestedUsers(shuffled.slice(0, 3));
    } catch (error) {
      console.error('Error loading suggested users:', error);
    }
    setLoading(false);
  };

  return (
    <aside className="w-80 flex-shrink-0 space-y-4">
      {/* AI Recommendations */}
      <div className="card-base p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <h3 className="section-title text-sm">AI-Powered Matches</h3>
        </div>
        <div className="p-3 rounded-lg bg-gradient-to-r from-primary/5 to-accent/5 border border-primary/10">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-primary">Pro tip:</span> Create a team and use AI Suggestions to find the best matches for your project!
          </p>
        </div>
      </div>

      {/* Suggested Teammates */}
      <div className="card-base p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="section-title text-sm">Available Teammates</h3>
          <span className="text-xs text-muted-foreground">Real-time</span>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        ) : suggestedUsers.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No available users yet
          </p>
        ) : (
          <div className="space-y-3">
            {suggestedUsers.map((u) => (
              <div
                key={u.id}
                className="flex items-start gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer"
                onClick={() => onViewProfile(u.id)}
              >
                <img
                  src={u.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(u.fullName || 'User')}`}
                  alt={u.fullName}
                  className="avatar w-10 h-10"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground truncate">{u.fullName}</p>
                  <p className="text-xs text-muted-foreground truncate">{u.primaryRole}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {u.skills?.slice(0, 2).map((skill) => (
                      <span key={skill.name} className={`skill-tag text-[10px] ${getSkillClass(skill.name)}`}>
                        {skill.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Trending Hackathons */}
      <div className="card-base p-4">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-accent" />
          <h3 className="section-title text-sm">Upcoming Hackathons</h3>
        </div>
        <div className="space-y-3">
          {[
            { name: 'HackMIT 2026', date: 'Feb 15-17', teams: 42 },
            { name: 'TreeHacks', date: 'Feb 22-24', teams: 38 },
            { name: 'CalHacks', date: 'Mar 1-3', teams: 56 },
          ].map((hackathon) => (
            <div key={hackathon.name} className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary/50 transition-colors">
              <div>
                <p className="font-medium text-sm text-foreground">{hackathon.name}</p>
                <p className="text-xs text-muted-foreground">{hackathon.date}</p>
              </div>
              <span className="text-xs text-primary font-medium">{hackathon.teams} teams forming</span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="card-base p-4">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4 text-accent" />
          <h3 className="section-title text-sm">Platform Stats</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-3 rounded-lg bg-secondary/50">
            <p className="text-2xl font-bold text-primary">{suggestedUsers.length > 0 ? suggestedUsers.length + '+' : '0'}</p>
            <p className="text-xs text-muted-foreground">Available Users</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-secondary/50">
            <p className="text-2xl font-bold text-accent">∞</p>
            <p className="text-xs text-muted-foreground">Possibilities</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default RightSidebar;