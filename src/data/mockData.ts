export interface User {
  id: string;
  name: string;
  role: string;
  avatar: string;
  skills: string[];
  bio: string;
  availability: 'available' | 'busy' | 'open';
  hackathons: number;
  quote: string;
}

export interface FeedPost {
  id: string;
  type: 'building' | 'looking' | 'open';
  user: User;
  title: string;
  description: string;
  rolesNeeded?: string[];
  skills?: string[];
  timestamp: string;
  likes: number;
  comments: number;
}

export interface Team {
  id: string;
  name: string;
  description: string;
  members: User[];
  rolesNeeded: string[];
  hackathon: string;
  status: 'forming' | 'active' | 'complete';
}

export const currentUser: User = {
  id: '1',
  name: 'Alex Chen',
  role: 'Full Stack Developer',
  avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
  skills: ['React', 'Node.js', 'Python', 'TypeScript'],
  bio: 'CS student at Stanford. Love building products that solve real problems. 3x hackathon winner.',
  availability: 'available',
  hackathons: 8,
  quote: 'I bring energy, clean code, and a bias for shipping fast.',
};

export const users: User[] = [
  currentUser,
  {
    id: '2',
    name: 'Sarah Kim',
    role: 'UI/UX Designer',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face',
    skills: ['Figma', 'User Research', 'Prototyping', 'Design Systems'],
    bio: 'Design student with a passion for accessible, delightful interfaces.',
    availability: 'available',
    hackathons: 5,
    quote: 'Design is not just what it looks like, it\'s how it works.',
  },
  {
    id: '3',
    name: 'Marcus Johnson',
    role: 'ML Engineer',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
    skills: ['Python', 'TensorFlow', 'PyTorch', 'Data Science'],
    bio: 'PhD candidate in ML. Building the future of AI, one model at a time.',
    availability: 'open',
    hackathons: 12,
    quote: 'The best solutions come from diverse perspectives.',
  },
  {
    id: '4',
    name: 'Emily Rodriguez',
    role: 'Backend Developer',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
    skills: ['Go', 'Kubernetes', 'AWS', 'PostgreSQL'],
    bio: 'Infrastructure nerd. I make sure your app scales when you go viral.',
    availability: 'available',
    hackathons: 7,
    quote: 'Reliability is the feature nobody sees but everyone needs.',
  },
  {
    id: '5',
    name: 'David Park',
    role: 'Mobile Developer',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    skills: ['React Native', 'Swift', 'Kotlin', 'Firebase'],
    bio: 'Building beautiful mobile experiences. App Store featured 3 times.',
    availability: 'busy',
    hackathons: 9,
    quote: 'Mobile-first isn\'t a strategy, it\'s a mindset.',
  },
  {
    id: '6',
    name: 'Priya Patel',
    role: 'Product Manager',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face',
    skills: ['Strategy', 'User Stories', 'Roadmapping', 'Analytics'],
    bio: 'Ex-Google PM. I turn chaos into shipped products.',
    availability: 'available',
    hackathons: 15,
    quote: 'The best product is the one that actually gets built.',
  },
];

export const feedPosts: FeedPost[] = [
  {
    id: '1',
    type: 'building',
    user: users[2],
    title: '🚀 Building an AI-powered study buddy',
    description: 'Looking for passionate hackers to join my team for HackMIT! We\'re building an AI tutor that adapts to your learning style. Already have the ML model working!',
    rolesNeeded: ['Frontend Developer', 'UI/UX Designer'],
    timestamp: '2 hours ago',
    likes: 24,
    comments: 8,
  },
  {
    id: '2',
    type: 'looking',
    user: users[1],
    title: '🔍 Designer looking for a technical team',
    description: 'I have wireframes for a sustainability tracking app ready to go. Need developers who care about climate tech and can ship fast.',
    skills: ['React', 'Node.js', 'Mobile'],
    timestamp: '4 hours ago',
    likes: 31,
    comments: 12,
  },
  {
    id: '3',
    type: 'open',
    user: users[3],
    title: '🎯 Open to joining the right team',
    description: 'Backend engineer with 7 hackathons under my belt. Specialize in building scalable APIs and infrastructure. Let me handle your backend so you can focus on the product.',
    skills: ['Go', 'AWS', 'Databases'],
    timestamp: '6 hours ago',
    likes: 18,
    comments: 5,
  },
  {
    id: '4',
    type: 'building',
    user: users[5],
    title: '🚀 Healthcare access for underserved communities',
    description: 'Forming a team for TreeHacks focused on connecting rural patients with specialists via telemedicine. Need builders who care about impact.',
    rolesNeeded: ['Full Stack Developer', 'ML Engineer', 'Mobile Developer'],
    timestamp: '8 hours ago',
    likes: 45,
    comments: 16,
  },
  {
    id: '5',
    type: 'looking',
    user: users[4],
    title: '🔍 Mobile dev seeking design-focused team',
    description: 'I can build any mobile experience, but I need a team that values beautiful, intuitive design. Looking for a designer-led project.',
    skills: ['React Native', 'Swift', 'Animations'],
    timestamp: '12 hours ago',
    likes: 22,
    comments: 7,
  },
];

export const teams: Team[] = [
  {
    id: '1',
    name: 'EcoTrack',
    description: 'Building a personal carbon footprint tracker with gamification',
    members: [currentUser, users[1], users[3]],
    rolesNeeded: ['ML Engineer'],
    hackathon: 'TreeHacks 2024',
    status: 'active',
  },
  {
    id: '2',
    name: 'StudyBuddy AI',
    description: 'AI-powered personalized tutoring platform',
    members: [currentUser, users[2]],
    rolesNeeded: ['Frontend Developer', 'Designer'],
    hackathon: 'HackMIT 2024',
    status: 'forming',
  },
];

export const suggestedUsers: User[] = [users[2], users[5], users[1]];

export const skillCategories = {
  frontend: ['React', 'Vue', 'Angular', 'TypeScript', 'CSS', 'Next.js'],
  backend: ['Node.js', 'Python', 'Go', 'Java', 'Ruby', 'PostgreSQL'],
  design: ['Figma', 'User Research', 'Prototyping', 'Design Systems', 'UI/UX'],
  ml: ['TensorFlow', 'PyTorch', 'Data Science', 'NLP', 'Computer Vision'],
  mobile: ['React Native', 'Swift', 'Kotlin', 'Flutter', 'Firebase'],
  devops: ['AWS', 'Docker', 'Kubernetes', 'CI/CD', 'Terraform'],
};

export const getSkillClass = (skill: string): string => {
  const lower = skill.toLowerCase();
  if (['react', 'vue', 'angular', 'typescript', 'css', 'next.js', 'frontend'].some(s => lower.includes(s))) return 'skill-frontend';
  if (['node', 'python', 'go', 'java', 'ruby', 'postgresql', 'backend', 'api'].some(s => lower.includes(s))) return 'skill-backend';
  if (['figma', 'design', 'ui', 'ux', 'prototyp', 'research'].some(s => lower.includes(s))) return 'skill-design';
  if (['tensorflow', 'pytorch', 'ml', 'ai', 'data', 'nlp', 'vision'].some(s => lower.includes(s))) return 'skill-ml';
  if (['react native', 'swift', 'kotlin', 'flutter', 'mobile', 'ios', 'android'].some(s => lower.includes(s))) return 'skill-mobile';
  if (['aws', 'docker', 'kubernetes', 'ci/cd', 'terraform', 'devops'].some(s => lower.includes(s))) return 'skill-devops';
  return 'skill-frontend';
};
