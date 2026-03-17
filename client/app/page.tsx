import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GoogleSignInButton } from "@/components/ui/google-sign-in-button.client";
import { hasAuthToken } from "@/lib/server-auth";
import { Gamepad2 } from 'lucide-react';
import { redirect } from "next/navigation";


export default async function Home() {
  const hasToken = await hasAuthToken();

  if (hasToken) {
    redirect(`/user/profile`)
  } else {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background bg-grid-pattern relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/20 rounded-full blur-3xl animate-pulse-glow" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 right-1/3 w-48 h-48 bg-accent/20 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: '0.5s' }} />
        </div>
        <Card className="w-full max-w-md mx-4 bg-card/80 backdrop-blur-xl neon-border relative z-10">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-xl gradient-gaming flex items-center justify-center glow-purple animate-float">
              <Gamepad2 className="w-8 h-8 text-primary-foreground" />
            </div>
            <CardTitle className="text-3xl font-bold text-glow-purple">
              NEXUS<span className="text-secondary">GAMING</span>
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Enter the arena. Connect with gamers worldwide.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <GoogleSignInButton />

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  Secure OAuth 2.0
                </span>
              </div>
            </div>
            <p className="text-xs text-center text-muted-foreground">
              By signing in, you agree to our{' '}
              <a href="#" className="text-primary hover:underline">Terms of Service</a>
              {' '}and{' '}
              <a href="#" className="text-primary hover:underline">Privacy Policy</a>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
}
