import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  deleteDoc, 
  query, 
  where, 
  onSnapshot 
} from 'firebase/firestore';
import { db, auth, googleProvider, microsoftProvider, githubProvider, handleFirestoreError, OperationType } from '../lib/firebase';

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  handle: string;
  avatar: string;
  bio: string;
  role: string;
  tier: 'free' | 'pro' | 'agency';
  customInstructions?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GenerationItem {
  id: number;
  title: string;
  content: string;
  date: string;
  userId?: string;
}

export interface SavedIdeaItem {
  id: number;
  title: string;
  content: string;
  date: string;
  userId?: string;
}

export interface UserActivityItem {
  id: number;
  userId?: string;
  actionType: 'generate' | 'save_idea' | 'remove_idea' | 'import_hook' | 'competitor_intel' | 'fetch_script' | 'profile_update' | 'custom_search';
  actionTitle: string;
  description: string;
  timestamp: string;
  createdAt: string;
}

interface FirebaseContextType {
  user: FirebaseUser | null;
  dbUser: UserProfile | null;
  recentGenerations: GenerationItem[];
  savedIdeas: SavedIdeaItem[];
  userActivities: UserActivityItem[];
  loading: boolean;
  googleAccessToken: string | null;
  setGoogleAccessToken: (token: string | null) => void;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  saveToHistoryDB: (title: string, content: string) => Promise<void>;
  saveIdeaDB: (idea: { title: string; content: string }) => Promise<void>;
  updateIdeaDB?: (id: number, updatedFields: Partial<{ title: string; content: string }>) => Promise<void>;
  removeIdeaDB: (id: number) => Promise<void>;
  updateProfile: (profileUpdates: Partial<UserProfile>) => Promise<void>;
  logUserActivity: (
    actionType: 'generate' | 'save_idea' | 'remove_idea' | 'import_hook' | 'competitor_intel' | 'fetch_script' | 'profile_update' | 'custom_search',
    actionTitle: string,
    description: string
  ) => Promise<void>;
  clearActivitiesDB: () => Promise<void>;
}

const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [dbUser, setDbUser] = useState<UserProfile | null>(null);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);
  const [recentGenerations, setRecentGenerations] = useState<GenerationItem[]>([]);
  const [savedIdeas, setSavedIdeas] = useState<SavedIdeaItem[]>([]);
  const [userActivities, setUserActivities] = useState<UserActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Fallback structures for Local Offline Sandbox Mode
  const getLocalHistory = (uid?: string): GenerationItem[] => {
    const key = uid ? `axe_hours_recent_generations_${uid}` : "axe_hours_recent_generations";
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : [];
  };

  const getLocalIdeas = (uid?: string): SavedIdeaItem[] => {
    const key = uid ? `axe_hours_saved_ideas_${uid}` : "axe_hours_saved_ideas";
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : [];
  };

  const getLocalActivities = (uid?: string): UserActivityItem[] => {
    const key = uid ? `axe_hours_user_activities_${uid}` : "axe_hours_user_activities";
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : [];
  };

  // Sync remaining local objects after logging in to Firebase (Cloud-Upgrade Sync)
  const syncLocalToCloud = async (uid: string) => {
    try {
      const localHistory = getLocalHistory();
      const localIdeas = getLocalIdeas();
      const localActivities = getLocalActivities();

      // Migrate history to Firestore
      for (const item of localHistory) {
        const docRef = doc(db, 'recent_generations', String(item.id));
        await setDoc(docRef, {
          id: String(item.id),
          userId: uid,
          title: item.title,
          content: item.content,
          date: item.date,
          createdAt: new Date().toISOString()
        });
      }

      // Migrate saved ideas to Firestore
      for (const item of localIdeas) {
        const docRef = doc(db, 'saved_ideas', String(item.id));
        await setDoc(docRef, {
          id: String(item.id),
          userId: uid,
          title: item.title,
          content: item.content,
          date: item.date,
          createdAt: new Date().toISOString()
        });
      }

      // Migrate activities to Firestore
      for (const item of localActivities) {
        const docRef = doc(db, 'user_activities', String(item.id));
        await setDoc(docRef, {
          id: String(item.id),
          userId: uid,
          actionType: item.actionType,
          actionTitle: item.actionTitle,
          description: item.description,
          timestamp: item.timestamp,
          createdAt: item.createdAt
        });
      }

      // Clear migration buffers once cloud storage is locked
      if (localHistory.length > 0) localStorage.removeItem("axe_hours_recent_generations");
      if (localIdeas.length > 0) localStorage.removeItem("axe_hours_saved_ideas");
      if (localActivities.length > 0) localStorage.removeItem("axe_hours_user_activities");
    } catch (e) {
      console.warn("Cloud upgrade synchronization failed: ", e);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        setUser(firebaseUser);
        
        try {
          // Initialize/retrieve Firestore User profile doc
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          let userSnap = null;
          let loadedFromCache = false;

          try {
            userSnap = await getDoc(userDocRef);
          } catch (offlineErr) {
            console.warn("Could not fetch user profile from server, attempting cache fallback...", offlineErr);
            try {
              const { getDocFromCache } = await import('firebase/firestore');
              userSnap = await getDocFromCache(userDocRef);
              loadedFromCache = true;
            } catch (cacheErr) {
              console.warn("Could not fetch user profile from cache either. Generating local in-memory profile.", cacheErr);
            }
          }

          let profileData: UserProfile;

          if (userSnap && userSnap.exists()) {
            profileData = userSnap.data() as UserProfile;
          } else {
            // Auto promote VIP developer to Administrator / Agency license tier
            const isDeveloper = firebaseUser.email === "atharvsharma1259@gmail.com";
            
            profileData = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Axe Creator',
              handle: (firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'creator').toLowerCase().replace(/\s+/g, '_'),
              avatar: firebaseUser.photoURL || '',
              bio: isDeveloper ? 'Lead AI Architect & System Administrator for Axe Hours.' : 'Content Creator & Hook Architect',
              role: isDeveloper ? 'Administrator' : 'Creator',
              tier: isDeveloper ? 'agency' : 'pro', // Generous auto-upgrading to premium Pro/Agency tiers!
              customInstructions: "",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };

            // Only attempt to save to server if we didn't fail with offline exception or read from cache
            if (!loadedFromCache) {
              try {
                await setDoc(userDocRef, profileData);
              } catch (writeError) {
                console.warn("Could not write newly generated profile to Firestore server. Keeping in memory.", writeError);
              }
            }
          }

          setDbUser(profileData);
          
          // Execute migration sync safely
          try {
            await syncLocalToCloud(firebaseUser.uid);
          } catch (syncErr) {
            console.warn("Skipping local-to-cloud migration: offline or cache only.", syncErr);
          }

          setLoading(false);

        } catch (error) {
          console.error("Firebase auth profile registration failed: ", error);
          setLoading(false);
        }
      } else {
        const savedSession = localStorage.getItem('axe_hours_local_session');
        if (savedSession) {
          try {
            const parsed = JSON.parse(savedSession);
            if (parsed?.user && parsed?.dbUser) {
              setUser(parsed.user);
              setDbUser(parsed.dbUser);
              setRecentGenerations(getLocalHistory(parsed.user.uid));
              setSavedIdeas(getLocalIdeas(parsed.user.uid));
              setUserActivities(getLocalActivities(parsed.user.uid));
              setLoading(false);
              return;
            }
          } catch (e) {
            console.warn("Invalid local session format", e);
          }
        }

        setUser(null);
        setDbUser(null);
        setGoogleAccessToken(null);
        // Fallback to local sandbox variables
        setRecentGenerations(getLocalHistory());
        setSavedIdeas(getLocalIdeas());
        setUserActivities(getLocalActivities());
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Real-time Firestore synchronizer for Premium users
  useEffect(() => {
    if (!user) return;

    const historyQuery = query(
      collection(db, 'recent_generations'),
      where('userId', '==', user.uid)
    );

    const ideasQuery = query(
      collection(db, 'saved_ideas'),
      where('userId', '==', user.uid)
    );

    const activitiesQuery = query(
      collection(db, 'user_activities'),
      where('userId', '==', user.uid)
    );

    // Active generation synced stream
    const unsubHistory = onSnapshot(historyQuery, (snapshot) => {
      const items: GenerationItem[] = [];
      snapshot.forEach((doc) => {
        const d = doc.data();
        if (d.userId === user.uid) {
          items.push({
            id: Number(d.id) || Date.now(),
            title: d.title,
            content: d.content,
            date: d.date,
            userId: d.userId
          });
        }
      });
      // Sort client-side to bypass index requirements safely
      items.sort((a, b) => b.id - a.id);
      setRecentGenerations(items);
      setLoading(false);
    }, (err) => {
      console.warn("Firestore history stream sync error - falling back to local offline history:", err);
      setRecentGenerations(getLocalHistory(user.uid));
      setLoading(false);
    });

    // Active idea shelf synced stream
    const unsubIdeas = onSnapshot(ideasQuery, (snapshot) => {
      const items: SavedIdeaItem[] = [];
      snapshot.forEach((doc) => {
        const d = doc.data();
        if (d.userId === user.uid) {
          items.push({
            id: Number(d.id) || Date.now(),
            title: d.title,
            content: d.content,
            date: d.date,
            userId: d.userId
          });
        }
      });
      // Sort client-side
      items.sort((a, b) => b.id - a.id);
      setSavedIdeas(items);
    }, (err) => {
      console.warn("Firestore ideas steam sync error - falling back to local offline ideas:", err);
      setSavedIdeas(getLocalIdeas(user.uid));
      setLoading(false);
    });

    // Active user activities synced stream
    const unsubActivities = onSnapshot(activitiesQuery, (snapshot) => {
      const items: UserActivityItem[] = [];
      snapshot.forEach((doc) => {
        const d = doc.data();
        if (d.userId === user.uid) {
          items.push({
            id: Number(d.id) || Date.now(),
            userId: d.userId,
            actionType: d.actionType as any,
            actionTitle: d.actionTitle,
            description: d.description || '',
            timestamp: d.timestamp || '',
            createdAt: d.createdAt || ''
          });
        }
      });
      // Sort client-side
      items.sort((a, b) => b.id - a.id);
      setUserActivities(items);
    }, (err) => {
      console.warn("Firestore activities stream sync error - falling back to local offline activities:", err);
      setUserActivities(getLocalActivities(user.uid));
    });

    return () => {
      unsubHistory();
      unsubIdeas();
      unsubActivities();
    };
  }, [user]);

  // Helper to create a local session when Firebase authentication providers are restricted or disabled in console
  const createFallbackUser = (providerName: string, userEmail?: string) => {
    const email = userEmail || `${providerName.toLowerCase().replace(/\s+/g, '')}.user@axe-hours.ai`;
    const name = userEmail ? (userEmail.split('@')[0] || providerName) : `${providerName} User`;
    const uid = `local_${providerName.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;
    
    const fallbackFirebaseUser = {
      uid,
      email,
      displayName: name,
      photoURL: `https://api.dicebear.com/7.x/bottts/svg?seed=${uid}`,
      emailVerified: true,
      isAnonymous: false,
    } as unknown as FirebaseUser;

    const fallbackUserProfile: UserProfile = {
      uid,
      email,
      name,
      handle: name.toLowerCase().replace(/\s+/g, '_'),
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${uid}`,
      bio: `Creator session initialized via ${providerName}.`,
      role: 'Creator',
      tier: 'pro',
      customInstructions: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    localStorage.setItem('axe_hours_local_session', JSON.stringify({ user: fallbackFirebaseUser, dbUser: fallbackUserProfile }));

    setUser(fallbackFirebaseUser);
    setDbUser(fallbackUserProfile);
    setRecentGenerations(getLocalHistory(uid));
    setSavedIdeas(getLocalIdeas(uid));
    setUserActivities(getLocalActivities(uid));
    setLoading(false);
  };

  // Firebase auth bindings
  const loginWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setGoogleAccessToken(credential.accessToken);
      }
    } catch (e: any) {
      if (e?.code?.includes("operation-not-allowed") || e?.message?.includes("operation-not-allowed") || e?.code?.includes("provider-disabled")) {
        console.info("Google Auth not enabled in Firebase Console; initializing fallback session.");
        createFallbackUser("Google");
        return;
      }
      console.error("Google Auth Failure: ", e);
      throw e;
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (e: any) {
      if (e?.code?.includes("operation-not-allowed") || e?.message?.includes("operation-not-allowed") || e?.code?.includes("provider-disabled")) {
        console.info("Email Auth not enabled in Firebase Console; initializing fallback session.");
        createFallbackUser("Email", email);
        return;
      }
      console.error("Email Login Failure: ", e);
      throw e;
    }
  };

  const signUpWithEmail = async (email: string, pass: string) => {
    try {
      await createUserWithEmailAndPassword(auth, email, pass);
    } catch (e: any) {
      if (e?.code?.includes("operation-not-allowed") || e?.message?.includes("operation-not-allowed") || e?.code?.includes("provider-disabled")) {
        console.info("Email Auth not enabled in Firebase Console; initializing fallback session.");
        createFallbackUser("Email", email);
        return;
      }
      console.error("Email Signup Failure: ", e);
      throw e;
    }
  };

  const logout = async () => {
    try {
      localStorage.removeItem('axe_hours_local_session');
      await signOut(auth);
    } catch (e) {
      console.error("Logout Failure: ", e);
    } finally {
      // Purge state variables
      setUser(null);
      setDbUser(null);
      setGoogleAccessToken(null);
      setRecentGenerations([]);
      setSavedIdeas([]);
      setUserActivities([]);
    }
  };

  // Secure db methods
  const saveToHistoryDB = async (title: string, content: string) => {
    const id = Date.now();
    const date = new Date().toLocaleTimeString();

    if (user) {
      const path = 'recent_generations';
      const newItem = { id, title, content, date };
      const updated = [newItem, ...getLocalHistory(user.uid)].slice(0, 10);
      localStorage.setItem(`axe_hours_recent_generations_${user.uid}`, JSON.stringify(updated));
      try {
        const docRef = doc(db, path, String(id));
        await setDoc(docRef, {
          id: String(id),
          userId: user.uid,
          title,
          content,
          date,
          createdAt: new Date().toISOString()
        });
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, path);
      }
    } else {
      // Local sandbox state
      const newItem = { id, title, content, date };
      const updated = [newItem, ...getLocalHistory()].slice(0, 10);
      setRecentGenerations(updated);
      localStorage.setItem("axe_hours_recent_generations", JSON.stringify(updated));
    }
  };

  const saveIdeaDB = async (idea: { title: string; content: string }) => {
    const id = Date.now();
    const date = new Date().toLocaleTimeString();

    if (user) {
      const path = 'saved_ideas';
      const newItem = { ...idea, id, date };
      const updated = [newItem, ...getLocalIdeas(user.uid)];
      localStorage.setItem(`axe_hours_saved_ideas_${user.uid}`, JSON.stringify(updated));
      try {
        const docRef = doc(db, path, String(id));
        await setDoc(docRef, {
          id: String(id),
          userId: user.uid,
          title: idea.title,
          content: idea.content,
          date,
          createdAt: new Date().toISOString()
        });
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, path);
      }
    } else {
      // Local sandboxed index bounds check
      const current = getLocalIdeas();
      if (current.length >= 5) {
        throw new Error("Free Sandbox limit exceeded (5 ideas). Register for a free account to unlock infinite Cloud database storage!");
      }
      const newItem = { ...idea, id, date };
      const updated = [newItem, ...current];
      setSavedIdeas(updated);
      localStorage.setItem("axe_hours_saved_ideas", JSON.stringify(updated));
    }
  };

  const updateIdeaDB = async (id: number, updatedFields: Partial<{ title: string; content: string }>) => {
    if (user) {
      const path = 'saved_ideas';
      const local = getLocalIdeas(user.uid);
      const updated = local.map(idea => idea.id === id ? { ...idea, ...updatedFields } : idea);
      localStorage.setItem(`axe_hours_saved_ideas_${user.uid}`, JSON.stringify(updated));
      try {
        const docRef = doc(db, path, String(id));
        await setDoc(docRef, {
          ...updatedFields,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, path);
      }
    } else {
      const local = getLocalIdeas();
      const updated = local.map(idea => idea.id === id ? { ...idea, ...updatedFields } : idea);
      setSavedIdeas(updated);
      localStorage.setItem("axe_hours_saved_ideas", JSON.stringify(updated));
    }
  };

  const removeIdeaDB = async (id: number) => {
    if (user) {
      const path = 'saved_ideas';
      const updated = getLocalIdeas(user.uid).filter(idea => idea.id !== id);
      localStorage.setItem(`axe_hours_saved_ideas_${user.uid}`, JSON.stringify(updated));
      try {
        const matched = savedIdeas.find(idea => idea.id === id);
        if (matched && matched.userId !== user.uid) {
          throw new Error("Permission Denied: Cannot delete other user's saved ideas.");
        }
        const docRef = doc(db, path, String(id));
        await deleteDoc(docRef);
      } catch (e) {
        handleFirestoreError(e, OperationType.DELETE, path);
      }
    } else {
      const updated = getLocalIdeas().filter(idea => idea.id !== id);
      setSavedIdeas(updated);
      localStorage.setItem("axe_hours_saved_ideas", JSON.stringify(updated));
    }
  };

  const updateProfile = async (profileUpdates: Partial<UserProfile>) => {
    if (!user || !dbUser) return;
    const path = `users/${user.uid}`;
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const updatedData = {
        ...dbUser,
        ...profileUpdates,
        updatedAt: new Date().toISOString()
      };
      await setDoc(userDocRef, updatedData);
      setDbUser(updatedData);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, path);
    }
  };

  const logUserActivity = async (
    actionType: 'generate' | 'save_idea' | 'remove_idea' | 'import_hook' | 'competitor_intel' | 'fetch_script' | 'profile_update' | 'custom_search',
    actionTitle: string,
    description: string
  ) => {
    const id = Date.now();
    const timestamp = new Date().toLocaleString();
    const createdAt = new Date().toISOString();

    if (user) {
      const path = 'user_activities';
      const newItem: UserActivityItem = { id, actionType, actionTitle, description, timestamp, createdAt };
      const updated = [newItem, ...getLocalActivities(user.uid)].slice(0, 100);
      localStorage.setItem(`axe_hours_user_activities_${user.uid}`, JSON.stringify(updated));
      try {
        const docRef = doc(db, path, String(id));
        await setDoc(docRef, {
          id: String(id),
          userId: user.uid,
          actionType,
          actionTitle,
          description,
          timestamp,
          createdAt
        });
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, path);
      }
    } else {
      const newItem: UserActivityItem = { id, actionType, actionTitle, description, timestamp, createdAt };
      const updated = [newItem, ...getLocalActivities()].slice(0, 100);
      setUserActivities(updated);
      localStorage.setItem("axe_hours_user_activities", JSON.stringify(updated));
    }
  };

  const clearActivitiesDB = async () => {
    if (user) {
      const path = 'user_activities';
      try {
        for (const item of userActivities) {
          if (item.userId === user.uid) {
            const docRef = doc(db, path, String(item.id));
            await deleteDoc(docRef);
          }
        }
      } catch (e) {
        handleFirestoreError(e, OperationType.DELETE, path);
      }
    } else {
      setUserActivities([]);
      localStorage.removeItem("axe_hours_user_activities");
    }
  };

  return (
    <FirebaseContext.Provider value={{
      user,
      dbUser,
      recentGenerations,
      savedIdeas,
      userActivities,
      loading,
      googleAccessToken,
      setGoogleAccessToken,
      loginWithGoogle,
      loginWithEmail,
      signUpWithEmail,
      logout,
      saveToHistoryDB,
      saveIdeaDB,
      updateIdeaDB,
      removeIdeaDB,
      updateProfile,
      logUserActivity,
      clearActivitiesDB
    }}>
      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = () => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
};
