import { type ReactNode, useEffect, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ClerkProvider, SignIn, SignUp, Show, useUser } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { ErrorBoundary } from '@/components/error-boundary';
import { TooltipProvider } from '@/components/ui/tooltip';
import { observeAuthenticationState } from '@/lib/analytics';
import NotFound from '@/pages/not-found';
import Home from '@/pages/home';
import {
  Route,
  Switch,
  useLocation,
  Redirect,
  Router as WouterRouter,
} from 'wouter';

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

const basePath = import.meta.env.BASE_URL?.replace(/\/$/, '') || '';

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env file');
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "hsl(0 84% 50%)",
    colorForeground: "hsl(0 0% 8%)",
    colorMutedForeground: "hsl(0 0% 45%)",
    colorDanger: "hsl(0 84% 50%)",
    colorBackground: "hsl(0 0% 100%)",
    colorInput: "hsl(40 10% 85%)",
    colorInputForeground: "hsl(0 0% 8%)",
    colorNeutral: "hsl(40 10% 85%)",
    fontFamily: "'DM Sans', sans-serif",
    borderRadius: "0.25rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-card rounded-xl w-[440px] max-w-full overflow-hidden border border-border",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "font-serif text-2xl font-bold text-foreground",
    headerSubtitle: "text-muted-foreground",
    socialButtonsBlockButtonText: "text-foreground font-semibold",
    formFieldLabel: "text-foreground font-semibold uppercase tracking-wider text-xs",
    footerActionLink: "text-primary hover:text-primary/80 transition-colors",
    footerActionText: "text-muted-foreground",
    dividerText: "text-muted-foreground",
    identityPreviewEditButton: "text-primary",
    formFieldSuccessText: "text-primary",
    alertText: "text-destructive",
    logoBox: "h-12 flex items-center justify-center",
    logoImage: "h-8 w-auto",
    socialButtonsBlockButton: "border-border hover:bg-muted/50",
    formButtonPrimary: "bg-primary text-primary-foreground hover:bg-primary/90 rounded-full font-semibold uppercase tracking-widest text-xs",
    formFieldInput: "bg-transparent border-t border-b border-l-0 border-r-0 rounded-none focus:ring-0 focus:border-primary text-foreground placeholder-muted-foreground",
    footerAction: "bg-secondary/50",
    dividerLine: "bg-border",
    alert: "bg-destructive/10 border-destructive/20",
    otpCodeFieldInput: "border-border text-foreground",
    formFieldRow: "space-y-2",
    main: "space-y-6",
  },
};

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4 relative">
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>
      <div className="relative z-10 w-full max-w-md">
        <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
      </div>
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4 relative">
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>
      <div className="relative z-10 w-full max-w-md">
        <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
      </div>
    </div>
  );
}

function PrincipalBoundary() {
  const { user, isLoaded } = useUser();
  const previousSignedIn = useRef<boolean | undefined>(undefined);
  const isSignedIn = Boolean(user);

  useEffect(() => {
    previousSignedIn.current = observeAuthenticationState(
      previousSignedIn.current,
      isLoaded,
      isSignedIn,
    );
  }, [isLoaded, isSignedIn]);

  if (!isLoaded) return <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground" role="status">Opening Creative Crew…</div>;

  const principalId = user?.id ?? 'guest';

  return <PrincipalApp key={principalId} />;
}

function PrincipalApp() {
  const [queryClient] = useState(() => new QueryClient());

  useEffect(() => () => {
    void queryClient.cancelQueries();
    queryClient.clear();
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <Router />
    </QueryClientProvider>
  );
}

function HomeRedirect() {
  const { user } = useUser();
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/user-portal" />
      </Show>
      <Show when="signed-out">
        <Home key={user?.id ?? 'guest'} />
      </Show>
    </>
  );
}

function UserPortal() {
  const { user } = useUser();
  return (
    <>
      <Show when="signed-in">
        <Home key={user?.id ?? 'guest'} />
      </Show>
      <Show when="signed-out">
        <Redirect to="/" />
      </Show>
    </>
  );
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={HomeRedirect} />
        <Route path="/user-portal" component={UserPortal} />
        <Route path="/sign-in/*?" component={SignInPage} />
        <Route path="/sign-up/*?" component={SignUpPage} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();
  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: {
            title: "Creative Crew",
            subtitle: "Sign in to access your digital production desk",
          },
        },
        signUp: {
          start: {
            title: "Creative Crew",
            subtitle: "Create an account to save your treatments",
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <PrincipalBoundary />
    </ClerkProvider>
  );
}

function App() {
  return (
    <TooltipProvider>
      <WouterRouter base={basePath}>
        <ClerkProviderWithRoutes />
      </WouterRouter>
    </TooltipProvider>
  );
}

export default App;