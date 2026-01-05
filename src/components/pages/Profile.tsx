import { useState, useEffect } from 'react';
import { MapPin, Calendar, Award, Quote, Sparkles, Shield, ExternalLink, Loader2, Edit, Trash2, PenSquare } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getProfile, subscribeToUserPosts, updatePost, deletePost, UserProfile, FeedPost } from '@/services/firestore';
import { isFirebaseConfigured } from '@/lib/firebase';
import { getSkillClass } from '@/data/mockData';
import { Timestamp } from 'firebase/firestore';
import EditPostModal from '../EditPostModal';
import { toast } from 'sonner';

interface ProfileProps {
  userId?: string;
  isOwnProfile?: boolean;
  userProfile?: UserProfile | null;
  onEditProfile?: () => void;
}

const Profile = ({ userId, isOwnProfile = true, userProfile: passedProfile, onEditProfile }: ProfileProps) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(passedProfile || null);
  const [loading, setLoading] = useState(!passedProfile);
  const [myPosts, setMyPosts] = useState<FeedPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [editingPost, setEditingPost] = useState<FeedPost | null>(null);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);

  const targetUserId = userId || user?.uid;

  useEffect(() => {
    if (passedProfile) {
      setProfile(passedProfile);
      setLoading(false);
      return;
    }

    const loadProfile = async () => {
      if (!isFirebaseConfigured()) {
        setLoading(false);
        return;
      }

      if (!targetUserId) {
        setLoading(false);
        return;
      }

      try {
        const fetchedProfile = await getProfile(targetUserId);
        setProfile(fetchedProfile);
      } catch (error) {
        console.error('Error loading profile:', error);
      }
      setLoading(false);
    };

    loadProfile();
  }, [userId, user, passedProfile, targetUserId]);

  // Subscribe to user's posts
  useEffect(() => {
    if (!isFirebaseConfigured() || !targetUserId) {
      setPostsLoading(false);
      return;
    }

    const unsubscribe = subscribeToUserPosts(targetUserId, (posts) => {
      setMyPosts(posts);
      setPostsLoading(false);
    });

    return () => unsubscribe();
  }, [targetUserId]);

  const handleEditPost = async (postId: string, data: { title: string; description: string; tags: string[] }) => {
    await updatePost(postId, data);
    toast.success('Post updated successfully!');
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return;
    }
    
    setDeletingPostId(postId);
    try {
      await deletePost(postId);
      toast.success('Post deleted successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete post');
    }
    setDeletingPostId(null);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="card-base p-12 text-center">
        <p className="text-muted-foreground">Profile not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="card-base overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-primary to-primary/70" />
        <div className="px-6 pb-6">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between -mt-12 gap-4">
            <div className="flex items-end gap-4">
              <img
                src={profile.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(profile.fullName || 'User')}`}
                alt={profile.fullName}
                className="avatar w-24 h-24 border-4 border-card"
              />
              <div className="mb-2">
                <div className="flex items-center gap-2">
                  <h1 className="font-display font-bold text-2xl text-foreground">{profile.fullName}</h1>
                  {profile.teamId && (
                    <div className="ai-badge">
                      <Shield className="w-3 h-3" />
                      <span>In a Team</span>
                    </div>
                  )}
                </div>
                <p className="text-muted-foreground">{profile.primaryRole}</p>
                {profile.college && (
                  <p className="text-sm text-muted-foreground">{profile.college} • {profile.yearOfStudy}</p>
                )}
              </div>
            </div>
            {isOwnProfile && onEditProfile && (
              <button onClick={onEditProfile} className="btn-secondary flex items-center gap-2">
                <Edit className="w-4 h-4" />
                Edit Profile
              </button>
            )}
            {!isOwnProfile && (
              <div className="flex items-center gap-2">
                <button className="btn-primary">Pitch Your Team</button>
                <button className="btn-secondary">Message</button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Bio */}
          {profile.bio && (
            <div className="card-base p-6">
              <h2 className="section-title mb-3">About</h2>
              <p className="text-muted-foreground leading-relaxed">{profile.bio}</p>
            </div>
          )}

          {/* Skills */}
          {profile.skills && profile.skills.length > 0 && (
            <div className="card-base p-6">
              <h2 className="section-title mb-4">Skills</h2>
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((skill, idx) => (
                  <span key={idx} className={`skill-tag text-sm ${getSkillClass(skill.name)}`}>
                    {skill.name}
                    <span className="ml-1 opacity-70">({skill.proficiency})</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* My Posts Section */}
          <div className="card-base p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="section-title flex items-center gap-2">
                <PenSquare className="w-4 h-4" />
                {isOwnProfile ? 'My Posts' : 'Posts'}
              </h2>
              <span className="text-sm text-muted-foreground">
                {myPosts.length} {myPosts.length === 1 ? 'post' : 'posts'}
              </span>
            </div>
            
            {postsLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : myPosts.length === 0 ? (
              <div className="text-center py-8">
                <PenSquare className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">
                  {isOwnProfile ? "You haven't created any posts yet" : "No posts yet"}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {myPosts.map((post) => (
                  <div key={post.id} className="p-4 rounded-lg bg-secondary/30 border border-border">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground mb-1">{post.title}</h3>
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{post.description}</p>
                        
                        {/* Tags */}
                        {post.tags && post.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {post.tags.map((tag, idx) => (
                              <span key={idx} className="px-2 py-0.5 rounded-full text-xs font-medium bg-secondary text-muted-foreground">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                        
                        <p className="text-xs text-muted-foreground">
                          {formatTimestamp(post.createdAt)}
                        </p>
                      </div>
                      
                      {/* Edit/Delete buttons - only for own posts */}
                      {isOwnProfile && user?.uid === post.authorId && (
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => setEditingPost(post)}
                            className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                            title="Edit post"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeletePost(post.id)}
                            disabled={deletingPostId === post.id}
                            className="p-2 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                            title="Delete post"
                          >
                            {deletingPostId === post.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quote */}
          <div className="card-base p-6 bg-gradient-to-br from-primary/5 to-accent/5">
            <div className="flex items-start gap-4">
              <Quote className="w-8 h-8 text-primary flex-shrink-0" />
              <div>
                <p className="text-lg text-foreground italic leading-relaxed">
                  "{profile.bio || 'Looking forward to building amazing projects together!'}"
                </p>
                <p className="mt-3 text-sm font-medium text-primary">
                  — {profile.fullName?.split(' ')[0]}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status */}
          <div className="card-base p-6">
            <h2 className="section-title mb-4">Status</h2>
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
              profile.teamId 
                ? 'bg-muted text-muted-foreground'
                : 'bg-skill-mobile/10 text-skill-mobile'
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                profile.teamId 
                  ? 'bg-muted-foreground'
                  : 'bg-skill-mobile'
              }`} />
              {profile.teamId ? 'Currently in a team' : 'Available for teams'}
            </div>
          </div>

          {/* Education */}
          {profile.college && (
            <div className="card-base p-6">
              <h2 className="section-title mb-4">Education</h2>
              <div className="space-y-2">
                <p className="font-medium text-foreground">{profile.college}</p>
                <p className="text-sm text-muted-foreground">{profile.yearOfStudy}</p>
              </div>
            </div>
          )}

          {/* AI Verification Placeholder */}
          <div className="card-base p-6">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-primary" />
              <h2 className="section-title text-sm">Skill Verification</h2>
            </div>
            <div className="p-3 rounded-lg bg-gradient-to-r from-primary/5 to-accent/5 border border-primary/10">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-primary">Coming soon:</span> AI-verified skills based on project history and peer reviews.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Post Modal */}
      {editingPost && (
        <EditPostModal
          post={editingPost}
          onClose={() => setEditingPost(null)}
          onSubmit={handleEditPost}
        />
      )}
    </div>
  );
};

export default Profile;
