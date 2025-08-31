import { useEffect } from "react";
import { useRouter } from "next/router";
import { setToken } from "../../lib/api";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    // When the page loads, check if there's a token in the URL
    if (router.isReady) {
      const { token } = router.query;
      if (token) {
        // If there is, save it and redirect to the dashboard
        setToken(token);
        router.push("/admin");
      } else {
        // If not, something went wrong, send back to login
        router.push("/admin/login");
      }
    }
  }, [router.isReady, router.query, router]);

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <p>Authenticating, please wait...</p>
    </div>
  );
}
