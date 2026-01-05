import { useState, useEffect } from 'react';
import { Rocket, Search, Target, PenSquare, Loader2, Users, MessageCircle, Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { subscribeToFeedPosts, createUserPost, FeedPost as FeedPostType } from '@/services/firestore';
import { isFirebaseConfigured } from '@/lib/firebase';
import { getSkillClass } from '@/data/mockData';
import { Timestamp } from 'firebase/firestore';
import CreatePostModal from '../CreatePostModal';
import { toast } from 'sonner';

interface HomeFeedProps {
  onNavigate: (page: string) => void;
  onViewProfile: (userId: string) => void;
}

const HomeFeed = ({ onNavigate, onViewProfile }: HomeFeedProps) => {
  const { user } = useAuth();
  const [filter, setFilter] = useState<'all' | 'team_created' | 'member_joined' | 'looking_for_team' | 'user_post'>('all');
  const [posts, setPosts] = useState<FeedPostType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setLoading(false);
      return;
    }

    const unsubscribe = subscribeToFeedPosts((fetchedPosts) => {
      setPosts(fetchedPosts);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleCreatePost = async (data: { title: string; description: string; tags: string[] }) => {
    if (!user) return;
    await createUserPost(user.uid, data);
    toast.success('Post created successfully!');
  };

  const filteredPosts = filter === 'all' 
    ? posts 
    : posts.filter((post) => post.type === filter);

  const filters = [
    { id: 'all', label: 'All Posts', icon: null },
    { id: 'team_created', label: 'New Teams', icon: Rocket },
    { id: 'member_joined', label: 'Member Updates', icon: Users },
    { id: 'looking_for_team', label: 'Looking for Team', icon: Search },
    { id: 'user_post', label: 'Community Posts', icon: MessageCircle },
  ];

  const formatTimestamp = (timestamp: Timestamp | null): string => {
    if (!timestamp) return 'Just now';
    const date = timestamp.toDate();
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    return `${diffDays} days ago`;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'team_created':
        return <Rocket className="w-4 h-4 text-primary" />;
      case 'member_joined':
        return <Users className="w-4 h-4 text-skill-mobile" />;
      case 'looking_for_team':
        return <Search className="w-4 h-4 text-accent" />;
      case 'open_to_join':
        return <Target className="w-4 h-4 text-skill-frontend" />;
      case 'user_post':
        return <MessageCircle className="w-4 h-4 text-primary" />;
      default:
        return <Rocket className="w-4 h-4 text-primary" />;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'team_created':
        return 'bg-primary/10 text-primary';
      case 'member_joined':
        return 'bg-skill-mobile/10 text-skill-mobile';
      case 'looking_for_team':
        return 'bg-accent/10 text-accent';
      case 'open_to_join':
        return 'bg-skill-frontend/10 text-skill-frontend';
      case 'user_post':
        return 'bg-primary/10 text-primary';
      default:
        return 'bg-primary/10 text-primary';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'team_created':
        return 'New Team';
      case 'member_joined':
        return 'Member Joined';
      case 'looking_for_team':
        return 'Looking for Team';
      case 'open_to_join':
        return 'Open to Join';
      case 'user_post':
        return 'Post';
      default:
        return type;
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
    <div className="space-y-4">
      {/* Create Post CTA */}
      <div className="card-base p-4">
        <div className="flex gap-3">
          <button 
            onClick={() => setShowCreateModal(true)}
            className="flex-1 flex items-center gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors text-left"
          >
            <div className="p-2 rounded-full bg-primary/10">
              <PenSquare className="w-5 h-5 text-primary" />
            </div>
            <span className="text-muted-foreground">Share something with the community...</span>
          </button>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Post
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card-base p-2 flex items-center gap-2 overflow-x-auto">
        {filters.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setFilter(id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              filter === id 
                ? 'bg-primary text-primary-foreground' 
                : 'text-muted-foreground hover:bg-secondary'
            }`}
          >
            {Icon && <Icon className="w-4 h-4" />}
            {label}
          </button>
        ))}
      </div>

      {/* Feed Posts */}
      <div className="space-y-4">
        {filteredPosts.map((post) => (
          <div key={post.id} className="card-base p-5">
            <div className="flex items-start gap-4">
              <img
                src={post.authorAvatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(post.authorName)}`}
                alt={post.authorName}
                className="avatar w-12 h-12 cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all"
                onClick={() => onViewProfile(post.authorId)}
              />
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span 
                    className="font-semibold text-foreground hover:text-primary cursor-pointer"
                    onClick={() => onViewProfile(post.authorId)}
                  >
                    {post.authorName}
                  </span>
                  {post.authorRole && (
                    <span className="text-sm text-muted-foreground">• {post.authorRole}</span>
                  )}
                </div>
                
                <div className="flex items-center gap-2 mb-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 ${getTypeBadge(post.type)}`}>
                    {getTypeIcon(post.type)}
                    {getTypeLabel(post.type)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatTimestamp(post.createdAt)}
                  </span>
                </div>
                
                <h3 className="font-semibold text-foreground mb-2">{post.title}</h3>
                <p className="text-muted-foreground mb-4">{post.description}</p>
                
                {/* Tags */}
                {post.tags && post.tags.length > 0 && (
                  <div className="mb-4">
                    <div className="flex flex-wrap gap-2">
                      {post.tags.map((tag, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded-full text-xs font-medium bg-secondary text-muted-foreground">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Roles Needed */}
                {post.rolesNeeded && post.rolesNeeded.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-muted-foreground mb-2">Looking for:</p>
                    <div className="flex flex-wrap gap-2">
                      {post.rolesNeeded.map((role, idx) => (
                        <span key={idx} className="px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                          {role}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Skills */}
                {post.skills && post.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {post.skills.map((skill, idx) => (
                      <span key={idx} className={`skill-tag ${getSkillClass(skill)}`}>
                        {skill}
                      </span>
                    ))}
                  </div>
                )}

                {/* Message Author Button */}
                <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                  <button 
                    onClick={() => onViewProfile(post.authorId)}
                    className="btn-secondary text-sm flex items-center gap-1.5"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Message Author
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredPosts.length === 0 && !loading && (
        <div className="card-base p-12 text-center">
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-display font-bold text-lg text-foreground mb-2">No posts available right now</h3>
          <p className="text-muted-foreground mb-4">Please try again later or be the first to create a post!</p>
          <button onClick={() => setShowCreateModal(true)} className="btn-primary">
            Create a Post
          </button>
        </div>
      )}

      {/* Create Post Modal */}
      {showCreateModal && (
        <CreatePostModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreatePost}
        />
      )}
    </div>
  );
};

export default HomeFeed;
