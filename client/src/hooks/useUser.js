// Keeps track of the signed-in user.
// Only the user's id is saved in the browser; the profile always comes from the server.
import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

const STORAGE_KEY = 'eventTrackerUserId';

export function useUser() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On page load: if we saved a user id before, load that profile
  useEffect(() => {
    const savedId = localStorage.getItem(STORAGE_KEY);
    if (!savedId) {
      setLoading(false);
      return;
    }
    api
      .getUser(savedId)
      .then((data) => setUser(data.user))
      .catch(() => localStorage.removeItem(STORAGE_KEY)) // user no longer exists
      .finally(() => setLoading(false));
  }, []);

  async function login(name, email, city) {
    const data = await api.login(name, email, city);
    localStorage.setItem(STORAGE_KEY, data.user.id);
    setUser(data.user);
  }

  async function updateProfile(updates) {
    const data = await api.updateUser(user.id, updates);
    setUser(data.user);
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }

  return { user, loading, login, updateProfile, logout };
}
