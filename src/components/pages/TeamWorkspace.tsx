import { useState, useEffect } from 'react';
import { FolderKanban, Plus, Clock, User, Loader2, ArrowLeft, Users, Send } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Team, 
  getTeam, 
  getTeamMembers, 
  addWorkspaceLog,
  subscribeToWorkspaceLogs,
  WorkspaceLog,
  UserProfile,
  TeamMember,
  getProfile
} from '@/services/firestore';
import { isFirebaseConfigured } from '@/lib/firebase';

interface TeamWorkspaceProps {
  teamId: string;
  onBack: () => void;
}

const TeamWorkspace = ({ teamId, onBack }: TeamWorkspaceProps) => {
  const { user } = useAuth();
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<(TeamMember & { profile: UserProfile | null })[]>([]);
  const [logs, setLogs] = useState<WorkspaceLog[]>([]);
  const [newLog, setNewLog] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isMember, setIsMember] = useState(false);

  useEffect(() => {
    loadWorkspace();
    
    // Subscribe to real-time log updates
    if (isFirebaseConfigured() && teamId) {
      const unsubscribe = subscribeToWorkspaceLogs(teamId, (updatedLogs) => {
        setLogs(updatedLogs);
      });
      return () => unsubscribe();
    }
  }, [teamId, user]);

  const loadWorkspace = async () => {
    setLoading(true);
    if (!isFirebaseConfigured() || !user || !teamId) {
      setLoading(false);
      return;
    }

    try {
      // Load team
      const teamData = await getTeam(teamId);
      setTeam(teamData);

      // Load members
      const teamMembers = await getTeamMembers(teamId);
      setMembers(teamMembers);

      // Check if current user is a member
      const isMemberOfTeam = teamMembers.some(m => m.userId === user.uid);
      setIsMember(isMemberOfTeam);

      // Load user profile
      const profile = await getProfile(user.uid);
      setUserProfile(profile);

    } catch (error) {
      console.error('Error loading workspace:', error);
    }
    setLoading(false);
  };

  const handleAddLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLog.trim() || !user || !userProfile) return;

    setSubmitting(true);
    try {
      await addWorkspaceLog(
        teamId,
        user.uid,
        userProfile.fullName || 'Team Member',
        newLog.trim()
      );
      setNewLog('');
    } catch (error) {
      console.error('Error adding log:', error);
    }
    setSubmitting(false);
  };

  const formatTime = (timestamp: any): string => {
    if (!timestamp) return 'Just now';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="card-base p-12 text-center">
        <p className="text-muted-foreground">Team not found</p>
        <button onClick={onBack} className="btn-primary mt-4">
          Go Back
        </button>
      </div>
    );
  }

  if (!isMember) {
    return (
      <div className="card-base p-12 text-center">
        <p className="text-destructive font-medium mb-2">Access Denied</p>
        <p className="text-muted-foreground">You are not a member of this team.</p>
        <button onClick={onBack} className="btn-primary mt-4">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card-base p-6">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 rounded-lg hover:bg-secondary transition-colors">
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <FolderKanban className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="font-display font-bold text-2xl text-foreground">{team.name}</h1>
                <p className="text-muted-foreground">{team.description}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Progress Log */}
        <div className="lg:col-span-2 space-y-4">
          {/* Add Log Form */}
          <div className="card-base p-6">
            <h2 className="section-title mb-4">Add Progress Update</h2>
            <form onSubmit={handleAddLog} className="flex gap-3">
              <input
                type="text"
                value={newLog}
                onChange={(e) => setNewLog(e.target.value)}
                placeholder="What did you accomplish? e.g., 'Completed dashboard UI'"
                className="input-field flex-1"
              />
              <button 
                type="submit" 
                disabled={submitting || !newLog.trim()}
                className="btn-primary flex items-center gap-2"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Post
              </button>
            </form>
          </div>

          {/* Logs List */}
          <div className="card-base p-6">
            <h2 className="section-title mb-4">Progress Log</h2>
            
            {logs.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No progress updates yet. Be the first to share your progress!
              </p>
            ) : (
              <div className="space-y-4">
                {logs.map((log) => (
                  <div key={log.id} className="flex gap-4 p-4 rounded-lg bg-secondary/30 border border-border">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-medium text-primary">
                          {log.userName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-foreground">{log.userName}</span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTime(log.createdAt)}
                        </span>
                      </div>
                      <p className="text-muted-foreground">{log.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Team Members Sidebar */}
        <div className="space-y-4">
          <div className="card-base p-6">
            <h2 className="section-title mb-4 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Team Members ({members.length})
            </h2>
            
            <div className="space-y-3">
              {members.map((member) => (
                <div key={member.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
                  <img
                    src={member.profile?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(member.profile?.fullName || 'User')}`}
                    alt={member.profile?.fullName}
                    className="w-10 h-10 rounded-full"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {member.profile?.fullName || 'Unknown'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {member.role} • {member.profile?.primaryRole}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamWorkspace;