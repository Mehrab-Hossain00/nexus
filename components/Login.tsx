import React, { useState, useEffect } from 'react';
import { ArrowRight, Sparkles, Lock, ScanFace, UserPlus, ArrowLeft, LogIn, PlusCircle, Delete, Loader2 } from 'lucide-react';
import { authService } from '../services/authService';
import { UserProfile } from '../types';

interface LoginProps {
  onLogin: (user: UserProfile) => void;
}

type AuthStep = 'LANDING' | 'SELECT_USER' | 'ENTER_PIN' | 'REGISTER_NAME' | 'REGISTER_PIN';

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [step, setStep] = useState<AuthStep>('LANDING');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  
  // Input States
  const [pin, setPin] = useState('');
  const [newUserName, setNewUserName] = useState('');
  
  // Animation States
  const [isScanning, setIsScanning] = useState(false);
  const [shakeError, setShakeError] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setIsLoadingUsers(true);
    const storedUsers = await authService.getUsers();
    setUsers(storedUsers);
    setIsLoadingUsers(false);
    
    // Optional: If 0 users, go straight to register, but careful with async timing
    if (storedUsers.length === 0 && step === 'LANDING') {
        // We'll let them click "Create Account" or we can auto-direct. 
        // Let's stick to Landing for cleaner UX on first load.
    }
  };

  const handleUserSelect = (user: UserProfile) => {
    setSelectedUser(user);
    setPin('');
    setStep('ENTER_PIN');
  };

  const handlePinInput = (digit: string) => {
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);
      
      // Auto-submit on 4th digit
      if (newPin.length === 4) {
        if (step === 'ENTER_PIN' && selectedUser) {
           validateLogin(selectedUser.uid, newPin);
        } else if (step === 'REGISTER_PIN') {
           completeRegistration(newPin);
        }
      }
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
  };

  const validateLogin = async (uid: string, enteredPin: string) => {
    setIsProcessing(true);
    // Real auth check
    const result = await authService.login(uid, enteredPin);
    setIsProcessing(false);
    
    if (result.success && result.user) {
      onLogin(result.user);
    } else {
      setShakeError(true);
      setPin('');
      setTimeout(() => setShakeError(false), 500);
    }
  };

  const startBiometricScan = () => {
    if (!selectedUser) return;
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      // "Success" simulation
      validateLogin(selectedUser.uid, selectedUser.pin); 
    }, 1800);
  };

  const startRegistration = () => {
    setNewUserName('');
    setPin('');
    setStep('REGISTER_NAME');
  };

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newUserName.trim()) {
      setStep('REGISTER_PIN');
    }
  };

  const completeRegistration = async (finalPin: string) => {
     setIsProcessing(true);
     try {
         const newUser = await authService.register(newUserName, finalPin);
         onLogin(newUser);
     } catch (e) {
         console.error(e);
         setShakeError(true);
         setTimeout(() => setShakeError(false), 500);
     } finally {
         setIsProcessing(false);
     }
  };

  // --------------------------------------------------------------------------
  // Components
  // --------------------------------------------------------------------------

  const Keypad = () => (
    <div className="grid grid-cols-3 gap-4 max-w-[280px] mx-auto mt-8">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
        <button
          key={num}
          onClick={() => handlePinInput(num.toString())}
          disabled={isProcessing}
          className="w-16 h-16 rounded-full bg-zinc-800/50 hover:bg-zinc-700 text-white text-xl font-medium border border-white/5 transition-all hover:scale-105 active:scale-95 flex items-center justify-center backdrop-blur-sm disabled:opacity-50 disabled:pointer-events-none hover:shadow-[0_0_15px_rgba(255,255,255,0.1)]"
        >
          {num}
        </button>
      ))}
      <div className="flex items-center justify-center">
        {step === 'ENTER_PIN' && selectedUser?.biometricEnabled && (
           <button 
             onClick={startBiometricScan}
             disabled={isScanning || isProcessing}
             className="w-16 h-16 rounded-full flex items-center justify-center text-indigo-400 hover:text-white hover:bg-indigo-500/20 transition-all active:scale-90"
           >
             <ScanFace className={`w-6 h-6 ${isScanning ? 'animate-pulse' : ''}`} />
           </button>
        )}
      </div>
      <button
        onClick={() => handlePinInput('0')}
        disabled={isProcessing}
        className="w-16 h-16 rounded-full bg-zinc-800/50 hover:bg-zinc-700 text-white text-xl font-medium border border-white/5 transition-all hover:scale-105 active:scale-95 flex items-center justify-center backdrop-blur-sm disabled:opacity-50 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)]"
      >
        0
      </button>
      <button
        onClick={handleBackspace}
        disabled={isProcessing}
        className="w-16 h-16 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-all disabled:opacity-50 active:scale-90"
      >
        <Delete className="w-6 h-6" />
      </button>
    </div>
  );

  const PinDisplay = () => (
    <div className="flex justify-center gap-4 my-8 h-4 items-center">
      {isProcessing ? (
          <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
      ) : (
          [0, 1, 2, 3].map(i => (
            <div 
              key={i} 
              className={`
                w-4 h-4 rounded-full border border-white/20 transition-all duration-300
                ${i < pin.length ? 'bg-indigo-500 border-indigo-500 scale-110 shadow-[0_0_10px_rgba(99,102,241,0.5)]' : 'bg-transparent'}
              `}
            />
          ))
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-black to-black pointer-events-none" />
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-20" />
      
      {/* Biometric Scan Overlay */}
      {isScanning && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative">
             <div className="absolute inset-0 border-2 border-indigo-500 rounded-lg animate-ping opacity-20" />
             <ScanFace className="w-24 h-24 text-indigo-400 animate-pulse" strokeWidth={1} />
             <div className="absolute top-full left-0 right-0 text-center mt-4 text-indigo-400 text-sm font-mono tracking-widest uppercase">
                Verifying Identity...
             </div>
             <div className="absolute top-0 left-0 w-full h-0.5 bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,1)] animate-[scan_2s_ease-in-out_infinite]" />
          </div>
        </div>
      )}

      <div className={`
         w-full max-w-md relative z-10 transition-all duration-500
         ${shakeError ? 'animate-[shake_0.5s_cubic-bezier(.36,.07,.19,.97)_both]' : ''}
      `}>
        
        {/* VIEW: LANDING */}
        {step === 'LANDING' && (
          <div className="animate-fade-in space-y-12 text-center">
            <div className="space-y-4">
               {/* Minimalist Logo */}
               <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-black border border-white/10 shadow-2xl relative overflow-hidden mb-2 group hover:border-white/20 hover:scale-105 transition-all duration-500 hover:shadow-[0_0_30px_rgba(99,102,241,0.2)]">
                  <div className="absolute top-0 right-0 w-8 h-8 bg-indigo-500 blur-[15px] rounded-full opacity-50 group-hover:opacity-100 transition-opacity" />
                  <Sparkles className="w-10 h-10 text-white relative z-10 group-hover:rotate-12 transition-transform duration-500" />
               </div>
               <div>
                 <h1 className="text-4xl font-bold text-white tracking-tight">Nexus</h1>
                 <p className="text-zinc-500 text-sm font-medium uppercase tracking-[0.3em]">Study Pro Cloud</p>
               </div>
            </div>

            <div className="space-y-4 w-full px-4">
               <button 
                  onClick={() => setStep('SELECT_USER')}
                  disabled={isLoadingUsers}
                  className="w-full group relative p-5 rounded-2xl bg-gradient-to-r from-zinc-900/50 to-zinc-900/30 border border-white/10 hover:border-indigo-500/50 transition-all flex items-center justify-between backdrop-blur-md overflow-hidden disabled:opacity-50 hover:shadow-[0_0_20px_rgba(99,102,241,0.15)] hover:scale-[1.02] active:scale-[0.98]"
               >
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="flex items-center gap-4 relative z-10">
                     <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white transition-colors text-zinc-400 group-hover:shadow-[0_0_10px_rgba(99,102,241,0.5)]">
                        {isLoadingUsers ? <Loader2 className="w-5 h-5 animate-spin"/> : <LogIn className="w-5 h-5" />}
                     </div>
                     <div className="text-left">
                        <div className="text-white font-bold text-lg group-hover:text-indigo-100 transition-colors">Sign In</div>
                        <div className="text-zinc-500 text-xs">Access cloud workspace</div>
                     </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-zinc-600 group-hover:text-white group-hover:translate-x-1 transition-all relative z-10" />
               </button>

               <button 
                  onClick={startRegistration}
                  className="w-full group relative p-5 rounded-2xl bg-transparent border border-zinc-800 hover:border-zinc-700 hover:bg-white/5 transition-all flex items-center justify-between hover:scale-[1.02] active:scale-[0.98]"
               >
                  <div className="flex items-center gap-4">
                     <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 group-hover:text-white transition-colors">
                        <PlusCircle className="w-5 h-5" />
                     </div>
                     <div className="text-left">
                        <div className="text-white font-semibold text-base">Create Account</div>
                        <div className="text-zinc-500 text-xs">New user profile</div>
                     </div>
                  </div>
               </button>
            </div>

            <div className="text-zinc-600 text-xs mt-8">
               Secure Firebase Connection Active
            </div>
          </div>
        )}

        {/* VIEW: SELECT USER */}
        {step === 'SELECT_USER' && (
          <div className="animate-slide-up space-y-8">
             <button 
                onClick={() => setStep('LANDING')}
                className="absolute -top-12 left-0 text-zinc-500 hover:text-white transition-colors flex items-center gap-2 text-sm"
             >
                <ArrowLeft className="w-4 h-4" /> Back
             </button>

             <div className="text-center space-y-2">
                <h1 className="text-2xl font-bold text-white tracking-tight">Who is working today?</h1>
             </div>

             <div className="grid grid-cols-2 gap-4 max-h-[400px] overflow-y-auto custom-scrollbar p-1">
               {users.map(user => (
                 <button
                   key={user.uid}
                   onClick={() => handleUserSelect(user)}
                   className="group relative p-4 rounded-2xl bg-zinc-900/40 border border-white/5 hover:border-indigo-500/50 hover:bg-zinc-900/60 transition-all flex flex-col items-center gap-3 backdrop-blur-md hover:scale-[1.02] active:scale-[0.98] hover:shadow-[0_0_20px_rgba(99,102,241,0.2)]"
                 >
                   <img src={user.avatar} alt={user.name} className="w-16 h-16 rounded-full border-2 border-zinc-800 group-hover:border-indigo-500 transition-colors shadow-lg" />
                   <span className="text-white font-medium text-sm group-hover:text-indigo-300 transition-colors">{user.name}</span>
                 </button>
               ))}
               {users.length === 0 && (
                   <div className="col-span-2 text-zinc-500 text-center py-8">
                       No users found. Please create an account.
                   </div>
               )}
             </div>
          </div>
        )}

        {/* VIEW: ENTER PIN */}
        {step === 'ENTER_PIN' && selectedUser && (
          <div className="animate-slide-up text-center">
            <button 
              onClick={() => { setStep('SELECT_USER'); setPin(''); }}
              className="absolute left-0 top-0 p-2 text-zinc-500 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            
            <img 
              src={selectedUser.avatar} 
              alt={selectedUser.name} 
              className="w-24 h-24 rounded-full border-4 border-black shadow-2xl mx-auto mb-6" 
            />
            <h2 className="text-2xl font-bold text-white mb-1">{selectedUser.name}</h2>
            <p className="text-zinc-500 text-sm flex items-center justify-center gap-2">
              <Lock className="w-3 h-3" /> Secured Workspace
            </p>

            <PinDisplay />
            <Keypad />
          </div>
        )}

        {/* VIEW: REGISTER NAME */}
        {step === 'REGISTER_NAME' && (
          <div className="animate-slide-up bg-zinc-900/40 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl">
             <button 
                onClick={() => setStep('LANDING')}
                className="mb-6 text-zinc-500 hover:text-white transition-colors flex items-center gap-2 text-sm"
             >
                <ArrowLeft className="w-4 h-4" /> Back
             </button>
             
             <div className="mb-6">
                <h2 className="text-2xl font-bold text-white">Initialize Identity</h2>
                <p className="text-zinc-400 text-sm mt-1">Create a cloud profile to store your data.</p>
             </div>
             
             <form onSubmit={handleNameSubmit} className="space-y-6">
                <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Designation</label>
                    <input 
                        autoFocus
                        value={newUserName}
                        onChange={(e) => setNewUserName(e.target.value)}
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-indigo-500/50 outline-none transition-all text-lg focus:shadow-[0_0_15px_rgba(99,102,241,0.1)]"
                        placeholder="e.g. Alex Chen"
                    />
                </div>
                <button 
                    type="submit"
                    disabled={!newUserName.trim()}
                    className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 active:scale-98 hover:shadow-[0_0_20px_rgba(99,102,241,0.3)]"
                >
                    <span>Continue</span>
                    <ArrowRight className="w-4 h-4" />
                </button>
             </form>
          </div>
        )}

        {/* VIEW: REGISTER PIN */}
        {step === 'REGISTER_PIN' && (
           <div className="animate-slide-up text-center">
             <button 
                onClick={() => setStep('REGISTER_NAME')}
                className="absolute left-0 top-0 p-2 text-zinc-500 hover:text-white transition-colors"
             >
               <ArrowLeft className="w-6 h-6" />
             </button>

             <h2 className="text-2xl font-bold text-white mb-2">Create Security PIN</h2>
             <p className="text-zinc-500 text-sm mb-8">Set a 4-digit code to protect your studies.</p>
             
             <div className="bg-zinc-900/30 p-8 rounded-3xl border border-white/5 backdrop-blur-md">
                 <PinDisplay />
                 <Keypad />
             </div>
           </div>
        )}

      </div>
      
      <style>{`
        @keyframes shake {
          10%, 90% { transform: translate3d(-1px, 0, 0); }
          20%, 80% { transform: translate3d(2px, 0, 0); }
          30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
          40%, 60% { transform: translate3d(4px, 0, 0); }
        }
        @keyframes scan {
            0% { top: 0; }
            50% { top: 100%; }
            100% { top: 0; }
        }
      `}</style>
    </div>
  );
};