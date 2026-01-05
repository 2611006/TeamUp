import { useState, useEffect } from 'react';
import { Bell, Check, X, Clock, Send, Loader2, Eye, CheckCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  subscribeToInvitations,
  subscribeToNotifications,
  respondToInvitation,
  getProfile,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  Invitation,
  Notification as NotificationType
} from '@/services/firestore';
import { isFirebaseConfigured } from '@/lib/firebase';
import { Timestamp } from 'firebase/firestore';
import { toast } from 'sonner';

const Notifications = () => {
  const { user } = useAuth();
  const [incoming, setIncoming] = useState<Invitation[]>([]);
  const [outgoing, setOutgoing] = useState<Invitation[]>([]);
  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'invitations' | 'all'>('invitations');

  useEffect(() => {
    if (!isFirebaseConfigured() || !user) {
      setLoading(false);
      return;
    }

    // Subscribe to invitations in real-time
    const unsubInvitations = subscribeToInvitations(user.uid, (inc, out) => {
      setIncoming(inc);
      setOutgoing(out);
      setLoading(false);
    });

    // Subscribe to all notifications in real-time
    const unsubNotifications = subscribeToNotifications(user.uid, (notifs) => {
      setNotifications(notifs);
    });

    return () => {
      unsubInvitations();
      unsubNotifications();
    };
  }, [user]);

  const handleRespond = async (invitation: Invitation, accept: boolean) => {
    if (!user) return;
    setProcessingId(invitation.id);
    
    try {
      // Check if the person JOINING is already in a team before accepting
      if (accept) {
        // For join_request: the person wanting to join is fromUserId (the requester)
        // For invite: the person wanting to join is toUserId (the current user receiving the invite)
        const joiningUserId = invitation.type === 'join_request' ? invitation.fromUserId : user.uid;
        const profile = await getProfile(joiningUserId);
        
        if (profile?.teamId) {
          const errorMessage = invitation.type === 'join_request' 
            ? `${invitation.fromUserName} is already in a team and cannot join yours.`
            : 'You are already in a team. Leave your current team before joining another.';
          toast.error(errorMessage);
          setProcessingId(null);
          return;
        }
      }

      await respondToInvitation(
        invitation.id,
        accept ? 'accepted' : 'rejected',
        accept ? invitation.teamId : undefined,
        accept ? user.uid : undefined,
        accept ? 'Member' : undefined
      );

      toast.success(accept ? `Joined ${invitation.teamName}!` : 'Invitation declined');
    } catch (error: any) {
      console.error('Error responding to invitation:', error);
      toast.error(error.message || 'Failed to respond to invitation');
    }
    
    setProcessingId(null);
  };

  const handleMarkAsRead = async (notificationId: string) => {
    await markNotificationAsRead(notificationId);
  };

  const handleMarkAllAsRead = async () => {
    if (!user) return;
    await markAllNotificationsAsRead(user.uid);
    toast.success('All notifications marked as read');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-accent/10 text-accent';
      case 'accepted':
        return 'bg-skill-mobile/10 text-skill-mobile';
      case 'rejected':
        return 'bg-destructive/10 text-destructive';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'accepted':
        return 'Accepted';
      case 'rejected':
        return 'Rejected';
      default:
        return status;
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'INVITE':
        return <Send className="w-4 h-4 text-primary" />;
      case 'ACCEPTED':
        return <Check className="w-4 h-4 text-skill-mobile" />;
      case 'REJECTED':
        return <X className="w-4 h-4 text-destructive" />;
      default:
        return <Bell className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const formatTimestamp = (timestamp: Timestamp | null): string => {
    if (!timestamp) return 'Just now';
    const date = timestamp.toDate();
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const unreadCount = notifications.filter(n => !n.read).length;

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
            <div className="p-2 rounded-xl bg-primary/10 relative">
              <Bell className="w-6 h-6 text-primary" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-accent text-accent-foreground text-xs font-bold rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </div>
            <div>
              <h1 className="font-display font-bold text-2xl text-foreground">Notifications</h1>
              <p className="text-muted-foreground">Team invitations and updates</p>
            </div>
          </div>
          
          {unreadCount > 0 && (
            <button 
              onClick={handleMarkAllAsRead}
              className="btn-secondary text-sm flex items-center gap-1.5"
            >
              <CheckCheck className="w-4 h-4" />
              Mark all read
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setActiveTab('invitations')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'invitations' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            Incoming ({incoming.length})
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'all' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            Sent ({outgoing.length})
          </button>
        </div>
      </div>

      {activeTab === 'invitations' && (
        <div className="card-base p-6">
          <h2 className="section-title mb-4 flex items-center gap-2">
            <Check className="w-4 h-4" />
            Incoming Invitations ({incoming.length})
          </h2>
          
          {incoming.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No pending invitations</p>
          ) : (
            <div className="space-y-3">
              {incoming.map((inv) => (
                <div key={inv.id} className="p-4 rounded-lg bg-secondary/30 border border-border">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="font-medium text-foreground">
                        <span className="text-primary">{inv.fromUserName}</span> invited you to join{' '}
                        <span className="text-primary">{inv.teamName}</span>
                      </p>
                      {inv.message && (
                        <p className="text-sm text-muted-foreground mt-1">"{inv.message}"</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        {formatTimestamp(inv.createdAt)}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRespond(inv, true)}
                        disabled={processingId === inv.id}
                        className="btn-primary text-sm flex items-center gap-1.5"
                      >
                        {processingId === inv.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                        Accept
                      </button>
                      <button
                        onClick={() => handleRespond(inv, false)}
                        disabled={processingId === inv.id}
                        className="btn-secondary text-sm flex items-center gap-1.5"
                      >
                        <X className="w-4 h-4" />
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'all' && (
        <div className="card-base p-6">
          <h2 className="section-title mb-4 flex items-center gap-2">
            <Send className="w-4 h-4" />
            Sent Invitations ({outgoing.length})
          </h2>
          
          {outgoing.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No sent invitations</p>
          ) : (
            <div className="space-y-3">
              {outgoing.map((inv) => (
                <div key={inv.id} className="p-4 rounded-lg bg-secondary/30 border border-border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">
                        Invited <span className="text-primary">{inv.toUserName}</span> to join{' '}
                        <span className="text-primary">{inv.teamName}</span>
                      </p>
                      {inv.message && (
                        <p className="text-sm text-muted-foreground mt-1">"{inv.message}"</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTimestamp(inv.createdAt)}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(inv.status)}`}>
                      {getStatusLabel(inv.status)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Notifications;
