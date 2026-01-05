import { X, Send, Sparkles, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Team, UserProfile } from '@/services/firestore';

interface JoinTeamModalProps {
  team: Team;
  userProfile: UserProfile | null;
  onClose: () => void;
  onSend: (message: string) => void;
}

const JoinTeamModal = ({ team, userProfile, onClose, onSend }: JoinTeamModalProps) => {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [aiTip, setAiTip] = useState<string>('');

  useEffect(() => {
    generateAiTip();
  }, [team, userProfile]);

  const generateAiTip = () => {
    if (!userProfile) {
      setAiTip('Complete your profile to get personalized recommendations!');
      return;
    }

    const userRole = userProfile.primaryRole || '';
    const userSkills = userProfile.skills?.map(s => s.name) || [];
    const rolesNeeded = team.rolesNeeded || [];
    
    // Check for role match
    const roleMatches = rolesNeeded.some(role => 
      role.toLowerCase().includes(userRole.toLowerCase()) ||
      userRole.toLowerCase().includes(role.toLowerCase())
    );

    let tip = '';
    
    if (roleMatches) {
      tip = `🎯 Great match! This team is looking for a ${rolesNeeded.find(r => 
        r.toLowerCase().includes(userRole.toLowerCase()) || 
        userRole.toLowerCase().includes(r.toLowerCase())
      )}, and you're a ${userRole}!`;
    } else if (rolesNeeded.length > 0) {
      tip = `This team needs: ${rolesNeeded.join(', ')}. As a ${userRole}, highlight how your skills can complement their team.`;
    } else {
      tip = `You're a ${userRole} with skills in ${userSkills.slice(0, 3).join(', ') || 'various areas'}. Share how you can contribute to "${team.name}".`;
    }

    // Add skill-based suggestions
    if (userSkills.length > 0) {
      const hasDesign = userSkills.some(s => 
        s.toLowerCase().includes('figma') || s.toLowerCase().includes('design')
      );
      const hasBackend = userSkills.some(s => 
        s.toLowerCase().includes('node') || s.toLowerCase().includes('python')
      );
      const hasFrontend = userSkills.some(s => 
        s.toLowerCase().includes('react') || s.toLowerCase().includes('vue')
      );

      if (hasDesign) {
        tip += ' Mention your design expertise and portfolio.';
      } else if (hasBackend) {
        tip += ' Highlight your backend and API development experience.';
      } else if (hasFrontend) {
        tip += ' Showcase your frontend development skills.';
      }
    }

    setAiTip(tip);
  };

  const handleSend = async () => {
    setSending(true);
    await onSend(message);
    setSending(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content animate-scale-in" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display font-bold text-xl text-foreground">Request to Join</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Send a join request to <span className="text-primary">{team.name}</span>
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-secondary transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Team Info */}
        <div className="p-3 rounded-lg bg-secondary/30 border border-border mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-foreground">{team.name}</span>
            <span className="text-xs text-muted-foreground">
              {team.members.length}/{team.maxMembers} members
            </span>
          </div>
          {team.rolesNeeded && team.rolesNeeded.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {team.rolesNeeded.map((role, idx) => (
                <span key={idx} className="px-2 py-0.5 rounded-full text-xs bg-accent/10 text-accent">
                  {role}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* AI Tip */}
        <div className="p-3 rounded-lg bg-gradient-to-r from-primary/5 to-accent/5 border border-primary/10 mb-4">
          <div className="flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-primary">AI Tip</p>
              <p className="text-xs text-muted-foreground mt-0.5">{aiTip}</p>
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
            placeholder="Tell the team leader why you'd be a great fit for their team..."
            className="input-field min-h-[120px] resize-none"
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
                Send Request
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default JoinTeamModal;
