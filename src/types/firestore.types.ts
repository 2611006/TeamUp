import { Timestamp } from 'firebase/firestore';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  college?: string;
  yearOfStudy?: 'First Year' | 'Second Year' | 'Third Year' | 'Fourth Year';
  primaryRole: 'Frontend Developer' | 'Backend Developer' | 'UI/UX Designer' | 'Tester' | 'Full Stack Developer' | 'ML Engineer' | 'Mobile Developer' | 'DevOps Engineer' | 'Product Manager';
  skills: { name: string; proficiency: 'Beginner' | 'Intermediate' | 'Pro' }[];
  bio?: string;
  avatar?: string;
  teamId: string | null;
  isTeamLeader?: boolean;
  createdAt: Timestamp;
}

export interface Team {
  id: string;
  name: string;
  description: string;
  hackathon?: string;
  leaderId: string;
  leaderName?: string;
  members: { userId: string; role: string; userName?: string }[];
  maxMembers: number;
  status: 'forming' | 'active' | 'complete';
  rolesNeeded?: string[];
  createdAt: Timestamp;
}

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: string;
  joinedAt: Timestamp;
}

export interface Invitation {
  id: string;
  teamId: string;
  teamName: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  message?: string;
  type: 'invite' | 'join_request';
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Timestamp;
}

export interface Notification {
  id: string;
  toUserId: string;
  fromUserId: string;
  fromUserName?: string;
  type: 'INVITE' | 'ACCEPTED' | 'REJECTED' | 'TEAM_UPDATE' | 'JOIN_REQUEST';
  teamId?: string;
  teamName?: string;
  message?: string;
  read: boolean;
  createdAt: Timestamp;
}

export interface FeedPost {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  authorRole?: string;
  type: 'team_created' | 'member_joined' | 'looking_for_team' | 'open_to_join' | 'user_post';
  title: string;
  description: string;
  teamId?: string;
  teamName?: string;
  rolesNeeded?: string[];
  skills?: string[];
  tags?: string[];
  createdAt: Timestamp;
}

export interface WorkspaceLog {
  id: string;
  teamId: string;
  userId: string;
  userName: string;
  message: string;
  createdAt: Timestamp;
}
