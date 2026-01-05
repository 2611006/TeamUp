import { useState, useEffect } from 'react';
import { FolderKanban, Users, ChevronRight, Plus, Sparkles, Loader2, Crown, LogOut, Trash2, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  subscribeToUserTeams, 
  subscribeToTeamMembers,
  subscribeToJoinRequests,
  getAvailableUsers,
  removeTeamMember,
  terminateTeam,
  respondToInvitation,
  Team, 
  TeamMember, 
  UserProfile,
  Invitation
} from '@/services/firestore';
import { isFirebaseConfigured } from '@/lib/firebase';
import { getTeamRecommendations } from '@/services/geminiService';
import { toast } from 'sonner';

interface MyTeamsProps {
  onNavigate: (page: string) => void;
  onViewWorkspace?: (teamId: string) => void;
}

interface TeamWithMembers extends Team {
  loadedMembers: (TeamMember & { profile: UserProfile | null })[];
}

const MyTeams = ({ onNavigate, onViewWorkspace }: MyTeamsProps) => {
  const { user } = useAuth();
  const [teams, setTeams] = useState<TeamWithMembers[]>([]);
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<{
    missingRoles: string[];
    recommendedUsers: { user: UserProfile; reason: string }[];
    explanation: string;
  } | null>(null);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [joinRequests, setJoinRequests] = useState<Invitation[]>([]);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState<string | null>(null);
  const [showTerminateConfirm, setShowTerminateConfirm] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!isFirebaseConfigured() || !user) {
      setLoading(false);
      return;
    }

    // Subscribe to user's teams in real-time
    const unsubscribe = subscribeToUserTeams(user.uid, async (userTeams) => {
      const teamsWithMembers: TeamWithMembers[] = await Promise.all(
        userTeams.map(async (team) => {
          return new Promise<TeamWithMembers>((resolve) => {
            const unsubMembers = subscribeToTeamMembers(team.id, (members) => {
              resolve({ ...team, loadedMembers: members });
            });
          });
        })
      );
      
      setTeams(teamsWithMembers);
      setLoading(false);

      // Subscribe to join requests if user is a leader
      teamsWithMembers.forEach(team => {
        if (team.leaderId === user.uid) {
          subscribeToJoinRequests(team.id, setJoinRequests);
        }
      });
    });

    return () => unsubscribe();
  }, [user]);

  const loadRecommendations = async (team: TeamWithMembers) => {
    setLoadingRecommendations(true);
    try {
      const availableUsers = await getAvailableUsers(user?.uid);
      const currentMembers = team.loadedMembers.map(m => ({ role: m.role }));
      const recs = await getTeamRecommendations(team, currentMembers, availableUsers);
      setRecommendations(recs);
    } catch (error) {
      console.error('Error loading recommendations:', error);
    }
    setLoadingRecommendations(false);
  };

  const handleLeaveTeam = async (teamId: string) => {
    if (!user) return;
    setActionLoading(true);
    try {
      await removeTeamMember(teamId, user.uid);
      toast.success('You have left the team');
      setShowLeaveConfirm(null);
    } catch (error: any) {
      console.error('Error leaving team:', error);
      toast.error(error.message || 'Failed to leave team');
    }
    setActionLoading(false);
  };

  const handleTerminateTeam = async (teamId: string) => {
    if (!user) return;
    setActionLoading(true);
    try {
      await terminateTeam(teamId, user.uid);
      toast.success('Team has been terminated');
      setShowTerminateConfirm(null);
    } catch (error: any) {
      console.error('Error terminating team:', error);
      toast.error(error.message || 'Failed to terminate team');
    }
    setActionLoading(false);
  };

  const handleRespondToJoinRequest = async (request: Invitation, status: 'accepted' | 'rejected') => {
    setActionLoading(true);
    try {
      await respondToInvitation(request.id, status);
      toast.success(status === 'accepted' ? `${request.fromUserName} has joined the team!` : 'Request declined');
    } catch (error: any) {
      console.error('Error responding to request:', error);
      toast.error(error.message || 'Failed to respond to request');
    }
    setActionLoading(false);
  };

  const getStatusBadge = (status: string, currentMembers: number, maxMembers: number) => {
    if (status === 'forming' && currentMembers >= maxMembers) {
        return 'bg-muted text-muted-foreground'; // Complete style
    }
    switch (status) {
        case 'forming':
        return 'bg-accent/10 text-accent';
        case 'active':
        return 'bg-skill-mobile/10 text-skill-mobile';
        case 'complete':
        return 'bg-muted text-muted-foreground';
        default:
        return 'bg-primary/10 text-primary';
    }
  };

  const getStatusLabel = (status: string, currentMembers: number, maxMembers: number) => {
    if (status === 'forming' && currentMembers >= maxMembers) {
        return 'Complete';
    }
    switch (status) {
        case 'forming':
        return 'Forming';
        case 'active':
        return 'Active';
        case 'complete':
        return 'Complete';
        default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card-base p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <FolderKanban className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="font-display font-bold text-2xl text-foreground">My Teams</h1>
              <p className="text-muted-foreground">Manage your hackathon teams</p>
            </div>
          </div>
          <button onClick={() => onNavigate('build')} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New Team
          </button>
        </div>
      </div>

      {/* Join Requests (for team leaders) */}
      {joinRequests.length > 0 && (
        <div className="card-base p-6 border-l-4 border-accent">
          <h2 className="font-display font-bold text-lg text-foreground mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-accent" />
            Join Requests ({joinRequests.length})
          </h2>
          <div className="space-y-3">
            {joinRequests.map((request) => (
              <div key={request.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border">
                <div className="flex items-center gap-3">
                  <img
                    src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(request.fromUserName)}`}
                    alt={request.fromUserName}
                    className="w-10 h-10 rounded-full"
                  />
                  <div>
                    <p className="font-medium text-foreground">{request.fromUserName}</p>
                    <p className="text-xs text-muted-foreground">
                      {request.message || 'Wants to join your team'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRespondToJoinRequest(request, 'rejected')}
                    disabled={actionLoading}
                    className="btn-secondary text-sm"
                  >
                    Decline
                  </button>
                  <button
                    onClick={() => handleRespondToJoinRequest(request, 'accepted')}
                    disabled={actionLoading}
                    className="btn-primary text-sm"
                  >
                    Accept
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Teams List */}
      <div className="space-y-4">
        {teams.map((team) => {
          const isLeader = team.leaderId === user?.uid;
          
          return (
            <div key={team.id} className="card-base card-interactive p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-display font-bold text-xl text-foreground">{team.name}</h3>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(team.status, team.loadedMembers.length, team.maxMembers)}`}>
                        {getStatusLabel(team.status, team.loadedMembers.length, team.maxMembers)}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-muted-foreground">
                      {team.loadedMembers.length}/{team.maxMembers} members
                    </span>
                    {isLeader && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-accent/10 text-accent flex items-center gap-1">
                        <Crown className="w-3 h-3" />
                        Leader
                      </span>
                    )}
                  </div>
                  <p className="text-muted-foreground">{team.description}</p>
                  {team.hackathon && (
                    <p className="text-sm text-primary mt-1">🎯 {team.hackathon}</p>
                  )}
                </div>
                <button 
                  onClick={() => onViewWorkspace?.(team.id)}
                  className="btn-ghost flex items-center gap-1"
                >
                  View Workspace
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Members */}
              <div className="mb-4">
                <p className="text-xs font-medium text-muted-foreground mb-3">
                  Team Members ({team.loadedMembers.length})
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                    {team.loadedMembers.map((member) => (
                      <img
                        key={member.id}
                        src={member.profile?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(member.profile?.fullName || 'User')}`}
                        alt={member.profile?.fullName || 'Team member'}
                        className="avatar w-9 h-9 border-2 border-card"
                        title={`${member.profile?.fullName} - ${member.role}`}
                      />
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {team.loadedMembers.map((member, idx) => (
                      <span key={member.id} className="text-sm text-muted-foreground">
                        {member.profile?.fullName || 'Unknown'} 
                        <span className="text-xs text-primary">({member.role})</span>
                        {idx < team.loadedMembers.length - 1 ? ', ' : ''}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Roles Needed */}
              {team.rolesNeeded && team.rolesNeeded.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Roles Needed:</p>
                  <div className="flex flex-wrap gap-2">
                    {team.rolesNeeded.map((role, idx) => (
                      <span key={idx} className="px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                        {role}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Team Actions */}
              <div className="pt-4 border-t border-border">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <p className="text-sm text-muted-foreground">
                    {isLeader ? 'Manage your team' : 'Team options'}
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={() => onNavigate('discover')} className="btn-outline text-sm">
                      Find Teammates
                    </button>
                    
                    {isLeader && team.status === 'forming' && (
                      <button 
                        onClick={() => loadRecommendations(team)}
                        disabled={loadingRecommendations}
                        className="btn-primary text-sm flex items-center gap-1.5"
                      >
                        {loadingRecommendations ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Sparkles className="w-4 h-4" />
                        )}
                        AI Suggestions
                      </button>
                    )}

                    {/* Leave Team (for non-leaders) */}
                    {!isLeader && (
                      <button 
                        onClick={() => setShowLeaveConfirm(team.id)}
                        className="btn-secondary text-sm flex items-center gap-1.5 text-destructive hover:bg-destructive/10"
                      >
                        <LogOut className="w-4 h-4" />
                        Leave Team
                      </button>
                    )}

                    {/* Terminate Team (for leaders) */}
                    {isLeader && (
                      <button 
                        onClick={() => setShowTerminateConfirm(team.id)}
                        className="btn-secondary text-sm flex items-center gap-1.5 text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-4 h-4" />
                        Terminate Team
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* AI Recommendations */}
              {recommendations && (
                <div className="mt-4 p-4 rounded-lg bg-gradient-to-r from-primary/5 to-accent/5 border border-primary/10">
                  <div className="flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-primary mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-primary mb-2">AI Recommendations</p>
                      <p className="text-sm text-muted-foreground mb-3">{recommendations.explanation}</p>
                      
                      {recommendations.missingRoles.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs font-medium text-foreground mb-1">Missing Roles:</p>
                          <div className="flex flex-wrap gap-1">
                            {recommendations.missingRoles.map((role, idx) => (
                              <span key={idx} className="px-2 py-0.5 rounded-full text-xs bg-accent/10 text-accent">
                                {role}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {recommendations.recommendedUsers.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-foreground mb-2">Recommended Users:</p>
                          <div className="space-y-2">
                            {recommendations.recommendedUsers.map((rec, idx) => (
                              <div key={idx} className="flex items-center gap-2 p-2 rounded bg-secondary/50">
                                <img
                                  src={rec.user.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(rec.user.fullName || 'User')}`}
                                  alt={rec.user.fullName}
                                  className="w-8 h-8 rounded-full"
                                />
                                <div>
                                  <p className="text-sm font-medium">{rec.user.fullName}</p>
                                  <p className="text-xs text-muted-foreground">{rec.reason}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {teams.length === 0 && (
        <div className="card-base p-12 text-center">
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-display font-bold text-lg text-foreground mb-2">No teams yet</h3>
          <p className="text-muted-foreground mb-4">Start your hackathon journey by creating a team or joining one</p>
          <div className="flex justify-center gap-3">
            <button onClick={() => onNavigate('build')} className="btn-primary">
              Create a Team
            </button>
            <button onClick={() => onNavigate('discover-teams')} className="btn-secondary">
              Find a Team
            </button>
          </div>
        </div>
      )}

      {/* Leave Team Confirmation Modal */}
      {showLeaveConfirm && (
        <div className="modal-overlay" onClick={() => setShowLeaveConfirm(null)}>
          <div className="modal-content animate-scale-in max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-full bg-destructive/10">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <h2 className="font-display font-bold text-xl text-foreground">Leave Team?</h2>
                <p className="text-sm text-muted-foreground">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-muted-foreground mb-6">
              Are you sure you want to leave this team? You will need to request to join again if you change your mind.
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowLeaveConfirm(null)} 
                className="btn-secondary"
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button 
                onClick={() => handleLeaveTeam(showLeaveConfirm)}
                disabled={actionLoading}
                className="btn-primary bg-destructive hover:bg-destructive/90 flex items-center gap-2"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                Leave Team
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Terminate Team Confirmation Modal */}
      {showTerminateConfirm && (
        <div className="modal-overlay" onClick={() => setShowTerminateConfirm(null)}>
          <div className="modal-content animate-scale-in max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-full bg-destructive/10">
                <Trash2 className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <h2 className="font-display font-bold text-xl text-foreground">Terminate Team?</h2>
                <p className="text-sm text-muted-foreground">This action is permanent</p>
              </div>
            </div>
            <p className="text-muted-foreground mb-6">
              Are you sure you want to terminate this team? All members will be removed and the team will be deleted permanently. This cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowTerminateConfirm(null)} 
                className="btn-secondary"
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button 
                onClick={() => handleTerminateTeam(showTerminateConfirm)}
                disabled={actionLoading}
                className="btn-primary bg-destructive hover:bg-destructive/90 flex items-center gap-2"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Terminate Team
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyTeams;
