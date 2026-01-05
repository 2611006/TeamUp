import { useState } from 'react';
import { User, GraduationCap, Briefcase, Code, Save, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { createProfile, updateProfile, UserProfile } from '@/services/firestore';
import { isFirebaseConfigured } from '@/lib/firebase';

interface ProfileSetupProps {
  existingProfile?: UserProfile | null;
  onComplete: () => void;
}

const yearOptions = ['First Year', 'Second Year', 'Third Year', 'Fourth Year'] as const;
const roleOptions = [
  'Frontend Developer',
  'Backend Developer',
  'UI/UX Designer',
  'Tester',
  'Full Stack Developer',
  'ML Engineer',
  'Mobile Developer',
  'DevOps Engineer',
  'Product Manager'
] as const;
const proficiencyOptions = ['Beginner', 'Intermediate', 'Pro'] as const;

const ProfileSetup = ({ existingProfile, onComplete }: ProfileSetupProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    fullName: existingProfile?.fullName || '',
    college: existingProfile?.college || '',
    yearOfStudy: existingProfile?.yearOfStudy || 'First Year',
    primaryRole: existingProfile?.primaryRole || 'Frontend Developer',
    bio: existingProfile?.bio || '',
    skills: existingProfile?.skills || [{ name: '', proficiency: 'Beginner' as const }]
  });

  const addSkill = () => {
    setFormData(prev => ({
      ...prev,
      skills: [...prev.skills, { name: '', proficiency: 'Beginner' as const }]
    }));
  };

  const updateSkill = (index: number, field: 'name' | 'proficiency', value: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.map((skill, i) => 
        i === index ? { ...skill, [field]: value } : skill
      )
    }));
  };

  const removeSkill = (index: number) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!formData.fullName.trim()) {
      setError('Full name is required');
      return;
    }

    const validSkills = formData.skills.filter(s => s.name.trim());
    
    setLoading(true);
    
    if (isFirebaseConfigured() && user) {
      try {
        const profileData = {
          email: user.email || '',
          fullName: formData.fullName,
          college: formData.college,
          yearOfStudy: formData.yearOfStudy as UserProfile['yearOfStudy'],
          primaryRole: formData.primaryRole as UserProfile['primaryRole'],
          bio: formData.bio,
          skills: validSkills as UserProfile['skills'],
          avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(formData.fullName)}`
        };

        if (existingProfile) {
          await updateProfile(user.uid, profileData);
        } else {
          await createProfile(user.uid, profileData);
        }
      } catch (err) {
        setError('Failed to save profile. Please try again.');
        setLoading(false);
        return;
      }
    }
    
    setLoading(false);
    onComplete();
  };

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="card-base p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-primary/10">
              <User className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="font-display font-bold text-2xl text-foreground">
                {existingProfile ? 'Edit Profile' : 'Complete Your Profile'}
              </h1>
              <p className="text-muted-foreground">Tell us about yourself</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}

            {/* Basic Info */}
            <div className="space-y-4">
              <h2 className="section-title flex items-center gap-2">
                <User className="w-4 h-4" />
                Basic Information
              </h2>
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                  placeholder="John Doe"
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Short Bio
                </label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                  placeholder="Tell us about yourself in a few sentences..."
                  className="input-field min-h-[80px] resize-none"
                />
              </div>
            </div>

            {/* Education */}
            <div className="space-y-4">
              <h2 className="section-title flex items-center gap-2">
                <GraduationCap className="w-4 h-4" />
                Education
              </h2>
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  College / University
                </label>
                <input
                  type="text"
                  value={formData.college}
                  onChange={(e) => setFormData(prev => ({ ...prev, college: e.target.value }))}
                  placeholder="Stanford University"
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Year of Study
                </label>
                <select
                  value={formData.yearOfStudy}
                  onChange={(e) => setFormData(prev => ({ ...prev, yearOfStudy: e.target.value as typeof yearOptions[number] }))}
                  className="input-field"
                >
                  {yearOptions.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Role */}
            <div className="space-y-4">
              <h2 className="section-title flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                Primary Role
              </h2>
              
              <div className="flex flex-wrap gap-2">
                {roleOptions.map(role => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, primaryRole: role }))}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      formData.primaryRole === role
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>

            {/* Skills */}
            <div className="space-y-4">
              <h2 className="section-title flex items-center gap-2">
                <Code className="w-4 h-4" />
                Skills
              </h2>
              
              {formData.skills.map((skill, index) => (
                <div key={index} className="flex gap-3">
                  <input
                    type="text"
                    value={skill.name}
                    onChange={(e) => updateSkill(index, 'name', e.target.value)}
                    placeholder="e.g., React, Python..."
                    className="input-field flex-1"
                  />
                  <select
                    value={skill.proficiency}
                    onChange={(e) => updateSkill(index, 'proficiency', e.target.value)}
                    className="input-field w-32"
                  >
                    {proficiencyOptions.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                  {formData.skills.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSkill(index)}
                      className="btn-ghost text-destructive"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              
              <button
                type="button"
                onClick={addSkill}
                className="btn-outline text-sm"
              >
                + Add Skill
              </button>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {existingProfile ? 'Update Profile' : 'Complete Setup'}
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProfileSetup;
