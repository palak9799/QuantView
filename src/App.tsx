import React, { useState, useEffect } from "react";
import Onboarding from "./components/Onboarding";
import Dashboard from "./components/Dashboard";
import InterviewRoom from "./components/InterviewRoom";
import FeedbackRoom from "./components/FeedbackRoom";
import { UserProfile, MockSession, InterviewType } from "./types";
import { Sparkles, Power, Github, LayoutGrid, Award, LogOut } from "lucide-react";

export default function App() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [sessionHistory, setSessionHistory] = useState<MockSession[]>([]);
  const [activePage, setActivePage] = useState<"onboarding" | "dashboard" | "interview" | "feedback">("onboarding");
  const [currentInterviewType, setCurrentInterviewType] = useState<InterviewType>("hr");
  const [currentLevel, setCurrentLevel] = useState<number>(1);
  const [currentInterviewField, setCurrentInterviewField] = useState<string>("Computer Science");
  const [currentTotalQuestions, setCurrentTotalQuestions] = useState<number>(5);
  const [currentDifficulty, setCurrentDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [currentTimeLimit, setCurrentTimeLimit] = useState<number>(60);
  const [currentIsFresher, setCurrentIsFresher] = useState<boolean>(false);
  const [activeSession, setActiveSession] = useState<MockSession | null>(null);
  const [unlockedLevelMessage, setUnlockedLevelMessage] = useState<string | null>(null);

  // 1. Initialise local cache values at start without bypassing the login screen
  useEffect(() => {
    try {
      const cachedHistory = localStorage.getItem("quantview_history");
      if (cachedHistory) {
        setSessionHistory(JSON.parse(cachedHistory));
      }
    } catch (e) {
      console.warn("Failed to load QuantView history settings:", e);
    }
  }, []);

  // 2. Synchronise profile completion / validation upon manual login event
  const handleOnboardingComplete = (newProfile: UserProfile) => {
    try {
      // Restore cached progress of this specific email if present to preserve level unlocks
      const cachedProfileStr = localStorage.getItem("quantview_profile");
      if (cachedProfileStr) {
        const cachedProfile = JSON.parse(cachedProfileStr);
        if (cachedProfile.email.toLowerCase() === newProfile.email.toLowerCase()) {
          // Sync existing progress
          const syncedProfile = {
            ...newProfile,
            currentLevel: cachedProfile.currentLevel || 1,
            xpPoints: cachedProfile.xpPoints || 0,
            completedLevels: cachedProfile.completedLevels || [],
            badges: cachedProfile.badges || [],
            streakCount: cachedProfile.streakCount || 1,
            targetRole: cachedProfile.targetRole || newProfile.targetRole,
            experienceLevel: cachedProfile.experienceLevel || newProfile.experienceLevel,
            targetIndustry: cachedProfile.targetIndustry || newProfile.targetIndustry,
          };
          localStorage.setItem("quantview_profile", JSON.stringify(syncedProfile));
          setProfile(syncedProfile);
          setActivePage("dashboard");
          return;
        }
      }
    } catch (e) {
      console.warn("Failed to sync cached user profile:", e);
    }

    localStorage.setItem("quantview_profile", JSON.stringify(newProfile));
    setProfile(newProfile);
    setActivePage("dashboard");
  };

  // 3. Initiate Mock Assessment
  const handleStartInterview = (
    type: InterviewType,
    level: number = 1,
    selectedField: string = "Computer Science",
    totalQuestions: number = 5,
    difficulty: "easy" | "medium" | "hard" = "medium",
    timeLimit: number = 60,
    isFresher: boolean = false
  ) => {
    setCurrentInterviewType(type);
    setCurrentLevel(level);
    setCurrentInterviewField(selectedField);
    setCurrentTotalQuestions(totalQuestions);
    setCurrentDifficulty(difficulty);
    setCurrentTimeLimit(timeLimit);
    setCurrentIsFresher(isFresher);
    setActivePage("interview");
  };

  // 4. Save Completed Evaluation Report directly to History
  const handleCompleteSession = (completed: MockSession) => {
    if (!profile) return;

    const sessionWithLevel: MockSession = {
      ...completed,
      level: currentLevel,
      selectedField: currentInterviewField,
      totalQuestions: currentTotalQuestions
    };

    const overall = sessionWithLevel.evaluation?.overallScore || 0;
    let updatedCompleted = [...(profile.completedLevels || [])];

    // Unlock Level 2 after complete Level 1, Level 3 after Level 2, etc. (Threshold: score >= 70)
    if (overall >= 70) {
      if (!updatedCompleted.includes(currentLevel)) {
        updatedCompleted.push(currentLevel);
      }
    }

    // Determine highest unlocked level (starts at 1)
    let nextHighestLevel = 1;
    for (let l = 2; l <= 5; l++) {
      if (updatedCompleted.includes(l - 1)) {
        nextHighestLevel = l;
      }
    }

    let unlockedMessageText: string | null = null;
    if (nextHighestLevel > (profile.currentLevel || 1)) {
      const levelNames: Record<number, string> = {
        2: "Level 2 - Basic",
        3: "Level 3 - Intermediate",
        4: "Level 4 - Advanced",
        5: "Level 5 - Expert"
      };
      const text = levelNames[nextHighestLevel as keyof typeof levelNames] || `Level ${nextHighestLevel}`;
      unlockedMessageText = `🎉 Professional Level Unlocked! You successfully completed Level ${currentLevel} with ${overall}% content score and unlocked ${text}!`;
    }

    const updatedProfile: UserProfile = {
      ...profile,
      completedLevels: updatedCompleted,
      currentLevel: nextHighestLevel
    };

    if (unlockedMessageText) {
      setUnlockedLevelMessage(unlockedMessageText);
    }

    localStorage.setItem("quantview_profile", JSON.stringify(updatedProfile));
    setProfile(updatedProfile);

    const updatedHistory = [sessionWithLevel, ...sessionHistory];
    setSessionHistory(updatedHistory);
    localStorage.setItem("quantview_history", JSON.stringify(updatedHistory));
    
    setActiveSession(sessionWithLevel);
    setActivePage("feedback");
  };

  const handleUpdateProfile = (updatedProfile: UserProfile) => {
    localStorage.setItem("quantview_profile", JSON.stringify(updatedProfile));
    setProfile(updatedProfile);
  };

  const handleViewFeedback = (session: MockSession) => {
    setActiveSession(session);
    setActivePage("feedback");
  };

  const handleCleanSignOut = () => {
    if (confirm("Sign out of QuantView? History records are stored strictly in this browser space.")) {
      localStorage.removeItem("quantview_profile");
      localStorage.removeItem("quantview_history");
      setProfile(null);
      setSessionHistory([]);
      setActivePage("onboarding");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none">
      
      {/* Dynamic Global Top Header Navigation (Dashboard, Feedback Screens) */}
      {profile && activePage !== "interview" && (
        <header className="border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-md sticky top-0 z-50 px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <span className="font-bold text-slate-950 tracking-tighter text-lg text-white">Q</span>
              </div>
              <span className="font-semibold text-lg tracking-tight bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent">
                QuantView <span className="text-xs font-mono px-1.5 py-0.5 ml-1.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400">AI Coach</span>
              </span>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center space-x-1.5 text-xs text-slate-400 px-3 py-1 bg-slate-900 border border-slate-800 rounded-lg">
                <LayoutGrid className="w-3.5 h-3.5 text-cyan-500" />
                <span className="font-semibold text-slate-300">Diagnostic Suite Active</span>
              </div>

              <button
                onClick={handleCleanSignOut}
                className="text-slate-500 hover:text-red-400 text-xs font-medium font-mono px-3 py-1.5 rounded-lg border border-slate-800/80 hover:border-red-500/20 hover:bg-red-500/5 transition-all text-center flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </header>
      )}

      {unlockedLevelMessage && (
        <div className="bg-blue-600 text-white font-semibold text-xs py-3 px-6 flex items-center shadow-lg animate-in slide-in-from-top duration-300">
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
            <span className="font-bold font-mono tracking-wide">{unlockedLevelMessage}</span>
            <button 
              onClick={() => setUnlockedLevelMessage(null)}
              className="ml-4 bg-white/25 hover:bg-white/40 text-white rounded px-3 py-1 text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-all"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Primary Page Router Render Router Box */}
      <div className="flex-grow">
        {activePage === "onboarding" && (
          <Onboarding onComplete={handleOnboardingComplete} />
        )}

        {activePage === "dashboard" && profile && (
          <Dashboard
            userProfile={profile}
            sessionHistory={sessionHistory}
            onStartInterview={handleStartInterview}
            onViewFeedback={handleViewFeedback}
            onUpdateProfile={handleUpdateProfile}
          />
        )}

        {activePage === "interview" && profile && (
          <InterviewRoom
            userProfile={profile}
            interviewType={currentInterviewType}
            interviewLevel={currentLevel}
            selectedField={currentInterviewField}
            totalQuestions={currentTotalQuestions}
            difficulty={currentDifficulty}
            timeLimit={currentTimeLimit}
            isFresher={currentIsFresher}
            onCompleteSession={handleCompleteSession}
            onCancel={() => setActivePage("dashboard")}
          />
        )}

        {activePage === "feedback" && activeSession && (
          <FeedbackRoom
            session={activeSession}
            userProfile={profile}
            onBackToDashboard={() => {
              setActiveSession(null);
              setActivePage("dashboard");
            }}
          />
        )}
      </div>

    </div>
  );
}
