import React, { useState, useEffect } from "react";
import { UserProfile, MockSession, InterviewType } from "../types";
import { 
  User, Calendar, Play, FileText, ChevronRight, BarChart3, Clock, 
  Search, Award, History, Sparkles, CheckCircle2, Shield
} from "lucide-react";

interface DashboardProps {
  userProfile: UserProfile;
  sessionHistory: MockSession[];
  onStartInterview: (
    type: InterviewType,
    level: number,
    selectedField: string,
    totalQuestions: number,
    difficulty: "easy" | "medium" | "hard",
    timeLimit: number,
    isFresher: boolean
  ) => void;
  onViewFeedback: (session: MockSession) => void;
  onUpdateProfile: (updatedProfile: UserProfile) => void;
}

const interviewFields = [
  "Computer Science",
  "IT",
  "Software Engineering",
  "Civil Engineering",
  "Mechanical Engineering",
  "Electrical Engineering",
  "Electronics Engineering",
  "MBA",
  "Finance",
  "Marketing",
  "HR",
  "Healthcare",
  "Teaching",
  "Government Jobs",
  "Banking",
  "Law",
  "Pharmacy",
  "Agriculture",
  "Architecture",
  "Hotel Management",
  "General Interview"
];

export default function Dashboard({ userProfile, sessionHistory, onStartInterview, onViewFeedback, onUpdateProfile }: DashboardProps) {
  const [activeSessionTab, setActiveSessionTab] = useState<InterviewType>("hr");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedField, setSelectedField] = useState<string>("Computer Science");
  const [questionsCountValue, setQuestionsCountValue] = useState<number | "custom">(5);
  const [customQuestionsCount, setCustomQuestionsCount] = useState<number>(8);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [timeLimit, setTimeLimit] = useState<number>(60);
  const [isFresher, setIsFresher] = useState<boolean>(false);
  const [selectedLevel, setSelectedLevel] = useState<number>(userProfile.currentLevel || 1);

  // Automatically request camera & microphone permissions upon entering the interview dashboard.
  useEffect(() => {
    let activeStream: MediaStream | null = null;
    const requestPermissions = async () => {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          activeStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
          });
          activeStream.getTracks().forEach(track => {
            track.stop();
          });
        }
      } catch (err) {
        console.warn("Dashboard permission solicitor: not supported or denied:", err);
      }
    };
    requestPermissions();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const totalSessions = sessionHistory.length;
  const evaluatedSessions = sessionHistory.filter(s => s.status === "evaluated");
  
  // Calculate analytics averages
  const overallAverage = evaluatedSessions.length > 0 
    ? Math.round(evaluatedSessions.reduce((acc, s) => acc + (s.evaluation?.overallScore || 0), 0) / evaluatedSessions.length)
    : 0;

  const avgComm = evaluatedSessions.length > 0 
    ? Math.round(evaluatedSessions.reduce((acc, s) => acc + (s.evaluation?.communicationScore || 0), 0) / evaluatedSessions.length)
    : 0;

  const avgConf = evaluatedSessions.length > 0 
    ? Math.round(evaluatedSessions.reduce((acc, s) => acc + (s.evaluation?.confidenceScore || 0), 0) / evaluatedSessions.length)
    : 0;

  const avgBody = evaluatedSessions.length > 0 
    ? Math.round(evaluatedSessions.reduce((acc, s) => acc + (s.evaluation?.bodyLanguageScore || 0), 0) / evaluatedSessions.length)
    : 0;

  const avgVoice = evaluatedSessions.length > 0 
    ? Math.round(evaluatedSessions.reduce((acc, s) => acc + (s.evaluation?.voiceAnalysisScore || 0), 0) / evaluatedSessions.length)
    : 0;

  // Track descriptions for launch buttons
  const tracksInfo = {
    hr: {
      title: "HR Screening Track",
      desc: "Designed to prepare you for critical screenings regarding company alignment, culture fitness, salary expectations, and long-term targets.",
      topics: ["Culture fit", "Conflict resolution", "Career goals"]
    },
    technical: {
      title: "Technical Engineering Track",
      desc: "Engineered for deep-dive technical and engineering roles. Covers system constraints, code patterns, optimization plans, and logic frameworks.",
      topics: ["System Design", "Cloud scaling", "Performance loops"]
    },
    behavioral: {
      title: "Behavioral situations Track",
      desc: "Prepares you for the STAR framework (Situation, Task, Action, Result) questions common with major enterprise recruiters.",
      topics: ["Leadership", "STAR Framework", "Mistake responses"]
    },
    aptitude: {
      title: "Aptitude & Logic",
      desc: "Fast paced quantitative analysis, mathematical riddles, and logical workflow descriptions to test raw cognitive reflexes.",
      topics: ["Logical reasoning", "Estimation logs", "Math logic"]
    },
    placement: {
      title: "Campus Placement Preparation",
      desc: "Comprehensive college mock track designed alongside academy guidance to maximize hiring and success statistics.",
      topics: ["Self introductions", "Skill highlights", "Project deep dive"]
    }
  };

  const getPracticeRecommendations = () => {
    return [
      {
        title: "The 3-Second Breath Technique",
        cat: "Confidence Drill",
        desc: "Rhythmic breathing exercises programmed to lower voice pitch, steady heart pace, and eliminate rapid vocal start spikes.",
        time: "5 mins"
      },
      {
        title: "STAR Structural Response Blueprint",
        cat: "Recruiting STAR",
        desc: "Interactive guide on parsing prompts instantly to lay out Situation, Task, Action, and Quantitative Outcomes.",
        time: "10 mins"
      }
    ];
  };

  // Filter session records
  const filteredHistory = sessionHistory.filter(session => {
    if (!searchTerm) return true;
    return session.interviewType.toLowerCase().includes(searchTerm.toLowerCase()) || 
           `level ${session.level}`.includes(searchTerm.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-6 sm:p-10 relative overflow-hidden">
      {/* Decorative Light Aesthetic Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f080_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f080_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
      <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-blue-100 rounded-full blur-[140px] pointer-events-none opacity-40" />
      <div className="absolute bottom-[10%] right-[-10%] w-[40%] h-[40%] bg-sky-100 rounded-full blur-[120px] pointer-events-none opacity-40" />

      <div className="max-w-7xl mx-auto space-y-8 relative z-10">
        
        {/* Profile Summary & Performance Telemetry Metrics Row */}
        <div id="dashboard_summary" className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 sm:p-8 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            
            {/* Left: User description info block */}
            <div className="lg:col-span-4 flex items-center space-x-4">
              <div className="w-14 h-14 rounded-xl bg-blue-600 flex items-center justify-center text-white font-extrabold text-xl shadow-lg shadow-blue-500/10 shrink-0">
                {userProfile.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">{userProfile.name}</h2>
                <p className="text-xs text-slate-505 font-medium leading-none mt-1 font-mono">
                  {userProfile.email}
                </p>
                <div className="mt-2.5">
                  <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
                    Highest Unlocked: Level {userProfile.currentLevel || 1} - {
                      (userProfile.currentLevel || 1) === 1 ? "Beginner" :
                      (userProfile.currentLevel || 1) === 2 ? "Basic" :
                      (userProfile.currentLevel || 1) === 3 ? "Intermediate" :
                      (userProfile.currentLevel || 1) === 4 ? "Advanced" : "Expert"
                    }
                  </span>
                </div>
                <span className="inline-block text-[9px] text-slate-400 font-medium font-mono mt-2">
                  Member Since: {userProfile.joinedDate}
                </span>
              </div>
            </div>

            {/* Right: Analytical scorecard averages (Professional/Biometric indicators, no game mechanics) */}
            <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-5 gap-4 pt-4 lg:pt-0 border-t lg:border-t-0 border-slate-100">
              
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-center sm:text-left">
                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Completed Sessions</span>
                <span className="text-xl font-black text-slate-800 mt-1 block leading-none">{totalSessions}</span>
                <span className="text-[9px] text-slate-400 font-medium block mt-1.5 leading-none">Diagnostic Record List</span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-center sm:text-left">
                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Avg Overall Score</span>
                <span className="text-xl font-black text-blue-600 mt-1 block leading-none">
                  {overallAverage > 0 ? overallAverage : "—"}
                </span>
                <span className="text-[9px] text-slate-400 font-medium block mt-1.5 leading-none">Global Accuracy Grade</span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-center sm:text-left">
                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Grammar & Vocab</span>
                <span className="text-xl font-black text-slate-800 mt-1 block leading-none">
                  {avgComm > 0 ? avgComm : "—"}
                </span>
                <span className="text-[9px] text-slate-400 font-medium block mt-1.5 leading-none">Verbal Accuracy Score</span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-center sm:text-left">
                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Stability Index</span>
                <span className="text-xl font-black text-slate-800 mt-1 block leading-none">
                  {avgConf > 0 ? avgConf : "—"}
                </span>
                <span className="text-[9px] text-slate-400 font-medium block mt-1.5 leading-none">Biometric Confidence</span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-center sm:text-left">
                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Executive Posture</span>
                <span className="text-xl font-black text-slate-800 mt-1 block leading-none">
                  {avgBody > 0 ? avgBody : "—"}
                </span>
                <span className="text-[9px] text-slate-400 font-medium block mt-1.5 leading-none">Posture Align Metric</span>
              </div>

            </div>

          </div>
        </div>

        {/* Setup and Launcher Block */}
        <div className="bg-white border border-slate-200/95 shadow-sm rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="space-y-1 pb-4 border-b border-slate-100">
            <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-600 animate-pulse" />
              Configure Mock Assessment Session
            </h3>
            <p className="text-xs text-slate-505 font-medium">
              Calibrate track characteristics, target category, and timeline constraints below to initiate professional adaptive evaluation.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Variable Configurations (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Category Track (HR, Tech, Situational, Aptitude, Place) */}
              <div className="space-y-3">
                <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">1. Target Recruiter Category Track</label>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  {(["hr", "technical", "behavioral", "aptitude", "placement"] as InterviewType[]).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveSessionTab(tab)}
                      className={`capitalize text-xs font-bold py-2.5 px-1.5 rounded-xl border transition-all text-center flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                        activeSessionTab === tab 
                          ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/10 font-black"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                      }`}
                    >
                      <span className="text-base">
                        {tab === "hr" ? "👤" : tab === "technical" ? "💻" : tab === "behavioral" ? "🤝" : tab === "aptitude" ? "🧠" : "🎓"}
                      </span>
                      <span className="truncate w-full block text-[11px]">
                        {tab === "hr" ? "HR screening" : tab}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Professional Field Target */}
              <div className="space-y-2.5">
                <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">2. Target Role / Business Field</label>
                <div className="relative">
                  <select
                    value={selectedField}
                    onChange={(e) => setSelectedField(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-800 text-xs sm:text-sm font-bold px-4 py-3 rounded-xl transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/15 appearance-none cursor-pointer"
                  >
                    {interviewFields.map((field) => (
                      <option key={field} value={field} className="font-semibold text-slate-800 bg-white">
                        💼 {field}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                    <ChevronRight className="w-4 h-4 rotate-90" />
                  </div>
                </div>
              </div>

              {/* Target Practice Level Section */}
              <div className="space-y-2.5">
                <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">3. Target Practice Level (Syllabus progression)</label>
                <div className="flex flex-col gap-1.5 pb-2">
                  {[
                    { val: 1, name: "Level 1 - Beginner", desc: "Foundational HR warmups, self-introduction, and bio pitches." },
                    { val: 2, name: "Level 2 - Basic", desc: "Standard situational behavior, workflows, and core client basics." },
                    { val: 3, name: "Level 3 - Intermediate", desc: "STAR framework behavioral scenarios and standard logic cases." },
                    { val: 4, name: "Level 4 - Advanced", desc: "High-stakes conflict resolutions and structural scaling audits." },
                    { val: 5, name: "Level 5 - Expert", desc: "Executive leadership pitfalls, intense system mock designs, and pitches." }
                  ].map((lvl) => {
                    const unlocked = lvl.val === 1 || (userProfile.completedLevels || []).includes(lvl.val - 1);
                    const isSelected = selectedLevel === lvl.val;
                    
                    return (
                      <button
                        key={lvl.val}
                        type="button"
                        disabled={!unlocked}
                        onClick={() => setSelectedLevel(lvl.val)}
                        className={`text-left p-2.5 rounded-xl border transition-all flex items-start gap-2.5 cursor-pointer ${
                          isSelected
                            ? "bg-blue-50/80 border-blue-500 text-blue-900 shadow-sm"
                            : unlocked
                              ? "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300"
                              : "bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed opacity-60"
                        }`}
                      >
                        <div className="mt-0.5 shrink-0 text-xs">
                          {unlocked ? (isSelected ? "🔵" : "⚪") : "🔒"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[11px]">{lvl.name}</span>
                            {unlocked && (
                              <span className={`text-[8px] px-1.5 py-0.5 rounded font-mono font-bold leading-none ${
                                (userProfile.completedLevels || []).includes(lvl.val)
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                                  : "bg-blue-50 text-blue-700 border border-blue-250/30"
                              }`}>
                                {(userProfile.completedLevels || []).includes(lvl.val) ? "PASSED" : "UNLOCKED"}
                              </span>
                            )}
                          </div>
                          <p className="text-[10.5px] opacity-80 leading-normal mt-0.5">{lvl.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Difficulty Selection (Easy, Medium, Hard) */}
              <div className="space-y-2.5">
                <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">4. Interview Difficulty Tier</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["easy", "medium", "hard"] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setDifficulty(opt)}
                      className={`font-bold py-2.5 rounded-xl border transition-all text-center flex flex-col items-center justify-center cursor-pointer text-xs capitalize ${
                        difficulty === opt
                          ? "bg-blue-600 border-blue-600 text-white shadow-sm font-black"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                      }`}
                    >
                      <span>{opt}</span>
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-505 leading-normal italic">
                  {difficulty === "easy" && "• Easy selects foundational HR screening warmups (e.g., self-introductions, basic strengths and soft skill pitches)."}
                  {difficulty === "medium" && "• Medium includes core technical methodologies, system structures, and situational STAR scenarios."}
                  {difficulty === "hard" && "• Hard selects strict engineering systems scaling plans, abstract conflict resolutions, and advanced design traps."}
                </p>
              </div>

            </div>

            {/* Rounds & Constraints (5 cols) */}
            <div className="lg:col-span-5 space-y-6 bg-slate-50/60 p-5 border border-slate-150 rounded-2xl flex flex-col justify-between">
              
              <div className="space-y-5">
                {/* Round Counts Selection */}
                <div className="space-y-2">
                  <label className="text-[10px] font-extrabold uppercase text-slate-450 tracking-wider block">5. Diagnostic Round Counts</label>
                  <div className="grid grid-cols-5 gap-2">
                    {([3, 5, 10, 15, "custom"] as const).map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setQuestionsCountValue(opt)}
                        className={`font-bold py-2 rounded-xl border transition-all text-center flex flex-col items-center justify-center cursor-pointer text-xs ${
                          questionsCountValue === opt
                            ? "bg-blue-600 border-blue-600 text-white font-black"
                            : "bg-white text-slate-650 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        <span>{opt === "custom" ? "Custom" : opt}</span>
                      </button>
                    ))}
                  </div>

                  {questionsCountValue === "custom" && (
                    <div className="flex items-center gap-2 mt-2 animate-in slide-in-from-top-1 duration-150">
                      <span className="text-[11px] font-semibold text-slate-500 whitespace-nowrap">Enter custom rounds (1 to 20):</span>
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={customQuestionsCount}
                        onChange={(e) => {
                          const parsed = parseInt(e.target.value);
                          if (!isNaN(parsed)) {
                            setCustomQuestionsCount(Math.min(20, Math.max(1, parsed)));
                          }
                        }}
                        className="w-16 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800 font-extrabold focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-center"
                      />
                    </div>
                  )}
                </div>

                {/* Answer Duration Cutoff limit */}
                <div className="space-y-2">
                  <label className="text-[10px] font-extrabold uppercase text-slate-455 tracking-wider block">6. Answer Time Limit</label>
                  <div className="grid grid-cols-3 gap-2">
                    {([30, 60, 120] as const).map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setTimeLimit(opt)}
                        className={`font-bold py-2 rounded-xl border transition-all text-center flex flex-col items-center justify-center cursor-pointer text-xs ${
                          timeLimit === opt
                            ? "bg-blue-600 border-blue-600 text-white font-black"
                            : "bg-white text-slate-655 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        <span>{opt === 30 ? "30s" : opt === 60 ? "1 min" : "2 mins"}</span>
                      </button>
                    ))}
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium block">
                    The voice recognition core dynamically terminates recording and locks answers upon timeout limits.
                  </span>
                </div>

                {/* Beginner Warmup Mode Toggle */}
                <div className="flex items-center justify-between border-t border-slate-200/80 pt-4">
                  <div className="space-y-0.5 pr-2">
                    <span className="block text-[10px] font-mono text-blue-600 font-bold uppercase tracking-wider">Placement Warmup</span>
                    <h5 className="text-xs font-bold text-slate-800">Beginner Mode Warmup</h5>
                    <p className="text-[10px] text-slate-450 leading-tight">Forces basic introductory screening topics.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsFresher(!isFresher)}
                    className={`w-10 h-5 flex items-center rounded-full p-0.5 cursor-pointer transition-colors shrink-0 ${
                      isFresher ? "bg-blue-600" : "bg-slate-300"
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow transform transition-transform ${
                        isFresher ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Quick Summary Row & Button to trigger room */}
              <div className="border-t border-slate-200/80 pt-4 mt-2 space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-600 font-mono">
                  <span>Track: <strong className="capitalize text-slate-800 font-bold">{activeSessionTab}</strong></span>
                  <span>Rounds: {questionsCountValue === "custom" ? customQuestionsCount : questionsCountValue} Questions</span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const actualCount = questionsCountValue === "custom" ? customQuestionsCount : questionsCountValue;
                    onStartInterview(activeSessionTab, selectedLevel, selectedField, actualCount, difficulty, timeLimit, isFresher);
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-3.5 px-4 rounded-xl text-xs sm:text-sm shadow-md shadow-blue-500/10 flex items-center justify-center gap-2 transition-all cursor-pointer hover:-translate-y-0.5"
                >
                  <Play className="w-4 h-4 text-white fill-white" />
                  <span>Launch Practice Room</span>
                  <ChevronRight className="w-4 h-4 text-white" />
                </button>
              </div>

            </div>

          </div>
        </div>

        {/* History Evaluations & Recommended Modules (2-Column Grid) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-300">
          
          {/* Previous Assessments Table - 8 Columns */}
          <div className="lg:col-span-8 bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                  <History className="w-4 h-4 text-blue-600" />
                  Candidate Interview Records & Reports
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">Historic record logs with complete visual analysis portfolios.</p>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter track..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:bg-white w-full sm:w-44 font-semibold"
                />
              </div>
            </div>

            {filteredHistory.length === 0 ? (
              <div className="py-12 text-center text-slate-450 bg-slate-50 border border-dashed border-slate-205 rounded-xl">
                <FileText className="w-9 h-9 mx-auto text-slate-300 mb-2" />
                <p className="text-xs font-bold text-slate-600">No session records registered.</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Launches above will populate transcripts instantly here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-bold bg-slate-50 text-[9px] uppercase tracking-wider">
                      <th className="py-3 px-4 rounded-l-xl">Track Category</th>
                      <th className="py-3 px-4">Field</th>
                      <th className="py-3 px-4">Difficulty</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Accuracy Grade</th>
                      <th className="py-3 px-4 text-right rounded-r-xl">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredHistory.map((item) => {
                      // Map simulated levels to user difficulty labels if they were defined via levels
                      let mappedDifficulty = item.level === 1 ? "Easy" : item.level === 5 ? "Hard" : "Medium";
                      
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3.5 px-4 capitalize font-bold text-slate-900 flex items-center space-x-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                            <span>{item.interviewType === "hr" ? "HR screening" : item.interviewType}</span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 font-semibold truncate max-w-[120px]">
                            {item.selectedField || "General"}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-505 capitalize text-[10px]">
                            {mappedDifficulty}
                          </td>
                          <td className="py-3.5 px-4 text-slate-500 font-medium">
                            {new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-900 font-mono">
                            {item.evaluation ? (
                              <span className={`text-[13px] ${
                                item.evaluation.overallScore >= 12 ? "text-emerald-600" :
                                item.evaluation.overallScore >= 8 ? "text-blue-600" : "text-amber-600"
                              }`}>
                                {item.evaluation.overallScore}
                              </span>
                            ) : (
                              <span className="text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded text-[9px] font-bold">Incomplete</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => onViewFeedback(item)}
                              className="bg-blue-550 hover:bg-blue-600 text-blue-600 hover:text-white border border-blue-100 hover:border-blue-500 text-[10px] font-extrabold px-3 py-1.5 rounded-lg transition-all flex items-center space-x-1 ml-auto cursor-pointer font-mono"
                            >
                              <span>Open Report</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Coaching Modules & Practice Recommendations - 4 Columns */}
          <div className="lg:col-span-4 bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
            <div>
              <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                <Award className="w-4 h-4 text-blue-600" />
                Diagnostic Practice Plan
              </h3>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5 leading-relaxed">
                Personalized communication drills structured to resolve feedback deficiencies.
              </p>
            </div>

            <div className="space-y-3.5 flex-grow font-semibold">
              {getPracticeRecommendations().map((rec, index) => (
                <div key={index} className="bg-slate-50 p-4 border border-slate-100 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between text-[9px] font-mono text-blue-600 uppercase">
                    <span>{rec.cat}</span>
                    <span className="text-slate-400 font-bold">{rec.time}</span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-800 leading-snug">{rec.title}</h4>
                  <p className="text-[10px] text-slate-500 leading-relaxed font-medium">{rec.desc}</p>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-[10px] text-slate-400 font-mono">
              <span>Diagnostic System Status</span>
              <span className="text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-100 uppercase tracking-widest font-black leading-none text-[9px]">
                Safe Suite Online
              </span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
