import { X, Send, Sparkles, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getProfile, getUserTeams, UserProfile, Team } from '@/services/firestore';

interface PitchModalProps {
  type: 'pitch' | 'invite';
  recipientName: string;
  recipientId?: string;
  onClose: () => void;
  onSend: (message: string) => void;
}

const PitchModal = ({ type, recipientName, recipientId, onClose, onSend }: PitchModalProps) => {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [aiTip, setAiTip] = useState<string | null>(null);
  const [loadingTip, setLoadingTip] = useState(false);

  const title = type === 'pitch' ? 'Pitch Yourself' : 'Invite to Your Team';
  const subtitle = type === 'pitch' 
    ? `Tell ${recipientName} why you'd be a great fit for their team` 
    : `Invite ${recipientName} to join your team`;
  const placeholder = type === 'pitch'
    ? "Hi! I saw your post and I'd love to contribute. Here's what I bring to the table..."
    : "Hey! I think you'd be a perfect fit for our team. Here's what we're building...";

  // Generate AI tip when modal opens
  useEffect(() => {
    if (type === 'invite' && recipientId && user) {
      generateAiTip();
    }
  }, [type, recipientId, user]);

  const generateAiTip = async () => {
    if (!recipientId || !user) return;
    
    setLoadingTip(true);
    try {
      // Get recipient's profile
      const recipientProfile = await getProfile(recipientId);
      if (!recipientProfile) {
        setAiTip('This user could be a great addition to your team!');
        setLoadingTip(false);
        return;
      }

      // Get current user's team
      const userTeams = await getUserTeams(user.uid);
      const team = userTeams[0];

      // Generate tip based on user's skills and team's needs
      const tip = generateTipLocally(recipientProfile, team);
      setAiTip(tip);
    } catch (error) {
      console.error('Error generating AI tip:', error);
      setAiTip('This user could be a valuable addition to your team based on their skills!');
    }
    setLoadingTip(false);
  };

  const generateTipLocally = (recipientProfile: UserProfile, team: Team | undefined): string => {
    const recipientRole = recipientProfile.primaryRole || '';
    const recipientSkills = recipientProfile.skills?.map(s => s.name) || [];
    
    // Check if team needs this role
    const rolesNeeded = team?.rolesNeeded || [];
    const roleMatches = rolesNeeded.some(role => 
      role.toLowerCase().includes(recipientRole.toLowerCase()) ||
      recipientRole.toLowerCase().includes(role.toLowerCase())
    );

    // Get existing team member roles
    const existingRoles = team?.members?.map(m => m.role) || [];
    
    // Build recommendation
    let tip = '';
    
    if (roleMatches) {
      tip = `🎯 Perfect match! ${recipientName} is a ${recipientRole}, which is one of the roles you're looking for.`;
    } else if (rolesNeeded.length > 0) {
      tip = `${recipientName} is a ${recipientRole}. While this isn't explicitly in your "needed roles," their skills in ${recipientSkills.slice(0, 3).join(', ') || 'various technologies'} could complement your team.`;
    } else {
      tip = `${recipientName}'s expertise as a ${recipientRole} with skills in ${recipientSkills.slice(0, 3).join(', ') || 'various technologies'} could strengthen your team.`;
    }

    // Add skill-specific recommendations
    if (recipientSkills.length > 0) {
      const topSkills = recipientSkills.slice(0, 3);
      
      // Check for complementary skills based on common patterns
      const hasDesignSkills = topSkills.some(s => 
        s.toLowerCase().includes('figma') || 
        s.toLowerCase().includes('design') || 
        s.toLowerCase().includes('ui') ||
        s.toLowerCase().includes('ux')
      );
      
      const hasBackendSkills = topSkills.some(s => 
        s.toLowerCase().includes('node') || 
        s.toLowerCase().includes('python') || 
        s.toLowerCase().includes('go') ||
        s.toLowerCase().includes('api')
      );
      
      const hasFrontendSkills = topSkills.some(s => 
        s.toLowerCase().includes('react') || 
        s.toLowerCase().includes('vue') || 
        s.toLowerCase().includes('angular')
      );

      const hasMLSkills = topSkills.some(s => 
        s.toLowerCase().includes('tensorflow') || 
        s.toLowerCase().includes('pytorch') || 
        s.toLowerCase().includes('ml') ||
        s.toLowerCase().includes('ai')
      );

      if (hasDesignSkills) {
        tip += ' Their design skills can help create a polished user experience.';
      } else if (hasBackendSkills) {
        tip += ' Their backend expertise ensures robust infrastructure.';
      } else if (hasFrontendSkills) {
        tip += ' Their frontend skills will help build an engaging interface.';
      } else if (hasMLSkills) {
        tip += ' Their ML knowledge can add intelligent features to your project.';
      }
    }

    return tip;
  };

  const handleSend = async () => {
    setSending(true);
    await onSend(message);
    setSending(false);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content animate-scale-in" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display font-bold text-xl text-foreground">{title}</h2>
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-secondary transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* AI Tip - Dynamic based on recipient */}
        <div className="p-3 rounded-lg bg-gradient-to-r from-primary/5 to-accent/5 border border-primary/10 mb-4">
          <div className="flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-primary">AI Tip</p>
              {loadingTip ? (
                <div className="flex items-center gap-2 mt-1">
                  <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Analyzing compatibility...</span>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {aiTip || 'Mention specific skills that match their needs and past hackathon experience.'}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Message Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-foreground mb-2">
            Your Message (optional)
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={placeholder}
            className="input-field min-h-[150px] resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <button onClick={onClose} className="btn-secondary" disabled={sending}>
            Cancel
          </button>
          <button 
            onClick={handleSend}
            disabled={sending}
            className="btn-primary flex items-center gap-2"
          >
            {sending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send {type === 'pitch' ? 'Pitch' : 'Invite'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PitchModal;
