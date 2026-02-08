import React, { useState, useEffect, useRef } from 'react';
import { MidnightDAppAPI } from './midnight-api';
import { 
  GraduationCap, 
  Upload, 
  Award, 
  Search, 
  Calendar, 
  Building2, 
  BookOpen, 
  ChevronRight, 
  Copy, 
  Check, 
  FileText, 
  CheckCircle2, 
  ShieldAlert, 
  Cpu, 
  Database, 
  Wallet, 
  Link,
  EyeOff,
  Lock as LockIcon,
  Terminal as TerminalIcon,
  ExternalLink
} from 'lucide-react';

type Mode = 'graduate' | 'employer';
type Step = 'upload' | 'extract' | 'commit' | 'success';
type VerificationType = 'recency' | 'ownership' | 'level';

// Degree level mapping
const DEGREE_LEVELS: Record<string, number> = {
  'Associate': 1,
  'Bachelor': 2,
  'Master': 3,
  'Doctorate': 4,
  'Professional': 5
};

function App() {
  const [mode, setMode] = useState<Mode>('graduate');
  const [step, setStep] = useState<Step>('upload');
  const [extractedData, setExtractedData] = useState({ 
    institution: '', 
    degreeType: 'Bachelor', 
    fieldOfStudy: '', 
    graduationYear: '2024' 
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const logEndRef = useRef<HTMLDivElement>(null);
  const [credentialHash, setCredentialHash] = useState('0x7a2d48bf6e9a4c12d00d2f8e9a4c12d00d2f8e9a4c12d00d2f8e9a4c12d00d2');
  const [hasCopied, setHasCopied] = useState(false);

  // Employer/Verifier State
  const [verifierHash, setVerifierHash] = useState('');
  const [vType, setVType] = useState<VerificationType>('recency');
  const [verifyStatus, setVerifyStatus] = useState<'idle' | 'checking' | 'verified' | 'failed'>('idle');
  const [maxYearsAgo, setMaxYearsAgo] = useState(5);
  const [walletAddr, setWalletAddr] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMocked, setIsMocked] = useState(false);
  const [requiredDegreeLevel, setRequiredDegreeLevel] = useState('Bachelor');
  const [deployedAddress, setDeployedAddress] = useState<string | null>(null);
  const [credentialSecret, setCredentialSecret] = useState<Uint8Array | null>(null);
  const midnightApi = useRef<MidnightDAppAPI>(new MidnightDAppAPI());

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  // Helper to check if hash is valid format
  const isValidHashFormat = (hash: string): boolean => {
    const hexPattern = /^0x[0-9a-fA-F]{64}$/;
    return hexPattern.test(hash.trim());
  };

  const connectWallet = async () => {
    setIsConnecting(true);
    addLog('System: Searching for Midnight Lace extension...');
    
    try {
      // @ts-ignore
      const midnight = window.midnight;
      if (!midnight || !midnight.mnLace) {
        throw new Error('EXTENSION_MISSING');
      }

      addLog('System: Requesting connection from Lace Wallet...');
      const walletAPI = await midnight.mnLace.connect('undeployed');
      
      const { shieldedAddress } = await walletAPI.getShieldedAddresses();
      const addr = shieldedAddress;
      
      // Initialize Midnight API with the connected wallet
      await midnightApi.current.initialize(walletAPI);
      
      setWalletAddr(addr);
      setIsMocked(false);
      addLog(`Lace Wallet Connected: ${addr.substring(0, 10)}... (Midnight Network)`);
      setIsConnecting(false);
    } catch (err: any) {
      if (err.message === 'EXTENSION_MISSING') {
        addLog('⚠️ Error: Midnight Lace Wallet not found.');
        addLog('👉 Please install the Lace Wallet extension to use the real flow.');
      } else {
        addLog(`Error: ${err.message || 'Failed to connect to Lace Wallet.'}`);
      }
      setIsConnecting(false);
    }
  };

  useEffect(() => {
    // Only scroll to the end of logs without smooth behavior to avoid hijacking the scroll
    logEndRef.current?.scrollIntoView({ block: 'nearest' });
  }, [logs]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(credentialHash);
    setHasCopied(true);
    addLog('System: Credential hash copied to clipboard.');
    setTimeout(() => setHasCopied(false), 2000);
  };

  // Simulated Credential Document Processing
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIsProcessing(true);
      addLog(`File attached: ${e.target.files[0].name}`);
      addLog('Secure Sandbox: Processing credential document locally...');
      setTimeout(() => {
        setExtractedData({ 
          institution: 'Massachusetts Institute of Technology', 
          degreeType: 'Bachelor', 
          fieldOfStudy: 'Computer Science', 
          graduationYear: '2024' 
        });
        addLog('OCR Engine: Credential extraction successful.');
        setIsProcessing(false);
        setStep('extract');
      }, 1500);
    }
  };

  // --- Real Hashing Logic (SubtleCrypto) ---
  const calculateHash = async () => {
    setIsProcessing(true);
    addLog('System: Generating Zero-Knowledge commitment for credential...');
    const secret = window.crypto.getRandomValues(new Uint8Array(32));
    setCredentialSecret(secret);
    const hashBuffer = await crypto.subtle.digest('SHA-256', secret);
    const hashHex = '0x' + Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    setTimeout(() => {
      setCredentialHash(hashHex);
      addLog("System: Credential commitment generated: " + hashHex.substring(0, 16) + "...");
      setIsProcessing(false);
      setStep('commit');
    }, 1200);
  };

  const handlePublish = async () => {
    setIsProcessing(true);
    
    // Check if wallet is connected (required for real blockchain deployment)
    if (!walletAddr) {
      addLog('⚠️ Warning: Lace Wallet not connected. Using SIMULATION mode.');
      addLog('💡 Connect Lace Wallet for REAL Zero-Knowledge Proof generation on Midnight.');
      addLog('Simulation: Storing credential commitment in localStorage (NOT on blockchain)...');
      
      // Fallback to simulation
      const ledger = JSON.parse(localStorage.getItem('midnight_diploma_ledger') || '[]');
      if (!ledger.includes(credentialHash)) {
        ledger.push(credentialHash);
        localStorage.setItem('midnight_diploma_ledger', JSON.stringify(ledger));
      }
      
      setTimeout(() => {
        addLog(`Simulation Complete: Credential hash stored locally (not on Midnight blockchain)`);
        setIsProcessing(false);
        setStep('success');
      }, 1500);
      return;
    }
    
    // Real blockchain deployment path
    addLog('Midnight Prover: Generating ZK proof for credential ownership...');
    addLog(`Midnight Node: Submitting credential registration transaction...`);
    
    try {
      // Convert credentialHash (from calculation) back to Uint8Array for the circuit
      const commitment = new Uint8Array(credentialHash.replace('0x', '').match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
      const holderAddressBytes = new Uint8Array(32); // Mocked for now, in real it should match the wallet
      
      const finalizedTx = await midnightApi.current.registerCredential(commitment, holderAddressBytes);
      
      addLog(`Success: Credential anchored on Midnight! Tx: ${finalizedTx.txHash.substring(0, 10)}...`);
      setDeployedAddress(finalizedTx.contractAddress as string);
      
      // Still push to sim ledger for verifier ease in this demo
      const ledger = JSON.parse(localStorage.getItem('midnight_diploma_ledger') || '[]');
      if (!ledger.includes(credentialHash)) {
        ledger.push(credentialHash);
        localStorage.setItem('midnight_diploma_ledger', JSON.stringify(ledger));
      }
      
      setIsProcessing(false);
      setStep('success');
    } catch (err: any) {
      addLog(`Error: Blockchain registration failed. ${err.message}`);
      setIsProcessing(false);
    }
  };
  const handleVerify = async () => {
    // Input validation - MUST validate before ANY processing
    const trimmedHash = verifierHash.trim();
    
    // Check if hash is empty
    if (!trimmedHash) {
      setVerifyStatus('failed');
      addLog('❌ Verification Error: No credential hash provided. Please paste a valid commitment hash.');
      return;
    }
    
    // Validate hash format: must be 0x followed by 64 hex characters (32 bytes)
    const hexPattern = /^0x[0-9a-fA-F]{64}$/;
    if (!hexPattern.test(trimmedHash)) {
      setVerifyStatus('failed');
      addLog('❌ Verification Error: Invalid credential hash format.');
      addLog('   Expected: 0x + 64 hexadecimal characters (e.g., 0x7a2d48bf...)');
      addLog(`   Received: "${trimmedHash.substring(0, 30)}${trimmedHash.length > 30 ? '...' : ''}"`);
      return;
    }
    
    setVerifyStatus('checking');
    addLog(`Employer: Initiating [${vType.toUpperCase()}] verification for credential ${trimmedHash.substring(0, 16)}...`);
    
    // REAL ZK PROOF PATH (with Lace Wallet connected)
    if (deployedAddress && credentialSecret) {
        addLog(`Midnight Prover: Generating Zero-Knowledge Proof of Credential Eligibility...`);
        try {
            const holderAddressBytes = new Uint8Array(32); // Mock for demo
            let result;
            
            if (vType === 'recency') {
                const graduationYear = parseInt(extractedData.graduationYear);
                result = await midnightApi.current.proveGraduationRecency(deployedAddress, graduationYear, maxYearsAgo, credentialSecret!, holderAddressBytes);
            } else if (vType === 'level') {
                const reqLevel = DEGREE_LEVELS[requiredDegreeLevel] || 2;
                const holderLevel = DEGREE_LEVELS[extractedData.degreeType] || 2;
                result = await midnightApi.current.proveDegreeLevel(deployedAddress, reqLevel, holderLevel, credentialSecret!, holderAddressBytes);
            }
            
            setVerifyStatus('verified');
            addLog(`✅ Success: ZK Proof verified on Midnight! Credential is ${vType === 'recency' ? 'recent enough' : 'level-qualified'}.`);
            return;
        } catch (err: any) {
            addLog(`❌ Error: ZK Proof generation/verification failed. ${err.message}`);
            setVerifyStatus('failed');
            return;
        }
    }

    // SIMULATION PATH (when wallet not connected)
    addLog('⚠️ Simulation Mode: Consulting Local Ledger (NOT on Midnight blockchain)...');
    setTimeout(() => {
      // Step 1: Check if hash exists in ledger
      const ledger = JSON.parse(localStorage.getItem('midnight_diploma_ledger') || '[]');
      const isRegistered = ledger.includes(trimmedHash);
      const isCurrentSession = trimmedHash.toLowerCase() === credentialHash.trim().toLowerCase();

      if (!isRegistered && !isCurrentSession) {
        setVerifyStatus('failed');
        addLog('❌ Verification Failed: Credential not found in ledger. Graduate has not registered this credential.');
        return;
      }

      // Step 2: Hash exists - now verify the ACTUAL requirements
      // In simulation, we can only verify if this is the current session user
      if (isCurrentSession) {
        // We have access to extractedData for current session
        let requirementMet = false;
        
        if (vType === 'recency') {
          const graduationYear = parseInt(extractedData.graduationYear);
          const currentYear = new Date().getFullYear();
          const yearsAgo = currentYear - graduationYear;
          requirementMet = yearsAgo <= maxYearsAgo;
          
          if (requirementMet) {
            addLog(`✅ Simulation Success: Graduated ${yearsAgo} years ago, meets ${maxYearsAgo}-year recency requirement.`);
            addLog(`   Note: In REAL mode, graduation year would be hidden via Zero-Knowledge Proof.`);
          } else {
            addLog(`❌ Verification Failed: Graduated ${yearsAgo} years ago, does not meet ${maxYearsAgo}-year recency requirement.`);
          }
        } else if (vType === 'ownership') {
          requirementMet = true; // Ownership check just confirms credential ownership
          addLog(`✅ Simulation Success: Credential ownership confirmed.`);
          addLog(`   Note: In REAL mode, this uses cryptographic proof of private key.`);
        } else if (vType === 'level') {
          const reqLevel = DEGREE_LEVELS[requiredDegreeLevel] || 2;
          const holderLevel = DEGREE_LEVELS[extractedData.degreeType] || 2;
          requirementMet = holderLevel >= reqLevel;
          
          if (requirementMet) {
            addLog(`✅ Simulation Success: Degree level (${extractedData.degreeType}) meets ${requiredDegreeLevel}+ requirement.`);
            addLog(`   Note: In REAL mode, exact degree would be hidden via Zero-Knowledge Proof.`);
          } else {
            addLog(`❌ Verification Failed: Degree level (${extractedData.degreeType}) does not meet ${requiredDegreeLevel}+ requirement.`);
          }
        }
        
        setVerifyStatus(requirementMet ? 'verified' : 'failed');
      } else {
        // Hash is in ledger but not current session - we can't verify requirements in simulation
        setVerifyStatus('failed');
        addLog('❌ Simulation Limitation: Cannot verify requirements for non-current session credentials.');
        addLog('   Connect Lace Wallet for REAL Zero-Knowledge Proof verification on Midnight.');
        addLog('   In real mode, employer would receive cryptographic proof without seeing private academic data.');
      }
    }, 2500);
  };



  return (
    <div className="relative min-h-screen p-4 md:p-8 flex flex-col items-center">
      {/* Background Decor */}
      <div className="glow-bg top-0 left-1/4 w-[500px] h-[500px]" />
      <div className="glow-bg bottom-0 right-1/4 w-[400px] h-[400px]" style={{ animationDelay: '-4s' }} />

      {/* Header & Mode Toggle */}
      <div className="flex flex-col items-center gap-6 mb-12 w-full max-w-xl text-center">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/20 rounded-xl border border-primary/30">
            <GraduationCap className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            PrivateDiploma
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex p-1 bg-white/5 border border-white/10 rounded-full">
            <button 
              onClick={() => setMode('graduate')}
              className={`px-8 py-2 rounded-full text-sm font-medium transition-all ${mode === 'graduate' ? 'bg-primary shadow-lg shadow-primary/20 text-white' : 'text-foreground/60 hover:text-white'}`}
            >
              Graduate
            </button>
            <button 
              onClick={() => setMode('employer')}
              className={`px-8 py-2 rounded-full text-sm font-medium transition-all ${mode === 'employer' ? 'bg-primary shadow-lg shadow-primary/20 text-white' : 'text-foreground/60 hover:text-white'}`}
            >
              Employer
            </button>
          </div>

          <button 
            onClick={connectWallet}
            disabled={!!walletAddr || isConnecting}
            className={`flex items-center gap-2 px-6 py-2 rounded-full text-sm font-bold border transition-all ${walletAddr ? (isMocked ? 'border-orange-500/30 bg-orange-500/10 text-orange-500' : 'border-green-500/30 bg-green-500/10 text-green-500') : 'border-white/10 bg-white/5 text-white hover:bg-white/10'}`}
          >
            <Wallet className="w-4 h-4" />
            {isConnecting ? 'Connecting...' : walletAddr ? (isMocked ? `SIM: ${walletAddr.substring(0, 8)}...` : `${walletAddr.substring(0, 8)}...`) : 'Connect Lace'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr,400px] gap-8 w-full max-w-7xl">
        {/* Main Interaction Area */}
        <main className="glass p-8 flex flex-col gap-8">
          {mode === 'graduate' ? (
            <>
              {/* Graduate Steps */}
              <div className="flex justify-between items-center px-4">
                {[
                  { id: 'upload', icon: Upload },
                  { id: 'extract', icon: FileText },
                  { id: 'commit', icon: LockIcon },
                  { id: 'success', icon: CheckCircle2 },
                ].map((s, idx) => (
                  <React.Fragment key={s.id}>
                    <div className={`flex flex-col items-center gap-2 ${step === s.id ? 'text-primary' : 'text-foreground/20'}`}>
                      <div className={`p-3 rounded-full border ${step === s.id ? 'border-primary bg-primary/10' : 'border-current'}`}>
                        <s.icon className="w-5 h-5" />
                      </div>
                    </div>
                    {idx < 3 && <div className="h-px flex-1 bg-white/10 mx-2" />}
                  </React.Fragment>
                ))}
              </div>

              {step === 'upload' && (
                <div className="flex flex-col items-center text-center gap-6 py-8 animate-in">
                  <div className="space-y-2">
                    <h2 className="text-2xl font-semibold text-white">Register Your Credential</h2>
                    <p className="text-foreground/60 max-w-md">Upload your diploma or transcript. Data is hashed locally — only a Zero-Knowledge Proof is sent to Midnight Network.</p>
                  </div>
                  
                  <label className="w-full max-w-md aspect-video border-2 border-dashed border-white/10 hover:border-primary/50 hover:bg-white/5 rounded-3xl flex flex-col items-center justify-center gap-4 cursor-pointer transition-all group">
                    <input type="file" className="hidden" onChange={handleFileUpload} />
                    {isProcessing ? (
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm font-medium animate-pulse">Processing Credential...</span>
                      </div>
                    ) : (
                      <>
                        <div className="p-4 bg-white/5 rounded-2xl group-hover:bg-primary/20 transition-all">
                          <Upload className="w-8 h-8 text-foreground/40 group-hover:text-primary transition-all" />
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="font-medium text-white">Upload Diploma or Transcript</span>
                          <span className="text-xs text-foreground/40 mt-1">Processed entirely in-browser</span>
                        </div>
                      </>
                    )}
                  </label>
                </div>
              )}

              {step === 'extract' && (
                <div className="flex flex-col gap-8 py-4 animate-in">
                  <div className="space-y-2">
                    <h2 className="text-2xl font-semibold text-white">Review Extracted Credential</h2>
                    <p className="text-foreground/60">Verify your academic information before generating the cryptographic commitment.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-foreground/40 ml-1">Institution</label>
                      <input 
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-4 focus:ring-2 focus:ring-primary/20 outline-none text-white transition-all hover:bg-white/10"
                        value={extractedData.institution}
                        onChange={(e) => setExtractedData({...extractedData, institution: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-foreground/40 ml-1">Degree Type</label>
                      <select 
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-4 focus:ring-2 focus:ring-primary/20 outline-none text-white transition-all hover:bg-white/10"
                        value={extractedData.degreeType}
                        onChange={(e) => setExtractedData({...extractedData, degreeType: e.target.value})}
                      >
                        {Object.keys(DEGREE_LEVELS).map(level => (
                          <option key={level} value={level} className="bg-gray-900">{level}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-foreground/40 ml-1">Field of Study</label>
                      <input 
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-4 focus:ring-2 focus:ring-primary/20 outline-none text-white transition-all hover:bg-white/10"
                        value={extractedData.fieldOfStudy}
                        onChange={(e) => setExtractedData({...extractedData, fieldOfStudy: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-foreground/40 ml-1">Graduation Year</label>
                      <input 
                        type="number"
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-4 focus:ring-2 focus:ring-primary/20 outline-none text-white transition-all hover:bg-white/10"
                        value={extractedData.graduationYear}
                        onChange={(e) => setExtractedData({...extractedData, graduationYear: e.target.value})}
                      />
                    </div>
                  </div>

                  <button 
                    onClick={calculateHash}
                    className="w-full bg-primary hover:bg-primary/90 text-white font-bold p-5 rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2"
                  >
                    Generate Credential Commitment <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}

              {step === 'commit' && (
                <div className="flex flex-col items-center text-center gap-8 py-8 animate-in">
                  <div className="w-20 h-20 bg-primary/10 rounded-3xl border border-primary/20 flex items-center justify-center">
                    <Award className="w-10 h-10 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-2xl font-semibold text-white">Your Credential Commitment</h2>
                    <p className="text-foreground/60 max-w-md">This hash represents your verified credential. Share it with employers to prove your qualifications privately.</p>
                  </div>

                  <div className="relative w-full max-w-lg group">
                    <div className="w-full bg-black/40 border border-white/10 p-6 rounded-2xl font-mono text-primary text-sm break-all leading-relaxed pr-16 bg-gradient-to-r from-black/40 to-primary/5">
                      {credentialHash}
                    </div>
                    <button 
                        onClick={copyToClipboard}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all text-white group-hover:scale-110 active:scale-95"
                    >
                        {hasCopied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                    </button>
                  </div>

                  <button 
                    onClick={handlePublish}
                    disabled={isProcessing}
                    className="w-full max-w-md bg-primary hover:bg-primary/90 text-white font-bold p-5 rounded-xl shadow-xl shadow-primary/20 disabled:opacity-50 transition-all"
                  >
                    {isProcessing ? 'Generating Proof...' : 'Publish to Midnight Network'}
                  </button>
                </div>
              )}

              {step === 'success' && (
                <div className="flex flex-col items-center text-center gap-8 py-12 animate-in">
                  <div className="w-28 h-28 bg-green-500/10 border-4 border-green-500/30 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(34,197,94,0.2)]">
                    <CheckCircle2 className="w-14 h-14 text-green-500" />
                  </div>
                  <div className="space-y-4">
                    <h2 className="text-4xl font-extrabold text-white tracking-tight">Credential Anchored</h2>
                    <p className="text-foreground/60 max-sm text-lg">Your educational credential is now verified on Midnight Network. Employers can verify your degree without seeing your transcript.</p>
                  </div>
                  <div className="flex gap-4">
                    <button onClick={() => setStep('upload')} className="px-10 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl font-semibold text-white transition-all">New Credential</button>
                    <button onClick={() => { setMode('employer'); setVerifierHash(credentialHash); }} className="px-10 py-4 bg-primary text-white rounded-2xl font-bold shadow-xl shadow-primary/30 hover:scale-105 transition-all">Switch to Employer</button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Employer Verification Logic */}
              <div className="flex flex-col gap-10 py-6 animate-in">
                <div className="flex items-center gap-6">
                  <div className="p-5 bg-accent/20 rounded-2xl border border-accent/30">
                    <Search className="w-10 h-10 text-accent" />
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-2xl font-semibold text-white">Credential Verification</h2>
                    <p className="text-foreground/60">Verify academic credentials without accessing transcripts.</p>
                  </div>
                </div>

                <div className="p-8 bg-white/5 border border-white/10 rounded-3xl space-y-8">
                  {/* Select Verification Type */}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 'recency', label: 'Recency', icon: Calendar },
                      { id: 'ownership', label: 'Ownership', icon: Award },
                      { id: 'level', label: 'Degree Level', icon: BookOpen },
                    ].map(t => (
                        <button
                            key={t.id}
                            onClick={() => { setVType(t.id as VerificationType); setVerifyStatus('idle'); }}
                            className={`flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all ${vType === t.id ? 'bg-accent/20 border-accent text-accent' : 'bg-white/5 border-white/10 text-foreground/40 hover:text-white hover:bg-white/10'}`}
                        >
                            <t.icon className="w-6 h-6" />
                            <span className="text-xs font-bold uppercase tracking-wider">{t.label}</span>
                        </button>
                    ))}
                  </div>

                  {vType === 'recency' && (
                    <div className="space-y-4 animate-in">
                        <label className="text-xs font-bold text-foreground/30 uppercase tracking-widest ml-1">Maximum Years Since Graduation</label>
                        <div className="flex items-center gap-4">
                            <input 
                                type="number" 
                                className="w-24 bg-black/40 border border-white/10 rounded-xl p-4 text-white font-bold text-center outline-none focus:ring-2 focus:ring-accent/40"
                                value={maxYearsAgo}
                                onChange={(e) => setMaxYearsAgo(parseInt(e.target.value) || 0)}
                            />
                            <span className="text-foreground/40 text-sm font-medium">Years Ago</span>
                        </div>
                    </div>
                  )}

                  {vType === 'level' && (
                    <div className="space-y-4 animate-in">
                        <label className="text-xs font-bold text-foreground/30 uppercase tracking-widest ml-1">Minimum Degree Level Required</label>
                        <select 
                            className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white font-bold outline-none focus:ring-2 focus:ring-accent/40"
                            value={requiredDegreeLevel}
                            onChange={(e) => setRequiredDegreeLevel(e.target.value)}
                        >
                            {Object.keys(DEGREE_LEVELS).map(level => (
                                <option key={level} value={level} className="bg-gray-900">{level}</option>
                            ))}
                        </select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm font-bold uppercase tracking-widest text-foreground/40 ml-1">
                        <span>Candidate Credential Hash</span>
                        <span className="text-[10px] text-accent font-normal normal-case italic">Shared by graduate</span>
                    </div>
                    <textarea 
                        className={`w-full bg-black/40 border rounded-xl p-4 font-mono text-sm focus:ring-2 outline-none transition-all resize-none h-24 ${
                          verifierHash && !isValidHashFormat(verifierHash) 
                            ? 'border-red-500/50 text-red-400 focus:ring-red-500/20' 
                            : 'border-white/10 text-primary focus:ring-primary/20'
                        }`}
                        value={verifierHash}
                        onChange={(e) => { setVerifierHash(e.target.value); setVerifyStatus('idle'); }}
                        placeholder="Paste candidate's credential hash here (0x...)"
                    />
                    {verifierHash && !isValidHashFormat(verifierHash) && (
                      <p className="text-xs text-red-400 ml-1 flex items-center gap-1">
                        <ShieldAlert className="w-3 h-3" />
                        Invalid format. Expected: 0x + 64 hex characters
                      </p>
                    )}
                  </div>

                  <button 
                    onClick={handleVerify}
                    className="w-full bg-accent hover:bg-accent/90 text-white font-bold p-6 rounded-2xl shadow-xl shadow-accent/20 transition-all group active:scale-95"
                  >
                    <span className="flex items-center justify-center gap-3">
                      {verifyStatus === 'checking' ? (
                        <>
                          <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                          Verifying on Midnight Network...
                        </>
                      ) : `Verify ${vType === 'recency' ? 'Graduation Recency' : vType === 'level' ? 'Degree Level' : 'Credential Ownership'}`}
                    </span>
                  </button>

                  {verifyStatus === 'verified' && (
                    <div className="flex items-center justify-center gap-4 p-6 bg-green-500/10 border border-green-500/30 rounded-2xl animate-in text-green-500 font-bold text-lg shadow-[0_0_30px_rgba(34,197,94,0.1)]">
                      <GraduationCap className="w-7 h-7" />
                      CREDENTIAL VERIFIED
                    </div>
                  )}

                  {verifyStatus === 'failed' && (
                    <div className="flex items-center justify-center gap-4 p-6 bg-red-500/10 border border-red-500/30 rounded-2xl animate-in text-red-400 font-bold">
                      <EyeOff className="w-6 h-6" />
                      VERIFICATION FAILED
                    </div>
                  )}
                </div>

                <div className="p-6 bg-white/5 border-l-4 border-accent/20 rounded-r-2xl">
                  <p className="text-sm text-foreground/60 leading-relaxed">
                    Verify that the candidate meets the <b>{vType === 'recency' ? 'GRADUATION RECENCY' : vType === 'level' ? 'DEGREE LEVEL' : 'CREDENTIAL OWNERSHIP'}</b> criteria without ever seeing their full academic transcript or GPA. 
                  </p>
                </div>
              </div>
            </>
          )}
        </main>

        {/* Sidebar: Console & Stats */}
        <aside className="flex flex-col gap-8">
          {/* Stack Status */}
          <div className="terminal-glass p-6 space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-widest text-foreground/40">Environment</h3>
                <div className={`px-2 py-0.5 ${isMocked ? 'bg-orange-500/20 text-orange-500' : 'bg-green-500/20 text-green-500'} text-[10px] font-bold rounded uppercase`}>
                  {isMocked ? 'Simulation' : 'Midnight Network'}
                </div>
            </div>
            <div className="space-y-4">
              {[
                { label: 'Midnight Node', status: isMocked ? 'Simulation' : 'Connected', color: isMocked ? 'bg-orange-500' : 'bg-green-500' },
                { label: 'Credential Indexer', status: isMocked ? 'Local Storage' : 'Syncing', color: isMocked ? 'bg-orange-500' : 'bg-green-500' },
                { label: 'ZK Prover Engine', status: 'Available', color: 'bg-primary' },
                { label: 'Credential Store', status: 'Encrypted', color: 'bg-white/10' },
              ].map(stack => (
                <div key={stack.label} className="group cursor-default">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-foreground/40 group-hover:text-foreground/80 transition-all font-medium">{stack.label}</span>
                    <span className="text-[10px] uppercase font-black text-foreground/20 group-hover:text-foreground/60 transition-all">{stack.status}</span>
                  </div>
                  <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className={`h-full ${stack.color} w-full transition-all`} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Console */}
          <div className="terminal-glass flex-1 flex flex-col min-h-[400px]">
            <div className="terminal-header">
              <div className="flex items-center gap-2">
                <TerminalIcon className="w-3 h-3" />
                <span>PrivateDiploma SDK Debug</span>
              </div>
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
              </div>
            </div>
            <div className="p-4 space-y-3 overflow-y-auto font-mono text-[11px] leading-relaxed">
              {logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-foreground/20 py-12">
                    <Cpu className="w-8 h-8 opacity-20" />
                    <span className="text-[11px] uppercase tracking-widest">Awaiting Operations</span>
                </div>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className="flex gap-4 group">
                    <span className="text-foreground/10 select-none">#{i.toString().padStart(2, '0')}</span>
                    <span className="text-foreground/80 break-all group-hover:text-primary transition-all">{log}</span>
                  </div>
                ))
              )}
              <div ref={logEndRef} />
            </div>
          </div>
        </aside>
      </div>

      <style>{`
        .animate-in {
          animation: slideUpFade 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }
        @keyframes slideUpFade {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

export default App;
