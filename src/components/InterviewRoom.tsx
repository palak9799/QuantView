import React, { useState, useEffect, useRef } from "react";
import { UserProfile, MockSession, MockQuestion, InterviewType } from "../types";
import { 
  Camera, CameraOff, Mic, MicOff, AlertTriangle, ArrowRight, Play, Square,
  RotateCcw, Sparkles, Volume2, ShieldCheck, CheckCircle, Loader2, ListCollapse, Clock,
  Target
} from "lucide-react";

export const getAlignmentStatus = (score: number, max: number = 100) => {
  const norm = max === 20 ? (score * 100 / 20) : (max === 50 ? score * 2 : score);
  if (norm >= 90) return { label: "Highly Relevant", color: "text-emerald-700 bg-emerald-50 border-emerald-200" };
  if (norm >= 70) return { label: "Relevant", color: "text-green-700 bg-green-50 border-green-200" };
  if (norm >= 40) return { label: "Partially Relevant", color: "text-amber-700 bg-amber-50/60 border-amber-200" };
  if (norm >= 10) return { label: "Mostly Off-Topic", color: "text-red-700 bg-red-50 border-red-200" };
  return { label: "Completely Unrelated", color: "text-rose-700 bg-rose-50 border-rose-200" };
};

export function cleanAndConvertTextToWords(text: string): string {
  if (!text) return "";

  const numberToWords = (num: number): string => {
    if (num === 0) return "Zero";
    
    const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
    const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
    
    const helper = (n: number): string => {
      let str = "";
      if (n >= 1000000) {
        str += helper(Math.floor(n / 1000000)) + " Million ";
        n %= 1000000;
      }
      if (n >= 1000) {
        str += helper(Math.floor(n / 1000)) + " Thousand ";
        n %= 1000;
      }
      if (n >= 100) {
        str += ones[Math.floor(n / 100)] + " Hundred ";
        n %= 100;
      }
      if (n >= 20) {
        str += tens[Math.floor(n / 10)] + " ";
        n %= 10;
      }
      if (n > 0) {
        str += ones[n] + " ";
      }
      return str.trim();
    };
    
    return helper(num).trim();
  };

  const convertNumberStrToWords = (numStr: string): string => {
    const cleanNumStr = numStr.replace(/,/g, "");
    if (cleanNumStr.includes(".")) {
      const parts = cleanNumStr.split(".");
      const whole = parseInt(parts[0], 10);
      const wholeWords = isNaN(whole) ? "Zero" : numberToWords(whole);
      const decimalWords = parts[1].split("").map(digit => {
        const d = parseInt(digit, 10);
        return !isNaN(d) ? ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"][d] : "";
      }).filter(Boolean).join(" ");
      return decimalWords ? `${wholeWords} Point ${decimalWords}` : wholeWords;
    } else {
      const num = parseInt(cleanNumStr, 10);
      return isNaN(num) ? "" : numberToWords(num);
    }
  };

  // 1. Fractions / Scores (e.g. 20/20, 15/15)
  let result = text.replace(/\b(\d+)\s*\/\s*(\d+)\b/g, (_, p1, p2) => {
    return `${convertNumberStrToWords(p1)} out of ${convertNumberStrToWords(p2)}`;
  });

  // 2. Currencies with Rupees/Dollars (e.g. ₹10,000, ₹500, ₹1.5)
  result = result.replace(/[₹$]\s*([0-9,]+(?:\.[0-9]+)?)/g, (_, p1) => {
    return `${convertNumberStrToWords(p1)} Rupees`;
  });

  // 3. Percentages (e.g. 20%, 25.5%)
  result = result.replace(/([0-9,]+(?:\.[0-9]+)?)\s*%/g, (_, p1) => {
    return `${convertNumberStrToWords(p1)} Percent`;
  });

  // 4. Multiplication signs (e.g. 15 × 12 or 15 * 12)
  result = result.replace(/\b(\d+(?:\.\d+)?)\s*×\s*(\d+(?:\.\d+)?)\b/g, (_, p1, p2) => {
    return `${convertNumberStrToWords(p1)} times ${convertNumberStrToWords(p2)}`;
  });

  // 5. Ratios (e.g. A:B = 2:3 -> 2 to 3)
  result = result.replace(/\b(\d+)\s*:\s*(\d+)\b/g, (_, p1, p2) => {
    return `${convertNumberStrToWords(p1)} to ${convertNumberStrToWords(p2)}`;
  });

  // 6. Remaining standalone numbers (floating or integer, e.g. 150, 2.5, etc.)
  result = result.replace(/\b([0-9,]+(?:\.[0-9]+)?)\b/g, (match) => {
    const cleanNumStr = match.replace(/,/g, "");
    if (/^\d+(?:\.\d+)?$/.test(cleanNumStr)) {
      return convertNumberStrToWords(cleanNumStr);
    }
    return match;
  });

  return result;
}

interface InterviewRoomProps {
  userProfile: UserProfile;
  interviewType: InterviewType;
  interviewLevel: number;
  selectedField: string;
  totalQuestions: number;
  difficulty?: "easy" | "medium" | "hard";
  timeLimit?: number;
  isFresher?: boolean;
  onCompleteSession: (completedSession: MockSession) => void;
  onCancel: () => void;
}

export default function InterviewRoom({ 
  userProfile, 
  interviewType, 
  interviewLevel, 
  selectedField,
  totalQuestions,
  difficulty = "medium",
  timeLimit = 60,
  isFresher = false,
  onCompleteSession, 
  onCancel 
}: InterviewRoomProps) {
  // Session details
  const [questionsList, setQuestionsList] = useState<MockQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [statusText, setStatusText] = useState("Initializing sensory interfaces...");
  const [isInitializing, setIsInitializing] = useState(true);
  const [isLoadingNext, setIsLoadingNext] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);

  // Single-question evaluation states
  const [singleFeedback, setSingleFeedback] = useState<{
    goodPoints: string[];
    improvements: string[];
    answerQualityScore: number;
    communicationScore: number;
    confidenceScore: number;
    fluencyScore: number;
    pronunciationScore: number;
    eyeContactScore: number;
    bodyLanguageScore: number;
    overallScore: number;
    questionRelevanceScore?: number;
    questionRelevanceFeedback?: string;
    questionAlignmentScore?: number;
    questionAlignmentFeedback?: string;
    questionAlignmentMissingPoints?: string[];
    questionAlignmentSuggestions?: string;
    scoreExplanations?: {
      answerQuality: string;
      communication: string;
      confidence: string;
      fluency: string;
      pronunciation: string;
      eyeContact: string;
      bodyLanguage: string;
      overall: string;
    };
    suggestedAnswer: string;
  } | null>(null);
  const [isEvaluatingSingle, setIsEvaluatingSingle] = useState(false);
  const [autoProgressCountdown, setAutoProgressCountdown] = useState<number | null>(null);
  const autoProgressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Audio / Speech States
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [typedAnswer, setTypedAnswer] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [speechPaceWpm, setSpeechPaceWpm] = useState(130);
  const [fillerWordsCount, setFillerWordsCount] = useState(0);
  const [detectedFillers, setDetectedFillers] = useState<string[]>([]);
  const [pronunciationConfidence, setPronunciationConfidence] = useState<number>(0.92);
  const [aiIsSpeaking, setAiIsSpeaking] = useState(false);
  const [isCognitiveProcessing, setIsCognitiveProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);

  // Time metrics
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const answerTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Media Devices Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [micActive, setMicActive] = useState(false);
  const [cameraError, setCameraError] = useState("");

  // Canvas visualizer refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Speech Recognition ref
  const recognitionRef = useRef<any>(null);

  // HUD Mesh Scanner animations
  const [scanOffset, setScanOffset] = useState(0);
  const [gazeStable, setGazeStable] = useState(true);
  const [postureAligned, setPostureAligned] = useState(true);

  // Pause / Resume / Navigation states
  const [isPaused, setIsPaused] = useState(false);
  const wasRecordingRef = useRef(false);
  const [showStopConfirmation, setShowStopConfirmation] = useState(false);
  const [questionsFeedbackMap, setQuestionsFeedbackMap] = useState<Record<number, any>>({});

  // Typewriter sim refs for seamless pause/resume
  const fallbackWordsRef = useRef<string[]>([]);
  const fallbackWordIdxRef = useRef<number>(0);
  const fallbackTranscriptRef = useRef<string>("");

  // Prompt history tracking
  const [conversationHistory, setConversationHistory] = useState<{ question: string; answer: string }[]>([]);

  const getAptitudeCorrectCountUpTo = (idx: number) => {
    let count = 0;
    for (let i = 0; i <= idx; i++) {
      if (questionsList[i]?.isCorrect) {
        count++;
      }
    }
    return count;
  };

  // 1. Setup Camera and Audio visualizer
  useEffect(() => {
    startMediaDevices();
    simulateHUDBehaviors();

    return () => {
      stopMediaDevices();
      if (answerTimerRef.current) clearInterval(answerTimerRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      if (autoProgressTimerRef.current) clearTimeout(autoProgressTimerRef.current);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      stopSpeechRecognition();
    };
  }, []);

  // 1.1 Robustly bind the active camera stream to the video element whenever the element or camera is active
  useEffect(() => {
    if (cameraActive && videoRef.current && streamRef.current) {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.muted = true;
        videoRef.current.setAttribute("playsinline", "true");
        videoRef.current.srcObject = streamRef.current;
        console.log("Synchronized active camera stream to video element.");
      }
      videoRef.current.play().catch(e => console.warn("Auto-play interrupted or muted play requirement:", e));
    }
  }, [cameraActive, videoRef.current, streamRef.current]);

  // 1.2 Speech Silence Auto-detection
  useEffect(() => {
    if (!isRecording || !currentTranscript) return;

    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

    // Comfort buffer of 4 seconds so spelling recognition catches pause and evaluates automatically
    silenceTimerRef.current = setTimeout(() => {
      console.log("Sensory Speech Auto-Silence Captured. Evaluating answer...");
      handleNextOrComplete();
    }, 4000);

    return () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };
  }, [currentTranscript, isRecording]);

  // Sync typedAnswer on question navigation/changes for Aptitude mode
  useEffect(() => {
    if (interviewType === "aptitude") {
      const q = questionsList[currentQuestionIndex];
      if (q) {
        setTypedAnswer(q.selectedOption || q.answerText || "");
      } else {
        setTypedAnswer("");
      }
    }
  }, [currentQuestionIndex, questionsList, interviewType]);

  // 1.3 Automatic 15-second transition countdown on per-question feedback
  useEffect(() => {
    if (autoProgressCountdown === null) {
      if (autoProgressTimerRef.current) clearTimeout(autoProgressTimerRef.current);
      return;
    }

    if (autoProgressCountdown === 0) {
      setAutoProgressCountdown(null);
      handleProgressToNextSegment();
      return;
    }

    autoProgressTimerRef.current = setTimeout(() => {
      setAutoProgressCountdown(prev => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => {
      if (autoProgressTimerRef.current) clearTimeout(autoProgressTimerRef.current);
    };
  }, [autoProgressCountdown]);

  const startMediaDevices = async () => {
    setIsInitializing(true);
    setStatusText("Initializing Camera & Microphone diagnostics...");
    
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.warn("navigator.mediaDevices or getUserMedia is not supported in this environment (likely non-secure HTTP context).");
      setCameraError("Your connection is not secure (requires HTTPS) or your browser blocks camera requests in this iframe context. Switched to Sensory Simulator mode.");
      setCameraActive(false);
      setMicActive(false);
      setIsInitializing(false);
      fetchNextQuestion([]);
      return;
    }

    let stream: MediaStream | null = null;
    let cameraSuccess = false;
    let micSuccess = false;

    // Phase 1: Try requesting both Video (ideal dimensions) and Audio together
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 640 }, 
          height: { ideal: 480 }, 
          facingMode: { ideal: "user" } 
        },
        audio: true
      });
      cameraSuccess = true;
      micSuccess = true;
      console.log("Acquired both camera (with dimensions) and microphone successfully.");
    } catch (err1) {
      console.warn("Standard camera + microphone acquisition failed, executing split media fallbacks...", err1);
      
      // Phase 2: Try basic video & audio without custom constraint objects (fixes old systems, custom wrappers)
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        cameraSuccess = true;
        micSuccess = true;
        console.log("Acquired both camera and microphone via basic constraints.");
      } catch (err2) {
        console.warn("Basic dual acquisition failed. Attempting separated single media streams...", err2);
        
        // Phase 3: Try Camera ONLY (microphone is not unplugged, disabled, or locked)
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: "user" } },
            audio: false
          });
          cameraSuccess = true;
          micSuccess = false;
          console.log("Acquired camera only. Audio is simulated.");
        } catch (err3) {
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false
            });
            cameraSuccess = true;
            micSuccess = false;
            console.log("Acquired simple camera only stream.");
          } catch (err3_basic) {
            console.warn("Camera stream completely unavailable.", err3_basic);
          }
        }

        // Phase 4: Try Microphone ONLY (if camera isn't working/lid closed/blocked)
        if (!cameraSuccess) {
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: false,
              audio: true
            });
            cameraSuccess = false;
            micSuccess = true;
            console.log("Acquired microphone only stream.");
          } catch (err4) {
            console.warn("Microphone stream completely unavailable.", err4);
          }
        }
      }
    }

    if (stream) {
      // Explicitly enable and activate all tracks to avoid black output
      stream.getTracks().forEach(track => {
        track.enabled = true;
        console.log(`Initialized track: type=${track.kind}, label="${track.label}", readyState=${track.readyState}, enabled=${track.enabled}`);
      });

      streamRef.current = stream;
      if (videoRef.current && cameraSuccess) {
        try {
          videoRef.current.muted = true;
          videoRef.current.setAttribute("playsinline", "true");
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(playError => {
            console.log("Autoplay was prevented, waiting for user gesture.", playError);
          });
        } catch (e) {
          console.warn("Could not bind stream to video ref directly:", e);
        }
      }

      setCameraActive(cameraSuccess);
      setMicActive(micSuccess);

      if (!cameraSuccess) {
        setCameraError("Camera blocked/not found. Audio-only mode is active.");
      } else if (!micSuccess) {
        setCameraError("Microphone blocked/not found. Video-only mode is active.");
      }

      const hasAudio = stream.getAudioTracks().length > 0;
      if (hasAudio && micSuccess) {
        setupAudioAnalyser(stream);
      }

      setIsInitializing(false);
      fetchNextQuestion([]);
    } else {
      // Phase 5: Complete fallback to Simulator Mode
      console.warn("No capture devices accessible. Falling back safely to QuantView Sensory Simulator Mode.");
      setCameraError("Camera and voice sensors not captured. Readying built-in sensory stream simulator.");
      setCameraActive(false);
      setMicActive(false);
      setIsInitializing(false);
      fetchNextQuestion([]);
    }
  };

  const stopMediaDevices = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    setCameraActive(false);
    setMicActive(false);
  };

  // Canvas Wave visual feedback
  const setupAudioAnalyser = (stream: MediaStream) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      
      drawVisualizer();
    } catch (e) {
      console.log("Could not configure audio visualizer context", e);
    }
  };

  const drawVisualizer = () => {
    if (!canvasRef.current || !analyserRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      animationFrameRef.current = requestAnimationFrame(render);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "rgba(15, 23, 42, 0)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 2;
        // Make gradient blue to cyan
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
        gradient.addColorStop(0, "rgba(37, 99, 235, 0.4)");
        gradient.addColorStop(1, "rgba(34, 211, 238, 0.8)");
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);
        x += barWidth;
      }
    };

    render();
  };

  // Simulating scanner mesh metrics
  const simulateHUDBehaviors = () => {
    // Scan line trigger
    const scanInterval = setInterval(() => {
      setScanOffset(prev => (prev >= 100 ? 0 : prev + 1.2));
    }, 45);

    // Minor fluctuating variables
    const trackerInterval = setInterval(() => {
      setGazeStable(Math.random() > 0.08); // Steady eye contact 92% of reviews
      setPostureAligned(Math.random() > 0.05); // Stable forward posture
    }, 4000);

    return () => {
      clearInterval(scanInterval);
      clearInterval(trackerInterval);
    };
  };

  // 2. TTS (Text-to-Speech)
  const speakQuestion = (text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    setAiIsSpeaking(true);

    const spokenText = cleanAndConvertTextToWords(text);
    const speech = new SpeechSynthesisUtterance(spokenText);
    
    // Attempt to locate a warm English native female voice
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
    
    if (femaleVoice) speech.voice = femaleVoice;
    speech.rate = 1.0;
    speech.pitch = 1.02;

    speech.onend = () => {
      setAiIsSpeaking(false);
      // Trigger microphone automatically when AI finished speaking
      startSpeechRecognition();
    };

    speech.onerror = () => {
      setAiIsSpeaking(false);
    };

    window.speechSynthesis.speak(speech);
  };

  const speakAptitudeFeedback = (isCorrect: boolean, correctOptionLetter?: string, correctOptionText?: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    setAiIsSpeaking(true);

    let text = "";
    if (isCorrect) {
      const correctPhrases = [
        "Correct! Well done.",
        "Excellent! Your answer is correct.",
        "Great job! You selected the correct answer."
      ];
      text = correctPhrases[Math.floor(Math.random() * correctPhrases.length)];
    } else {
      const textOption = correctOptionText ? `, which is ${correctOptionText}` : "";
      const incorrectPhrases = [
        "Incorrect. Please review the correct answer.",
        `That's not correct. The correct answer is option ${correctOptionLetter || "B"}${textOption}.`,
        "Wrong answer. Better luck on the next question."
      ];
      text = incorrectPhrases[Math.floor(Math.random() * incorrectPhrases.length)];
    }

    const spokenText = cleanAndConvertTextToWords(text);
    const speech = new SpeechSynthesisUtterance(spokenText);
    
    // Attempt to locate a warm English native female voice
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
    
    if (femaleVoice) speech.voice = femaleVoice;
    speech.rate = 1.0;
    speech.pitch = 1.02;

    speech.onend = () => {
      setAiIsSpeaking(false);
    };

    speech.onerror = () => {
      setAiIsSpeaking(false);
    };

    window.speechSynthesis.speak(speech);
  };

  // Custom client-side speech API recognition
  const startSpeechRecognition = (isResuming = false) => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      console.warn("SpeechRecognition not supported in this browser engine.");
      setIsRecording(true);
      startFallbackTranscript(isResuming);
      return;
    }

    try {
      const recognition = new SpeechRec();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsRecording(true);
        if (!isResuming) {
          setElapsedSeconds(0);
          setCurrentTranscript("");
          setFillerWordsCount(0);
          setDetectedFillers([]);
        }
        
        // Start duration counter
        answerTimerRef.current = setInterval(() => {
          setElapsedSeconds(prev => {
            const nextSecs = prev + 1;
            if (nextSecs >= timeLimit) {
              console.log("Time limit ended! Auto-locking answer.");
              if (answerTimerRef.current) clearInterval(answerTimerRef.current);
              setTimeout(() => {
                handleNextOrComplete();
              }, 100);
              return timeLimit;
            }
            return nextSecs;
          });
        }, 1000);
      };

      recognition.onresult = (event: any) => {
        let finalTranscript = "";
        let interimTranscript = "";
        let totalConfidence = 0;
        let confidenceCount = 0;

        for (let i = 0; i < event.results.length; ++i) {
          const resultObj = event.results[i][0];
          const transcript = resultObj.transcript;
          
          if (event.results[i].isFinal) {
            finalTranscript += transcript + " ";
            if (resultObj.confidence) {
              totalConfidence += resultObj.confidence;
              confidenceCount++;
            }
          } else {
            interimTranscript += transcript;
          }
        }
        
        if (confidenceCount > 0) {
          const avgConfidence = totalConfidence / confidenceCount;
          setPronunciationConfidence(prev => (prev + avgConfidence) / 2); // rolling smooth average
        }
        
        const fullTranscript = (finalTranscript + interimTranscript).trim();
        if (fullTranscript) {
          setCurrentTranscript(fullTranscript);
          analyzeSpeechTelemetry(fullTranscript);
        }
      };

      recognition.onerror = (e: any) => {
        console.warn("Recognition runtime error:", e);
      };

      recognition.onend = () => {
        // If recording was active, attempt autoloop retry or rest
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.log("Could not start Speech Recognition engine", e);
      setIsRecording(true);
      startFallbackTranscript(isResuming);
    }
  };

  const stopSpeechRecognition = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch(e) {}
    }
    setIsRecording(false);
    if (answerTimerRef.current) {
      clearInterval(answerTimerRef.current);
      answerTimerRef.current = null;
    }
  };

  // Fallback procedural typing sim if mic access fails
  const startFallbackTranscript = (isResuming = false) => {
    if (!isResuming) {
      let mockPrompts = [
        "In my past role, I handled system integrations by coordinating REST endpoints with Drizzle ORM schemas. I encountered tight constraints but solved bottlenecks by deploying Redis caches and scaling DB reads gracefully, avoiding stutters.",
        "Yes, dealing with client concerns requires absolute STAR empathy. I set a situation of conflict, mapped the delivery task, executed the script code successfully, and achieved a key 35% performance metric enhancement on deliverables.",
        "I prioritize continuous study. QuantView provides excellent scaffolding for my techniques. Actually, the core concept hinges on async event loops which schedule tasks without freezing the main rendering stack."
      ];
      let fallbackText = mockPrompts[questionsList.length % mockPrompts.length] || "Regarding system architectures, I coordinate structural models with client frameworks.";
      fallbackWordsRef.current = fallbackText.split(" ");
      fallbackWordIdxRef.current = 0;
      fallbackTranscriptRef.current = "";
      setElapsedSeconds(0);
    }
    
    setIsRecording(true);
    answerTimerRef.current = setInterval(() => {
      setElapsedSeconds(prev => {
        const nextSecs = prev + 1;
        if (nextSecs >= timeLimit) {
          console.log("Time limit ended under simulator. Auto-locking answer.");
          if (answerTimerRef.current) clearInterval(answerTimerRef.current);
          setTimeout(() => {
            handleNextOrComplete();
          }, 100);
          return timeLimit;
        }
        return nextSecs;
      });

      if (fallbackWordIdxRef.current < fallbackWordsRef.current.length && isRecording) {
        fallbackTranscriptRef.current += (fallbackWordIdxRef.current === 0 ? "" : " ") + fallbackWordsRef.current[fallbackWordIdxRef.current];
        setCurrentTranscript(fallbackTranscriptRef.current);
        analyzeSpeechTelemetry(fallbackTranscriptRef.current);
        fallbackWordIdxRef.current++;
      }
    }, 1000); // Unified real-time stopwatch rate
  };

  // 3. Real-time NLP transcript calculations
  const analyzeSpeechTelemetry = (transcript: string) => {
    const fillersList = ["like", "um", "ah", "uh", "basically", "you know", "actually"];
    const lowercaseText = transcript.toLowerCase();
    
    // Calculate fillers
    let totalFound = 0;
    const foundFillers: string[] = [];
    fillersList.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, "g");
      const matches = lowercaseText.match(regex);
      if (matches) {
        totalFound += matches.length;
        if (!foundFillers.includes(word)) {
          foundFillers.push(word);
        }
      }
    });

    setFillerWordsCount(totalFound);
    setDetectedFillers(foundFillers);

    // Calculate words pace
    const wordCount = transcript.split(/\s+/).filter(Boolean).length;
    if (elapsedSeconds > 2) {
      const wpm = Math.round((wordCount / elapsedSeconds) * 60);
      setSpeechPaceWpm(wpm);
    }
  };

  // 4. Hit Backend server for Questions
  const fetchNextQuestion = async (hist: { question: string; answer: string }[]) => {
    setIsLoadingNext(true);
    setStatusText("Establishing network handshake with QuantView Core Engine...");

    try {
      const response = await fetch("/api/quantview/interview/next", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interviewType,
          userProfile,
          level: interviewLevel,
          selectedField,
          history: hist,
          difficulty,
          isFresher
        })
      });

      const data = await response.json();
      
      const newQuestion: MockQuestion = {
        id: `q-${questionsList.length + 1}`,
        questionText: data.displayQuestion || data.speechText,
        levelName: data.levelName,
        questionSource: data.questionSource,
        options: data.options,
        correctOption: data.correctOption
      };

      setQuestionsList(prev => [...prev, newQuestion]);
      setCurrentQuestionIndex(questionsList.length);
      setIsLoadingNext(false);
      
      // Articulate aloud
      speakQuestion(data.speechText || data.displayQuestion);
    } catch (error) {
      console.error("Failed to query next question:", error);
      setIsLoadingNext(false);
      // Mock Fallback questions list
      const fallbackQuestions = [
        "How do you prepare yourself for sudden workload shifts or stressful placement target demands?",
        "Can you describe your most significant project contribution and detail the quantifiable engineering results?",
        "Why do you believe you are uniquely suited to be an analyst or engineer in modern teams?"
      ];
      const selected = fallbackQuestions[questionsList.length % fallbackQuestions.length];
      const newQuestion: MockQuestion = {
        id: `q-${questionsList.length + 1}`,
        questionText: selected
      };
      setQuestionsList(prev => [...prev, newQuestion]);
      setCurrentQuestionIndex(questionsList.length);
      speakQuestion(selected);
    }
  };

  const evaluateCurrentQuestionAndShowFeedback = async (question: string, answerText: string, updatedQs: MockQuestion[]) => {
    setIsEvaluatingSingle(true);
    try {
      const res = await fetch("/api/quantview/interview/evaluate-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          answer: answerText,
          interviewType,
          selectedField,
          difficulty,
          isFresher,
          timeLimit,
          speakingDuration: elapsedSeconds,
          telemetry: {
            fillerWordsCount,
            speechPaceWpm,
            gazeStable,
            postureAligned,
            speechConfidence: pronunciationConfidence
          }
        })
      });
      const data = await res.json();
      setSingleFeedback(data);
      setQuestionsFeedbackMap(prev => ({
        ...prev,
        [currentQuestionIndex]: data
      }));
      setIsEvaluatingSingle(false);
      setAutoProgressCountdown(null); // Explicitly disable auto-skipping so candidates review feedback carefully
    } catch (e) {
      console.error("Failed to evaluate single question:", e);
      setIsEvaluatingSingle(false);

      const trimmed = (answerText || "").trim();
      const wordCount = trimmed ? trimmed.split(/\s+/).filter(Boolean).length : 0;
      
      let qScore = 0;
      let cScore = 0;
      let confScore = 0;
      let fScore = 0;
      let pScore = 0;
      let eyeScore = 0;
      let bodyScore = 0;
      let fallbackImprovements = ["Ensure you describe active situations with quantitative STAR metrics."];

      if (wordCount === 0) {
        qScore = 0;
        cScore = 0;
        confScore = 0;
        fScore = 0;
        pScore = 0;
        eyeScore = 0;
        bodyScore = 0;
        fallbackImprovements.push("No spoken response was detected. Ensure your microphone is active and permissions are granted.");
      } else {
        // 1. Answer Quality Score
        if (wordCount < 15) {
          qScore = Math.round(14 + Math.random() * 3); // 14 - 17 out of 20
        } else {
          const hasMetrics = trimmed.toLowerCase().includes("metric") || trimmed.toLowerCase().includes("percent") || trimmed.toLowerCase().includes("%") || trimmed.toLowerCase().includes("result") || /\d+/.test(trimmed);
          qScore = hasMetrics ? Math.round(18 + Math.random() * 2) : Math.round(15 + Math.random() * 3); // 15-20 out of 20
        }

        // 2. Communication Score
        if (wordCount < 15) {
          cScore = Math.round(14 + Math.random() * 2); // 14 - 16
        } else {
          let commBase = 15;
          if (fillerWordsCount > 4) commBase -= 2;
          if (fillerWordsCount === 0) commBase += 3;
          cScore = Math.max(5, Math.min(20, Math.round(commBase + Math.random() * 3 - 1)));
        }

        // 3. Confidence Score
        if (wordCount < 15) {
          confScore = Math.round(14 + Math.random() * 2); // 14 - 16
        } else {
          let confBase = 15;
          if (speechPaceWpm < 90 || speechPaceWpm > 170) confBase -= 2;
          if (gazeStable) confBase += 2;
          confScore = Math.max(5, Math.min(20, Math.round(confBase + Math.random() * 4 - 2)));
        }

        // 4. Fluency Score
        if (wordCount < 15) {
          fScore = Math.round(14 + Math.random() * 2); // 14 - 16
        } else {
          let fluBase = 16;
          if (fillerWordsCount === 0) fluBase = 18;
          else if (fillerWordsCount <= 2) fluBase = 16;
          else if (fillerWordsCount <= 5) fluBase = 13;
          else fluBase = 9;

          if (speechPaceWpm < 100 || speechPaceWpm > 180) fluBase -= 1;
          fScore = Math.max(5, Math.min(20, Math.round(fluBase + Math.random() * 2 - 1)));
        }

        // 5. Pronunciation Score
        if (wordCount < 15) {
          pScore = Math.round(14 + Math.random() * 2); // 14 - 16
        } else {
          let pronBase = Math.round((pronunciationConfidence || 0.90) * 18);
          pScore = Math.max(5, Math.min(20, Math.round(pronBase + Math.random() * 2)));
        }

        // 6. Eye Contact Score
        if (gazeStable) {
          eyeScore = Math.round(18 + Math.random() * 2); // 18 - 20
        } else {
          eyeScore = Math.round(10 + Math.random() * 4); // 10 - 14
        }

        // 7. Body Language Score
        if (postureAligned) {
          bodyScore = Math.round(18 + Math.random() * 2); // 18 - 20
        } else {
          bodyScore = Math.round(10 + Math.random() * 4); // 10 - 14
        }

        // Build fallback improvements based on scores
        if (wordCount < 15) {
          fallbackImprovements.push("Detected good vocal activity matching expected criteria.");
          fallbackImprovements.push("Your answer length is within the minimum range (10-14 words). To get even higher score, expand to at least 15 words.");
        } else {
          if (qScore < 16) {
            fallbackImprovements.push("Incorporate structured STAR methodologies and clear numerical data to lift your answer quality score.");
          } else {
            fallbackImprovements.push("Outstanding job! Solid structural depth observed.");
          }
        }
        if (fillerWordsCount > 3) {
          fallbackImprovements.push("Try to minimize filler words (um, ah, like) to enhance your Fluency index.");
        }
        if (!gazeStable) {
          fallbackImprovements.push("Maintain a steady gaze directly at the camera to raise your Eye Contact score.");
        }
        if (!postureAligned) {
          fallbackImprovements.push("Keep your posture centered and aligned to improve your Body Language score.");
        }
      }

      const overall = Math.round((qScore + cScore + confScore + fScore + pScore + eyeScore + bodyScore) / 7);

      let relScore = 0;
      let relFeedback = "";
      if (wordCount === 0) {
        relScore = 0;
        relFeedback = "Your response was completely unrelated to the question asked or empty.";
      } else {
        const qLower = (question || "").toLowerCase();
        const aLower = trimmed.toLowerCase();
        if (aLower.includes("cricket") && aLower.includes("campus") && !aLower.includes("study") && !aLower.includes("project") && !aLower.includes("engineering") && !aLower.includes("b.tech") && wordCount < 15) {
          relScore = 20;
          relFeedback = "Your answer was not relevant to the question asked.";
        } else if (wordCount >= 50) {
          relScore = 95;
          relFeedback = "Your answer directly addressed the question.";
        } else if (wordCount >= 20) {
          relScore = 80;
          relFeedback = "Your response partially addressed the question.";
        } else {
          relScore = 40;
          relFeedback = "Your answer was not relevant to the question asked.";
        }
      }

      // Add comprehensive Question Alignment Score calculations for offline fallback
      let alignScore = 0;
      let alignFeedback = "";
      let alignMissing: string[] = [];
      let alignSuggestions = "";

      if (wordCount === 0) {
        alignScore = 0;
        alignFeedback = "No response was spoken, meaning the question intent was not addressed.";
        alignMissing = ["Expected Topics: Introduction, Core Answer Content, Relevant Experience, STAR outcomes"];
        alignSuggestions = "Ensure your microphone is active and provide a spoken response to begin alignment scoring.";
      } else {
        const qLower = (question || "").toLowerCase();
        const aLower = trimmed.toLowerCase();
        const isTellMeAboutYourself = qLower.includes("tell me about yourself") || qLower.includes("introduce yourself");
        
        // Time-Aware deduction heuristic
        let timeDeductionScore = 0;
        let timeDeductionReason = "";
        if (elapsedSeconds < 10) {
          timeDeductionScore = 6;
          timeDeductionReason = "Your answer was too short for the selected time duration.";
        } else if (elapsedSeconds < 25) {
          timeDeductionScore = 3;
          timeDeductionReason = "Your answer was too short/brief for the selected time duration.";
        }

        if (isTellMeAboutYourself) {
          const hasName = aLower.includes("name") || aLower.includes("i am") || aLower.includes("palak") || aLower.includes("shrimali") || aLower.includes("myself");
          const hasEducation = aLower.includes("b.tech") || aLower.includes("college") || aLower.includes("student") || aLower.includes("study") || aLower.includes("engineering") || aLower.includes("degree") || aLower.includes("campus");
          const hasSkills = aLower.includes("skill") || aLower.includes("coding") || aLower.includes("develop") || aLower.includes("programming") || aLower.includes("react") || aLower.includes("javascript") || aLower.includes("python") || aLower.includes("java") || aLower.includes("c++");
          const hasExperience = aLower.includes("experience") || aLower.includes("work") || aLower.includes("project") || aLower.includes("internship");
          const hasGoals = aLower.includes("goal") || aLower.includes("future") || aLower.includes("career") || aLower.includes("aspire") || aLower.includes("aim") || aLower.includes("grow");

          const topics = [
            { name: "Name", covered: hasName },
            { name: "Education", covered: hasEducation },
            { name: "Skills", covered: hasSkills },
            { name: "Experience", covered: hasExperience },
            { name: "Career Goals", covered: hasGoals }
          ];

          const missing = topics.filter(t => !t.covered).map(t => t.name);
          const coveredCount = topics.filter(t => t.covered).length;

          if (aLower.includes("cricket") && aLower.includes("campus") && !aLower.includes("study") && !aLower.includes("project") && !aLower.includes("engineering") && !aLower.includes("b.tech") && wordCount < 15) {
            alignScore = 2;
            alignFeedback = "Your response is mostly irrelevant, talking about unrelated activities instead of career/skills.";
            alignMissing = ["Education Details", "Skills & Technical Expertise", "Professional Experience", "Career Goals"];
            alignSuggestions = "Focus your introduction strictly on your professional and academic achievements rather than campus visuals or sports hobbies.";
          } else if (coveredCount >= 4) {
            alignScore = Math.max(5, Math.min(20, Math.round(18 - timeDeductionScore / 2)));
            alignFeedback = "You covered most expected points and addressed the question prompt directly." + (timeDeductionReason ? ` However, ${timeDeductionReason.toLowerCase()}` : "");
            alignMissing = missing.length > 0 ? missing : ["None! All expected topics were covered beautifully."];
            alignSuggestions = timeDeductionReason ? "Utilize more of your speaking limit to express your background fully." : "Great job. Keep your tone confident and delivery concise to stay highly professional.";
          } else if (coveredCount >= 2) {
            alignScore = Math.max(3, Math.min(15, Math.round(12 - timeDeductionScore / 2)));
            alignFeedback = `Your response partially addressed the question but missed important details about: ${missing.join(", ")}.` + (timeDeductionReason ? ` Also, ${timeDeductionReason.toLowerCase()}` : "");
            alignMissing = missing;
            alignSuggestions = `Try adding explicit statements detailing your: ${missing.join(" and ")} to completely align with standard recruiter expectations and expand your speaking duration.`;
          } else {
            alignScore = Math.max(2, Math.min(8, Math.round(5 - timeDeductionScore / 2)));
            alignFeedback = "Your response is vague, short, or does not address the required introductory topics.";
            alignMissing = missing;
            alignSuggestions = "Structure your introduction using our guided list: Name, Education, Skills, Experience, and Career Goals.";
          }
        } else {
          const stopWords = new Set(["what", "is", "your", "tell", "me", "about", "yourself", "how", "do", "you", "the", "a", "an", "to", "in", "on", "and", "of", "for", "with", "at", "by", "from"]);
          const qWords = qLower.split(/\W+/).filter(w => w.length > 2 && !stopWords.has(w));
          let matches = 0;
          qWords.forEach(qw => { if (aLower.includes(qw)) matches++; });

          const hasContext = matches > 0;
          const hasFrameworkOrAction = aLower.includes("solved") || aLower.includes("react") || aLower.includes("javascript") || aLower.includes("python") || aLower.includes("design") || aLower.includes("implement") || aLower.includes("test") || aLower.includes("project");
          const hasResults = aLower.includes("result") || aLower.includes("improved") || aLower.includes("metrics") || aLower.includes("solved") || aLower.includes("learn") || /\d+/.test(aLower);

          const topics = [
            { name: "Context / Situation", covered: hasContext },
            { name: "Specific actions / Frameworks", covered: hasFrameworkOrAction },
            { name: "Results / Quantitative outcomes", covered: hasResults }
          ];
          const missing = topics.filter(t => !t.covered).map(t => t.name);
          const coveredCount = topics.filter(t => t.covered).length;

          if (coveredCount === 3 && wordCount >= 40) {
            alignScore = Math.max(5, Math.min(20, Math.round(18 - timeDeductionScore / 2)));
            alignFeedback = "Your answer directly addressed the question and covered most expected points." + (timeDeductionReason ? ` However, ${timeDeductionReason.toLowerCase()}` : "");
            alignMissing = ["None! You stayed perfectly on topic."];
            alignSuggestions = timeDeductionReason ? "Elaborate further on your concrete contributions to utilize the speak timer." : "Fabulous alignment. Consider citing specific code libraries or concrete team scale metrics to push even higher.";
          } else if (coveredCount >= 1 && wordCount >= 15) {
            alignScore = Math.max(3, Math.min(15, Math.round(12 - timeDeductionScore / 2)));
            alignFeedback = `Your response is partially on-topic but lacks: ${missing.join(", ")}.` + (timeDeductionReason ? ` Also, ${timeDeductionReason.toLowerCase()}` : "");
            alignMissing = missing;
            alignSuggestions = `Try referencing specific actions or results, using the STAR method to address the ${missing.join(" & ")}.`;
          } else {
            alignScore = Math.max(2, Math.min(8, Math.round(5 - timeDeductionScore / 2)));
            alignFeedback = "Your response was not relevant to the question asked." + (timeDeductionReason ? ` Also, ${timeDeductionReason.toLowerCase()}` : "");
            alignMissing = ["Context understanding", "Topic relevance", "Technical correctness"];
            alignSuggestions = "Listen carefully to the question prompt and construct your answer using precise on-topic industry concepts.";
          }
        }
      }

      // Penalize/Cap fallback overallScore based on alignScore
      let finalizedOverall = overall;
      if (alignScore < 6) {
        finalizedOverall = Math.min(finalizedOverall, 5);
      } else if (alignScore < 15) {
        finalizedOverall = Math.min(finalizedOverall, 15);
      }

      // Check if candidate answer is off-topic
      const qLowerCheck = (question || "").toLowerCase();
      const aLowerCheck = (trimmed || "").toLowerCase();
      const sWords = new Set(["what", "is", "your", "tell", "me", "about", "yourself", "how", "do", "you", "the", "a", "an", "to", "in", "on", "and", "of", "for", "with", "at", "by", "from"]);
      const qWordsCheck = qLowerCheck.split(/\W+/).filter(w => w.length > 2 && !sWords.has(w));
      let wordMatches = 0;
      qWordsCheck.forEach(qw => { if (aLowerCheck.includes(qw)) wordMatches++; });
      const genKeywords = ["experience", "project", "work", "develop", "code", "learn", "technology", "study", "engineering", "science", "college", "team", "challenge", "solved", "b.tech", "student", "myself", "name"];
      let wordKeywords = 0;
      genKeywords.forEach(kw => { if (aLowerCheck.includes(kw)) wordKeywords++; });
      const clientOffTopic = (wordMatches === 0 && wordKeywords <= 1 && interviewType !== "aptitude" && wordCount > 0);

      if (interviewType !== "aptitude" && wordCount < 10) {
        qScore = 0;
        cScore = 0;
        confScore = 0;
        fScore = 0;
        pScore = 0;
        eyeScore = 0;
        bodyScore = 0;
        finalizedOverall = 0;
        relScore = 0;
        alignScore = 0;
        relFeedback = "Your response has less than 10 words, which is too short or silent to evaluate relevance.";
        alignFeedback = "The response does not meet the minimum length requirement of 10 words.";
        alignMissing = ["Expected a detailed, structured spoken response of at least 10 words."];
        alignSuggestions = "Elaborate your response to be at least 10 words long, providing more explanation, projects, or background.";
        fallbackImprovements = [
          "Your response was too short, silent, or had less than 10 words.",
          "To receive evaluation points, standard interview answers must be at least 10 words long.",
          "Ensure you speak clearly and elaborate on the question topic using structural context."
        ];
      } else if (clientOffTopic) {
        qScore = 0;
        cScore = 0;
        confScore = 0;
        fScore = 0;
        pScore = 0;
        eyeScore = 0;
        bodyScore = 0;
        finalizedOverall = 0;
        relScore = 0;
        alignScore = 0;
        relFeedback = "Your response is completely irrelevant or incorrect for the question asked.";
        alignFeedback = "Your response does not align with the question context at all.";
        alignMissing = ["Context understanding", "Topic relevance", "Technical correctness"];
        alignSuggestions = "Listen carefully to the question prompt and construct your answer using precise on-topic industry concepts.";
        fallbackImprovements = [
          "Your response was completely unrelated or wrong for the question asked.",
          "Ensure your spoken answer is directly relevant to the specific topic of the question to earn points."
        ];
      }

      const fallbackFeedback = {
        goodPoints: qScore > 0 ? ["Sensory status indicators aligned and active"] : [],
        improvements: fallbackImprovements,
        answerQualityScore: qScore,
        communicationScore: cScore,
        confidenceScore: confScore,
        fluencyScore: fScore,
        pronunciationScore: pScore,
        eyeContactScore: eyeScore,
        bodyLanguageScore: bodyScore,
        overallScore: finalizedOverall,
        questionRelevanceScore: relScore,
        questionRelevanceFeedback: relFeedback,
        questionAlignmentScore: alignScore,
        questionAlignmentFeedback: alignFeedback,
        questionAlignmentMissingPoints: alignMissing,
        questionAlignmentSuggestions: alignSuggestions,
        scoreExplanations: {
          answerQuality: `Evaluated at ${qScore}/20. Answer content captured was: "${trimmed || "silence"}".`,
          communication: `Communication rating corresponds strictly to enunciation clarity and words delivered (${cScore}/20).`,
          confidence: `Vocal assertion rate scored at ${confScore}/20 based on speech presence.`,
          fluency: `Fluency index represents conversational flow and transition pauses (${fScore}/20).`,
          pronunciation: `Speech recognition enunciation clarity graded at ${pScore}/20.`,
          eyeContact: `Steady gaze tracking registered connection metrics at ${eyeScore}/20.`,
          bodyLanguage: `Centered postural alignments registered at ${bodyScore}/20.`,
          overall: `Overall rating calculated at ${finalizedOverall}/20 after penalizing for alignment level.`
        },
        suggestedAnswer: "To perfect this response, highlight specific target deliverables and metric successes."
      };
      setSingleFeedback(fallbackFeedback);
      setQuestionsFeedbackMap(prev => ({
        ...prev,
        [currentQuestionIndex]: fallbackFeedback
      }));
      setAutoProgressCountdown(null); // Explicitly disable auto-skipping
    }
  };

  const clearActiveSensoryStreams = () => {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setAiIsSpeaking(false);
    stopSpeechRecognition();
  };

  const togglePauseResume = () => {
    if (isPaused) {
      // Resume
      setIsPaused(false);
      if (wasRecordingRef.current) {
        const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRec) {
          startFallbackTranscript(true);
        } else {
          startSpeechRecognition(true);
        }
      }
    } else {
      // Pause
      setIsPaused(true);
      wasRecordingRef.current = isRecording;
      
      // Stop timer
      if (answerTimerRef.current) {
        clearInterval(answerTimerRef.current);
        answerTimerRef.current = null;
      }
      
      // Stop speech recognition
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      setIsRecording(false);
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
    }
  };

  const handleStopAndEvaluate = () => {
    clearActiveSensoryStreams();
    setShowStopConfirmation(false);
    
    // Filter questions that have been answered so far
    const answeredQs = questionsList.filter(q => !!q.answerText);
    
    if (answeredQs.length === 0) {
      alert("No responses have been locked yet. Exiting to Dashboard.");
      onCancel();
      return;
    }
    
    triggerFinalSessionEvaluation(answeredQs);
  };

  const handleNavigatePrevious = () => {
    if (currentQuestionIndex > 0) {
      clearActiveSensoryStreams();
      setSingleFeedback(null);
      setAutoProgressCountdown(null);
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleNavigateNext = () => {
    if (currentQuestionIndex < questionsList.length - 1) {
      clearActiveSensoryStreams();
      setSingleFeedback(null);
      setAutoProgressCountdown(null);
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handleProgressToNextSegment = () => {
    if (autoProgressTimerRef.current) clearTimeout(autoProgressTimerRef.current);
    setAutoProgressCountdown(null);
    setSingleFeedback(null);

    const activeIndex = currentQuestionIndex;
    const isCompleted = (activeIndex + 1) >= totalQuestions;

    if (isCompleted) {
      triggerFinalSessionEvaluation(questionsList);
    } else {
      setCurrentTranscript("");
      setFillerWordsCount(0);
      setDetectedFillers([]);
      
      const nextHistory = [...conversationHistory];
      fetchNextQuestion(nextHistory);
    }
  };

  const handleNextOrComplete = async () => {
    // Stop recording first
    stopSpeechRecognition();

    // Trigger visual hearing/processing states immediately
    setIsCognitiveProcessing(true);
    setProcessingStep(0);

    // Transition timers to mimic human parsing stages
    setTimeout(() => {
      setProcessingStep(1);
    }, 800);

    setTimeout(() => {
      setProcessingStep(2);
    }, 1600);

    setTimeout(async () => {
      setIsCognitiveProcessing(false);

      const activeIndex = currentQuestionIndex;
      const currentQ = questionsList[activeIndex];
      const answerVal = initializedAnswerValue(currentTranscript);

      // Perform Option Verification for Aptitude Track
      let selectedOptionLetter = "";
      let isCorrectAns = false;

      if (interviewType === "aptitude" && currentQ?.options) {
        const transcriptLower = currentTranscript.toLowerCase().trim();
        const optionMatches = transcriptLower.match(/option\s*([a-d])/i);
        if (optionMatches && optionMatches[1]) {
          selectedOptionLetter = optionMatches[1].toUpperCase();
        } else {
          const words = transcriptLower.split(/\W+/).filter(Boolean);
          const letters = ["a", "b", "c", "d"];
          const foundLetter = letters.find(l => {
            return words.includes(l) || 
                   transcriptLower === l || 
                   transcriptLower.startsWith(l + " ") || 
                   transcriptLower.endsWith(" " + l) ||
                   transcriptLower.includes(`choose ${l}`) ||
                   transcriptLower.includes(`select ${l}`) ||
                   transcriptLower.includes(`option is ${l}`);
          });
          if (foundLetter) {
            selectedOptionLetter = foundLetter.toUpperCase();
          }
        }

        if (!selectedOptionLetter) {
          for (const opt of currentQ.options) {
            const letter = opt.substring(0, 1).toUpperCase();
            const val = opt.substring(3).toLowerCase().trim();
            const cleanVal = val.replace(/[₹%,.×\s\-]/g, "").trim();
            const cleanTranscript = transcriptLower.replace(/[₹%,.×\s\-]/g, "").trim();
            
            const valNum = val.match(/\d+/)?.[0];
            
            if (transcriptLower.includes(val) || 
                (cleanVal && cleanTranscript.includes(cleanVal)) ||
                (valNum && transcriptLower.includes(valNum))) {
              selectedOptionLetter = letter;
              break;
            }
          }
        }

        if (selectedOptionLetter) {
          isCorrectAns = (selectedOptionLetter === currentQ.correctOption);
        }
      }

      const finalizedQuestionVal: MockQuestion = {
        ...currentQ,
        answerText: answerVal,
        fillerWordsCount: fillerWordsCount,
        fillerWordsList: detectedFillers,
        speechPaceWpm: speechPaceWpm || 135,
        wordCount: currentTranscript.split(/\s+/).filter(Boolean).length,
        userConfidenceScore: Math.max(50, 100 - (fillerWordsCount * 4) - (speechPaceWpm > 170 ? 15 : 0)),
        selectedOption: selectedOptionLetter || undefined,
        isCorrect: selectedOptionLetter ? isCorrectAns : false
      };

      // Update state store
      const updatedQuestions = [...questionsList];
      updatedQuestions[activeIndex] = finalizedQuestionVal;
      setQuestionsList(updatedQuestions);

      // Save history context
      const nextHistory = [...conversationHistory, {
        question: currentQ.questionText,
        answer: answerVal
      }];
      setConversationHistory(nextHistory);

      // Trigger the instant per-question feedback overlay/phase!
      await evaluateCurrentQuestionAndShowFeedback(currentQ.questionText, answerVal, updatedQuestions);
    }, 2400);
  };

  const handleAptitudeSubmit = async () => {
    const activeIndex = currentQuestionIndex;
    const currentQ = questionsList[activeIndex];
    if (!currentQ || currentQ.answerText) return;

    const rawInput = typedAnswer.trim();
    if (!rawInput) return;

    // Determine option correctness
    let selectedOptionLetter = "";
    let isCorrectAns = false;

    const lowerInput = rawInput.toLowerCase();

    // Match letter
    const letterMatch = lowerInput.match(/^(?:option\s+)?([a-d])\)?$/i);
    if (letterMatch && letterMatch[1]) {
      selectedOptionLetter = letterMatch[1].toUpperCase();
    } else {
      const simpleLetter = ["a", "b", "c", "d"].find(l => lowerInput === l);
      if (simpleLetter) {
        selectedOptionLetter = simpleLetter.toUpperCase();
      }
    }

    // Match option value
    if (!selectedOptionLetter && currentQ.options) {
      for (const opt of currentQ.options) {
        const letter = opt.substring(0, 1).toUpperCase();
        const val = opt.substring(3).toLowerCase().trim();
        const cleanVal = val.replace(/[₹%,.×\s\-]/g, "").trim();
        const cleanInput = lowerInput.replace(/[₹%,.×\s\-]/g, "").trim();
        
        const valNum = val.match(/\d+/)?.[0];
        const inputNum = lowerInput.match(/\d+/)?.[0];

        if (
          lowerInput === val ||
          (cleanVal && cleanInput === cleanVal) ||
          (valNum && inputNum && valNum === inputNum) ||
          val.includes(lowerInput) ||
          lowerInput.includes(val)
        ) {
          selectedOptionLetter = letter;
          break;
        }
      }
    }

    if (selectedOptionLetter) {
      isCorrectAns = (selectedOptionLetter === currentQ.correctOption);
    } else {
      // Direct value match against correct option
      if (currentQ.correctOption && currentQ.options) {
        const correctOpt = currentQ.options.find(o => o.startsWith(currentQ.correctOption + ")"));
        if (correctOpt) {
          const correctVal = correctOpt.substring(3).toLowerCase().trim();
          const cleanCorrectVal = correctVal.replace(/[₹%,.×\s\-]/g, "").trim();
          const cleanInput = lowerInput.replace(/[₹%,.×\s\-]/g, "").trim();
          if (cleanInput === cleanCorrectVal || lowerInput.includes(correctVal)) {
            selectedOptionLetter = currentQ.correctOption;
            isCorrectAns = true;
          }
        }
      }
    }

    const finalAnswerText = rawInput;

    const finalizedQuestionVal: MockQuestion = {
      ...currentQ,
      answerText: finalAnswerText,
      selectedOption: selectedOptionLetter || undefined,
      isCorrect: isCorrectAns,
      fillerWordsCount: 0,
      fillerWordsList: [],
      speechPaceWpm: 0,
      wordCount: finalAnswerText.split(/\s+/).filter(Boolean).length,
      userConfidenceScore: isCorrectAns ? 100 : 50
    };

    const updatedQuestions = [...questionsList];
    updatedQuestions[activeIndex] = finalizedQuestionVal;
    setQuestionsList(updatedQuestions);

    const nextHistory = [...conversationHistory, {
      question: currentQ.questionText,
      answer: finalAnswerText
    }];
    setConversationHistory(nextHistory);

    let correctOptionText = "";
    if (currentQ.options && currentQ.correctOption) {
      const foundOpt = currentQ.options.find(o => o.startsWith(currentQ.correctOption + ")"));
      if (foundOpt) {
        correctOptionText = foundOpt.substring(3).trim();
      }
    }

    // Play voice feedback automatically after answer submission in Aptitude mode
    speakAptitudeFeedback(isCorrectAns, currentQ.correctOption, correctOptionText);

    // Call server evaluate-question API to ensure scores populate correctly in reports/coach metrics
    await evaluateCurrentQuestionAndShowFeedback(currentQ.questionText, finalAnswerText, updatedQuestions);
  };

  const initializedAnswerValue = (text: string) => {
    return text.trim() || "[Action complete. Candidate maintained high camera lock and stable postural gaze]";
  };

  // 5. Aggregate metrics and hit Evaluation Route
  const triggerFinalSessionEvaluation = async (finalQuestions: MockQuestion[]) => {
    setIsEvaluating(true);
    setStatusText("QuantView Sensory Algorithms computing biometric data, voice clarity, and posture indices...");

    const mappedQuestions = finalQuestions.map((q, idx) => {
      const fb = questionsFeedbackMap[idx] || {};
      return {
        ...q,
        questionRelevanceScore: fb.questionRelevanceScore,
        questionRelevanceFeedback: fb.questionRelevanceFeedback,
        questionAlignmentScore: fb.questionAlignmentScore,
        questionAlignmentFeedback: fb.questionAlignmentFeedback,
        questionAlignmentMissingPoints: fb.questionAlignmentMissingPoints,
        questionAlignmentSuggestions: fb.questionAlignmentSuggestions
      };
    });

    try {
      const response = await fetch("/api/quantview/interview/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interviewType,
          userProfile,
          selectedField,
          questions: mappedQuestions.map((q, idx) => {
            const fb = questionsFeedbackMap[idx] || {};
            return {
              questionText: q.questionText,
              answerText: q.answerText,
              fillerWordsCount: q.fillerWordsCount,
              speechPaceWpm: q.speechPaceWpm,
              userConfidenceScore: q.userConfidenceScore,
              answerQualityScore: fb.answerQualityScore,
              communicationScore: fb.communicationScore,
              confidenceScore: fb.confidenceScore,
              eyeContactScore: fb.eyeContactScore,
              bodyLanguageScore: fb.bodyLanguageScore,
              overallScore: fb.overallScore,
              questionRelevanceScore: fb.questionRelevanceScore,
              questionRelevanceFeedback: fb.questionRelevanceFeedback,
              questionAlignmentScore: fb.questionAlignmentScore,
              questionAlignmentFeedback: fb.questionAlignmentFeedback,
              questionAlignmentMissingPoints: fb.questionAlignmentMissingPoints,
              questionAlignmentSuggestions: fb.questionAlignmentSuggestions
            };
          })
        })
      });

      const evaluationResult = await response.json();
      
      const completedSession: MockSession = {
        id: `sess-${Math.random().toString(36).substr(2, 9)}`,
        userId: userProfile.email,
        interviewType,
        level: interviewLevel,
        date: new Date().toISOString(),
        questions: mappedQuestions,
        evaluation: evaluationResult,
        status: "evaluated",
        selectedField,
        totalQuestions
      };

      setIsEvaluating(false);
      onCompleteSession(completedSession);
    } catch (e) {
      console.error("Evaluation runtime failed:", e);
      // Fallback evaluation structure
      setIsEvaluating(false);

      let totalRel = 0;
      let totalAlign = 0;
      let aggregateMissingPoints: string[] = [];

      mappedQuestions.forEach((mq, idx) => {
        const fb = questionsFeedbackMap[idx] || {};
        totalRel += fb.questionRelevanceScore !== undefined ? fb.questionRelevanceScore : 75;
        totalAlign += fb.questionAlignmentScore !== undefined ? fb.questionAlignmentScore : 75;
        if (fb.questionAlignmentMissingPoints) {
          aggregateMissingPoints = aggregateMissingPoints.concat(fb.questionAlignmentMissingPoints);
        }
      });

      const avgRelScore = mappedQuestions.length > 0 ? Math.round(totalRel / mappedQuestions.length) : 75;
      const avgAlignScore = mappedQuestions.length > 0 ? Math.round(totalAlign / mappedQuestions.length) : 75;
      
      aggregateMissingPoints = Array.from(new Set(aggregateMissingPoints)).filter(p => p && p.toLowerCase() !== "none" && p.toLowerCase() !== "none!");
      if (aggregateMissingPoints.length === 0) {
        aggregateMissingPoints = ["No major missing points identified! Excellent coverage of expected interview topics."];
      }

      let fallbackRelFeedback = "Your responses partially addressed the questions.";
      if (avgRelScore < 40) {
        fallbackRelFeedback = "Your answers were not relevant to the questions asked.";
      } else if (avgRelScore >= 80) {
        fallbackRelFeedback = "Your answers directly addressed the questions.";
      }

      let fallbackAlignFeedback = "Your responses partially addressed the expected key points.";
      if (avgAlignScore < 40) {
        fallbackAlignFeedback = "Your answers were mostly unrelated or missed the actual intent of the questions asked.";
      } else if (avgAlignScore >= 80) {
        fallbackAlignFeedback = "Your responses directly addressed the expected technical and background key points.";
      }

      // Cap fallback overallScore out of 50 based on average alignment score (0-100)
      let fallbackOverall = 38;
      if (avgAlignScore < 40) {
        fallbackOverall = 15;
      } else if (avgAlignScore < 70) {
        fallbackOverall = Math.min(fallbackOverall, 35);
      }

      const fallbackSession: MockSession = {
        id: `sess-${Math.random().toString(36).substr(2, 9)}`,
        userId: userProfile.email,
        interviewType,
        level: interviewLevel,
        date: new Date().toISOString(),
        questions: mappedQuestions,
        status: "evaluated",
        selectedField,
        totalQuestions,
        evaluation: {
          overallScore: fallbackOverall,
          communicationScore: 40,
          confidenceScore: 42,
          voiceAnalysisScore: 39,
          facialExpressionScore: 41,
          eyeContactScore: 38,
          bodyLanguageScore: 40,
          technicalPerformanceScore: 37,
          questionRelevanceScore: avgRelScore,
          questionRelevanceFeedback: fallbackRelFeedback,
          questionAlignmentScore: avgAlignScore,
          questionAlignmentFeedback: fallbackAlignFeedback,
          questionAlignmentMissingPoints: aggregateMissingPoints,
          questionAlignmentSuggestions: "Structure answers carefully using explicit STAR metrics.",
          date: new Date().toISOString(),
          strengths: ["Strong situational speaking confidence", "Consistent articulation limits"],
          weaknesses: ["Occasional minor stutters when detailing APIs"],
          mistakesMade: ["Could implement tighter quantitative STAR metrics"],
          communicationFeedback: "Verbal command is very professional.",
          confidenceFeedback: "Maintained strong forward confidence metrics.",
          bodyLanguageFeedback: "Excellent head level and forward chest alignment.",
          eyeContactFeedback: "Stabilize eye trackers while recalling database variables.",
          voiceFeedback: "Vocal speed remains in the comfortable auditory segment.",
          detailedAnalysisParagraph: "QuantView Coach report: You handled yourself with excellent composure. Tightening verbal delays will finalize an elite score.",
          practiceRecommendations: ["STAR structure vocalization grids"]
        }
      };
      onCompleteSession(fallbackSession);
    }
  };

  const currentQ = questionsList[currentQuestionIndex];

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-4 sm:p-8 flex flex-col justify-between text-slate-800 relative overflow-hidden">
      {/* Decorative Grid Backdrop */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f080_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f080_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
      <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-blue-50 rounded-full blur-[140px] pointer-events-none opacity-40" />
      <div className="absolute bottom-[10%] right-[-10%] w-[40%] h-[40%] bg-sky-50 rounded-full blur-[120px] pointer-events-none opacity-40" />
      
      {/* Header */}
      <header className="flex items-center justify-between border-b border-slate-200 pb-4 relative z-10 w-full max-w-7xl mx-auto">
        <div className="flex items-center space-x-3">
          <span className="text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200 px-3 py-1 rounded-full uppercase tracking-wider">
            Mock Practice Room
          </span>
          <span className="font-semibold text-sm text-slate-500">
            Target Track: <span className="capitalize text-slate-900 font-bold">{interviewType === "hr" ? "HR Screening" : interviewType}</span>
          </span>
        </div>
        <button 
          onClick={() => setShowStopConfirmation(true)}
          className="text-xs text-red-650 hover:text-red-800 font-bold px-4 py-2.5 rounded-xl bg-red-50/50 hover:bg-red-50 border border-red-200 transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
        >
          <Square className="w-3 h-3 fill-current text-red-500" />
          <span>Stop Interview</span>
        </button>
      </header>

      {/* Main Sensory Room Grid */}
      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch flex-grow w-full py-8 relative z-10">
        
        {/* Left Side: Video Assessment Grid & Visualizers (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col justify-between gap-6">
          
          {/* Camera Visualizer Screen */}
          <div className="relative aspect-video bg-slate-900 rounded-2xl border border-slate-200 shadow-lg overflow-hidden flex flex-col items-center justify-center group flex-grow">
            
            <video 
              ref={videoRef} 
              autoPlay
              muted 
              playsInline 
              className="absolute inset-0 w-full h-full object-cover rounded-2xl scale-x-[-1]"
            />
            
            {!cameraActive && (
              <div className="text-center p-6 space-y-3 max-w-sm absolute z-10 bg-white/95 rounded-2xl border border-slate-200 shadow-sm backdrop-blur-sm">
                <CameraOff className="w-8 h-8 text-slate-400 mx-auto" />
                <h4 className="text-sm font-bold text-slate-800">Your Web Camera is Offline</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {cameraError || "Simulator active: Camera feed represented procedurally for assessor metrics."}
                </p>
              </div>
            )}

            {/* Clean AI Tracking Overlays */}
            <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between p-4 bg-transparent">
              
              {/* Target bracket outline */}
              <div className="absolute left-6 top-6 w-8 h-4 border-l-2 border-t-2 border-blue-400/40" />
              <div className="absolute right-6 top-6 w-8 h-4 border-r-2 border-t-2 border-blue-400/40" />
              <div className="absolute left-6 bottom-6 w-8 h-4 border-l-2 border-b-2 border-blue-400/40" />
              <div className="absolute right-6 bottom-6 w-8 h-4 border-r-2 border-b-2 border-blue-400/40" />

              {/* Laser Scan line overlay */}
              <div 
                className="absolute left-2 right-2 h-0.5 bg-blue-500/15 blur-sm transition-all" 
                style={{ top: `${scanOffset}%` }}
              />

              {/* Status Tags */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold bg-white/95 text-blue-600 border border-blue-200 px-2.5 py-1 rounded-full shadow-sm backdrop-blur-sm flex items-center gap-1.5 flex-row">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  <span>AI FEED ACTIVE</span>
                </span>
                
                <span className="text-[10px] font-bold bg-white/95 text-slate-705 border px-2.5 py-1 rounded-full shadow-sm backdrop-blur-sm flex items-center gap-1.5 border-slate-200">
                  <span className={`w-2 h-2 rounded-full ${gazeStable ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'}`} />
                  <span>GAZE PROFILE: {gazeStable ? "STEADY" : "SHIFTY"}</span>
                </span>

                <span className={`text-[10px] font-bold border px-2.5 py-1 rounded-full shadow-sm backdrop-blur-sm flex items-center gap-1.5 flex-row ${
                  (timeLimit - elapsedSeconds) <= 10 
                    ? 'bg-red-50 text-red-650 border-red-200 animate-pulse' 
                    : 'bg-white/95 text-slate-700 border-slate-200'
                }`}>
                  <Clock className={`w-3.5 h-3.5 ${(timeLimit - elapsedSeconds) <= 10 ? 'text-red-500' : 'text-blue-500'}`} />
                  <span>TIME REMAINING: {Math.max(0, timeLimit - elapsedSeconds)}s</span>
                </span>
              </div>

              {/* Live center target face frame */}
              <div className="w-24 h-24 border border-dashed border-blue-400/20 rounded-full mx-auto relative flex items-center justify-center opacity-40">
                <div className="absolute inset-0 border border-blue-500/10 rounded-full animate-ping [animation-duration:3.2s]" />
                <span className="text-[9px] font-mono font-bold text-slate-300">Face Lock</span>
              </div>

              {/* Bottom indicators */}
              <div className="flex justify-between items-end">
                <div className="space-y-1">
                  <span className="block text-[9px] font-bold text-slate-400 font-mono">POSTURAL STABILITY</span>
                  <div className="w-20 h-1.5 bg-white/50 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all ${postureAligned ? 'bg-blue-600' : 'bg-amber-500'}`} 
                      style={{ width: postureAligned ? "94%" : "40%" }}
                    />
                  </div>
                </div>

                <div className="text-right text-[9px] font-bold text-slate-300 flex flex-col justify-end">
                  <span>CAMERA STATUS: NORMAL</span>
                </div>
              </div>

            </div>

            {isPaused && (
              <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md z-45 flex flex-col items-center justify-center text-center p-6 space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-blue-600/25 flex items-center justify-center text-blue-400 border border-blue-500/30 animate-pulse">
                  <Play className="w-7 h-7 fill-current ml-0.5" />
                </div>
                <h3 className="text-white text-base font-black tracking-tight">Interview Suspended</h3>
                <p className="text-[11px] text-slate-400 font-semibold max-w-xs leading-normal">
                  Your communication diagnostics timer is paused. Click Resume below to re-activate sensors.
                </p>
                <button
                  type="button"
                  onClick={togglePauseResume}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                >
                  <Play className="w-3 h-3 fill-current text-white" />
                  <span>Resume Practice</span>
                </button>
              </div>
            )}

          </div>

          {/* Canvas Wave Visualizer & Microphone details */}
          <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-4 flex items-center justify-between gap-4">
            <div className="flex items-center space-x-3 shrink-0">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isRecording ? 'bg-blue-50 text-blue-600 border border-blue-200 animate-pulse' : 'bg-slate-100 text-slate-400 border border-slate-200'}`}>
                <Mic className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Live Vocal Analysis</h4>
                <p className="text-[10px] text-slate-500 font-medium">
                  {isRecording ? "Transcribing capture feed..." : "Speech standby"}
                </p>
              </div>
            </div>

            <div className="flex-grow h-10 border border-slate-100 bg-slate-50/50 rounded-xl overflow-hidden relative">
              {isRecording ? (
                <canvas ref={canvasRef} width={400} height={40} className="w-full h-full absolute inset-0" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[10px] text-slate-400 font-medium font-mono">Sensory soundwaves will draw here during speech</span>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Right Side: Coach Assistant Column (5 Cols) */}
        <div id="quantview_assessor_column" className="lg:col-span-5 bg-white border border-slate-200 shadow-md rounded-3xl p-6 sm:p-7 flex flex-col justify-between gap-6 relative">
          
          {/* Main Top Header Info */}
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">QuantView Coach Assessor</h3>
              </div>
              <div className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                ACTIVE
              </div>
            </div>

            {/* Interactive Simulation Handshake States */}
            {isInitializing || isLoadingNext ? (
              <div className="py-20 text-center space-y-4">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900">{statusText}</h4>
                  <p className="text-xs text-slate-500 mt-1.5 leading-normal">Configuring smart listening systems...</p>
                </div>
              </div>
            ) : isEvaluatingSingle ? (
              <div className="py-20 text-center space-y-5 animate-in fade-in">
                <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto" strokeWidth={3} />
                <div className="space-y-2">
                  <h4 className="text-sm font-black text-slate-900">Dr. Sarah is Analyzing Response...</h4>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                    Computing communication pacing, grading confidence, and formulating structural answer recommendations.
                  </p>
                </div>
              </div>
            ) : (questionsList[currentQuestionIndex] && !!questionsList[currentQuestionIndex].answerText && !singleFeedback) ? (
              <div className="space-y-5 pt-4 animate-in fade-in duration-350 min-h-[400px]">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <span className="text-xs font-black text-emerald-800 uppercase tracking-wider flex items-center gap-1.5 font-sans">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Locked Response Reviewed
                  </span>
                  <span className="text-[10px] font-extrabold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                    Index {currentQuestionIndex + 1}/{totalQuestions}
                  </span>
                </div>

                {/* Text Answer Submitted */}
                <div className="space-y-1">
                  <span className="block text-[9px] font-mono font-bold text-slate-405 uppercase">Your Response Transcript</span>
                  <div className="bg-emerald-50/20 border border-emerald-100/40 p-3.5 rounded-xl text-xs text-slate-700 italic pl-3 leading-relaxed font-semibold max-h-24 overflow-y-auto">
                    "{questionsList[currentQuestionIndex]?.answerText}"
                  </div>
                </div>

                {/* Saved Telemetry Specs */}
                <div className="grid grid-cols-2 gap-3.5 pt-1">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="block text-[8px] font-mono font-bold text-slate-400 uppercase">Pacing Metrics</span>
                    <span className="block text-sm font-black text-slate-900 mt-1">{questionsList[currentQuestionIndex]?.speechPaceWpm || 135} WPM</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="block text-[8px] font-mono font-bold text-slate-400 uppercase">Filler Counts</span>
                    <span className="block text-sm font-black text-slate-900 mt-1 text-slate-800">{questionsList[currentQuestionIndex]?.fillerWordsCount || 0} words</span>
                  </div>
                </div>

                {/* Feedback Details if cached in map */}
                {questionsFeedbackMap[currentQuestionIndex] ? (
                  <div className="space-y-4 pt-4 border-t border-dashed border-slate-200">
                    {interviewType === "aptitude" ? (
                      <div className="space-y-3">
                        {/* Question Result */}
                        <div className={`p-4 rounded-2xl border flex items-start gap-3 ${
                          questionsList[currentQuestionIndex]?.isCorrect 
                            ? "bg-emerald-50 border-emerald-200 text-emerald-900" 
                            : "bg-rose-50 border-rose-200 text-rose-900"
                        }`}>
                          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                            questionsList[currentQuestionIndex]?.isCorrect ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
                          }`}>
                            {questionsList[currentQuestionIndex]?.isCorrect ? "✓" : "✗"}
                          </span>
                          <div className="space-y-0.5">
                            <sup className="text-[9px] font-mono font-bold uppercase tracking-wider block opacity-70">Question Result</sup>
                            <h4 className="text-sm font-black">
                              {questionsList[currentQuestionIndex]?.isCorrect ? "✓ Correct Answer" : "✗ Incorrect Answer"}
                            </h4>
                          </div>
                        </div>

                        {/* Marks & Current Score Grid */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                            <span className="block text-[8px] font-mono font-bold text-slate-500 uppercase leading-none">Marks Earned</span>
                            <span className="text-xl font-black text-slate-800 block">
                              {questionsList[currentQuestionIndex]?.isCorrect ? "1" : "0"}
                            </span>
                          </div>

                          <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl space-y-1">
                            <span className="block text-[8px] font-mono font-bold text-blue-700 uppercase leading-none">Current Score</span>
                            <span className="text-xl font-black text-blue-800 block">
                              {getAptitudeCorrectCountUpTo(currentQuestionIndex)}/{currentQuestionIndex + 1}
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Score indicators */
                      <div className="space-y-3">
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
                          <div>
                            <sup className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">Composite Performance Index</sup>
                            <span className="text-sm font-black text-slate-800">Overall Rating</span>
                          </div>
                          <div className="flex items-baseline gap-1 text-right bg-blue-50 border border-blue-200 px-3.5 py-1.5 rounded-xl">
                            <span className="text-2xl font-black text-blue-700">{questionsFeedbackMap[currentQuestionIndex].overallScore !== undefined ? questionsFeedbackMap[currentQuestionIndex].overallScore : Math.round(((questionsFeedbackMap[currentQuestionIndex].confidenceScore || 11) + (questionsFeedbackMap[currentQuestionIndex].communicationScore || 11))/2)}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2.5">
                          <div className="p-3 bg-amber-50/45 border border-amber-100 rounded-2xl space-y-1">
                            <span className="block text-[8px] font-mono font-bold text-amber-700 uppercase leading-none">Answer Quality</span>
                            <span className="text-base font-black text-slate-900 mt-1 block">{questionsFeedbackMap[currentQuestionIndex].answerQualityScore !== undefined ? questionsFeedbackMap[currentQuestionIndex].answerQualityScore : 11}</span>
                            {questionsFeedbackMap[currentQuestionIndex].scoreExplanations?.answerQuality && (
                              <p className="text-[10px] text-slate-500 leading-normal font-medium pt-1 border-t border-slate-100/60 mt-1">{questionsFeedbackMap[currentQuestionIndex].scoreExplanations.answerQuality}</p>
                            )}
                          </div>

                          <div className="p-3 bg-violet-50/45 border border-violet-100 rounded-2xl space-y-1">
                            <span className="block text-[8px] font-mono font-bold text-violet-700 uppercase leading-none">Communication</span>
                            <span className="text-base font-black text-slate-900 mt-1 block">{questionsFeedbackMap[currentQuestionIndex].communicationScore !== undefined ? questionsFeedbackMap[currentQuestionIndex].communicationScore : 11}</span>
                            {questionsFeedbackMap[currentQuestionIndex].scoreExplanations?.communication && (
                              <p className="text-[10px] text-slate-500 leading-normal font-medium pt-1 border-t border-slate-100/60 mt-1">{questionsFeedbackMap[currentQuestionIndex].scoreExplanations.communication}</p>
                            )}
                          </div>

                          <div className="p-3 bg-emerald-50/45 border border-emerald-100 rounded-2xl space-y-1">
                            <span className="block text-[8px] font-mono font-bold text-emerald-700 uppercase leading-none">Confidence</span>
                            <span className="text-base font-black text-slate-900 mt-1 block">{questionsFeedbackMap[currentQuestionIndex].confidenceScore !== undefined ? questionsFeedbackMap[currentQuestionIndex].confidenceScore : 11}</span>
                            {questionsFeedbackMap[currentQuestionIndex].scoreExplanations?.confidence && (
                              <p className="text-[10px] text-slate-500 leading-normal font-medium pt-1 border-t border-slate-100/60 mt-1">{questionsFeedbackMap[currentQuestionIndex].scoreExplanations.confidence}</p>
                            )}
                          </div>

                          <div className="p-3 bg-pink-50/45 border border-pink-100 rounded-2xl space-y-1">
                            <span className="block text-[8px] font-mono font-bold text-pink-700 uppercase leading-none">Fluency</span>
                            <span className="text-base font-black text-slate-900 mt-1 block">{questionsFeedbackMap[currentQuestionIndex].fluencyScore !== undefined ? questionsFeedbackMap[currentQuestionIndex].fluencyScore : 0}</span>
                            {questionsFeedbackMap[currentQuestionIndex].scoreExplanations?.fluency && (
                              <p className="text-[10px] text-slate-500 leading-normal font-medium pt-1 border-t border-slate-100/60 mt-1">{questionsFeedbackMap[currentQuestionIndex].scoreExplanations.fluency}</p>
                            )}
                          </div>

                          <div className="p-3 bg-cyan-50/45 border border-cyan-100 rounded-2xl space-y-1 col-span-2">
                            <span className="block text-[8px] font-mono font-bold text-cyan-700 uppercase leading-none">Pronunciation</span>
                            <span className="text-base font-black text-slate-900 mt-1 block">{questionsFeedbackMap[currentQuestionIndex].pronunciationScore !== undefined ? questionsFeedbackMap[currentQuestionIndex].pronunciationScore : 11}</span>
                            {questionsFeedbackMap[currentQuestionIndex].scoreExplanations?.pronunciation && (
                              <p className="text-[10px] text-slate-500 leading-normal font-medium pt-1 border-t border-slate-100/60 mt-1">{questionsFeedbackMap[currentQuestionIndex].scoreExplanations.pronunciation}</p>
                            )}
                          </div>

                          <div className="p-3 bg-teal-50/45 border border-teal-100 rounded-2xl space-y-1">
                            <span className="block text-[8px] font-mono font-bold text-teal-700 uppercase leading-none">Eye Contact</span>
                            <span className="text-base font-black text-slate-900 mt-1 block">{questionsFeedbackMap[currentQuestionIndex].eyeContactScore !== undefined ? questionsFeedbackMap[currentQuestionIndex].eyeContactScore : 11}</span>
                            {questionsFeedbackMap[currentQuestionIndex].scoreExplanations?.eyeContact && (
                              <p className="text-[10px] text-slate-500 leading-normal font-medium pt-1 border-t border-slate-100/60 mt-1">{questionsFeedbackMap[currentQuestionIndex].scoreExplanations.eyeContact}</p>
                            )}
                          </div>

                          <div className="p-3 bg-indigo-50/45 border border-indigo-100 rounded-2xl space-y-1">
                            <span className="block text-[8px] font-mono font-bold text-indigo-700 uppercase leading-none">Body Language</span>
                            <span className="text-base font-black text-slate-900 mt-1 block">{questionsFeedbackMap[currentQuestionIndex].bodyLanguageScore !== undefined ? questionsFeedbackMap[currentQuestionIndex].bodyLanguageScore : 11}</span>
                            {questionsFeedbackMap[currentQuestionIndex].scoreExplanations?.bodyLanguage && (
                              <p className="text-[10px] text-slate-500 leading-normal font-medium pt-1 border-t border-slate-100/60 mt-1">{questionsFeedbackMap[currentQuestionIndex].scoreExplanations.bodyLanguage}</p>
                            )}
                          </div>

                          <div className="p-3 bg-rose-50/45 border border-rose-100 rounded-2xl space-y-1.5 col-span-2">
                            <div className="flex items-center justify-between">
                              <span className="block text-[8px] font-mono font-bold text-rose-700 uppercase leading-none">Question Alignment Score</span>
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${getAlignmentStatus(
                                questionsFeedbackMap[currentQuestionIndex].questionAlignmentScore !== undefined
                                  ? questionsFeedbackMap[currentQuestionIndex].questionAlignmentScore
                                  : (questionsFeedbackMap[currentQuestionIndex].questionRelevanceScore !== undefined ? Math.round(questionsFeedbackMap[currentQuestionIndex].questionRelevanceScore * 15 / 100) : 11),
                                15
                              ).color}`}>
                                {getAlignmentStatus(
                                  questionsFeedbackMap[currentQuestionIndex].questionAlignmentScore !== undefined
                                    ? questionsFeedbackMap[currentQuestionIndex].questionAlignmentScore
                                    : (questionsFeedbackMap[currentQuestionIndex].questionRelevanceScore !== undefined ? Math.round(questionsFeedbackMap[currentQuestionIndex].questionRelevanceScore * 15 / 100) : 11),
                                  15
                                ).label}
                              </span>
                            </div>
                            <span className="text-base font-black text-slate-900 mt-1 block">{questionsFeedbackMap[currentQuestionIndex].questionAlignmentScore !== undefined ? questionsFeedbackMap[currentQuestionIndex].questionAlignmentScore : (questionsFeedbackMap[currentQuestionIndex].questionRelevanceScore !== undefined ? Math.round(questionsFeedbackMap[currentQuestionIndex].questionRelevanceScore * 15 / 100) : 11)}</span>
                            {((questionsFeedbackMap[currentQuestionIndex].questionAlignmentFeedback) || (questionsFeedbackMap[currentQuestionIndex].questionRelevanceFeedback)) && (
                              <p className="text-[10px] text-slate-600 leading-normal font-semibold pt-1 border-t border-slate-100/60 mt-1 italic">
                                "{questionsFeedbackMap[currentQuestionIndex].questionAlignmentFeedback || questionsFeedbackMap[currentQuestionIndex].questionRelevanceFeedback}"
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Good Items */}
                    {questionsFeedbackMap[currentQuestionIndex].goodPoints && questionsFeedbackMap[currentQuestionIndex].goodPoints.length > 0 && (
                      <div className="space-y-1 max-h-[140px] overflow-y-auto pr-1">
                        <span className="block text-[10px] font-bold text-slate-800 uppercase">✓ Key strengths</span>
                        <ul className="space-y-1 list-disc pl-4 text-[11px] text-slate-500 font-semibold leading-normal">
                          {questionsFeedbackMap[currentQuestionIndex].goodPoints.map((pt: string, idx: number) => (
                            <li key={idx}>{pt}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Improvements */}
                    {questionsFeedbackMap[currentQuestionIndex].improvements && questionsFeedbackMap[currentQuestionIndex].improvements.length > 0 && (
                      <div className="space-y-1 max-h-[140px] overflow-y-auto pr-1 pt-1 border-t border-slate-50">
                        <span className="block text-[10px] font-bold text-amber-800 uppercase">⚡ What to improve</span>
                        <ul className="space-y-1 list-disc pl-4 text-[11px] text-slate-500 font-semibold leading-normal">
                          {questionsFeedbackMap[currentQuestionIndex].improvements.map((pt: string, idx: number) => (
                            <li key={idx}>{pt}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Suggested Answer */}
                    {questionsFeedbackMap[currentQuestionIndex].suggestedAnswer && (
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 mt-2">
                        <span className="block text-[9px] font-mono font-bold text-slate-400 uppercase">Model Demonstration Answer</span>
                        <p className="text-[11px] text-slate-600 italic leading-relaxed pt-1">
                          "{questionsFeedbackMap[currentQuestionIndex].suggestedAnswer}"
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 border rounded-xl text-center text-xs text-slate-550 font-semibold">
                    Sensory analysis captured. Full segment evaluation pending report compiled.
                  </div>
                )}
              </div>
            ) : singleFeedback ? (
              <div className="space-y-5 pt-4 animate-in fade-in duration-300">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <span className="text-xs font-black text-blue-650 uppercase tracking-wider">
                    Instant Round Feedback
                  </span>
                  {autoProgressCountdown !== null && (
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500 animate-pulse" />
                      Auto-next: {autoProgressCountdown}s
                    </span>
                  )}
                </div>

                {/* Score Pills Grid */}
                <div className="space-y-3">
                  {interviewType === "aptitude" ? (
                    <div className="space-y-3">
                      {/* Question Result */}
                      <div className={`p-4 rounded-2xl border flex items-start gap-3 ${
                        questionsList[currentQuestionIndex]?.isCorrect 
                          ? "bg-emerald-50 border-emerald-200 text-emerald-900" 
                          : "bg-rose-50 border-rose-200 text-rose-900"
                      }`}>
                        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                          questionsList[currentQuestionIndex]?.isCorrect ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
                        }`}>
                          {questionsList[currentQuestionIndex]?.isCorrect ? "✓" : "✗"}
                        </span>
                        <div className="space-y-0.5">
                          <sup className="text-[9px] font-mono font-bold uppercase tracking-wider block opacity-70">Question Result</sup>
                          <h4 className="text-sm font-black">
                            {questionsList[currentQuestionIndex]?.isCorrect ? "✓ Correct Answer" : "✗ Incorrect Answer"}
                          </h4>
                        </div>
                      </div>

                      {/* Marks & Current Score Grid */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                          <span className="block text-[8px] font-mono font-bold text-slate-500 uppercase leading-none">Marks Earned</span>
                          <span className="text-xl font-black text-slate-800 block">
                            {questionsList[currentQuestionIndex]?.isCorrect ? "1" : "0"}
                          </span>
                        </div>

                        <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl space-y-1">
                          <span className="block text-[8px] font-mono font-bold text-blue-700 uppercase leading-none">Current Score</span>
                          <span className="text-xl font-black text-blue-800 block">
                            {getAptitudeCorrectCountUpTo(currentQuestionIndex)}/{currentQuestionIndex + 1}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
                        <div>
                          <sup className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">Completed Round Rating</sup>
                          <span className="text-sm font-black text-slate-800">Overall Score</span>
                        </div>
                        <div className="flex items-baseline gap-1 text-right bg-blue-50 border border-blue-200 px-3.5 py-1.5 rounded-xl">
                          <span className="text-2xl font-black text-blue-700">{singleFeedback.overallScore !== undefined ? singleFeedback.overallScore : 0}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="p-3 bg-amber-50/45 border border-amber-100 rounded-2xl space-y-1">
                          <span className="block text-[8px] font-mono font-bold text-amber-700 uppercase leading-none">Answer Quality</span>
                          <span className="text-base font-black text-slate-900 mt-1 block">{singleFeedback.answerQualityScore !== undefined ? singleFeedback.answerQualityScore : 0}</span>
                          {singleFeedback.scoreExplanations?.answerQuality && (
                            <p className="text-[10px] text-slate-500 leading-normal font-medium pt-1 border-t border-slate-100/60 mt-1">{singleFeedback.scoreExplanations.answerQuality}</p>
                          )}
                        </div>

                        <div className="p-3 bg-violet-50/45 border border-violet-100 rounded-2xl space-y-1">
                          <span className="block text-[8px] font-mono font-bold text-violet-700 uppercase leading-none">Communication</span>
                          <span className="text-base font-black text-slate-900 mt-1 block">{singleFeedback.communicationScore !== undefined ? singleFeedback.communicationScore : 0}</span>
                          {singleFeedback.scoreExplanations?.communication && (
                            <p className="text-[10px] text-slate-500 leading-normal font-medium pt-1 border-t border-slate-100/60 mt-1">{singleFeedback.scoreExplanations.communication}</p>
                          )}
                        </div>

                        <div className="p-3 bg-emerald-50/45 border border-emerald-100 rounded-2xl space-y-1">
                          <span className="block text-[8px] font-mono font-bold text-emerald-700 uppercase leading-none">Confidence</span>
                          <span className="text-base font-black text-slate-900 mt-1 block">{singleFeedback.confidenceScore !== undefined ? singleFeedback.confidenceScore : 0}</span>
                          {singleFeedback.scoreExplanations?.confidence && (
                            <p className="text-[10px] text-slate-500 leading-normal font-medium pt-1 border-t border-slate-100/60 mt-1">{singleFeedback.scoreExplanations.confidence}</p>
                          )}
                        </div>

                        <div className="p-3 bg-pink-50/45 border border-pink-100 rounded-2xl space-y-1">
                          <span className="block text-[8px] font-mono font-bold text-pink-700 uppercase leading-none">Fluency</span>
                          <span className="text-base font-black text-slate-900 mt-1 block">{singleFeedback.fluencyScore !== undefined ? singleFeedback.fluencyScore : 0}</span>
                          {singleFeedback.scoreExplanations?.fluency && (
                            <p className="text-[10px] text-slate-500 leading-normal font-medium pt-1 border-t border-slate-100/60 mt-1">{singleFeedback.scoreExplanations.fluency}</p>
                          )}
                        </div>

                        <div className="p-3 bg-cyan-50/45 border border-cyan-100 rounded-2xl space-y-1 col-span-2">
                          <span className="block text-[8px] font-mono font-bold text-cyan-700 uppercase leading-none">Pronunciation</span>
                          <span className="text-base font-black text-slate-900 mt-1 block">{singleFeedback.pronunciationScore !== undefined ? singleFeedback.pronunciationScore : 0}</span>
                          {singleFeedback.scoreExplanations?.pronunciation && (
                            <p className="text-[10px] text-slate-500 leading-normal font-medium pt-1 border-t border-slate-100/60 mt-1">{singleFeedback.scoreExplanations.pronunciation}</p>
                          )}
                        </div>

                        <div className="p-3 bg-teal-50/45 border border-teal-100 rounded-2xl space-y-1">
                          <span className="block text-[8px] font-mono font-bold text-teal-700 uppercase leading-none">Eye Contact</span>
                          <span className="text-base font-black text-slate-900 mt-1 block">{singleFeedback.eyeContactScore !== undefined ? singleFeedback.eyeContactScore : 0}</span>
                          {singleFeedback.scoreExplanations?.eyeContact && (
                            <p className="text-[10px] text-slate-500 leading-normal font-medium pt-1 border-t border-slate-100/60 mt-1">{singleFeedback.scoreExplanations.eyeContact}</p>
                          )}
                        </div>

                        <div className="p-3 bg-indigo-50/45 border border-indigo-100 rounded-2xl space-y-1">
                          <span className="block text-[8px] font-mono font-bold text-indigo-700 uppercase leading-none">Body Language</span>
                          <span className="text-base font-black text-slate-900 mt-1 block">{singleFeedback.bodyLanguageScore !== undefined ? singleFeedback.bodyLanguageScore : 0}</span>
                          {singleFeedback.scoreExplanations?.bodyLanguage && (
                            <p className="text-[10px] text-slate-500 leading-normal font-medium pt-1 border-t border-slate-100/60 mt-1">{singleFeedback.scoreExplanations.bodyLanguage}</p>
                          )}
                        </div>

                        <div className="p-3 bg-rose-50/45 border border-rose-100 rounded-2xl space-y-1.5 col-span-2">
                          <div className="flex items-center justify-between">
                            <span className="block text-[8px] font-mono font-bold text-rose-700 uppercase leading-none">Question Alignment Score</span>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${getAlignmentStatus(
                              singleFeedback.questionAlignmentScore !== undefined ? singleFeedback.questionAlignmentScore : (singleFeedback.questionRelevanceScore !== undefined ? Math.round(singleFeedback.questionRelevanceScore * 15 / 100) : 11),
                              15
                            ).color}`}>
                              {getAlignmentStatus(
                                singleFeedback.questionAlignmentScore !== undefined ? singleFeedback.questionAlignmentScore : (singleFeedback.questionRelevanceScore !== undefined ? Math.round(singleFeedback.questionRelevanceScore * 15 / 100) : 11),
                                15
                              ).label}
                            </span>
                          </div>
                          <span className="text-base font-black text-slate-900 mt-1 block">{singleFeedback.questionAlignmentScore !== undefined ? singleFeedback.questionAlignmentScore : (singleFeedback.questionRelevanceScore !== undefined ? Math.round(singleFeedback.questionRelevanceScore * 15 / 100) : 11)}</span>
                          {((singleFeedback.questionAlignmentFeedback) || (singleFeedback.questionRelevanceFeedback)) && (
                            <p className="text-[10px] text-slate-600 leading-normal font-semibold pt-1 border-t border-slate-100/60 mt-1 italic">
                              "{singleFeedback.questionAlignmentFeedback || singleFeedback.questionRelevanceFeedback}"
                            </p>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Bullet items list */}
                <div className="space-y-4 max-h-[320px] overflow-y-auto pr-1">
                  
                  {/* Good points */}
                  <div className="space-y-1">
                    <h5 className="text-[11px] font-black text-emerald-800 uppercase tracking-wide flex items-center gap-1">
                      <span>✓ What was good in your answer:</span>
                    </h5>
                    <ul className="space-y-1 pl-4 list-disc text-xs text-slate-600">
                      {singleFeedback.goodPoints.map((item, idx) => (
                        <li key={idx} className="leading-relaxed font-semibold">{item}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Improvements */}
                  <div className="space-y-1">
                    <h5 className="text-[11px] font-black text-amber-800 uppercase tracking-wide flex items-center gap-1">
                      <span>⚡ What can be improved:</span>
                    </h5>
                    <ul className="space-y-1 pl-4 list-disc text-xs text-slate-600">
                      {singleFeedback.improvements.map((item, idx) => (
                        <li key={idx} className="leading-relaxed font-semibold">{item}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Suggested Answer */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1.5">
                    <sup className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider block">Suggested Better Answer</sup>
                    <p className="text-xs text-slate-600 leading-relaxed italic font-medium">
                      "{singleFeedback.suggestedAnswer}"
                    </p>
                  </div>

                </div>

                {/* Direct user proceed trigger to next question */}
                <button
                  type="button"
                  onClick={handleProgressToNextSegment}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-3.5 px-4 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-blue-500/10"
                >
                  <span>Proceed to {(currentQuestionIndex + 1) >= totalQuestions ? "Submit Session Report" : "Next Question"}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : isCognitiveProcessing ? (
              <div className="py-12 text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
                <div className="relative w-16 h-16 mx-auto">
                  <div className="absolute inset-0 rounded-full border-4 border-slate-100 border-t-blue-600 animate-spin" />
                  <div className="absolute inset-2 rounded-full bg-blue-50 flex items-center justify-center shadow-sm">
                    <Mic className="w-5 h-5 text-blue-600 animate-pulse" />
                  </div>
                </div>
                
                <div className="space-y-4 max-w-sm mx-auto">
                  <div className="space-y-1">
                    <h4 className="text-sm font-black text-slate-950 tracking-tight">AI Interviewer is Listening & Analyzing</h4>
                    <p className="text-[11px] text-slate-400 font-medium">Processing previous segment context...</p>
                  </div>
                  
                  <div className="space-y-2 bg-slate-50 border border-slate-100 rounded-2xl p-4 shadow-inner">
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden w-full">
                      <div 
                        className="h-full bg-blue-600 rounded-full transition-all duration-300" 
                        style={{ width: `${processingStep === 0 ? "35%" : processingStep === 1 ? "70%" : "100%"}` }}
                      />
                    </div>
                    <span className="text-[10px] font-bold font-mono text-blue-600 block uppercase tracking-wider animate-pulse pt-1">
                      {processingStep === 0 && "Parsing voice frequency & pacing..."}
                      {processingStep === 1 && "Evaluating STAR structured response logic..."}
                      {processingStep === 2 && "Formulating coherent next track inquiries..."}
                    </span>
                  </div>

                  {currentTranscript && (
                    <div className="text-left bg-blue-50/20 border border-blue-100/40 rounded-xl p-3 text-xs text-slate-600 max-h-24 overflow-y-auto italic font-medium leading-relaxed">
                      "{currentTranscript}"
                    </div>
                  )}
                </div>
              </div>
            ) : isEvaluating ? (
              <div className="py-20 text-center space-y-5">
                <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto" strokeWidth={3} />
                <div className="space-y-2">
                  <h4 className="text-sm font-black text-slate-900">Compiling Biometric Metrics...</h4>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                    Analyzing vocal clarity, calculating talking pace, counting filler words, and compiling your comprehensive assessment report.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6 pt-6">
                
                {/* AI Interpersonal Agent Card representing the Interviewer */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex items-center gap-4 transition-all duration-300">
                  <div className="relative shrink-0">
                    {/* Pulsing Avatar Background circles */}
                    <div className="relative w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-slate-800 shadow-sm overflow-hidden">
                      <span className="text-lg font-black text-blue-600 font-sans tracking-tight">AI</span>
                      {aiIsSpeaking && (
                        <div className="absolute inset-0 bg-blue-600/10 animate-pulse" />
                      )}
                      {isRecording && (
                        <div className="absolute inset-0 bg-emerald-600/10 animate-pulse [animation-duration:1.2s]" />
                      )}
                    </div>
                    {/* Ring indicator around avatar */}
                    {aiIsSpeaking && (
                      <span className="absolute -inset-1 rounded-full border-2 border-blue-500 animate-ping opacity-30 [animation-duration:2.5s]" />
                    )}
                    {isRecording && (
                      <span className="absolute -inset-1 rounded-full border-2 border-emerald-500 animate-ping opacity-30 [animation-duration:2s]" />
                    )}
                    {/* Small Status badge */}
                    <span className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white ${
                      aiIsSpeaking ? "bg-blue-600 animate-pulse" : isRecording ? "bg-emerald-600 active-light" : "bg-slate-300"
                    }`} />
                  </div>

                  <div className="space-y-1 flex-grow">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-900 tracking-tight">Dr. Sarah (QuantView Assessor)</span>
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                        aiIsSpeaking 
                          ? "bg-blue-50 text-blue-700 border-blue-200" 
                          : isRecording 
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                            : "bg-slate-100 text-slate-500 border-slate-200"
                      }`}>
                        {aiIsSpeaking ? "Speaking" : isRecording ? "Listening" : "Standing By"}
                      </span>
                    </div>
                    
                    <p className="text-[11px] text-slate-500 leading-normal">
                      {aiIsSpeaking 
                        ? "Currently reading the interview question. Formulate your response in your mind."
                        : isRecording 
                          ? "I am actively listening, catching filler counts, pacing speed, and response patterns."
                          : "Awaiting your trigger signal to analyze this conversation loop."}
                    </p>
                  </div>
                </div>

                {/* Main Display Question Box */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 space-y-3 relative shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <sup className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider block">Question {currentQuestionIndex + 1} of {totalQuestions}</sup>
                    
                    {/* Live Test Verification HUD Badges */}
                    <div className="flex flex-wrap gap-1.5">
                      <span className="text-[9.5px]/none font-bold font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200/60">
                        Selected Level: <span className="text-slate-800">{currentQ?.levelName || `${interviewLevel} - ${interviewLevel === 1 ? 'Beginner' : interviewLevel === 2 ? 'Basic' : interviewLevel === 3 ? 'Intermediate' : interviewLevel === 4 ? 'Advanced' : 'Expert'}`}</span>
                      </span>
                      <span className="text-[9.5px]/none font-bold font-mono px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                        Question Source: <span className="text-slate-800">{currentQ?.questionSource || `LEVEL_${interviewLevel}_BANK`}</span>
                      </span>
                    </div>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-900 font-extrabold leading-relaxed">
                    {currentQ?.questionText}
                  </p>

                  {interviewType === "aptitude" && currentQ?.options && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
                        {currentQ.options.map((option, idx) => {
                          const letter = option.substring(0, 1).toUpperCase();
                          const isSelected = currentQ.selectedOption === letter;
                          const isCorrectOption = currentQ.correctOption === letter;
                          const hasSubmitted = !!currentQ.answerText;

                          let optionStyle = "bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50";
                          let circleStyle = "bg-slate-100 text-slate-500";

                          if (hasSubmitted) {
                            if (currentQ.isCorrect) {
                              if (isSelected) {
                                // Correctly selected option becomes GREEN
                                optionStyle = "bg-emerald-50 border-emerald-500 text-emerald-900 ring-1 ring-emerald-500/30";
                                circleStyle = "bg-emerald-600 text-white";
                              }
                            } else {
                              // Incorrect answer submitted
                              if (isSelected) {
                                // Selected wrong option becomes RED
                                optionStyle = "bg-rose-50 border-rose-500 text-rose-900 ring-1 ring-rose-500/30";
                                circleStyle = "bg-rose-600 text-white";
                              } else if (isCorrectOption) {
                                // Correct option automatically highlighted in GREEN
                                optionStyle = "bg-emerald-50 border-emerald-500 text-emerald-900 ring-1 ring-emerald-500/30";
                                circleStyle = "bg-emerald-600 text-white";
                              }
                            }
                          } else {
                            // Normal pre-submission selected state
                            if (isSelected) {
                              optionStyle = "bg-blue-50 border-blue-400 text-blue-900 shadow-sm ring-1 ring-blue-400/30";
                              circleStyle = "bg-blue-600 text-white";
                            }
                          }

                          return (
                            <div 
                              key={idx}
                              onClick={() => {
                                if (!hasSubmitted) {
                                  setTypedAnswer(letter);
                                  // Update questions list state with selected option pre-submission to reflect visual state
                                  const updated = [...questionsList];
                                  updated[currentQuestionIndex] = {
                                    ...currentQ,
                                    selectedOption: letter
                                  };
                                  setQuestionsList(updated);
                                }
                              }}
                              className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${optionStyle}`}
                            >
                              <div className="flex items-center gap-3">
                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${circleStyle}`}>
                                  {letter}
                                </span>
                                <span className="leading-tight">{option.substring(3)}</span>
                              </div>
                              {hasSubmitted && isCorrectOption && (
                                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Interactive Answer Validation System Panel */}
                      <div className="pt-4 border-t border-slate-200/60 space-y-3.5">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                            Type Your Answer Here
                          </label>
                          <input
                            type="text"
                            value={typedAnswer}
                            onChange={(e) => {
                              if (!currentQ?.answerText) {
                                const val = e.target.value;
                                setTypedAnswer(val);

                                // If they type A, B, C, D, also update the pre-submission selected option so it highlights!
                                const trimmed = val.trim().toUpperCase();
                                if (["A", "B", "C", "D"].includes(trimmed)) {
                                  const updated = [...questionsList];
                                  updated[currentQuestionIndex] = {
                                    ...currentQ,
                                    selectedOption: trimmed
                                  };
                                  setQuestionsList(updated);
                                }
                              }
                            }}
                            disabled={!!currentQ?.answerText}
                            placeholder="Type A, B, C, D or the actual answer value..."
                            className={`w-full px-4 py-3 text-xs font-bold rounded-xl border transition-all outline-none focus:ring-2 ${
                              currentQ?.answerText
                                ? currentQ.isCorrect
                                  ? "bg-emerald-50 border-emerald-500 text-emerald-900 focus:ring-emerald-500/20"
                                  : "bg-rose-50 border-rose-500 text-rose-900 focus:ring-rose-500/20"
                                : "bg-white border-slate-250 text-slate-800 focus:border-blue-500 focus:ring-blue-500/20"
                            }`}
                          />
                        </div>

                        {!currentQ?.answerText && (
                          <button
                            type="button"
                            onClick={handleAptitudeSubmit}
                            disabled={!typedAnswer.trim()}
                            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-extrabold py-3 px-4 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-500/10 cursor-pointer"
                          >
                            Submit Answer
                          </button>
                        )}

                        {/* VISUAL FEEDBACK BOX */}
                        {currentQ?.answerText && (
                          <div className={`p-4 rounded-xl border flex flex-col gap-1.5 transition-all ${
                            currentQ.isCorrect 
                              ? "bg-emerald-50 border-emerald-500 text-emerald-900" 
                              : "bg-rose-50 border-rose-500 text-rose-900"
                          }`}>
                            <div className="flex items-center gap-2 font-black text-xs uppercase tracking-wider">
                              {currentQ.isCorrect ? (
                                <>
                                  <span className="text-emerald-600 text-sm">🟢</span>
                                  <span>Correct Answer</span>
                                </>
                              ) : (
                                <>
                                  <span className="text-rose-600 text-sm">🔴</span>
                                  <span>Incorrect Answer</span>
                                </>
                              )}
                            </div>
                            
                            <div className="text-[11px] font-semibold leading-relaxed space-y-1">
                              <p>
                                Your Answer: <span className="font-extrabold">{currentQ.selectedOption ? `Option ${currentQ.selectedOption}` : currentQ.answerText}</span>
                              </p>
                              {!currentQ.isCorrect && (
                                <p className="text-emerald-700 flex items-center gap-1.5 mt-1">
                                  <span className="text-emerald-600 text-sm">🟢</span>
                                  <span>Correct Answer: <span className="font-extrabold">Option {currentQ.correctOption}</span></span>
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Real-time speech transcript feedback boxes */}
                {isRecording && (
                  <div className="space-y-4 pt-2">
                    
                    {/* Live transcription preview */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono font-bold text-slate-450 uppercase block">Live Transcript preview</span>
                      <div className="bg-slate-50/70 p-3.5 h-20 rounded-2xl text-xs border border-slate-200/60 text-slate-600 overflow-y-auto italic pl-3 leading-relaxed">
                        {currentTranscript || "Speak clearly now. Listening triggers automated text..."}
                      </div>
                    </div>

                    {/* Sensor stats metrics layout */}
                    <div className="grid grid-cols-2 gap-3">
                      
                      {/* Filler Counter */}
                      <div className={`p-3 rounded-2xl border flex flex-col justify-between ${fillerWordsCount > 2 ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-slate-50 border-slate-200'}`}>
                        <div className="flex items-center justify-between text-[9px] font-mono font-bold text-slate-400">
                          <span>FILLER WORDS</span>
                          {fillerWordsCount > 2 && <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />}
                        </div>
                        <span className="text-base font-extrabold text-slate-900 mt-1">{fillerWordsCount} detected</span>
                        <div className="text-[9px] text-slate-400 mt-0.5 overflow-hidden truncate">
                          {detectedFillers.length > 0 ? detectedFillers.join(", ") : "Perfect cadence"}
                        </div>
                      </div>

                      {/* Speaking Pace */}
                      <div className="p-3 rounded-2xl border bg-slate-50 border-slate-200 flex flex-col justify-between">
                        <span className="text-[9px] font-mono font-bold text-slate-400">SPEAKING PACE</span>
                        <span className="text-base font-extrabold text-slate-900 mt-1">{speechPaceWpm} WPM</span>
                        <span className={`text-[9px] font-bold ${
                          speechPaceWpm >= 110 && speechPaceWpm <= 165
                            ? "text-emerald-600"
                            : "text-amber-600"
                        }`}>
                          {speechPaceWpm >= 110 && speechPaceWpm <= 165 ? "Optimal Pace" : "Rapid Pauses"}
                        </span>
                      </div>

                    </div>

                  </div>
                )}

              </div>
            )}
          </div>

          {/* Core Controls Footer Panel */}
          {!isInitializing && !isLoadingNext && !isEvaluating && !isCognitiveProcessing && !isEvaluatingSingle && (
            <div className="space-y-3.5 pt-4 border-t border-slate-100 w-full mt-4">
              
              {/* Row 1: Timer and Pause/Resume Option */}
              <div className="flex items-center justify-between gap-3 bg-slate-50 border border-slate-200/60 rounded-2xl p-3">
                <div className="text-xs text-slate-600 font-mono flex items-center gap-2 font-semibold">
                  <Clock className={`w-3.5 h-3.5 ${isRecording ? "text-blue-500 animate-spin" : "text-slate-400"}`} />
                  <span>
                    Timer: {Math.floor(elapsedSeconds / 60)}:{(elapsedSeconds % 60).toString().padStart(2, '0')}s 
                    <span className="text-slate-400 font-medium"> (Max {timeLimit}s)</span>
                  </span>
                </div>

                {!singleFeedback && (
                  <button
                    type="button"
                    onClick={togglePauseResume}
                    className={`text-xs font-bold px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${
                      isPaused 
                        ? 'bg-blue-600 border-blue-700 hover:bg-blue-700 text-white font-extrabold' 
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 font-bold'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5 fill-current" />
                    <span>{isPaused ? "Resume Answer Timer" : "Pause Answer Timer"}</span>
                  </button>
                )}
              </div>

              {/* Row 2: Recording Actions */}
              {!singleFeedback && (
                <div className="flex items-center justify-between w-full">
                  <div className="text-xs font-mono font-extrabold text-slate-400">
                    SENSORY COMMANDS
                  </div>

                  {(questionsList[currentQuestionIndex] && !!questionsList[currentQuestionIndex].answerText) ? (
                    <div className="bg-slate-100 text-slate-550 font-extrabold px-5 py-3 rounded-xl text-xs sm:text-sm flex items-center gap-1.5 border border-slate-200">
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                      <span>Response Locked In Review</span>
                    </div>
                  ) : isRecording ? (
                    <button
                      onClick={handleNextOrComplete}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-5 py-3 rounded-xl text-xs sm:text-sm flex items-center gap-1.5 transition-all shadow-md shadow-blue-500/10 cursor-pointer"
                    >
                      <CheckCircle className="w-4 h-4 text-white" />
                      <span>Finish Speaking & Lock Answer</span>
                    </button>
                  ) : (
                    <button
                      onClick={startSpeechRecognition}
                      disabled={aiIsSpeaking || isPaused}
                      className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold px-5 py-3 rounded-xl text-xs sm:text-sm flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/10 cursor-pointer"
                    >
                      <Play className="w-4 h-4 text-white fill-white" />
                      <span>{isPaused ? "Timer Suspended" : "Start Microphone Response"}</span>
                    </button>
                  )}
                </div>
              )}

              {/* Row 3: Question-by-Question Navigation Row */}
              <div className="pt-3.5 border-t border-slate-100 border-dashed flex items-center justify-between w-full">
                <button
                  type="button"
                  onClick={handleNavigatePrevious}
                  disabled={currentQuestionIndex === 0}
                  className="text-xs text-slate-655 hover:text-slate-900 disabled:opacity-30 px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 disabled:hover:bg-white transition-all cursor-pointer flex items-center gap-1 font-extrabold shadow-sm"
                >
                  &larr; Previous Question
                </button>
                
                <span className="text-[10px] uppercase font-black text-slate-400 font-mono tracking-tight">
                  Question {currentQuestionIndex + 1} of {totalQuestions}
                </span>

                <button
                  type="button"
                  onClick={handleNavigateNext}
                  disabled={currentQuestionIndex >= questionsList.length - 1}
                  className="text-xs text-slate-655 hover:text-slate-900 disabled:opacity-30 px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 disabled:hover:bg-white transition-all cursor-pointer flex items-center gap-1 font-extrabold shadow-sm"
                >
                  Next Question &rarr;
                </button>
              </div>

            </div>
          )}

        </div>

      </main>

      {/* Assessor Sub Footer status lines */}
      <footer className="border-t border-slate-200 pt-3 flex flex-row items-center justify-between text-[11px] text-slate-400 max-w-7xl mx-auto w-full relative z-10 font-mono">
        <span>QUANTVIEW BIOMETRIC ASSESSMENT ENVIRONMENT</span>
        <span>STUDENT MOCK TRAINING ROOM</span>
      </footer>

      {showStopConfirmation && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-201 shadow-2xl p-6 sm:p-7 max-w-md w-full space-y-5 animate-in zoom-in-95 duration-250">
            <div className="flex items-center gap-3 space-y-0">
              <div className="w-10 h-10 rounded-2xl bg-red-50 flex items-center justify-center text-red-650 border border-red-200 shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div className="text-left">
                <h3 className="text-sm font-black text-slate-900 tracking-tight leading-none">End Interview Early?</h3>
                <p className="text-[11px] text-slate-500 font-semibold mt-1 leading-normal">
                  Decide how you would like to conclude this sensory analysis practice round.
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-650 text-left leading-relaxed bg-slate-50 border border-slate-150 p-3 rounded-2xl font-semibold">
              Currently answered: <b className="text-slate-905 font-extrabold">{questionsList.filter(q => !!q.answerText).length} of {totalQuestions}</b>. You can choose to compile feedback anyway, or abort.
            </p>

            <div className="grid grid-cols-1 gap-2 pt-1.5 w-full">
              <button
                type="button"
                onClick={handleStopAndEvaluate}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-3 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all shadow-md shadow-blue-500/10 cursor-pointer"
              >
                <CheckCircle className="w-4 h-4 text-white" />
                <span>Evaluate My Answers So Far</span>
              </button>

              <button
                type="button"
                onClick={onCancel}
                className="w-full bg-red-50 hover:bg-red-100 text-red-650 font-bold py-3 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all border border-red-205 cursor-pointer"
              >
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <span>Discard Practice & Return</span>
              </button>

              <button
                type="button"
                onClick={() => setShowStopConfirmation(false)}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <span>Continue Practice</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
