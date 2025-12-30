import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { GlassCard } from "@/components/ui/glass-card";
import { MaterialIcon } from "@/components/ui/material-icon";
import { useLastFmAuth } from "@/contexts/LastFmAuthContext";

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { handleCallback } = useLastFmAuth();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      setStatus("error");
      setError("No authentication token received");
      return;
    }

    handleCallback(token)
      .then((success) => {
        if (success) {
          setStatus("success");
          setTimeout(() => navigate("/"), 1500);
        } else {
          setStatus("error");
          setError("Authentication failed");
        }
      })
      .catch(() => {
        setStatus("error");
        setError("An unexpected error occurred");
      });
  }, [searchParams, handleCallback, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <GlassCard className="w-full max-w-sm p-8 text-center">
        {status === "loading" && (
          <>
            <MaterialIcon
              name="progress_activity"
              size="xl"
              className="mx-auto animate-spin text-primary"
            />
            <h1 className="mt-4 text-xl font-bold">Connecting to Last.fm</h1>
            <p className="mt-2 text-sm text-muted-foreground">Please wait...</p>
          </>
        )}

        {status === "success" && (
          <>
            <MaterialIcon
              name="check_circle"
              size="xl"
              className="mx-auto text-green-500"
            />
            <h1 className="mt-4 text-xl font-bold">Connected!</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Redirecting to app...
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <MaterialIcon
              name="error"
              size="xl"
              className="mx-auto text-destructive"
            />
            <h1 className="mt-4 text-xl font-bold">Connection Failed</h1>
            <p className="mt-2 text-sm text-muted-foreground">{error}</p>
            <button
              onClick={() => navigate("/")}
              className="mt-4 text-sm font-medium text-primary hover:underline"
            >
              Return to app
            </button>
          </>
        )}
      </GlassCard>
    </div>
  );
}
