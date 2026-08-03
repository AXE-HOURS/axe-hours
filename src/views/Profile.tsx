import React, { useState, useEffect } from 'react';
import { GlassCard } from '../components/GlassCard';
import { useFirebase } from '../context/FirebaseContext';
import { db } from '../lib/firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { 
  User, 
  Users, 
  Mail, 
  Hash, 
  Shield, 
  Award, 
  Bookmark, 
  Sparkles, 
  UserPlus, 
  Check, 
  Plus, 
  FolderHeart, 
  Search, 
  ExternalLink,
  ChevronRight,
  Flame,
  Volume2
} from 'lucide-react';

interface SavedIdeaItem {
  id: number;
  title: string;
  content: string;
  date: string;
}

interface UserProfileData {
  email: string;
  name?: string;
  handle?: string;
  avatar?: string;
  bio?: string;
  role?: string;
  joinedDate?: string;
  groups?: string[];
}

interface ProfileProps {
  user: UserProfileData;
  onUpdateUser: (userData: any) => void;
  savedIdeas: SavedIdeaItem[];
}

interface GroupMember {
  uid: string;
  name: string;
  handle: string;
  avatar: string;
  joinedAt: string;
}

interface GroupItem {
  id: string;
  name: string;
  description: string;
  tag: string;
  membersCount: number;
  tier: 'Standard' | 'Pro' | 'Enterprise';
  isMember: boolean;
  members?: GroupMember[];
}

export const Profile: React.FC<ProfileProps> = ({ user, onUpdateUser, savedIdeas }) => {
  // Main form states
  const [name, setName] = useState(user?.name || "Guest Creator");
  const [handle, setHandle] = useState(user?.handle || "@guest_creator");
  const [avatar, setAvatar] = useState(user?.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100");
  const [bio, setBio] = useState(user?.bio || "Futuristic AI explorer breaking the limits of retention and hook generation.");
  const [role, setRole] = useState(user?.role || "Prompt Engineer");
  
  const [isSaved, setIsSaved] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'profile' | 'groups'>('profile');

  const uid = user?.uid || "guest";

  const DEFAULT_GROUPS = [
    { 
      id: '1', 
      name: 'Vanguard Prompt Alliance', 
      description: 'Elite collective crafting high-performance Gemini API templates and instructions.', 
      tag: 'PROMPTING', 
      membersCount: 42, 
      tier: 'Pro', 
      isMember: true 
    },
    { 
      id: '2', 
      name: 'SaaS Builder Lab', 
      description: 'Accelerated launching pod for solo developers constructing automated AI workflows.', 
      tag: 'DEVELOPMENT', 
      membersCount: 128, 
      tier: 'Standard', 
      isMember: false 
    },
    { 
      id: '3', 
      name: 'Ctr Matrix Scientists', 
      description: 'Analysis and statistical tuning of visual thumbnail layouts and title vectors.', 
      tag: 'ANALYTICS', 
      membersCount: 19, 
      tier: 'Enterprise', 
      isMember: false 
    }
  ];

  // Groups and tribes state
  const [groups, setGroups] = useState<GroupItem[]>(DEFAULT_GROUPS);

  // Sync groups state based on active user UID
  useEffect(() => {
    const key = `axe_hours_groups_${uid}`;
    const savedGroups = localStorage.getItem(key) || localStorage.getItem("axe_hours_groups");
    if (savedGroups) {
      try {
        setGroups(JSON.parse(savedGroups));
      } catch (e) {
        setGroups(DEFAULT_GROUPS);
      }
    } else {
      setGroups(DEFAULT_GROUPS);
    }
  }, [uid]);

  const { user: fbUser, dbUser } = useFirebase();
  const [dbGroups, setDbGroups] = useState<GroupItem[]>([]);
  const [membersMap, setMembersMap] = useState<Record<string, GroupMember[]>>({});

  // Synchronize groups from Firestore
  useEffect(() => {
    if (!fbUser) return;

    const unsubGroups = onSnapshot(collection(db, "groups"), (snapshot) => {
      const groupList: GroupItem[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        groupList.push({
          id: data.id,
          name: data.name,
          description: data.description,
          tag: data.tag,
          tier: data.tier,
          membersCount: 0, // calculated from membersMap
          isMember: false // calculated based on membersMap
        } as GroupItem);
      });

      if (groupList.length === 0) {
        // Seed default groups to Firestore database
        const seedGroups = async () => {
          for (const g of DEFAULT_GROUPS) {
            try {
              await setDoc(doc(db, "groups", g.id), {
                id: g.id,
                name: g.name,
                description: g.description,
                tag: g.tag,
                tier: g.tier,
                creatorId: "system",
                createdAt: new Date().toISOString()
              });
            } catch (e) {
              console.error("Failed to seed group to Firestore: ", e);
            }
          }
        };
        seedGroups();
      } else {
        setDbGroups(groupList);
      }
    }, (err) => {
      console.warn("Firestore groups sync error: ", err);
    });

    return () => unsubGroups();
  }, [fbUser]);

  // Synchronize members for each group in real-time
  useEffect(() => {
    if (!fbUser || dbGroups.length === 0) return;

    const unsubscribes = dbGroups.map(g => {
      const membersCol = collection(db, "groups", g.id, "members");
      return onSnapshot(membersCol, (snapshot) => {
        const membersList: GroupMember[] = [];
        snapshot.forEach(docSnap => {
          membersList.push(docSnap.data() as GroupMember);
        });
        setMembersMap(prev => ({
          ...prev,
          [g.id]: membersList
        }));
      }, (err) => {
        console.warn(`Firestore members sync error for group ${g.id}: `, err);
      });
    });

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [fbUser, dbGroups]);

  // Combined displayed groups list (Firestore-based if authenticated, otherwise local storage fallback)
  const displayedGroups = fbUser 
    ? dbGroups.map(g => {
        const groupMembers = membersMap[g.id] || [];
        const isMember = groupMembers.some(m => m.uid === fbUser.uid);
        return {
          ...g,
          isMember,
          membersCount: groupMembers.length,
          members: groupMembers
        };
      })
    : groups;

  // Group creation inputs
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");
  const [newGroupTag, setNewGroupTag] = useState("AI GENERAL");
  const [groupCreationSuccess, setGroupCreationSuccess] = useState(false);

  // Sound cue synthesizer
  const playPulseSound = (frequency: number, duration = 0.25) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      // Browsers might block block play before interaction
    }
  };

  useEffect(() => {
    localStorage.setItem(`axe_hours_groups_${uid}`, JSON.stringify(groups));
  }, [groups, uid]);

  // Handle saving the core creator settings
  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedUserData = {
      ...user,
      name,
      handle,
      avatar,
      bio,
      role
    };
    onUpdateUser(updatedUserData);
    setIsSaved(true);
    playPulseSound(587.33, 0.4); // D5 code
    setTimeout(() => setIsSaved(false), 2000);
  };

  // Avatar presets catalog
  const avatarPresets = [
    { url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100", label: "Pink Cyber" },
    { url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100", label: "Blue Slate" },
    { url: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100", label: "Volt Neon" },
    { url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=100", label: "Amber Glow" },
    { url: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&q=80&w=100", label: "Tech Core" }
  ];

  // Join/Leave group
  const toggleGroupJoin = async (groupId: string) => {
    if (!fbUser) {
      const fresh = groups.map(g => {
        if (g.id === groupId) {
          const nextStatus = !g.isMember;
          playPulseSound(nextStatus ? 523.25 : 349.23, 0.3); // C5 (Join) or F4 (Leave)
          return { 
            ...g, 
            isMember: nextStatus,
            membersCount: nextStatus ? g.membersCount + 1 : g.membersCount - 1
          };
        }
        return g;
      });
      setGroups(fresh);
      return;
    }

    const groupMembers = membersMap[groupId] || [];
    const isCurrentlyMember = groupMembers.some(m => m.uid === fbUser.uid);
    const memberDocRef = doc(db, "groups", groupId, "members", fbUser.uid);

    try {
      if (isCurrentlyMember) {
        // Leave
        playPulseSound(349.23, 0.3); // F4
        await deleteDoc(memberDocRef);
      } else {
        // Join
        playPulseSound(523.25, 0.3); // C5
        await setDoc(memberDocRef, {
          uid: fbUser.uid,
          name: dbUser?.name || fbUser.displayName || fbUser.email?.split("@")[0] || "Axe Creator",
          handle: dbUser?.handle || fbUser.displayName?.toLowerCase().replace(/\s+/g, "_") || "creator",
          avatar: dbUser?.avatar || fbUser.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100",
          joinedAt: new Date().toISOString()
        });
      }
    } catch (e) {
      console.error("Group membership toggle failed: ", e);
    }
  };

  // Add custom group
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim() || !newGroupDesc.trim()) return;

    const newGroupId = Date.now().toString();

    if (!fbUser) {
      const newGroup: GroupItem = {
        id: newGroupId,
        name: newGroupName.trim(),
        description: newGroupDesc.trim(),
        tag: newGroupTag.toUpperCase(),
        membersCount: 1,
        tier: 'Pro', // Default tier
        isMember: true
      };

      setGroups([newGroup, ...groups]);
      setNewGroupName("");
      setNewGroupDesc("");
      setGroupCreationSuccess(true);
      playPulseSound(880, 0.55); // A5 (Achievement chord)
      setTimeout(() => {
        setGroupCreationSuccess(false);
      }, 2500);
      return;
    }

    try {
      // 1. Write the group to Firestore groups collection
      await setDoc(doc(db, "groups", newGroupId), {
        id: newGroupId,
        name: newGroupName.trim(),
        description: newGroupDesc.trim(),
        tag: newGroupTag.toUpperCase(),
        tier: "Pro",
        creatorId: fbUser.uid,
        createdAt: new Date().toISOString()
      });

      // 2. Automatically join the creator to the group
      await setDoc(doc(db, "groups", newGroupId, "members", fbUser.uid), {
        uid: fbUser.uid,
        name: dbUser?.name || fbUser.displayName || fbUser.email?.split("@")[0] || "Axe Creator",
        handle: dbUser?.handle || fbUser.displayName?.toLowerCase().replace(/\s+/g, "_") || "creator",
        avatar: dbUser?.avatar || fbUser.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100",
        joinedAt: new Date().toISOString()
      });

      setNewGroupName("");
      setNewGroupDesc("");
      setGroupCreationSuccess(true);
      playPulseSound(880, 0.55); // A5 (Achievement chord)
      setTimeout(() => {
        setGroupCreationSuccess(false);
      }, 2500);
    } catch (e) {
      console.error("Tribe cloud broadcast failed: ", e);
    }
  };

  return (
    <div id="profile-network-container" className="space-y-8 animate-in fade-in duration-500 relative z-10 w-full max-w-7xl mx-auto">
      
      {/* Header Panel */}
      <div id="profile-network-header" className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-5">
        <div>
          <h1 id="profile-network-title" className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <User className="text-purple-400" size={32} /> Creator Profile Studio
          </h1>
          <p className="text-gray-400 text-xs mt-1.5 font-light">
            Model, configure, and connect your decentralized creator identities and local group registries.
          </p>
        </div>

        {/* Sub Navigation Tabs */}
        <div className="flex bg-black/60 border border-white/5 rounded-xl p-1 select-none">
          <button 
            onClick={() => { setActiveSubTab('profile'); playPulseSound(440, 0.15); }}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
              activeSubTab === 'profile' ? 'bg-purple-500/10 text-purple-300 border-b-2 border-purple-400/50' : 'text-gray-400 hover:text-white'
            }`}
          >
            Profile Model
          </button>
          <button 
            onClick={() => { setActiveSubTab('groups'); playPulseSound(440, 0.15); }}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center gap-1.5 ${
              activeSubTab === 'groups' ? 'bg-purple-500/10 text-purple-300 border-b-2 border-purple-400/50' : 'text-gray-400 hover:text-white'
            }`}
          >
            Tribes & Groups 
            <span className="bg-purple-500/20 text-purple-400 text-[9px] px-1.5 py-0.5 rounded-full font-bold">
              {groups.filter(g => g.isMember).length}Joined
            </span>
          </button>
        </div>
      </div>

      {activeSubTab === 'profile' ? (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          
          {/* Identity Editor Left Column */}
          <div className="xl:col-span-7 space-y-6">
            <GlassCard id="profile-identity-card" glowColor="purple" className="space-y-6">
              
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-purple-400 flex items-center gap-2">
                  <Shield size={16} /> Identity Core Credentials
                </h3>
                <span className="text-[10px] text-gray-500 font-mono">SECURE PREFERENCE MODEL</span>
              </div>

              <form onSubmit={handleProfileSave} className="space-y-5">
                
                {/* Form Inputs Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Creator Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                      <input 
                        type="text" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 pl-10 pr-3 text-xs text-white focus:outline-none focus:border-purple-500/40 font-semibold"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Handle Identifier</label>
                    <div className="relative">
                      <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                      <input 
                        type="text" 
                        value={handle}
                        onChange={(e) => setHandle(e.target.value)}
                        required
                        className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 pl-10 pr-3 text-xs text-white focus:outline-none focus:border-purple-500/40 font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Workspace Role</label>
                    <div className="relative">
                      <Award className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                      <select 
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        className="w-full bg-black/50 border border-white/10 rounded-xl py-2.5 pl-10 pr-3 text-xs text-white focus:outline-none focus:border-purple-500/40 cursor-pointer"
                      >
                        <option value="Prompt Engineer">Prompt Engineer</option>
                        <option value="Content Strategist">Content Strategist</option>
                        <option value="Interactive Visualizer">Interactive Visualizer</option>
                        <option value="Executive Producer">Executive Producer</option>
                        <option value="Growth Marketer">Growth Marketer</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Email Node Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" size={14} />
                      <input 
                        type="email" 
                        value={user.email} 
                        disabled
                        className="w-full bg-white/5 border border-white/5 rounded-xl py-2.5 pl-10 pr-3 text-xs text-gray-500 font-mono cursor-not-allowed"
                        title="Decentralized email identification node cannot be altered."
                      />
                    </div>
                  </div>
                </div>

                {/* Bio text area */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Creator Bio Statement</label>
                  <textarea 
                    rows={3} 
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Describe your design and creation guidelines..."
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-purple-500/40 leading-relaxed resize-none"
                  />
                </div>

                {/* Futuristic Interactive Avatar presets widget */}
                <div className="space-y-2">
                  <label className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Select Cybernetic Avatar Preset</label>
                  <div className="flex flex-wrap items-center gap-3">
                    {avatarPresets.map((pr, i) => {
                      const isSelected = avatar === pr.url;
                      return (
                        <div 
                          key={i} 
                          onClick={() => { setAvatar(pr.url); playPulseSound(600 + i * 50, 0.15); }}
                          className={`relative w-12 h-12 rounded-full cursor-pointer overflow-hidden border-2 transition-all p-0.5 ${
                            isSelected ? 'border-purple-400 scale-105 shadow-[0_0_12px_rgba(157,80,187,0.4)]' : 'border-white/10 opacity-70 hover:opacity-100 hover:scale-102'
                          }`}
                          title={pr.label}
                        >
                          <img src={pr.url} alt={pr.label} className="w-full h-full object-cover rounded-full" referrerPolicy="no-referrer" />
                          {isSelected && (
                            <div className="absolute inset-0 bg-purple-500/20 flex items-center justify-center">
                              <Check className="text-white drop-shadow-md" size={12} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Avatar Url block */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Or Supply Custom Avatar Image URL</label>
                  <input 
                    type="url" 
                    value={avatar}
                    onChange={(e) => setAvatar(e.target.value)}
                    placeholder="https://images.unsplash.com/your-custom-image"
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-purple-500/40 font-mono"
                  />
                </div>

                <div className="pt-2">
                  <button 
                    type="submit"
                    className="w-full py-3 bg-gradient-to-r from-purple-500 via-pink-500 to-amber-400 text-white font-extrabold text-xs uppercase rounded-xl tracking-widest flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.01]"
                  >
                    {isSaved ? (
                      <>
                        <Check size={16} /> Saved Successfully
                      </>
                    ) : (
                      <>
                        <Sparkles size={14} className="animate-pulse text-amber-300" /> Commit Profile Model Changes
                      </>
                    )}
                  </button>
                </div>

              </form>

            </GlassCard>
          </div>

          {/* Identity Blueprint Dashboard Right Column */}
          <div className="xl:col-span-5 space-y-6">
            
            {/* Visual preview widget */}
            <GlassCard id="profile-preview-card" glowColor="cyan" className="text-center p-8 space-y-5 flex flex-col items-center relative">
              <div className="absolute top-3 right-3 px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-[9px] text-cyan-400 font-mono select-none">
                PREVIEW NODE
              </div>

              <div className="relative group">
                <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-purple-500 via-pink-500 to-cyan-400 p-[3px] shadow-xl">
                  <div className="w-full h-full rounded-full bg-black overflow-hidden border border-black">
                    <img src={avatar} alt="Avatar" className="w-full h-full object-cover rounded-full" referrerPolicy="no-referrer" />
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-center gap-2">
                  <h2 className="text-xl font-extrabold text-white tracking-widest uppercase">{name}</h2>
                  <span className="bg-cyan-950/80 border border-cyan-500/40 text-cyan-400 rounded-md px-2 py-0.5 font-mono text-[9px] font-black tracking-widest uppercase shadow-[0_0_10px_rgba(6,182,212,0.35)] select-none">
                    LEVEL 4
                  </span>
                </div>
                <div className="flex items-center justify-center gap-2 mt-2 select-none">
                  <span className="text-xs font-mono text-cyan-400">{handle}</span>
                  <span className="w-1 h-1 rounded-full bg-gray-500" />
                  <span className="text-xs text-gray-400 font-light">{role}</span>
                </div>
              </div>

              <div className="w-full border-t border-white/5 pt-4">
                <p className="text-xs text-gray-300 leading-relaxed font-light italic">
                  "{bio}"
                </p>
              </div>

              {/* Saved counts and metrics */}
              <div className="grid grid-cols-3 gap-2 w-full pt-2">
                <div className="bg-white/5 border border-white/5 rounded-xl p-3 leading-none select-none">
                  <span className="block text-xl font-black text-white">{savedIdeas.length}</span>
                  <span className="text-[8px] text-gray-400 uppercase tracking-widest font-mono font-bold block mt-1">SAVED IDEAS</span>
                </div>
                <div className="bg-white/5 border border-white/5 rounded-xl p-3 leading-none select-none">
                  <span className="block text-xl font-black text-white">{displayedGroups.filter(g => g.isMember).length}</span>
                  <span className="text-[8px] text-gray-400 uppercase tracking-widest font-mono font-bold block mt-1">MY TRIBES</span>
                </div>
                <div className="bg-white/5 border border-white/5 rounded-xl p-3 leading-none select-none">
                  <span className="block text-xl font-black text-emerald-400">ACTIVE</span>
                  <span className="text-[8px] text-gray-400 uppercase tracking-widest font-mono font-bold block mt-1">STATUS</span>
                </div>
              </div>

            </GlassCard>

            {/* Saved Data Schema Extensible overview */}
            <GlassCard id="profile-schema-card" className="border-white/5 space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5 border-b border-white/5 pb-3">
                <FolderHeart size={16} /> Persistent Schema Storage
              </h3>
              
              <div className="space-y-3 font-mono text-xs text-gray-400">
                <div className="p-3 bg-black/40 border border-white/5 rounded-xl flex justify-between items-center group hover:bg-white/5 transition-all">
                  <div className="flex items-center gap-2">
                    <Bookmark size={14} className="text-amber-400" />
                    <span>Saved Snippets Count</span>
                  </div>
                  <span className="font-bold text-white pr-2">{savedIdeas.length} items</span>
                </div>

                <div className="p-3 bg-black/40 border border-white/5 rounded-xl flex justify-between items-center group hover:bg-white/5 transition-all">
                  <div className="flex items-center gap-2">
                    <Users size={14} className="text-purple-400" />
                    <span>Active Team Entities</span>
                  </div>
                  <span className="font-bold text-white pr-2">{displayedGroups.length} nodes</span>
                </div>

                <div className="p-3 bg-black/50 border border-white/5 rounded-xl text-[10px] space-y-1 select-text">
                  <span className="text-gray-500 font-bold block text-[9px] uppercase tracking-wider">LATEST EXTENSIBLE METADATA JSON</span>
                  <pre className="text-cyan-400/90 whitespace-pre overflow-x-auto text-[9px] pt-1 leading-snug">
{`{
  "creatorId": "${user.email.replace(/[@.]/g, '_')}",
  "capabilities": ["Retuner", "Synth_API"],
  "groupsJoined": ${JSON.stringify(displayedGroups.filter(g => g.isMember).map(g => g.name.substring(0, 12) + "..."))},
  "creationRules": {
    "engine": "gemini-3.5-flash",
    "retentionThreshold": 0.85
  }
}`}
                  </pre>
                </div>
              </div>
            </GlassCard>

          </div>

        </div>
      ) : (
        <div id="profile-network-tribes-view" className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          
          {/* Joinable Group Lists Left 7 units */}
          <div className="xl:col-span-7 space-y-6">
            
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-black text-white tracking-widest uppercase flex items-center gap-2">
                <Users size={20} className="text-purple-400" /> Decentralized Tribes Index
              </h3>
              <span className="text-xs text-gray-400 font-mono">
                {displayedGroups.length} public structures discovered
              </span>
            </div>

            <div className="space-y-4">
              {displayedGroups.map((grp) => {
                return (
                  <GlassCard 
                     key={grp.id} 
                     id={`collective-group-${grp.id}`} 
                     glowColor={grp.isMember ? "green" : "none"}
                     className="p-5 border-white/5 hover:border-purple-500/20"
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      
                      <div className="space-y-1.5 flex-1 pr-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-base font-extrabold text-white tracking-tight leading-tight select-text">
                            {grp.name}
                          </h4>
                          <span className="bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[8px] font-mono font-bold px-2 py-0.5 rounded uppercase">
                            {grp.tag}
                          </span>
                          <span className={`text-[8px] font-mono font-bold px-2 py-0.5 rounded uppercase ${
                            grp.tier === 'Enterprise' ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20' :
                            grp.tier === 'Pro' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' :
                            'bg-gray-500/15 text-gray-400 border border-white/10'
                          }`}>
                            {grp.tier}
                          </span>
                        </div>
                        <p className="text-xs text-gray-300 font-light select-text">
                          {grp.description}
                        </p>
                        
                        <div className="flex items-center gap-4 text-[10px] font-mono text-gray-500 select-none pt-1">
                          <span className="flex items-center gap-1 text-purple-400">
                            <Flame size={12} className="animate-pulse" /> Active Level: High
                          </span>
                          <span>•</span>
                          <span>{grp.membersCount} active {grp.membersCount === 1 ? 'node' : 'nodes'}</span>
                        </div>

                        {grp.members && grp.members.length > 0 && (
                          <div className="flex items-center gap-2 pt-2 flex-wrap border-t border-white/5 mt-2">
                            <div className="flex -space-x-1.5 overflow-hidden">
                              {grp.members.slice(0, 6).map((mbr) => (
                                <img
                                  key={mbr.uid}
                                  className="inline-block h-5 w-5 rounded-full ring-2 ring-black bg-[#111] object-cover"
                                  src={mbr.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100"}
                                  alt={mbr.name}
                                  title={`${mbr.name} (${mbr.handle})`}
                                  referrerPolicy="no-referrer"
                                />
                              ))}
                            </div>
                            <span className="text-[10px] font-mono text-purple-300">
                              Joined: {grp.members.map(m => m.name).slice(0, 3).join(", ")}
                              {grp.members.length > 3 ? ` +${grp.members.length - 3} more` : ""}
                            </span>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => toggleGroupJoin(grp.id)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider select-none transition-all cursor-pointer border ${
                          grp.isMember 
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20' 
                            : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                        }`}
                      >
                        {grp.isMember ? (
                          <span className="flex items-center gap-1"><Check size={12} /> Joined</span>
                        ) : (
                          <span className="flex items-center gap-1"><UserPlus size={12} /> Join Group</span>
                        )}
                      </button>

                    </div>
                  </GlassCard>
                );
              })}
            </div>

          </div>

          {/* Group Creator Right 5 units */}
          <div className="xl:col-span-5 space-y-6">
            <GlassCard id="profile-new-group-card" glowColor="purple" className="space-y-5">
              
              <div className="border-b border-white/5 pb-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                  <Plus size={16} /> Broadcast New Tribe Code
                </h3>
                <p className="text-[10px] text-gray-400 mt-1">
                  Deploy custom groups. Invite other practitioners locally or globally.
                </p>
              </div>

              {groupCreationSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold text-center animate-bounce">
                  ⚡ Broadcaster deployed successfully! Group added to indexing node.
                </div>
              )}

              <form onSubmit={handleCreateGroup} className="space-y-4">
                
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Tribe Name</label>
                  <input 
                    type="text"
                    required
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="e.g. Next-Gen Creators Mastermind"
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-purple-500/40 font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Specialization Tag</label>
                  <select
                    value={newGroupTag}
                    onChange={(e) => setNewGroupTag(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-purple-500/40 cursor-pointer"
                  >
                    <option value="PROMPTING">Prompt Architecture</option>
                    <option value="DEVELOPMENT">Software & Cloud APIs</option>
                    <option value="ANALYTICS">Data and CTR Science</option>
                    <option value="AI GENERAL">Uncategorized AI Matrix</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Mission Objective / Description</label>
                  <textarea
                    rows={4}
                    required
                    value={newGroupDesc}
                    onChange={(e) => setNewGroupDesc(e.target.value)}
                    placeholder="Highlight who this team is for, what tools you configure, and how members scale their output."
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-purple-500/40 text-[11px] resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-xl text-xs font-extrabold uppercase tracking-wide flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                >
                  <Plus size={14} /> Establish Decentralized Broadcast
                </button>

              </form>

            </GlassCard>
          </div>

        </div>
      )}

    </div>
  );
};
