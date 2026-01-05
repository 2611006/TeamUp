import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  query, 
  where, 
  orderBy,
  addDoc,
  serverTimestamp,
  onSnapshot,
  Unsubscribe,
  limit
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '@/lib/firebase';
import type { 
  UserProfile, 
  Team, 
  TeamMember, 
  Invitation, 
  WorkspaceLog,
  Notification,
  FeedPost
} from '@/types/firestore.types';

// Re-export types for convenience
export type { UserProfile, Team, TeamMember, Invitation, WorkspaceLog, Notification, FeedPost };

// ========================
// PROFILE FUNCTIONS
// ========================

export const getProfile = async (userId: string): Promise<UserProfile | null> => {
  if (!isFirebaseConfigured()) return null;
  const docRef = doc(db, 'profiles', userId);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as UserProfile : null;
};

export const createProfile = async (userId: string, data: Partial<UserProfile>): Promise<void> => {
  if (!isFirebaseConfigured()) return;
  await setDoc(doc(db, 'profiles', userId), {
    ...data,
    teamId: null,
    isTeamLeader: false,
    createdAt: serverTimestamp()
  });
};

export const updateProfile = async (userId: string, data: Partial<UserProfile>): Promise<void> => {
  if (!isFirebaseConfigured()) return;
  await updateDoc(doc(db, 'profiles', userId), data);
};

// ========================
// DISCOVER PEOPLE FUNCTIONS
// ========================

// Get ALL users (except current user) - for Discover People page
export const getAllUsers = async (excludeUserId?: string): Promise<UserProfile[]> => {
  if (!isFirebaseConfigured()) return [];
  const q = query(collection(db, 'profiles'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() } as UserProfile))
    .filter(user => user.id !== excludeUserId);
};

// Subscribe to all users in real-time
export const subscribeToAllUsers = (
  excludeUserId: string,
  onUpdate: (users: UserProfile[]) => void
): Unsubscribe => {
  if (!isFirebaseConfigured()) return () => {};
  
  const q = query(collection(db, 'profiles'), orderBy('createdAt', 'desc'));
  
  return onSnapshot(q, (snapshot) => {
    const users = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as UserProfile))
      .filter(user => user.id !== excludeUserId);
    onUpdate(users);
  });
};

// Get available users only (for backward compatibility)
export const getAvailableUsers = async (excludeUserId?: string): Promise<UserProfile[]> => {
  if (!isFirebaseConfigured()) return [];
  const q = query(collection(db, 'profiles'), where('teamId', '==', null));
  const snapshot = await getDocs(q);
  return snapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() } as UserProfile))
    .filter(user => user.id !== excludeUserId);
};

export const getAvailableUsersByRole = async (role: string, excludeUserId?: string): Promise<UserProfile[]> => {
  if (!isFirebaseConfigured()) return [];
  const q = query(
    collection(db, 'profiles'), 
    where('teamId', '==', null),
    where('primaryRole', '==', role)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() } as UserProfile))
    .filter(user => user.id !== excludeUserId);
};

export const getAvailableRoles = async (): Promise<string[]> => {
  if (!isFirebaseConfigured()) return [];
  const snapshot = await getDocs(collection(db, 'profiles'));
  const roles = new Set<string>();
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    if (data.primaryRole) roles.add(data.primaryRole);
  });
  return Array.from(roles);
};

// ========================
// TEAM FUNCTIONS
// ========================

export const createTeam = async (data: Omit<Team, 'id' | 'createdAt' | 'members'>): Promise<string> => {
  if (!isFirebaseConfigured()) return '';
  
  const leaderProfile = await getProfile(data.leaderId);
  const leaderName = leaderProfile?.fullName || 'User';
  
  const docRef = await addDoc(collection(db, 'teams'), {
    ...data,
    leaderName,
    members: [{ userId: data.leaderId, role: 'Team Leader', userName: leaderName }],
    createdAt: serverTimestamp()
  });
  
  // Update user's teamId and isTeamLeader
  await updateProfile(data.leaderId, { teamId: docRef.id, isTeamLeader: true });
  
  // Create feed post for team creation
  await createFeedPost({
    authorId: data.leaderId,
    authorName: leaderName,
    authorAvatar: leaderProfile?.avatar,
    authorRole: leaderProfile?.primaryRole,
    type: 'team_created',
    title: `🚀 Created team: ${data.name}`,
    description: data.description,
    teamId: docRef.id,
    teamName: data.name,
    rolesNeeded: data.rolesNeeded
  });
  
  return docRef.id;
};

export const getTeam = async (teamId: string): Promise<Team | null> => {
  if (!isFirebaseConfigured()) return null;
  const docSnap = await getDoc(doc(db, 'teams', teamId));
  return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as Team : null;
};

export const getUserTeams = async (userId: string): Promise<Team[]> => {
  if (!isFirebaseConfigured()) return [];
  
  // Get user's profile to check teamId
  const profile = await getProfile(userId);
  if (!profile?.teamId) return [];
  
  const team = await getTeam(profile.teamId);
  return team ? [team] : [];
};

// Subscribe to user's teams in real-time
export const subscribeToUserTeams = (
  userId: string,
  onUpdate: (teams: Team[]) => void
): Unsubscribe => {
  if (!isFirebaseConfigured()) return () => {};
  
  // First get user's teamId, then subscribe to that team
  const profileRef = doc(db, 'profiles', userId);
  
  return onSnapshot(profileRef, async (profileSnap) => {
    const profile = profileSnap.exists() ? profileSnap.data() as UserProfile : null;
    if (!profile?.teamId) {
      onUpdate([]);
      return;
    }
    
    const team = await getTeam(profile.teamId);
    onUpdate(team ? [team] : []);
  });
};

export const updateTeam = async (teamId: string, data: Partial<Team>): Promise<void> => {
  if (!isFirebaseConfigured()) return;
  await updateDoc(doc(db, 'teams', teamId), data);
};

// ========================
// TEAM MEMBER FUNCTIONS
// ========================

export const addTeamMember = async (teamId: string, userId: string, role: string): Promise<void> => {
  if (!isFirebaseConfigured()) return;
  
  // Check if user is already in a team
  const profile = await getProfile(userId);
  if (profile?.teamId) {
    throw new Error('User is already in a team');
  }
  
  // Get current team
  const team = await getTeam(teamId);
  if (!team) throw new Error('Team not found');
  
  // Check if team is full
  if (team.members.length >= team.maxMembers) {
    throw new Error('Team is full');
  }
  
  const userName = profile?.fullName || 'User';
  
  // Add member to team's members array
  const updatedMembers = [...(team.members || []), { userId, role, userName }];
  await updateTeam(teamId, { members: updatedMembers });
  
  // Update user's teamId
  await updateProfile(userId, { teamId, isTeamLeader: false });
  
  // Create feed post
  await createFeedPost({
    authorId: userId,
    authorName: userName,
    authorAvatar: profile?.avatar,
    authorRole: profile?.primaryRole,
    type: 'member_joined',
    title: `🎉 Joined team: ${team.name}`,
    description: `${userName} joined as ${role}`,
    teamId,
    teamName: team.name
  });
  
  // Also add to teamMembers collection for backward compatibility
  await addDoc(collection(db, 'teamMembers'), {
    teamId,
    userId,
    role,
    joinedAt: serverTimestamp()
  });
};

export const getTeamMembers = async (teamId: string): Promise<(TeamMember & { profile: UserProfile | null })[]> => {
  if (!isFirebaseConfigured()) return [];
  
  // Get team and its members array
  const team = await getTeam(teamId);
  if (!team) return [];
  
  // Fetch profiles for each member
  const members = await Promise.all(
    (team.members || []).map(async (member, index) => {
      const profile = await getProfile(member.userId);
      return {
        id: `${teamId}-${member.userId}`,
        teamId,
        userId: member.userId,
        role: member.role,
        joinedAt: team.createdAt,
        profile
      } as TeamMember & { profile: UserProfile | null };
    })
  );
  
  return members;
};

// Subscribe to team members in real-time
export const subscribeToTeamMembers = (
  teamId: string,
  onUpdate: (members: (TeamMember & { profile: UserProfile | null })[]) => void
): Unsubscribe => {
  if (!isFirebaseConfigured()) return () => {};
  
  const teamRef = doc(db, 'teams', teamId);
  
  return onSnapshot(teamRef, async (teamSnap) => {
    if (!teamSnap.exists()) {
      onUpdate([]);
      return;
    }
    
    const team = { id: teamSnap.id, ...teamSnap.data() } as Team;
    
    const members = await Promise.all(
      (team.members || []).map(async (member) => {
        const profile = await getProfile(member.userId);
        return {
          id: `${teamId}-${member.userId}`,
          teamId,
          userId: member.userId,
          role: member.role,
          joinedAt: team.createdAt,
          profile
        } as TeamMember & { profile: UserProfile | null };
      })
    );
    
    onUpdate(members);
  });
};

export const removeTeamMember = async (teamId: string, userId: string): Promise<void> => {
  if (!isFirebaseConfigured()) return;
  
  const team = await getTeam(teamId);
  if (!team) return;
  
  const updatedMembers = (team.members || []).filter(m => m.userId !== userId);
  await updateTeam(teamId, { members: updatedMembers });
  await updateProfile(userId, { teamId: null, isTeamLeader: false });
  
  // Also remove from teamMembers collection
  const q = query(
    collection(db, 'teamMembers'),
    where('teamId', '==', teamId),
    where('userId', '==', userId)
  );
  const snapshot = await getDocs(q);
  for (const doc of snapshot.docs) {
    await deleteDoc(doc.ref);
  }
};

// Terminate team (leader only)
export const terminateTeam = async (teamId: string, leaderId: string): Promise<void> => {
  if (!isFirebaseConfigured()) return;
  
  const team = await getTeam(teamId);
  if (!team) throw new Error('Team not found');
  if (team.leaderId !== leaderId) throw new Error('Only team leader can terminate the team');
  
  // FIX: Added (team.members || []) to prevent "not iterable" error
  const members = team.members || [];
  
  // Update all members' profiles to remove team association
  for (const member of members) {
    if (member.userId) {
      await updateProfile(member.userId, { teamId: null, isTeamLeader: false });
    }
  }
  
  // Delete team members from collection
  const membersQuery = query(collection(db, 'teamMembers'), where('teamId', '==', teamId));
  const membersSnapshot = await getDocs(membersQuery);
  for (const docSnap of membersSnapshot.docs) {
    await deleteDoc(docSnap.ref);
  }
  
  // Delete related invitations
  const invitationsQuery = query(collection(db, 'invitations'), where('teamId', '==', teamId));
  const invitationsSnapshot = await getDocs(invitationsQuery);
  for (const docSnap of invitationsSnapshot.docs) {
    await deleteDoc(docSnap.ref);
  }
  
  // Delete the team document
  await deleteDoc(doc(db, 'teams', teamId));
};

// Subscribe to teams with open slots (for Discover Teams page)
// Subscribe to teams with open slots (for Discover Teams page)
export const subscribeToAvailableTeams = (
  onUpdate: (teams: Team[]) => void
): Unsubscribe => {
  if (!isFirebaseConfigured()) return () => {};
  
  const q = query(
    collection(db, 'teams'),
    where('status', '==', 'forming'),
    orderBy('createdAt', 'desc')
  );
  
  return onSnapshot(q, (snapshot) => {
    const teams = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as Team))
      // FIX: Added a check (team.members || []) to prevent the .length error
      .filter(team => (team.members || []).length < team.maxMembers);
    onUpdate(teams);
  }, (error) => {
    console.error('Available teams subscription error:', error);
    onUpdate([]);
  });
};

// ========================
// INVITATION FUNCTIONS
// ========================

export const sendInvitation = async (data: Omit<Invitation, 'id' | 'status' | 'createdAt'>): Promise<void> => {
  if (!isFirebaseConfigured()) return;
  
  const isJoinRequest = data.type === 'join_request';
  
  // For invites, check if target user is already in a team
  if (!isJoinRequest) {
    const targetProfile = await getProfile(data.toUserId);
    if (targetProfile?.teamId) {
      throw new Error('User is already in a team');
    }
  }
  
  // For join requests, check if sender is already in a team
  if (isJoinRequest) {
    const senderProfile = await getProfile(data.fromUserId);
    if (senderProfile?.teamId) {
      throw new Error('You are already in a team');
    }
  }
  
  // Check for existing pending invitation/request
  const existingQuery = query(
    collection(db, 'invitations'),
    where('fromUserId', '==', data.fromUserId),
    where('teamId', '==', data.teamId),
    where('status', '==', 'pending')
  );
  const existingSnap = await getDocs(existingQuery);
  if (!existingSnap.empty) {
    throw new Error(isJoinRequest ? 'Join request already sent' : 'Invitation already sent');
  }
  
  // Create invitation/join request
  await addDoc(collection(db, 'invitations'), {
    ...data,
    status: 'pending',
    createdAt: serverTimestamp()
  });
  
  // Create notification
  const notifyUserId = isJoinRequest ? data.toUserId : data.toUserId;
  await createNotification({
    toUserId: notifyUserId,
    fromUserId: data.fromUserId,
    fromUserName: data.fromUserName,
    type: isJoinRequest ? 'JOIN_REQUEST' : 'INVITE',
    teamId: data.teamId,
    teamName: data.teamName,
    message: data.message
  });
};

export const getIncomingInvitations = async (userId: string): Promise<Invitation[]> => {
  if (!isFirebaseConfigured()) return [];
  const q = query(
    collection(db, 'invitations'),
    where('toUserId', '==', userId),
    where('status', '==', 'pending')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Invitation));
};

export const getOutgoingInvitations = async (userId: string): Promise<Invitation[]> => {
  if (!isFirebaseConfigured()) return [];
  const q = query(
    collection(db, 'invitations'),
    where('fromUserId', '==', userId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Invitation));
};

export const respondToInvitation = async (
  invitationId: string, 
  status: 'accepted' | 'rejected',
  teamId?: string,
  userId?: string,
  role?: string
): Promise<void> => {
  if (!isFirebaseConfigured()) return;
  
  // Get invitation details
  const invRef = doc(db, 'invitations', invitationId);
  const invSnap = await getDoc(invRef);
  const invitation = invSnap.exists() ? { id: invSnap.id, ...invSnap.data() } as Invitation : null;
  
  if (!invitation) {
    throw new Error('Invitation not found');
  }
  
  const isJoinRequest = invitation.type === 'join_request';
  
  // Determine who is joining
  const joiningUserId = isJoinRequest ? invitation.fromUserId : invitation.toUserId;
  const joiningUserName = isJoinRequest ? invitation.fromUserName : invitation.toUserName;
  
  // If accepting, verify the joining user is not already in a team
  if (status === 'accepted') {
    const profile = await getProfile(joiningUserId);
    if (profile?.teamId) {
      throw new Error('User is already in a team');
    }
    
    // Check if team still has room
    const team = await getTeam(invitation.teamId);
    if (!team) {
      throw new Error('Team no longer exists');
    }
    if (team.members.length >= team.maxMembers) {
      throw new Error('Team is full');
    }
  }
  
  await updateDoc(invRef, { status });
  
  if (status === 'accepted') {
    const joiningProfile = await getProfile(joiningUserId);
    const joiningRole = joiningProfile?.primaryRole || role || 'Member';
    
    await addTeamMember(invitation.teamId, joiningUserId, joiningRole);
    
    // Notify the appropriate party
    const notifyUserId = isJoinRequest ? invitation.fromUserId : invitation.fromUserId;
    const responderProfile = await getProfile(isJoinRequest ? invitation.toUserId : invitation.toUserId);
    
    await createNotification({
      toUserId: notifyUserId,
      fromUserId: isJoinRequest ? invitation.toUserId : invitation.toUserId,
      fromUserName: responderProfile?.fullName || 'User',
      type: 'ACCEPTED',
      teamId: invitation.teamId,
      teamName: invitation.teamName,
      message: isJoinRequest 
        ? `Your request to join ${invitation.teamName} was accepted!`
        : `${joiningUserName} accepted your invitation to join ${invitation.teamName}`
    });
  } else if (status === 'rejected') {
    const notifyUserId = isJoinRequest ? invitation.fromUserId : invitation.fromUserId;
    const responderProfile = await getProfile(isJoinRequest ? invitation.toUserId : invitation.toUserId);
    
    await createNotification({
      toUserId: notifyUserId,
      fromUserId: isJoinRequest ? invitation.toUserId : invitation.toUserId,
      fromUserName: responderProfile?.fullName || 'User',
      type: 'REJECTED',
      teamId: invitation.teamId,
      teamName: invitation.teamName,
      message: isJoinRequest 
        ? `Your request to join ${invitation.teamName} was declined`
        : `${invitation.toUserName} declined your invitation to join ${invitation.teamName}`
    });
  }
};

// Subscribe to join requests for a team leader
export const subscribeToJoinRequests = (
  teamId: string,
  onUpdate: (requests: Invitation[]) => void
): Unsubscribe => {
  if (!isFirebaseConfigured()) return () => {};
  
  const q = query(
    collection(db, 'invitations'),
    where('teamId', '==', teamId),
    where('type', '==', 'join_request'),
    where('status', '==', 'pending')
  );
  
  return onSnapshot(q, (snapshot) => {
    const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Invitation));
    onUpdate(requests);
  }, (error) => {
    console.error('Join requests subscription error:', error);
    onUpdate([]);
  });
};

// Subscribe to invitations in real-time
export const subscribeToInvitations = (
  userId: string,
  onUpdate: (incoming: Invitation[], outgoing: Invitation[]) => void
): Unsubscribe => {
  if (!isFirebaseConfigured()) return () => {};
  
  const incomingQuery = query(
    collection(db, 'invitations'),
    where('toUserId', '==', userId),
    where('status', '==', 'pending')
  );
  
  const outgoingQuery = query(
    collection(db, 'invitations'),
    where('fromUserId', '==', userId)
  );
  
  let incoming: Invitation[] = [];
  let outgoing: Invitation[] = [];
  
  const unsubIncoming = onSnapshot(incomingQuery, (snapshot) => {
    incoming = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Invitation));
    onUpdate(incoming, outgoing);
  });
  
  const unsubOutgoing = onSnapshot(outgoingQuery, (snapshot) => {
    outgoing = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Invitation));
    onUpdate(incoming, outgoing);
  });
  
  return () => {
    unsubIncoming();
    unsubOutgoing();
  };
};

// ========================
// NOTIFICATION FUNCTIONS
// ========================

export const createNotification = async (data: Omit<Notification, 'id' | 'read' | 'createdAt'>): Promise<void> => {
  if (!isFirebaseConfigured()) return;
  await addDoc(collection(db, 'notifications'), {
    ...data,
    read: false,
    createdAt: serverTimestamp()
  });
};

export const getNotifications = async (userId: string): Promise<Notification[]> => {
  if (!isFirebaseConfigured()) return [];
  const q = query(
    collection(db, 'notifications'),
    where('toUserId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(50)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
};

export const subscribeToNotifications = (
  userId: string,
  onUpdate: (notifications: Notification[]) => void
): Unsubscribe => {
  if (!isFirebaseConfigured()) return () => {};
  
  const q = query(
    collection(db, 'notifications'),
    where('toUserId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(50)
  );
  
  return onSnapshot(q, (snapshot) => {
    const notifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
    onUpdate(notifications);
  });
};

export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  if (!isFirebaseConfigured()) return;
  await updateDoc(doc(db, 'notifications', notificationId), { read: true });
};

export const markAllNotificationsAsRead = async (userId: string): Promise<void> => {
  if (!isFirebaseConfigured()) return;
  const q = query(
    collection(db, 'notifications'),
    where('toUserId', '==', userId),
    where('read', '==', false)
  );
  const snapshot = await getDocs(q);
  await Promise.all(snapshot.docs.map(d => updateDoc(d.ref, { read: true })));
};

export const getUnreadNotificationCount = async (userId: string): Promise<number> => {
  if (!isFirebaseConfigured()) return 0;
  const q = query(
    collection(db, 'notifications'),
    where('toUserId', '==', userId),
    where('read', '==', false)
  );
  const snapshot = await getDocs(q);
  return snapshot.size;
};

// ========================
// FEED POST FUNCTIONS
// ========================

export const createFeedPost = async (data: Omit<FeedPost, 'id' | 'createdAt'>): Promise<string> => {
  if (!isFirebaseConfigured()) return '';
  const docRef = await addDoc(collection(db, 'posts'), {
    ...data,
    createdAt: serverTimestamp()
  });
  return docRef.id;
};

export const createUserPost = async (
  userId: string,
  data: { title: string; description: string; tags?: string[] }
): Promise<string> => {
  if (!isFirebaseConfigured()) return '';
  
  const profile = await getProfile(userId);
  
  const docRef = await addDoc(collection(db, 'posts'), {
    authorId: userId,
    authorName: profile?.fullName || 'User',
    authorAvatar: profile?.avatar,
    authorRole: profile?.primaryRole,
    type: 'user_post',
    title: data.title,
    description: data.description,
    tags: data.tags || [],
    createdAt: serverTimestamp()
  });
  
  return docRef.id;
};

export const updatePost = async (
  postId: string,
  data: { title: string; description: string; tags?: string[] }
): Promise<void> => {
  if (!isFirebaseConfigured()) return;
  await updateDoc(doc(db, 'posts', postId), {
    title: data.title,
    description: data.description,
    tags: data.tags || []
  });
};

export const deletePost = async (postId: string): Promise<void> => {
  if (!isFirebaseConfigured()) return;
  await deleteDoc(doc(db, 'posts', postId));
};

export const getUserPosts = async (userId: string): Promise<FeedPost[]> => {
  if (!isFirebaseConfigured()) return [];
  const q = query(
    collection(db, 'posts'),
    where('authorId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FeedPost));
};

export const subscribeToUserPosts = (
  userId: string,
  onUpdate: (posts: FeedPost[]) => void
): Unsubscribe => {
  if (!isFirebaseConfigured()) return () => {};
  
  const q = query(
    collection(db, 'posts'),
    where('authorId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  
  return onSnapshot(q, (snapshot) => {
    const posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FeedPost));
    onUpdate(posts);
  });
};

export const getFeedPosts = async (): Promise<FeedPost[]> => {
  if (!isFirebaseConfigured()) return [];
  const q = query(
    collection(db, 'posts'),
    orderBy('createdAt', 'desc'),
    limit(50)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FeedPost));
};

export const subscribeToFeedPosts = (
  onUpdate: (posts: FeedPost[]) => void
): Unsubscribe => {
  if (!isFirebaseConfigured()) return () => {};
  
  const q = query(
    collection(db, 'posts'),
    orderBy('createdAt', 'desc'),
    limit(50)
  );
  
  return onSnapshot(q, (snapshot) => {
    const posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FeedPost));
    onUpdate(posts);
  }, (error) => {
    console.error('Feed subscription error:', error);
    onUpdate([]);
  });
};

// ========================
// WORKSPACE LOG FUNCTIONS
// ========================

export const addWorkspaceLog = async (teamId: string, userId: string, userName: string, message: string): Promise<void> => {
  if (!isFirebaseConfigured()) return;
  await addDoc(collection(db, 'workspaceLogs'), {
    teamId,
    userId,
    userName,
    message,
    createdAt: serverTimestamp()
  });
};

export const getWorkspaceLogs = async (teamId: string): Promise<WorkspaceLog[]> => {
  if (!isFirebaseConfigured()) return [];
  const q = query(
    collection(db, 'workspaceLogs'),
    where('teamId', '==', teamId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WorkspaceLog));
};

export const subscribeToWorkspaceLogs = (
  teamId: string,
  onUpdate: (logs: WorkspaceLog[]) => void
): Unsubscribe => {
  if (!isFirebaseConfigured()) return () => {};
  
  const q = query(
    collection(db, 'workspaceLogs'),
    where('teamId', '==', teamId),
    orderBy('createdAt', 'desc')
  );
  
  return onSnapshot(q, (snapshot) => {
    const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WorkspaceLog));
    onUpdate(logs);
  });
};
