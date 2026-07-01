import React, { useState } from "react";
import { MockSession, UserProfile } from "../types";
import { 
  FileText, Award, Eye, VolumeX, Volume2, ArrowLeft, Download, CheckCircle2, 
  XCircle, Activity, Sparkles, BookOpen, UserCheck, GraduationCap, Target
} from "lucide-react";
import { cleanAndConvertTextToWords } from "./InterviewRoom";

interface FeedbackRoomProps {
  session: MockSession;
  userProfile?: UserProfile;
  onBackToDashboard: () => void;
}

export default function FeedbackRoom({ session, userProfile, onBackToDashboard }: FeedbackRoomProps) {
  const { evaluation, interviewType } = session;
  const [playingVoiceFeedback, setPlayingVoiceFeedback] = useState(false);
  const [activeTab, setActiveTab] = useState<"summary" | "detailed" | "questions">("summary");

  if (!evaluation) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100 p-8">
        <div className="text-center space-y-4 max-w-sm">
          <XCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h2 className="text-xl font-bold">Evaluation Pending</h2>
          <p className="text-sm text-slate-400">This mock interview session is missing quantitative diagnostic assessments.</p>
          <button onClick={onBackToDashboard} className="mt-4 bg-blue-600 px-4 py-2 rounded-lg text-sm font-semibold">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const overall = evaluation.overallScore;
  const commScore = evaluation.communicationScore;
  const confScore = evaluation.confidenceScore;
  const answeredCount = session.questions.filter(q => q.answerText && q.answerText.trim().length > 0).length;
  const totalCount = session.totalQuestions || 5;

  const correctCount = session.questions.filter(q => q.isCorrect).length;
  const wrongCount = session.questions.length - correctCount;
  const accuracyVal = session.questions.length > 0 ? Math.round((correctCount / session.questions.length) * 100) : 0;

  // 1. Text-To-Speech Playback of Coach Detailed Analysis
  const togglePlayVoiceCoach = () => {
    if (!window.speechSynthesis) return;

    if (playingVoiceFeedback) {
      window.speechSynthesis.cancel();
      setPlayingVoiceFeedback(false);
    } else {
      setPlayingVoiceFeedback(true);
      const textToSpeak = evaluation.detailedAnalysisParagraph + 
        " Here are your custom practice recommendations: " + 
        evaluation.practiceRecommendations.join(". ") + 
        " Keep up the outstanding efforts.";
      
      const spokenText = cleanAndConvertTextToWords(textToSpeak);
      const utterance = new SpeechSynthesisUtterance(spokenText);
      const voices = window.speechSynthesis.getVoices();
      const femaleVoice = voices.find(v => {
        const name = v.name.toLowerCase();
        const isEnglish = v.lang.startsWith("en-") || v.lang.startsWith("en_");
        return isEnglish && (
          name.includes("female") || 
          name.includes("samantha") || 
          name.includes("zira") || 
          name.includes("hazel") || 
          name.includes("susan") || 
          name.includes("tessa") || 
          name.includes("victoria") || 
          name.includes("natural") || 
          name.includes("premium") || 
          name.includes("google us english")
        );
      }) || voices.find(v => v.lang.startsWith("en-") && v.name.includes("Google")) || voices.find(v => v.lang.startsWith("en-")) || voices[0];
      if (femaleVoice) utterance.voice = femaleVoice;
      utterance.rate = 0.95; // Slightly slower mentor rate
      
      utterance.onend = () => {
        setPlayingVoiceFeedback(false);
      };
      utterance.onerror = () => {
        setPlayingVoiceFeedback(false);
      };

      window.speechSynthesis.speak(utterance);
    }
  };

  // 2. Direct client-side Text-Dossier / Mock-PDF Downloader
  const downloadReportDossier = () => {
    const reportTemplate = `
======================================================================
                 QUANTVIEW AI ASSESSMENT REPORT
======================================================================
Evaluation Date       : ${new Date(evaluation.date).toLocaleDateString()}
Interview Track       : ${interviewType.toUpperCase()} SCREENING
Overall Performance   : ${evaluation.overallScore} / 20
----------------------------------------------------------------------

=================== SENSORY CORE METRICS ===================
- Communication Skills Score   : ${evaluation.communicationScore} / 20
- Sustained Confidence Score   : ${evaluation.confidenceScore} / 20
- Voice Analysis Score         : ${evaluation.voiceAnalysisScore} / 20
- Facial Expression Score       : ${evaluation.facialExpressionScore} / 20
- Eye Contact Tracker Score    : ${evaluation.eyeContactScore} / 20
- Posture & Form Alignment     : ${evaluation.bodyLanguageScore} / 20
- Technical Depth Score        : ${evaluation.technicalPerformanceScore} / 20

=================== CANDIDATE STRENGTHS ===================
${evaluation.strengths.map((s, idx) => `[${idx + 1}] ${s}`).join("\n")}

=================== AREAS OF IMPROVEMENT ==================
${evaluation.weaknesses.map((w, idx) => `[${idx + 1}] ${w}`).join("\n")}

=================== CORE ERRORS MATCHED ===================
${evaluation.mistakesMade.map((m, idx) => `[${idx + 1}] ${m}`).join("\n")}

=================== CORE MENTOR FEEDS =====================
- Communication Feedback   : ${evaluation.communicationFeedback}
- Postural Feedback        : ${evaluation.bodyLanguageFeedback}
- Gaze Tracker Feedback    : ${evaluation.eyeContactFeedback}
- Vocal Tempo Feedback     : ${evaluation.voiceFeedback}

=================== QUANTVIEW ROADMAP ====================
${evaluation.practiceRecommendations.map((r, idx) => `[*] Module ${idx + 1}: ${r}`).join("\n")}

----------------------------------------------------------------------
QuantView assessment core. This is a certificate and placement review document.
======================================================================
`;

    const blob = new Blob([reportTemplate], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `QuantView_Report_${interviewType}_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-6 sm:p-10 relative overflow-hidden">
      {/* Visual background elements */}
      <div className="absolute top-0 left-10 w-[400px] h-[400px] bg-blue-600/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-5 right-5 w-[300px] h-[300px] bg-teal-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-6xl mx-auto space-y-8 relative z-10">
        
        {/* Navigation Breadcrumb & Header Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <button
            onClick={onBackToDashboard}
            className="flex items-center space-x-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Candidate Dashboard</span>
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={togglePlayVoiceCoach}
              className={`text-xs px-4 py-2 rounded-xl font-bold border transition-all flex items-center gap-2 cursor-pointer ${
                playingVoiceFeedback
                  ? "bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse"
                  : "bg-slate-900 text-slate-300 border-slate-800 hover:text-white hover:bg-slate-800"
              }`}
            >
              {playingVoiceFeedback ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              <span>{playingVoiceFeedback ? "Mute Advisor Voice Coach" : "Play Advisor Voice Explanation"}</span>
            </button>

            <button
              onClick={downloadReportDossier}
              className="bg-blue-600 hover:bg-blue-500 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-blue-500/15"
            >
              <Download className="w-4 h-4" />
              <span>Download Performance Dossier</span>
            </button>
          </div>
        </div>

        {/* Major Top Info Summary Card */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-8 backdrop-blur-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-blue-500/5 to-transparent pointer-events-none" />

          <div className="space-y-4 max-w-xl text-center md:text-left">
            <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Session Certified and Logged</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
              QuantView AI Coach <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">Assessment Dossier</span>
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Your biometric tracking, grammatical vocabulary correctness, postural alignment, conversational pauses, and speech velocity (WPM) records have been analyzed. Review your performance logs below.
            </p>
          </div>

          {/* Major Circle Progress overall Score */}
          <div className="flex-shrink-0 flex flex-col items-center justify-center border-l border-slate-800 md:pl-10">
            {interviewType === "aptitude" ? (
              <div className="relative w-36 h-36 flex items-center justify-center">
                <svg className="absolute w-full h-full transform -rotate-90">
                  <circle cx="72" cy="72" r="62" stroke="#0f172a" strokeWidth="8" fill="transparent" />
                  <circle 
                    cx="72" cy="72" r="62" stroke="#10b981" strokeWidth="10" fill="transparent" 
                    strokeDasharray={`${2 * Math.PI * 62}`}
                    strokeDashoffset={`${2 * Math.PI * 62 * (1 - accuracyVal / 100)}`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="text-center z-10 space-y-0.5">
                  <span className="block text-4xl font-extrabold font-mono text-emerald-400 tracking-tighter">
                    {correctCount}/{session.questions.length}
                  </span>
                  <span className="block text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                    FINAL SCORE
                  </span>
                </div>
              </div>
            ) : (
              <div className="relative w-36 h-36 flex items-center justify-center">
                <svg className="absolute w-full h-full transform -rotate-90">
                  <circle cx="72" cy="72" r="62" stroke="#0f172a" strokeWidth="8" fill="transparent" />
                  <circle 
                    cx="72" cy="72" r="62" stroke="#2563eb" strokeWidth="10" fill="transparent" 
                    strokeDasharray={`${2 * Math.PI * 62}`}
                    strokeDashoffset={`${2 * Math.PI * 62 * (1 - (overall !== undefined ? overall : 0) / 20)}`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="text-center z-10 space-y-0.5">
                  <span className="block text-4xl font-extrabold font-mono text-white tracking-tighter">
                    {overall}
                  </span>
                  <span className="block text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                    OVERALL GRADE
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tab Menu Options */}
        <div className="flex border-b border-slate-800 pt-2 gap-2">
          {(["summary", "detailed", "questions"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`text-xs font-bold py-2.5 px-4 rounded-t-lg transition-colors border-b-2 cursor-pointer ${
                activeTab === tab 
                  ? "border-blue-500 text-blue-400 font-bold bg-slate-900/40"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              {tab === "summary" ? "Sensory Scorecard" : tab === "detailed" ? "Mentor Explanations" : "Transcript Review"}
            </button>
          ))}
        </div>

        {/* Tab Body Contents */}
        {activeTab === "summary" && (
          <div className="space-y-8">
            {interviewType === "aptitude" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                {/* Total Questions */}
                <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-all flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-mono text-slate-500 uppercase tracking-widest">Total Questions</span>
                    <BookOpen className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="flex items-baseline space-x-2">
                    <span className="text-2xl font-bold font-mono text-white">{session.questions.length}</span>
                  </div>
                  <div className="w-full h-1 bg-slate-950 rounded-full overflow-hidden mt-3">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: "100%" }} />
                  </div>
                </div>

                {/* Correct Answers */}
                <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-all flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-mono text-slate-500 uppercase tracking-widest">Correct Answers</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="flex items-baseline space-x-2">
                    <span className="text-2xl font-bold font-mono text-white">{correctCount}</span>
                    <span className="text-[10px] text-slate-500 font-medium">({accuracyVal}%)</span>
                  </div>
                  <div className="w-full h-1 bg-slate-950 rounded-full overflow-hidden mt-3">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${accuracyVal}%` }} />
                  </div>
                </div>

                {/* Wrong Answers */}
                <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-all flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-mono text-slate-500 uppercase tracking-widest">Wrong Answers</span>
                    <XCircle className="w-4 h-4 text-rose-400" />
                  </div>
                  <div className="flex items-baseline space-x-2">
                    <span className="text-2xl font-bold font-mono text-white">{wrongCount}</span>
                    <span className="text-[10px] text-slate-500 font-medium">({100 - accuracyVal}%)</span>
                  </div>
                  <div className="w-full h-1 bg-slate-950 rounded-full overflow-hidden mt-3">
                    <div className="h-full bg-rose-500 rounded-full" style={{ width: `${100 - accuracyVal}%` }} />
                  </div>
                </div>

                {/* Final Score */}
                <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-all flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-mono text-slate-500 uppercase tracking-widest">Final Score</span>
                    <Award className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="flex items-baseline space-x-2">
                    <span className="text-2xl font-bold font-mono text-white">{correctCount}/{session.questions.length}</span>
                  </div>
                  <div className="w-full h-1 bg-slate-950 rounded-full overflow-hidden mt-3">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: `${accuracyVal}%` }} />
                  </div>
                </div>

                {/* Accuracy */}
                <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-all flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-mono text-slate-500 uppercase tracking-widest">Accuracy</span>
                    <Target className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="flex items-baseline space-x-2">
                    <span className="text-2xl font-bold font-mono text-white">{accuracyVal}%</span>
                  </div>
                  <div className="w-full h-1 bg-slate-950 rounded-full overflow-hidden mt-3">
                    <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${accuracyVal}%` }} />
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
                  {[
                    { label: "Verbal Command", val: evaluation.communicationScore !== undefined ? evaluation.communicationScore : 14, max: 20, icon: FileText, color: "text-blue-400" },
                    { label: "Stability / Confidence", val: evaluation.confidenceScore !== undefined ? evaluation.confidenceScore : 14, max: 20, icon: Award, color: "text-teal-400" },
                    { titleSuffix: " (WPM)", label: "Voice Resonance", val: evaluation.voiceAnalysisScore !== undefined ? evaluation.voiceAnalysisScore : 14, max: 20, icon: Activity, color: "text-indigo-400 animate-pulse" },
                    { label: "Gaze Concentration", val: evaluation.eyeContactScore !== undefined ? evaluation.eyeContactScore : 14, max: 20, icon: Eye, color: "text-cyan-400" },
                    { label: "Question Relevance", val: evaluation.questionRelevanceScore !== undefined ? Math.round(evaluation.questionRelevanceScore * 20 / 100) : 14, max: 20, isRelevance: true, feedback: evaluation.questionRelevanceFeedback ?? "Your responses partially addressed the questions.", icon: Sparkles, color: "text-emerald-400" },
                    { label: "Question Alignment Score", val: evaluation.questionAlignmentScore !== undefined ? evaluation.questionAlignmentScore : 14, max: 20, isRelevance: true, feedback: evaluation.questionAlignmentFeedback ?? "Your responses aligned well with the question intents.", icon: Target, color: "text-pink-400 animate-pulse" }
                  ].map((m) => {
                    const pct = Math.min(100, Math.max(0, Math.round((m.val / m.max) * 100)));
                    return (
                      <div key={m.label} className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-all flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-xs font-mono text-slate-500 uppercase tracking-widest">{m.label}</span>
                            <m.icon className={`w-4 h-4 ${m.color}`} />
                          </div>
                          <div className="flex items-baseline space-x-2">
                            <span className="text-2xl font-bold font-mono text-white">{m.val}</span>
                            <span className="text-[10px] text-slate-500 font-medium">INDEX ({pct}%)</span>
                          </div>
                          <div className="w-full h-1 bg-slate-950 rounded-full overflow-hidden mt-3">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                        {"feedback" in m && m.feedback && (
                          <p className="text-[10px] text-emerald-400 mt-3 font-semibold leading-relaxed italic border-t border-slate-850 pt-2 text-center">
                            {m.feedback}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  <div className="lg:col-span-6 bg-slate-900/30 border border-slate-800 rounded-2xl p-6 space-y-4">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      Sensory Strengths Logged
                    </h3>
                    <ul className="space-y-2.5">
                      {evaluation.strengths.map((str, idx) => (
                        <li key={idx} className="bg-slate-950 p-3 rounded-lg text-xs leading-relaxed text-slate-300 border border-slate-800/80 flex items-start space-x-3">
                          <span className="text-[10px] font-mono text-emerald-400 font-bold mt-0.5">✓</span>
                          <span>{str}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="lg:col-span-6 bg-slate-900/30 border border-slate-800 rounded-2xl p-6 space-y-4">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <XCircle className="w-5 h-5 text-amber-500" />
                      Tactical Errors Registered
                    </h3>
                    <ul className="space-y-2.5">
                      {evaluation.mistakesMade.map((mist, idx) => (
                        <li key={idx} className="bg-slate-950 p-3 rounded-lg text-xs leading-relaxed text-slate-300 border border-slate-800/80 flex items-start space-x-3">
                          <span className="text-[10px] font-mono text-amber-500 font-light mt-0.5">✕</span>
                          <span>{mist}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Question Alignment Insights Panel */}
                <div className="bg-slate-900/30 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Target className="w-5 h-5 text-pink-500 animate-pulse" />
                    AI Question Alignment Analysis & Coverage Insights
                  </h3>
                  <p className="text-xs text-slate-400">
                    Evaluating how accurately your answers address the underlying question intent and expected professional content coverage.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-2">
                    {/* Score Card */}
                    <div className="md:col-span-4 bg-slate-950 p-5 rounded-xl border border-slate-800/80 flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Alignment Index</span>
                        <div className="flex items-baseline space-x-2 mt-2">
                          <span className="text-3xl font-bold font-mono text-pink-400">{evaluation.questionAlignmentScore ?? 14}</span>
                          <span className="text-[10px] text-pink-500/80 font-mono">
                            {(evaluation.questionAlignmentScore ?? 14) >= 15 ? "HIGH ALIGNMENT" : (evaluation.questionAlignmentScore ?? 14) >= 10 ? "MODERATE ALIGNMENT" : "LOW ALIGNMENT"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 mt-3 italic leading-relaxed">
                          "{evaluation.questionAlignmentFeedback ?? "Your responses aligned well with the question intents."}"
                        </p>
                      </div>
                      {evaluation.questionAlignmentSuggestions && (
                        <div className="border-t border-slate-850 pt-3 mt-3">
                          <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block mb-1">Coach Suggestion</span>
                          <p className="text-xs text-emerald-400 font-semibold">{evaluation.questionAlignmentSuggestions}</p>
                        </div>
                      )}
                    </div>

                    {/* Missing expected points */}
                    <div className="md:col-span-8 bg-slate-950 p-5 rounded-xl border border-slate-800/80 space-y-3">
                      <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block font-bold text-slate-400">Missing Key Points / Expected Coverage Topics Identified</span>
                      
                      {evaluation.questionAlignmentMissingPoints && evaluation.questionAlignmentMissingPoints.length > 0 && !(evaluation.questionAlignmentMissingPoints.length === 1 && (evaluation.questionAlignmentMissingPoints[0].toLowerCase().includes("none") || evaluation.questionAlignmentMissingPoints[0].toLowerCase().includes("no major missing"))) ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          {evaluation.questionAlignmentMissingPoints.map((pt, idx) => (
                            <div key={idx} className="bg-slate-900/40 p-3 rounded-lg border border-slate-850 flex items-start space-x-2.5">
                              <span className="text-xs text-pink-500 font-bold mt-0.5">⚠</span>
                              <span className="text-xs text-slate-300 font-medium leading-relaxed">{pt}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="bg-emerald-950/20 p-4 rounded-lg border border-emerald-900/40 text-xs text-emerald-400 font-medium leading-relaxed">
                          ✓ No missing expected topics detected! Your responses matched the required intent and coverage expectations perfectly.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === "detailed" && (
          <div className="space-y-6">
            {interviewType === "aptitude" ? (
              <div className="bg-slate-900/30 border border-slate-800 rounded-2xl p-6 space-y-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-blue-400" />
                  Coach Advisor Verbal Summary
                </h3>
                <blockquote className="bg-slate-950 p-5 rounded-xl border border-slate-800/80 text-sm italic text-slate-300 leading-relaxed border-l-4 border-l-blue-500 relative shadow-inner">
                  <span className="absolute -top-3 left-4 text-6xl text-slate-800 tracking-tighter inline-block select-none pointer-events-none font-serif">“</span>
                  <p className="relative z-10 pt-2 pl-2">
                    {evaluation.detailedAnalysisParagraph}
                  </p>
                </blockquote>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                
                <div className="lg:col-span-7 bg-slate-900/30 border border-slate-800 rounded-2xl p-6 space-y-6 flex flex-col justify-between">
                  <div className="space-y-4">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <UserCheck className="w-5 h-5 text-blue-400" />
                      Coach Advisor Verbal Summary
                    </h3>
                    <blockquote className="bg-slate-950 p-5 rounded-xl border border-slate-800/80 text-sm italic text-slate-300 leading-relaxed border-l-4 border-l-blue-500 relative shadow-inner">
                      <span className="absolute -top-3 left-4 text-6xl text-slate-800 tracking-tighter inline-block select-none pointer-events-none font-serif">“</span>
                      <p className="relative z-10 pt-2 pl-2">
                        {evaluation.detailedAnalysisParagraph}
                      </p>
                    </blockquote>
                  </div>

                  <div className="space-y-4 border-t border-slate-800/60 pt-4 mt-6">
                    <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest">SENSORY SUITE SUB-CRITICISMS</h4>
                    <div className="space-y-3">
                      {[
                        { title: "Verbal Command", val: evaluation.communicationFeedback },
                        { title: "Postural Stability", val: evaluation.bodyLanguageFeedback },
                        { title: "Eye Gaze Target", val: evaluation.eyeContactFeedback },
                        { title: "Vocal Tempo Speed", val: evaluation.voiceFeedback },
                        { title: "Question Relevance Analysis", val: evaluation.questionRelevanceFeedback || "Your response directly addressed the question asked." }
                      ].map((criticism) => (
                        <div key={criticism.title} className="text-xs">
                          <span className="font-semibold text-slate-200 block">{criticism.title}</span>
                          <p className="text-slate-400 text-xs mt-0.5 leading-relaxed">{criticism.val}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-5 bg-slate-900/30 border border-slate-800 rounded-2xl p-6 space-y-4 flex flex-col justify-between">
                  <div className="space-y-4">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-teal-400" />
                      Advisor Practice Plan
                    </h3>
                    <p className="text-xs text-slate-400">
                      Tailored communication recommendations formulated to target areas of improvement.
                    </p>
                  </div>

                  <div className="space-y-5 flex-grow pt-4">
                    {evaluation.practiceRecommendations.map((rec, index) => (
                      <div key={index} className="bg-slate-950 p-4 border border-slate-850 rounded-xl hover:border-slate-800 transition-all flex items-start space-x-3">
                        <span className="w-6 h-6 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center font-mono font-bold text-xs mt-0.5 shrink-0">
                          {index + 1}
                        </span>
                        <div>
                          <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-1 font-mono">RECOMMENDED TASK</h4>
                          <p className="text-xs text-slate-300 leading-relaxed font-semibold">{rec}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}
          </div>
        )}

        {activeTab === "questions" && (
          <div className="bg-slate-900/30 border border-slate-800 rounded-2xl p-6 space-y-6">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-indigo-400" />
                Speech Audio Transcript Logs
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Verbatim dialogue traces exchanged during active interview practice rounds.
              </p>
            </div>

            <div className="space-y-6">
              {session.questions.map((q, index) => (
                <div key={q.id} className="bg-slate-950/80 p-5 rounded-xl border border-slate-800/80 space-y-3.5 hover:border-slate-750 transition-all">
                  <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-mono font-bold text-blue-400">EXCHANGE {index + 1}</span>
                      {session.interviewType === "aptitude" && (
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                          q.isCorrect 
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25" 
                            : "bg-rose-500/15 text-rose-400 border border-rose-500/25"
                        }`}>
                          {q.isCorrect ? "✓ CORRECT" : "✗ INCORRECT"}
                        </span>
                      )}
                    </div>
                    {q.fillerWordsCount !== undefined && (
                      <span className="text-[10px] font-mono text-slate-500">
                        Filler word count: {q.fillerWordsCount} stutters
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-mono text-slate-500 uppercase tracking-widest select-none">AI QUESTION</p>
                    <p className="text-xs sm:text-sm text-slate-200 font-medium pl-3 border-l-2 border-slate-800">{q.questionText}</p>
                  </div>

                  {session.interviewType === "aptitude" && q.options && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 pl-3">
                      {q.options.map((option, idx) => {
                        const letter = option.substring(0, 1).toUpperCase();
                        const isSelected = q.selectedOption === letter;
                        const isCorrect = q.correctOption === letter;
                        return (
                          <div 
                            key={idx}
                            className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center gap-2 transition-all ${
                              isSelected 
                                ? isCorrect 
                                  ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-300"
                                  : "bg-rose-950/40 border-rose-500/50 text-rose-300"
                                : isCorrect 
                                  ? "bg-slate-900/40 border-emerald-600/30 text-emerald-400"
                                  : "bg-slate-900/20 border-slate-800 text-slate-400"
                            }`}
                          >
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black shrink-0 ${
                              isSelected 
                                ? isCorrect 
                                  ? "bg-emerald-600 text-white" 
                                  : "bg-rose-600 text-white"
                                : isCorrect 
                                  ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30"
                                  : "bg-slate-800 text-slate-500"
                            }`}>
                              {letter}
                            </span>
                            <span className="leading-tight">{option.substring(3)}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="space-y-2 pt-1">
                    <p className="text-xs font-mono text-slate-500 uppercase tracking-widest select-none">CANDIDATE ANSWER</p>
                    <p className="text-xs text-slate-300 pl-3 border-l-2 border-cyan-500 leading-relaxed italic">
                      {q.answerText || "[Candidate closed segment procedurally]"}
                    </p>
                  </div>

                  {session.interviewType !== "aptitude" && q.questionRelevanceScore !== undefined && (
                    <div className="mt-3 pt-3 border-t border-slate-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-900/20 p-3 rounded-lg border border-slate-900">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-xs font-mono text-slate-400">Relevance Score:</span>
                        <span className="text-xs font-bold font-mono text-emerald-400">{Math.round(q.questionRelevanceScore * 20 / 100)}</span>
                      </div>
                      {q.questionRelevanceFeedback && (
                        <span className="text-[11px] text-slate-300 italic">
                          {q.questionRelevanceFeedback}
                        </span>
                      )}
                    </div>
                  )}

                  {session.interviewType !== "aptitude" && q.questionAlignmentScore !== undefined && (
                    <div className="mt-2 flex flex-col gap-2 bg-slate-900/25 p-3 rounded-lg border border-slate-900">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Target className="w-3.5 h-3.5 text-pink-400" />
                          <span className="text-xs font-mono text-slate-400">Alignment Score:</span>
                          <span className="text-xs font-bold font-mono text-pink-400">{q.questionAlignmentScore}</span>
                        </div>
                        {q.questionAlignmentFeedback && (
                          <span className="text-[11px] text-slate-300 italic">
                            {q.questionAlignmentFeedback}
                          </span>
                        )}
                      </div>
                      {((q.questionAlignmentMissingPoints && q.questionAlignmentMissingPoints.length > 0 && !(q.questionAlignmentMissingPoints.length === 1 && (q.questionAlignmentMissingPoints[0].toLowerCase().includes("none") || q.questionAlignmentMissingPoints[0].toLowerCase().includes("no major missing")))) || q.questionAlignmentSuggestions) && (
                        <div className="border-t border-slate-800/40 pt-2 mt-1 space-y-1.5">
                          {q.questionAlignmentMissingPoints && q.questionAlignmentMissingPoints.length > 0 && !(q.questionAlignmentMissingPoints.length === 1 && (q.questionAlignmentMissingPoints[0].toLowerCase().includes("none") || q.questionAlignmentMissingPoints[0].toLowerCase().includes("no major missing"))) && (
                            <div>
                               <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider block">Missing Expected Topics:</span>
                              <div className="flex flex-wrap gap-1.5 mt-1">
                                {q.questionAlignmentMissingPoints.map((pt, idx) => (
                                  <span key={idx} className="bg-slate-950 px-2 py-0.5 rounded text-[10px] text-pink-400 border border-slate-850">
                                    {pt}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {q.questionAlignmentSuggestions && (
                            <div>
                              <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider block">Coach Coverage Suggestion:</span>
                              <p className="text-[11px] text-emerald-400 mt-0.5">{q.questionAlignmentSuggestions}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {session.interviewType !== "aptitude" && q.speechPaceWpm !== undefined && (
                    <div className="pt-2 flex items-center justify-between text-[10px] font-mono text-slate-500">
                      <span>Speaking Speed: {q.speechPaceWpm} WPM</span>
                      {q.userConfidenceScore !== undefined && (
                        <span>Confidence Index: {q.userConfidenceScore}%</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
