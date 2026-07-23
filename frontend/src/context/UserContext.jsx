import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const UserContext = createContext(null);

/**
 * UserContext — global state shared across the entire app:
 * - currentUser (profile + entry test status)
 * - character (selected 3D character)
 * - englishLevel (from placement assessment: BEGINNER | ELEMENTARY | INTERMEDIATE | ADVANCED | null)
 * - candidateRemark (loaded once at login, used by AI bot)
 * - remarkContext (formatted string for system prompt injection)
 */
export function UserProvider({ children }) {
  const [currentUser,    setCurrentUser]    = useState(null);
  const [character,      setCharacter]      = useState('eva');
  const [entryLevel,     setEntryLevel]     = useState('beginner');
  const [candidateRemark, setCandidateRemark] = useState(null);
  const [remarkContext,  setRemarkContext]  = useState('');
  const [loading,        setLoading]        = useState(true);

  const loadUserData = useCallback(async () => {
    setLoading(true);
    try {
      const profileRes = await api.get('/auth/me');
      const profile = profileRes.data;
      setCurrentUser(profile);
      setCharacter(profile.character || 'eva');
      setEntryLevel(profile.entryLevel || 'beginner');

      // Start session tracking
      try { await api.post('/sessions/start'); } catch {}

      // Tab close / page unload — end session
      const handleUnload = () => {
        const aiTutorSecs = parseInt(sessionStorage.getItem('vrm_ai_tutor_secs') || '0');
        navigator.sendBeacon('/sessions/end', JSON.stringify({ aiTutorDuration: aiTutorSecs }));
      };
      window.addEventListener('beforeunload', handleUnload);

      const nameString = profile?.first_name ? `${profile.first_name} ${profile.last_name || ''}`.trim() : (profile?.name || profile?.username || '');
      const nameContext = nameString ? `Student Profile - Name: ${nameString}\nAlways address the student by their name (${profile?.first_name || nameString}).\n` : '';

      if (profile.hasCompletedEntryTest) {
        try {
          const [remarkRes, contextRes] = await Promise.all([
            api.get('/remarks/me'),
            api.get('/remarks/me/context'),
          ]);
          setCandidateRemark(remarkRes.data);
          setRemarkContext(nameContext + (contextRes.data?.context || ''));
        } catch {
          setRemarkContext(nameContext);
        }
      } else {
        setRemarkContext(nameContext);
      }
    } catch (err) {
      console.error('Failed to load user data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateCharacter = useCallback(async (newCharacter) => {
    try {
      await api.patch('/auth/character', { character: newCharacter });
      setCharacter(newCharacter);
      setCurrentUser(prev => prev ? { ...prev, character: newCharacter } : prev);
    } catch (err) {
      console.error('Failed to update character:', err);
      throw err;
    }
  }, []);

  const markEntryTestComplete = useCallback(() => {
    setCurrentUser(prev => prev ? { ...prev, hasCompletedEntryTest: true, isFirstLogin: false } : prev);
  }, []);

  const refreshUser = useCallback(async () => {
    await loadUserData();
  }, [loadUserData]);

  return (
    <UserContext.Provider value={{
      currentUser,
      character,
      entryLevel,
      candidateRemark,
      remarkContext,
      loading,
      setCurrentUser,
      updateCharacter,
      markEntryTestComplete,
      refreshUser,
      loadUserData,
    }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used inside <UserProvider>');
  return ctx;
}

export default UserContext;