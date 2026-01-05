import { useState, useEffect } from 'react';
import { Search, Users, Loader2, UserPlus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  subscribeToAvailableTeams,
  getProfile,
  sendInvitation,
  Team,
  UserProfile
} from '@/services/firestore';
import { isFirebaseConfigured } from '@/lib/firebase';
import { toast } from 'sonner';
import JoinTeamModal from '../JoinTeamModal';

interface DiscoverTeamsProps {
  onNavigate: (page: string) => void;
}

const DiscoverTeams = ({ onNavigate }: DiscoverTeamsProps) => {
  const { user } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured() || !user) {
      setLoading(false);
      return;
    }

    // Load current user's profile
    getProfile(user.uid).then(setCurrentUserProfile);

    // Subscribe to available teams
    const unsubscribe = subscribeToAvailableTeams((availableTeams) => {
      // Filter out teams where the current user is the leader
      const filteredTeams = availableTeams.filter(team => team.leaderId !== user.uid);
      setTeams(filteredTeams);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleJoinRequest = async (team: Team, message: string) => {
    if (!user || !currentUserProfile) return;

    try {
      await sendInvitation({
        teamId: team.id,
        teamName: team.name,
        fromUserId: user.uid,
        fromUserName: currentUserProfile.fullName || 'User',
        toUserId: team.leaderId,
        toUserName: team.leaderName || 'Team Leader',
        message,
        type: 'join_request'
      });

      toast.success(`Join request sent to ${team.name}!`);
      setSelectedTeam(null);
    } catch (error: any) {
      console.error('Error sending join request:', error);
      toast.error(error.message || 'Failed to send join request');
    }
  };

  // Filter teams by search
  const filteredTeams = teams.filter((team) => {
    const term = searchTerm.toLowerCase();
    return (
      team.name.toLowerCase().includes(term) ||
      team.description.toLowerCase().includes(term) ||
      team.rolesNeeded?.some(role => role.toLowerCase().includes(term))
    );
  });

  // Check if current user is already in a team
  const isInTeam = currentUserProfile?.teamId !== null && currentUserProfile?.teamId !== undefined;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isInTeam) {
    return (
      <div className="space-y-6">
        <div className="card-base p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl bg-primary/10">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="font-display font-bold text-2xl text-foreground">Discover Teams</h1>
              <p className="text-muted-foreground">Find a team to join</p>
            </div>
          </div>
        </div>
        
        <div className="card-base p-12 text-center">
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-display font-bold text-lg text-foreground mb-2">You're already in a team!</h3>
          <p className="text-muted-foreground mb-4">
            Leave your current team first to join another one.
          </p>
          <button onClick={() => onNavigate('teams')} className="btn-primary">
            View My Team
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card-base p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-primary/10">
            <Users className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="font-display font-bold text-2xl text-foreground">Discover Teams</h1>
            <p className="text-muted-foreground">Find a team looking for members like you</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by team name, description, or roles needed..."
            className="input-field pl-12"
          />
        </div>
      </div>

      {/* Teams Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredTeams.map((team) => (
          <div key={team.id} className="card-base card-interactive p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-display font-bold text-lg text-foreground">{team.name}</h3>
                <p className="text-sm text-muted-foreground">Led by {team.leaderName || 'Unknown'}</p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                {team.members.length}/{team.maxMembers} members
              </span>
            </div>
            
            <p className="text-muted-foreground text-sm mb-4 line-clamp-2">{team.description}</p>

            {team.hackathon && (
              <p className="text-sm text-primary mb-3">🎯 {team.hackathon}</p>
            )}

            {/* Roles Needed */}
            {team.rolesNeeded && team.rolesNeeded.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">Looking for:</p>
                <div className="flex flex-wrap gap-1.5">
                  {team.rolesNeeded.map((role, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded-full text-xs bg-accent/10 text-accent">
                      {role}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Current Members */}
            <div className="mb-4">
              <p className="text-xs font-medium text-muted-foreground mb-2">Current members:</p>
              <div className="flex -space-x-2">
                {team.members.slice(0, 5).map((member, idx) => (
                  <img
                    key={idx}
                    src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(member.userName || 'User')}`}
                    alt={member.userName}
                    className="w-8 h-8 rounded-full border-2 border-card"
                    title={`${member.userName} - ${member.role}`}
                  />
                ))}
                {team.members.length > 5 && (
                  <div className="w-8 h-8 rounded-full border-2 border-card bg-secondary flex items-center justify-center text-xs font-medium">
                    +{team.members.length - 5}
                  </div>
                )}
              </div>
            </div>

            {/* Join Button */}
            <button 
              onClick={() => setSelectedTeam(team)}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              Request to Join
            </button>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredTeams.length === 0 && (
        <div className="card-base p-12 text-center">
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-display font-bold text-lg text-foreground mb-2">No teams available</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm 
              ? 'No teams match your search criteria' 
              : 'There are no teams with open slots right now. Try creating your own!'}
          </p>
          <button onClick={() => onNavigate('build')} className="btn-primary">
            Create a Team
          </button>
        </div>
      )}

      {/* Join Team Modal */}
      {selectedTeam && (
        <JoinTeamModal
          team={selectedTeam}
          userProfile={currentUserProfile}
          onClose={() => setSelectedTeam(null)}
          onSend={(message) => handleJoinRequest(selectedTeam, message)}
        />
      )}
    </div>
  );
};

export default DiscoverTeams;
