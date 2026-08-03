import React, { useState, useEffect, lazy, Suspense } from 'react';
import { db, auth } from './lib/firebase';
import { Sidebar } from './components/Sidebar';
import { TopNav } from './components/TopNav';
import { Footer } from './components/Footer';
import { AIPopoutAssistant } from './components/AIPopoutAssistant';
import { OnboardingTour } from './components/OnboardingTour';
import { Settings } from './views/Settings';
import { LandingPage } from './views/LandingPage';
import { SavedIdeas } from './views/SavedIdeas';
import { ViralHooks } from './views/ViralHooks';
import { Profile } from './views/Profile';
import { ActivityLog } from './views/ActivityLog';
import { useFirebase } from './context/FirebaseContext';
import { useToast } from './context/ToastContext';
import { Wand2 } from 'lucide-react';

const Dashboard = lazy(() => import('./views/Dashboard').then(m => ({ default: m.Dashboard })));
const AIGenerator = lazy(() => import('./views/AIGenerator').then(m => ({ default: m.AIGenerator })));
const Analytics = lazy(() => import('./views/Analytics').then(m => ({ default: m.Analytics })));
const CompetitorIntel = lazy(() => import('./views/CompetitorIntel').then(m => ({ default: m.CompetitorIntel })));
const ScriptFetcher = lazy(() => import('./views/ScriptFetcher').then(m => ({ default: m.ScriptFetcher })));

interface UserData {
  email: string;
  name?: string;
  handle?: string;
  avatar?: string;
  bio?: string;
  role?: string;
  uid?: string;
  tier?: string;
  customInstructions?: string;
}

interface GenerationItem {
  id: number;
  title: string;
  content: string;
  date: string;
}

interface SavedIdeaItem {
  id: number;
  title: string;
  content: string;
  date: string;
}

export default function App() {
  const { 
    user: firebaseUser, 
    dbUser, 
    recentGenerations: dbRecentGenerations,
    savedIdeas, 
    userActivities,
    loading: firebaseLoading,
    logout: firebaseLogout,
    saveToHistoryDB,
    saveIdeaDB,
    updateIdeaDB,
    removeIdeaDB,
    updateProfile,
    logUserActivity,
    clearActivitiesDB
  } = useFirebase();

  const { addToast } = useToast();

  const [recentGenerations, setRecentGenerations] = useState<any[]>([]);

  useEffect(() => {
    if (dbRecentGenerations && dbRecentGenerations.length > 0) {
      setRecentGenerations(dbRecentGenerations);
    } else if (savedIdeas && savedIdeas.length > 0) {
      setRecentGenerations(savedIdeas);
    } else {
      setRecentGenerations([]);
    }
  }, [dbRecentGenerations, savedIdeas]);

  const [localUser, setLocalUser] = useState<UserData | null>(() => {
    const saved = localStorage.getItem("axe_hours_user");
    return saved ? JSON.parse(saved) : null;
  });

  const [currentView, setCurrentView] = useState('dashboard');
  const [showNotifications, setShowNotifications] = useState(false);
  const [isTourOpen, setIsTourOpen] = useState(false);

  // General tab switcher listener
  useEffect(() => {
    const handleViewChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.view) {
        setCurrentView(customEvent.detail.view);
      }
    };
    window.addEventListener("change-active-view", handleViewChange);
    return () => window.removeEventListener("change-active-view", handleViewChange);
  }, []);

  // Initialize and load user theme
  useEffect(() => {
    const activeUid = dbUser?.uid || firebaseUser?.uid || localUser?.uid || "guest";
    const savedTheme = localStorage.getItem(`axe_hours_theme_${activeUid}`) || localStorage.getItem("axe_hours_theme") || "purple";
    document.documentElement.setAttribute("data-theme", savedTheme);
  }, [dbUser?.uid, firebaseUser?.uid, localUser?.uid]);

  const handleLogin = async (userData: UserData) => {
    if (dbUser) {
      await updateProfile({
        name: userData.name || '',
        handle: userData.handle || '',
        avatar: userData.avatar || '',
        bio: userData.bio || '',
        role: userData.role || ''
      });
    } else {
      setLocalUser(userData);
      localStorage.setItem("axe_hours_user", JSON.stringify(userData));
    }
    setCurrentView('dashboard');
  };

  const handleLogout = async () => {
    if (firebaseUser) {
      await firebaseLogout();
    }
    setLocalUser(null);
    localStorage.removeItem("axe_hours_user");
  };

  // Derive active user object: either Firestore profile or local Sandbox guest creator
  const user: UserData | null = dbUser ? {
    email: dbUser.email,
    name: dbUser.name,
    handle: dbUser.handle,
    avatar: dbUser.avatar,
    bio: dbUser.bio,
    role: dbUser.role,
    uid: dbUser.uid,
    tier: dbUser.tier,
    customInstructions: dbUser.customInstructions || ""
  } : (firebaseUser ? {
    email: firebaseUser.email || '',
    name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Axe Creator',
    handle: (firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'creator').toLowerCase().replace(/\s+/g, '_'),
    avatar: firebaseUser.photoURL || '',
    bio: firebaseUser.email === "atharvsharma1259@gmail.com" ? 'Lead AI Architect & System Administrator for Axe Hours.' : 'Content Creator & Hook Architect',
    role: firebaseUser.email === "atharvsharma1259@gmail.com" ? 'Administrator' : 'Creator',
    uid: firebaseUser.uid,
    tier: firebaseUser.email === "atharvsharma1259@gmail.com" ? 'agency' : 'pro',
    customInstructions: ""
  } : localUser);

  const [selectedHistoryItem, setSelectedHistoryItem] = useState<any | null>(null);

  const saveToHistory = async (title: string, content: string) => {
    await saveToHistoryDB(title, content);
    await logUserActivity('generate', `Generated Script: "${title}"`, `Created a retention script of ${content.length} characters using the generation engine.`);
  };
  
  const saveIdea = async (idea: { title: string; content: string }) => {
    try {
      await saveIdeaDB(idea);
      addToast("Creator Idea saved securely to your cloud vault! 🌌", "success");
      await logUserActivity('save_idea', `Saved Idea: "${idea.title}"`, `Saved proposal to the ideas board: "${idea.title}"`);
    } catch (err: any) {
      addToast("Failed to save idea: " + (err?.message || err), "error");
    }
  };
  
  const removeIdea = async (id: number) => {
    try {
      // Find historical title to log removal beautifully
      const idea = savedIdeas.find(i => i.id === id);
      const title = idea?.title || String(id);
      await removeIdeaDB(id);
      addToast("Idea successfully removed from your blueprint vault.", "info");
      await logUserActivity('remove_idea', `Removed Idea: "${title}"`, `Purged idea from the ideas board.`);
    } catch (err: any) {
      addToast("Failed to delete idea.", "error");
    }
  };

  const updateIdea = async (id: number, content: string) => {
    try {
      if (updateIdeaDB) {
        await updateIdeaDB(id, { content });
        addToast("Idea blueprint shortened and updated instantly! ⚡", "success");
      }
    } catch (err: any) {
      addToast("Failed to update idea.", "error");
    }
  };

  const handleSelectHistory = (item: any) => {
    setSelectedHistoryItem(item);
    setCurrentView('generator');
    addToast("Viral Hook blueprint loaded into the AI Generator workspace! ⚡", "success");
  };

  if (firebaseLoading) {
    return (
      <div id="loading-fallback-viewport" className="min-h-screen bg-[#020203] flex flex-col items-center justify-center font-sans overflow-hidden relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-purple-500/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="text-center space-y-6 relative z-10 select-none">
          <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-full inline-block animate-pulse">
            <Wand2 className="text-[#a855f7] animate-spin-slow" size={28} />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-purple-400">Loading Axe Hours AI</h2>
            <p className="text-[10px] text-gray-500 font-mono tracking-wider">Syncing creator profiles & active cloud history...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LandingPage onEnter={handleLogin} />;
  }

  return (
    <div id="axe-hours-main-app-shell" className="relative min-h-screen bg-black text-white font-sans overflow-hidden">
      {/* Ambient Atmospheric Orbs */}
      <div id="ambient-bg-orb-left" className="fixed -top-48 -left-48 w-[600px] h-[600px] bg-primary/20 blur-[150px] rounded-full pointer-events-none" />
      <div id="ambient-bg-orb-right" className="fixed -bottom-48 -right-48 w-[600px] h-[600px] bg-secondary/20 blur-[150px] rounded-full pointer-events-none" />

      <div id="axe-hours-layout-split" className="flex relative z-10 min-h-screen">
        <Sidebar 
          activeTab={currentView} 
          setActiveTab={setCurrentView} 
          recentGenerations={recentGenerations}
          onSelectHistory={handleSelectHistory}
          onLogout={handleLogout}
          user={user}
        />
        
        <div id="axe-hours-viewport" className="flex-1 flex flex-col md:ml-64 min-h-screen">
          <TopNav 
            showNotifications={showNotifications} 
            setShowNotifications={setShowNotifications} 
            user={user}
            onUpdateUser={handleLogin}
            onSelectHistory={handleSelectHistory}
            setCurrentView={setCurrentView}
            currentView={currentView}
            onOpenTour={() => setIsTourOpen(true)}
          />
          

          
          <main id="axe-hours-content-body" className="flex-1 p-4 md:p-8">
            <Suspense fallback={
              <div className="min-h-[400px] flex flex-col items-center justify-center p-8 text-center space-y-4">
                <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl animate-pulse">
                  <Wand2 className="text-purple-400 animate-spin-slow" size={24} />
                </div>
                <p className="text-xs font-mono uppercase tracking-widest text-purple-300 animate-pulse">
                  Loading workspace module...
                </p>
              </div>
            }>
              {currentView === 'dashboard' && (
                <Dashboard 
                  recentGenerations={recentGenerations}
                  onSelectHistory={handleSelectHistory}
                  onViewAllGens={() => setCurrentView('generator')}
                />
              )}
              {currentView === 'generator' && (
                <AIGenerator 
                  saveToHistory={saveToHistory}
                  selectedHistoryItem={selectedHistoryItem}
                  clearSelectedHistoryItem={() => setSelectedHistoryItem(null)}
                />
              )}
              {currentView === 'saved' && (
                <SavedIdeas 
                  savedIdeas={savedIdeas}
                  removeIdea={removeIdea}
                  updateIdea={updateIdea}
                  onLoadIntoGenerator={handleSelectHistory}
                />
              )}
              {currentView === 'viral' && (
                <ViralHooks 
                  onSelectHook={handleSelectHistory}
                />
              )}
              {currentView === 'competitor-intel' && (
                <CompetitorIntel />
              )}
              {currentView === 'script-fetcher' && (
                <ScriptFetcher />
              )}
              {currentView === 'activity-log' && (
                <ActivityLog />
              )}
              {currentView === 'settings' && <Settings />}
              {currentView === 'analytics' && <Analytics recentGenerations={recentGenerations} />}
              {currentView === 'profile' && (
                <Profile 
                  user={user} 
                  onUpdateUser={handleLogin} 
                  savedIdeas={savedIdeas} 
                />
              )}
            </Suspense>
          </main>
          <Footer />
        </div>
      </div>
      <AIPopoutAssistant currentView={currentView} setCurrentView={setCurrentView} />
      <OnboardingTour isOpen={isTourOpen} onClose={() => setIsTourOpen(false)} />
    </div>
  );
}
