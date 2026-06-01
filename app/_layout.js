import { useEffect } from "react";
import { router, Slot } from "expo-router";
import { AuthProvider, useAuth } from "../lib/stores/auth";

function RootLayoutNav() {
  const { session, loading, supabase } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!session) {
      router.replace("/onboarding/auth");
      return;
    }

    supabase
      .from("profiles")
      .select("username, onboarding_complete")
      .eq("id", session.user.id)
      .single()
      .then(({ data }) => {
        if (!data?.username) {
          router.replace("/onboarding/profile-setup");
        } else if (!data?.onboarding_complete) {
          router.replace("/onboarding/education");
        } else {
          router.replace("/(app)/feed");
        }
      });
  }, [session, loading]);

  return <Slot />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
