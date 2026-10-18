import React, { useState } from 'react';
import { 
  ShieldCheck, Sparkles, Mail, Lock, ChevronRight, 
  ChevronDown, AlertCircle, Info, ArrowRight
} from 'lucide-react';
import { Modal } from './Modal';
import { useFirebase } from '../context/FirebaseContext';
import { playAudioCue as playAudio } from '../utils/audio';
import firebaseConfig from '../../firebase-applet-config.json';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup';
  onOpenLegal?: (type: 'privacy' | 'terms' | 'dmca') => void;
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
  onOpenLegal,
  onSuccess
}) => {
  const { loginWithGoogle, loginWithEmail, signUpWithEmail } = useFirebase();

  const [authMode, setAuthMode] = useState<'login' | 'signup'>(initialMode);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [termsAffirmed, setTermsAffirmed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Friendly error state
  const [errorMessage, setErrorMessage] = useState('');
  const [errorAction, setErrorAction] = useState<'switch_to_signup' | 'switch_to_login' | null>(null);
  const [infoNotice, setInfoNotice] = useState('');

  // Reset state when mode toggles
  const switchMode = (mode: 'login' | 'signup') => {
    setAuthMode(mode);
    setErrorMessage('');
    setErrorAction(null);
    setInfoNotice('');
    playAudio(784, 'sine', 0.1);
  };

  const mapAuthError = (err: any) => {
    console.error("Auth error details:", err);
    const errCode = (err?.code || '').toLowerCase();
    const errMsg = (err?.message || String(err)).toLowerCase();

    // 1. Popup closed by user -> NO red error card
    if (errCode.includes('popup-closed-by-user') || errMsg.includes('popup-closed-by-user')) {
      setErrorMessage('');
      setErrorAction(null);
      setInfoNotice('Sign-in was canceled.');
      return;
    }

    setInfoNotice('');

    // 2. User not found -> guide to signup
    if (errCode.includes('user-not-found') || errMsg.includes('user-not-found')) {
      setErrorMessage('No account found with this email. Click below to create a new account.');
      setErrorAction('switch_to_signup');
      return;
    }

    // 3. Wrong password or invalid credentials
    if (
      errCode.includes('wrong-password') || 
      errCode.includes('invalid-credential') || 
      errMsg.includes('wrong-password') || 
      errMsg.includes('invalid-credential')
    ) {
      setErrorMessage('Incorrect email or password. Please verify your details.');
      setErrorAction(null);
      return;
    }

    // 4. Email already in use
    if (errCode.includes('email-already-in-use') || errMsg.includes('email-already-in-use')) {
      setErrorMessage('An account already exists with this email. Please sign in instead.');
      setErrorAction('switch_to_login');
      return;
    }

    // 5. Weak password
    if (errCode.includes('weak-password') || errMsg.includes('weak-password')) {
      setErrorMessage('Password is too weak. Please use at least 6 characters.');
      setErrorAction(null);
      return;
    }

    // 6. Unauthorized domain (NEVER mention "Firebase")
    if (errCode.includes('unauthorized-domain') || errMsg.includes('unauthorized-domain')) {
      const configProjId = firebaseConfig?.projectId || "axe-hours-youtube-engine";
      setErrorMessage(
        `⚠️ Domain Configuration Notice:\n\nThe current domain ("${window.location.hostname}") is not in your authorized identity provider settings.\n\nTo resolve this:\n1. Open your Identity Console: https://console.cloud.google.com/ or project settings: https://console.firebase.google.com/project/${configProjId}/authentication/settings\n2. Add "${window.location.hostname}" to the Authorized Domains list.\n3. Retry sign-in.`
      );
      setErrorAction(null);
      return;
    }

    // 7. Generic fallback without developer jargon or "Firebase"
    const cleaned = (err?.message || 'Authentication could not be completed.')
      .replace(/firebase/gi, 'Authentication Provider')
      .replace(/auth\//gi, '');
    setErrorMessage(cleaned);
    setErrorAction(null);
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!termsAffirmed) {
      setErrorMessage("Please confirm you are at least 13 years of age and agree to our Terms of Service and Privacy Policy to continue.");
      playAudio(220, "sawtooth", 0.4);
      return;
    }
    setErrorMessage('');
    setErrorAction(null);
    setInfoNotice('');
    setIsLoading(true);

    try {
      if (authMode === 'signup') {
        await signUpWithEmail(email, password);
      } else {
        await loginWithEmail(email, password);
      }
      playAudio(880, "sine", 0.3);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      mapAuthError(err);
      playAudio(220, "sawtooth", 0.4);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (!termsAffirmed) {
      setErrorMessage("Please confirm you are at least 13 years of age and agree to our Terms of Service and Privacy Policy to continue.");
      playAudio(220, "sawtooth", 0.4);
      return;
    }
    setErrorMessage('');
    setErrorAction(null);
    setInfoNotice('');
    setIsLoading(true);

    try {
      await loginWithGoogle();
      playAudio(1046, "sine", 0.25);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      mapAuthError(err);
      playAudio(220, "sawtooth", 0.4);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidthClass="max-w-3xl">
      <div id="google-auth-container" className="font-sans">
        {/* Header Bar */}
        <div className="flex items-center gap-2.5 pb-5 border-b border-[#303134] mb-6">
          <ShieldCheck size={20} className="text-purple-400 shrink-0" />
          <span className="text-sm font-medium text-[#e3e2e6]">Sign in options</span>
        </div>

        {/* Main Grid Content */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start py-2">
          {/* Left Column: Heading */}
          <div className="md:col-span-5 space-y-2">
            <h2 className="text-2xl sm:text-3xl font-normal text-[#e3e2e6] tracking-tight leading-tight">
              {showEmailForm ? (authMode === 'signup' ? "Create account" : "Sign in") : "Choose sign-in method"}
            </h2>
            <p className="text-sm text-[#c4c6d0]">
              to continue to <span className="font-semibold text-white">Axe Hours AI</span>
            </p>
          </div>

          {/* Right Column: Account Selection or Email Form */}
          <div className="md:col-span-7 space-y-5">
            {/* Friendly Non-Red Info Notice (e.g. for canceled popups) */}
            {infoNotice && (
              <div id="auth-info-notice" className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-medium flex items-center gap-2">
                <Info size={16} className="text-purple-400 shrink-0" />
                <span>{infoNotice}</span>
              </div>
            )}

            {/* Error Message Card with Clean Guidance & Action Toggle */}
            {errorMessage && (
              <div id="auth-error-display" className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs md:text-sm font-semibold leading-relaxed space-y-2">
                <div className="flex items-start gap-2">
                  <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
                  <span className="whitespace-pre-wrap">{errorMessage}</span>
                </div>
                {errorAction === 'switch_to_signup' && (
                  <button
                    type="button"
                    onClick={() => switchMode('signup')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 mt-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold transition-all shadow-md cursor-pointer"
                  >
                    <span>Create New Account</span>
                    <ArrowRight size={13} />
                  </button>
                )}
                {errorAction === 'switch_to_login' && (
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 mt-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold transition-all shadow-md cursor-pointer"
                  >
                    <span>Sign In Now</span>
                    <ArrowRight size={13} />
                  </button>
                )}
              </div>
            )}

            {!showEmailForm ? (
              <div className="space-y-5">
                {/* Explicit COPPA 13+ & Terms/Privacy Confirmation Statement */}
                <div className="p-3.5 rounded-xl bg-purple-950/25 border border-purple-500/40">
                  <label className="flex items-start gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      id="auth-coppa-terms-checkbox"
                      checked={termsAffirmed}
                      onChange={(e) => {
                        setTermsAffirmed(e.target.checked);
                        if (e.target.checked) setErrorMessage('');
                      }}
                      className="mt-0.5 rounded border-white/30 text-purple-600 focus:ring-0 cursor-pointer h-4 w-4 bg-black/50 accent-purple-500 shrink-0"
                    />
                    <span className="text-xs text-[#d1d5db] leading-relaxed font-sans">
                      By continuing, you confirm that you are at least 13 years of age and agree to our{' '}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onOpenLegal) onOpenLegal('terms');
                        }}
                        className="text-[#a8c7fa] underline hover:text-[#c2e7ff] font-medium cursor-pointer"
                      >
                        Terms of Service
                      </button>{' '}
                      and{' '}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onOpenLegal) onOpenLegal('privacy');
                        }}
                        className="text-[#a8c7fa] underline hover:text-[#c2e7ff] font-medium cursor-pointer"
                      >
                        Privacy Policy
                      </button>.
                    </span>
                  </label>
                </div>

                {/* Provider List */}
                <div className="border-t border-b border-[#303134] divide-y divide-[#303134]">
                  {/* Google Row */}
                  <button
                    type="button"
                    id="auth-google-sso-btn"
                    onClick={handleGoogleLogin}
                    disabled={isLoading}
                    className="w-full py-3.5 px-3 flex items-center justify-between hover:bg-white/5 transition-colors text-left group cursor-pointer"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-[#2a2b2d] border border-[#3c4043] flex items-center justify-center shrink-0">
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-[#e3e2e6] group-hover:text-white truncate">
                          Continue with Google
                        </div>
                        <div className="text-xs text-[#9aa0a6] truncate">
                          Single click Google SSO
                        </div>
                      </div>
                    </div>
                    <Sparkles size={16} className="text-purple-400 shrink-0" />
                  </button>

                  {/* Email / Custom Password Row */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowEmailForm(true);
                      playAudio(784, "sine", 0.1);
                    }}
                    className="w-full py-3.5 px-3 flex items-center justify-between hover:bg-white/5 transition-colors text-left group cursor-pointer"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-[#1e1f20] border border-[#303134] flex items-center justify-center text-[#c4c6d0] shrink-0 group-hover:border-gray-400">
                        <Mail size={18} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-[#e3e2e6] group-hover:text-white truncate">
                          Email and Password
                        </div>
                        <div className="text-xs text-[#9aa0a6] truncate">
                          Sign in or create account directly
                        </div>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-[#9aa0a6] group-hover:text-white shrink-0" />
                  </button>
                </div>

                <p className="text-xs text-[#9aa0a6] leading-relaxed pt-1">
                  Before using this app, you can review Axe Hours AI's{" "}
                  <button
                    type="button"
                    onClick={() => onOpenLegal && onOpenLegal('privacy')}
                    className="text-[#a8c7fa] underline cursor-pointer hover:text-[#c2e7ff]"
                  >
                    Privacy Policy
                  </button>{" "}
                  and{" "}
                  <button
                    type="button"
                    onClick={() => onOpenLegal && onOpenLegal('terms')}
                    className="text-[#a8c7fa] underline cursor-pointer hover:text-[#c2e7ff]"
                  >
                    Terms of Service
                  </button>.
                </p>
              </div>
            ) : (
              /* Custom Email Form view */
              <form id="auth-submit-form" onSubmit={handleAuthSubmit} className="space-y-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEmailForm(false);
                    setErrorMessage('');
                    setErrorAction(null);
                    setInfoNotice('');
                  }}
                  className="text-xs text-[#a8c7fa] hover:underline flex items-center gap-1 mb-2 font-medium cursor-pointer"
                >
                  ← Back to account options
                </button>

                <div className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-medium text-[#c4c6d0] mb-1">Email address</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input 
                        id="auth-email-input"
                        type="email" 
                        required 
                        data-private="true"
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)} 
                        placeholder="name@example.com" 
                        className="w-full bg-[#030307] border border-[#303134] rounded-xl py-3 pl-11 pr-4 text-white text-sm focus:outline-none focus:border-purple-500 placeholder-gray-500 ph-no-capture" 
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#c4c6d0] mb-1">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input 
                        id="auth-password-input"
                        type="password" 
                        required 
                        data-private="true"
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                        placeholder="••••••••" 
                        className="w-full bg-[#030307] border border-[#303134] rounded-xl py-3 pl-11 pr-4 text-white text-sm focus:outline-none focus:border-purple-500 placeholder-gray-500 ph-no-capture" 
                      />
                    </div>
                  </div>
                </div>

                {/* Explicit COPPA 13+ & Terms/Privacy Affirmation in Email Form */}
                <div className="p-3 rounded-xl bg-purple-950/25 border border-purple-500/40 select-none">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      id="auth-email-coppa-terms-checkbox"
                      checked={termsAffirmed}
                      onChange={(e) => {
                        setTermsAffirmed(e.target.checked);
                        if (e.target.checked) setErrorMessage('');
                      }}
                      className="mt-0.5 rounded border-white/30 text-purple-600 focus:ring-0 cursor-pointer h-4 w-4 bg-black/50 accent-purple-500 shrink-0"
                    />
                    <span className="text-xs text-[#d1d5db] leading-relaxed font-sans">
                      By continuing, you confirm that you are at least 13 years of age and agree to our{' '}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onOpenLegal) onOpenLegal('terms');
                        }}
                        className="text-[#a8c7fa] underline hover:text-[#c2e7ff] font-medium cursor-pointer"
                      >
                        Terms of Service
                      </button>{' '}
                      and{' '}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onOpenLegal) onOpenLegal('privacy');
                        }}
                        className="text-[#a8c7fa] underline hover:text-[#c2e7ff] font-medium cursor-pointer"
                      >
                        Privacy Policy
                      </button>.
                    </span>
                  </label>
                </div>

                {/* Tab switch guide */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <button 
                    type="button"
                    onClick={() => switchMode(authMode === 'signup' ? 'login' : 'signup')}
                    className="text-[#a8c7fa] hover:underline cursor-pointer font-medium text-left"
                  >
                    {authMode === 'signup' 
                      ? "Already have an account? Sign in" 
                      : "Don't have an account yet? Establish a brand new access account"}
                  </button>
                </div>

                <button 
                  id="auth-submit-action-btn" 
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-3 h-11 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl text-sm cursor-pointer transition-all shadow-md"
                >
                  {isLoading ? "Consulting AI..." : (authMode === 'signup' ? "Create Account" : "Sign In")}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Footer Bar */}
        <div className="mt-8 pt-4 border-t border-[#303134] flex flex-col sm:flex-row items-center justify-between text-xs text-[#9aa0a6] gap-3">
          <div className="flex items-center gap-1 cursor-pointer hover:text-white transition-colors">
            <span>English (United States)</span>
            <ChevronDown size={14} />
          </div>
          <div className="flex items-center gap-4">
            <button 
              type="button" 
              onClick={() => onOpenLegal && onOpenLegal('privacy')} 
              className="hover:text-white transition-colors cursor-pointer"
            >
              AXE Hours Privacy Policy
            </button>
            <button 
              type="button" 
              onClick={() => onOpenLegal && onOpenLegal('terms')} 
              className="hover:text-white transition-colors cursor-pointer"
            >
              Terms of Service
            </button>
            <button 
              type="button" 
              onClick={() => onOpenLegal && onOpenLegal('dmca')} 
              className="hover:text-white transition-colors cursor-pointer text-purple-400/90 hover:text-purple-300"
            >
              DMCA Takedown
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default AuthModal;
