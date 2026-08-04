import { useEffect, useState } from "react";
import Onboarding from "./components/Onboarding";
import Dashboard from "./components/Dashboard";
import { api } from "./api";

const STORAGE_KEY = "buku-gizi:user-id";

export default function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const savedId = localStorage.getItem(STORAGE_KEY);
    if (!savedId) {
      setChecking(false);
      return;
    }
    api
      .getUser(savedId)
      .then((data) => setUser(data.user))
      .catch(() => localStorage.removeItem(STORAGE_KEY))
      .finally(() => setChecking(false));
  }, []);

  const handleOnboarded = (newUser) => {
    localStorage.setItem(STORAGE_KEY, String(newUser.id));
    setUser(newUser);
  };

  const handleSwitchProfile = () => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  };

  if (checking) return null;

  return user ? (
    <Dashboard user={user} onSwitchProfile={handleSwitchProfile} />
  ) : (
    <Onboarding onDone={handleOnboarded} />
  );
}
