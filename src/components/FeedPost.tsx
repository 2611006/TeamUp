import { Heart, MessageCircle, Rocket, Search, Target, Sparkles } from 'lucide-react';
import { FeedPost as FeedPostType, getSkillClass } from '../data/mockData.ts';

interface FeedPostProps {
  post: FeedPostType;
  onPitch: () => void;
  onInvite: () => void;
  onViewProfile: () => void;
}

const FeedPost = ({ post, onPitch, onInvite, onViewProfile }: FeedPostProps) => {
  const getTypeIcon = () => {
    switch (post.type) {
      case 'building':
        return <Rocket className="w-4 h-4" />;
      case 'looking':
        return <Search className="w-4 h-4" />;
      case 'open':
        return <Target className="w-4 h-4" />;
    }
  };

  const getTypeLabel = () => {
    switch (post.type) {
      case 'building':
        return 'Building a Team';
      case 'looking':
        return 'Looking for Teammates';
      case 'open':
        return 'Open to Join';
    }
  };

  const getTypeColor = () => {
    switch (post.type) {
      case 'building':
        return 'bg-primary/10 text-primary';
      case 'looking':
        return 'bg-accent/10 text-accent';
      case 'open':
        return 'bg-skill-mobile/10 text-skill-mobile';
    }
  };

  return (
    <article className="feed-post card-interactive animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <img
            src={post.user.avatar}
            alt={post.user.name}
            className="avatar w-12 h-12 cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all"
            onClick={onViewProfile}
          />
          <div>
            <div className="flex items-center gap-2">
              <h3 
                className="font-semibold text-foreground hover:text-primary cursor-pointer transition-colors"
                onClick={onViewProfile}
              >
                {post.user.name}
              </h3>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getTypeColor()}`}>
                {getTypeIcon()}
                {getTypeLabel()}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{post.user.role} • {post.timestamp}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mb-4">
        <h4 className="font-display font-bold text-lg text-foreground mb-2">{post.title}</h4>
        <p className="text-muted-foreground leading-relaxed">{post.description}</p>
      </div>

      {/* Skills or Roles */}
      <div className="mb-4">
        {post.rolesNeeded && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Looking for:</p>
            <div className="flex flex-wrap gap-2">
              {post.rolesNeeded.map((role: string) => (
                <span key={role} className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-sm font-medium">
                  {role}
                </span>
              ))}
            </div>
          </div>
        )}
        {post.skills && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Skills:</p>
            <div className="flex flex-wrap gap-2">
              {post.skills.map((skill: string) => (
                <span key={skill} className={`skill-tag ${getSkillClass(skill)}`}>
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* AI Match Indicator (placeholder) */}
      {Math.random() > 0.5 && (
        <div className="mb-4 p-3 rounded-lg bg-gradient-to-r from-primary/5 to-accent/5 border border-primary/10">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm text-primary font-medium">AI Match: Your skills align with this team's needs</span>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <div className="flex items-center gap-4">
          <button className="btn-ghost flex items-center gap-1.5">
            <Heart className="w-4 h-4" />
            <span>{post.likes}</span>
          </button>
          <button className="btn-ghost flex items-center gap-1.5">
            <MessageCircle className="w-4 h-4" />
            <span>{post.comments}</span>
          </button>
        </div>
        <div className="flex items-center gap-2">
          {post.type === 'building' && (
            <button onClick={onPitch} className="btn-primary text-sm">
              Pitch Yourself
            </button>
          )}
          {post.type === 'looking' && (
            <button onClick={onInvite} className="btn-primary text-sm">
              Invite to Team
            </button>
          )}
          {post.type === 'open' && (
            <button onClick={onInvite} className="btn-primary text-sm">
              Pitch Your Team
            </button>
          )}
          <button onClick={onViewProfile} className="btn-secondary text-sm">
            View Profile
          </button>
        </div>
      </div>
    </article>
  );
};

export default FeedPost;
