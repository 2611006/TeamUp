import { useState, useEffect } from 'react';
import { Search, MessageCircle, Users, Filter, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  subscribeToAllUsers,
  getAvailableRoles,
  sendInvitation,
  getUserTeams,
  createTeam,
  getProfile,
  UserProfile 
} from '@/services/firestore';
import { isFirebaseConfigured } from '@/lib/firebase';
import { getSkillClass } from '@/data/mockData';
import PitchModal from '../PitchModal';
import { toast } from 'sonner';

interface DiscoverPeopleProps {
  onViewProfile: (userId: string) => void;
}

const DiscoverPeople = ({ onViewProfile }: DiscoverPeopleProps) => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState<UserProfile | null>(null);
  const [sending, setSending] = useState(false);
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured() || !user) {
      setLoading(false);
      return;
    }

    // Load current user's profile
    getProfile(user.uid).then(setCurrentUserProfile);

    // Load available roles
    loadRoles();

    // Subscribe to all users in real-time
    const unsubscribe = subscribeToAllUsers(user.uid, (fetchedUsers) => {
      setUsers(fetchedUsers);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const loadRoles = async () => {
    if (!isFirebaseConfigured()) return;
    const roles = await getAvailableRoles();
    setAvailableRoles(roles);
  };

  const handleSendInvite = async (targetUser: UserProfile, message: string) => {
    if (!user || !targetUser.id) return;
    setSending(true);
    
    try {
      // Get user's teams or create one if none exists
      let userTeams = await getUserTeams(user.uid);
      let teamId: string;
      let teamName: string;

      if (userTeams.length === 0) {
        // Create a default team for the user
        const profile = await getProfile(user.uid);
        teamId = await createTeam({
          name: `${profile?.fullName || 'My'}'s Team`,
          description: 'My hackathon team',
          leaderId: user.uid,
          status: 'forming',
          rolesNeeded: [],
          maxMembers: 4
        });
        teamName = `${profile?.fullName || 'My'}'s Team`;
      } else {
        teamId = userTeams[0].id;
        teamName = userTeams[0].name;
      }

      const profile = await getProfile(user.uid);

      // Send invitation
      await sendInvitation({
        teamId,
        teamName,
        fromUserId: user.uid,
        fromUserName: profile?.fullName || user.email?.split('@')[0] || 'User',
        toUserId: targetUser.id,
        toUserName: targetUser.fullName || 'User',
        message,
        type: 'invite'
      });

      toast.success(`Invitation sent to ${targetUser.fullName}`);
    } catch (error: any) {
      console.error('Error sending invitation:', error);
      toast.error(error.message || 'Failed to send invitation');
    }
    
    setSending(false);
    setShowModal(null);
  };

  // Filter by search term and role
  const filteredUsers = users.filter((u) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = 
      (u.fullName?.toLowerCase().includes(term) || '') ||
      (u.primaryRole?.toLowerCase().includes(term) || '') ||
      (u.skills?.some(skill => skill.name.toLowerCase().includes(term)) || false);
    
    const matchesRole = !roleFilter || u.primaryRole === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  // Get user status
  const getUserStatus = (u: UserProfile): { label: string; color: string; canInvite: boolean } => {
    if (!u.teamId) {
      return { label: '🟢 Available', color: 'bg-skill-mobile/10 text-skill-mobile', canInvite: true };
    }
    if (u.isTeamLeader) {
      return { label: '🟡 Creating a Team', color: 'bg-accent/10 text-accent', canInvite: false };
    }
    return { label: '🔵 Joined a Team', color: 'bg-primary/10 text-primary', canInvite: false };
  };

  // Check if current user can invite (must have a team or be able to create one)
  const canCurrentUserInvite = currentUserProfile?.isTeamLeader || !currentUserProfile?.teamId || currentUserProfile?.teamId;

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
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-primary/10">
            <Users className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="font-display font-bold text-2xl text-foreground">Discover People</h1>
            <p className="text-muted-foreground">Find talented teammates for your project</p>
          </div>
        </div>

        {/* Search */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, role, or skill..."
              className="input-field pl-12"
            />
          </div>
          
          {/* Role Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="input-field pl-9 pr-8 min-w-[180px]"
            >
              <option value="">All Roles</option>
              {availableRoles.map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Status Legend */}
      <div className="card-base p-4">
        <p className="text-sm font-medium text-foreground mb-3">User Status:</p>
        <div className="flex flex-wrap gap-4 text-sm">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-skill-mobile"></span>
            Available - Can be invited
          </span>
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent"></span>
            Creating a Team - Team leader
          </span>
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary"></span>
            Joined a Team - Already in a team
          </span>
        </div>
      </div>

      {/* People Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredUsers.map((u) => {
          const status = getUserStatus(u);
          
          return (
            <div key={u.id} className="card-base card-interactive p-5">
              <div className="flex items-start gap-4">
                <img
                  src={u.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(u.fullName || 'User')}`}
                  alt={u.fullName}
                  className="avatar w-14 h-14 cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all"
                  onClick={() => onViewProfile(u.id)}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 
                      className="font-semibold text-foreground hover:text-primary cursor-pointer transition-colors truncate"
                      onClick={() => onViewProfile(u.id)}
                    >
                      {u.fullName}
                    </h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                      {status.label}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{u.primaryRole}</p>
                  
                  {/* Skills */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {u.skills?.slice(0, 4).map((skill, idx) => (
                      <span key={idx} className={`skill-tag ${getSkillClass(skill.name)}`}>
                        {skill.name}
                      </span>
                    ))}
                    {u.skills && u.skills.length > 4 && (
                      <span className="skill-tag bg-muted text-muted-foreground">
                        +{u.skills.length - 4} more
                      </span>
                    )}
                  </div>

                  {/* College */}
                  {u.college && (
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                      <span>{u.college}</span>
                      {u.yearOfStudy && <span>• {u.yearOfStudy}</span>}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {status.canInvite ? (
                      <button 
                        onClick={() => setShowModal(u)}
                        disabled={sending}
                        className="btn-primary text-sm flex-1"
                      >
                        Invite to Team
                      </button>
                    ) : (
                      <button 
                        disabled
                        className="btn-secondary text-sm flex-1 opacity-50 cursor-not-allowed"
                      >
                        {u.isTeamLeader ? 'Team Leader' : 'Already in Team'}
                      </button>
                    )}
                    <button 
                      onClick={() => onViewProfile(u.id)}
                      className="btn-secondary text-sm flex items-center gap-1.5"
                    >
                      View Profile
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredUsers.length === 0 && (
        <div className="card-base p-12 text-center">
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-display font-bold text-lg text-foreground mb-2">No users found</h3>
          <p className="text-muted-foreground">
            {searchTerm || roleFilter 
              ? `No users matching your filters` 
              : 'Be the first to join!'}
          </p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <PitchModal
          type="invite"
          recipientName={showModal.fullName || 'User'}
          recipientId={showModal.id}
          onClose={() => setShowModal(null)}
          onSend={(message) => handleSendInvite(showModal, message)}
        />
      )}
    </div>
  );
};

export default DiscoverPeople;
