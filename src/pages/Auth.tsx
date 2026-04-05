import { FormEvent, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Activity, Loader2, LogIn, UserPlus } from "lucide-react";
import { FirebaseError } from "firebase/app";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FloatingLines from "@/components/FloatingLines";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { isFirebaseConfigured, missingFirebaseEnvKeys } from "@/lib/firebase";

function getAuthErrorMessage(error: unknown) {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case "auth/email-already-in-use":
        return "That email is already registered. Try signing in instead.";
      case "auth/invalid-email":
        return "Please enter a valid email address.";
      case "auth/invalid-credential":
      case "auth/wrong-password":
      case "auth/user-not-found":
        return "The email or password is incorrect.";
      case "auth/weak-password":
        return "Use a password with at least 6 characters.";
      case "auth/too-many-requests":
        return "Too many attempts right now. Please wait a bit and try again.";
      default:
        return error.message;
    }
  }

  return "Something went wrong while authenticating. Please try again.";
}

export default function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading, signIn, signUp } = useAuth();
  const [activeTab, setActiveTab] = useState("signin");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signInForm, setSignInForm] = useState({ email: "", password: "" });
  const [signUpForm, setSignUpForm] = useState({ name: "", email: "", password: "" });

  const redirectTo = useMemo(() => {
    const state = location.state as { from?: { pathname?: string } } | null;
    return state?.from?.pathname || "/dashboard";
  }, [location.state]);

  useEffect(() => {
    if (!loading && user) {
      navigate(redirectTo, { replace: true });
    }
  }, [loading, navigate, redirectTo, user]);

  const handleSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isFirebaseConfigured) {
      toast.error("Firebase is not configured yet. Add your keys in the project .env file first.");
      return;
    }
    setIsSubmitting(true);

    try {
      await signIn(signInForm.email, signInForm.password);
      toast.success("Signed in successfully.");
      navigate(redirectTo, { replace: true });
    } catch (error) {
      toast.error(getAuthErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignUp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isFirebaseConfigured) {
      toast.error("Firebase is not configured yet. Add your keys in the project .env file first.");
      return;
    }
    setIsSubmitting(true);

    try {
      await signUp(signUpForm.name, signUpForm.email, signUpForm.password);
      toast.success("Account created successfully.");
      navigate(redirectTo, { replace: true });
    } catch (error) {
      toast.error(getAuthErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading && user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-landing relative overflow-hidden flex items-center justify-center px-6 py-12">
      <div className="absolute inset-0">
        <FloatingLines
          enabledWaves={["top", "middle", "bottom"]}
          lineCount={5}
          lineDistance={5}
          bendRadius={5}
          bendStrength={-0.5}
          interactive
          parallax
        />
      </div>

      <Card className="relative z-10 w-full max-w-md border-landing-muted bg-card/95 backdrop-blur">
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-2 text-landing-accent">
            <Activity className="h-5 w-5" />
            <span className="font-semibold">MedCore EHR</span>
          </div>
          <CardTitle className="text-2xl">Secure access</CardTitle>
          <CardDescription>
            Sign in to access the hospital operations dashboard and existing live resource views.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isFirebaseConfigured && (
            <div className="mb-4 rounded-lg border border-warning/30 bg-warning/10 p-4 text-sm">
              <p className="font-medium text-foreground">Firebase setup needed before sign-in will work.</p>
              <p className="mt-1 text-muted-foreground">
                Create a <code>.env</code> file in the project root using <code>.env.example</code>, then add your
                Firebase Web App credentials from Firebase Console.
              </p>
              <p className="mt-2 text-muted-foreground">
                Missing keys: {missingFirebaseEnvKeys.join(", ")}
              </p>
            </div>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Create Account</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form className="space-y-4" onSubmit={handleSignIn}>
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    value={signInForm.email}
                    onChange={(event) => setSignInForm((current) => ({ ...current, email: event.target.value }))}
                    placeholder="admin@hospital.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    value={signInForm.password}
                    onChange={(event) => setSignInForm((current) => ({ ...current, password: event.target.value }))}
                    placeholder="Enter your password"
                    required
                  />
                </div>
                <Button type="submit" className="w-full gap-2" disabled={isSubmitting || !isFirebaseConfigured}>
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                  Sign In
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form className="space-y-4" onSubmit={handleSignUp}>
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Full Name</Label>
                  <Input
                    id="signup-name"
                    value={signUpForm.name}
                    onChange={(event) => setSignUpForm((current) => ({ ...current, name: event.target.value }))}
                    placeholder="Hospital admin name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    value={signUpForm.email}
                    onChange={(event) => setSignUpForm((current) => ({ ...current, email: event.target.value }))}
                    placeholder="admin@hospital.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    value={signUpForm.password}
                    onChange={(event) => setSignUpForm((current) => ({ ...current, password: event.target.value }))}
                    placeholder="Minimum 6 characters"
                    minLength={6}
                    required
                  />
                </div>
                <Button type="submit" className="w-full gap-2" disabled={isSubmitting || !isFirebaseConfigured}>
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                  Create Account
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <Button
            variant="link"
            className="mt-4 px-0"
            onClick={() => navigate("/")}
            type="button"
          >
            Back to home
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
