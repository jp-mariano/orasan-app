'use client'

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (provider: 'github' | 'google' | 'twitter') => Promise<void>
  signOut: () => Promise<void>
  manualSignOut: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const supabase = createClient()
  const profileCreationAttempted = useRef<Set<string>>(new Set())

  const createOrUpdateUserProfile = useCallback(async (user: User) => {
    // Prevent duplicate profile creation attempts for the same user
    if (profileCreationAttempted.current.has(user.id)) {
      return
    }

    // Mark as attempted immediately to prevent duplicates
    profileCreationAttempted.current.add(user.id)

    try {
      // Use our API route to create/update user profile
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: user.email,
          name: user.user_metadata?.full_name || user.user_metadata?.name || null
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Error creating/updating user profile:', errorData.error)
      }
    } catch (error) {
      console.error('Error in createOrUpdateUserProfile:', error)
    }
  }, [])

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        setSession(session)
        setUser(session?.user ?? null)
        
        // If user is already signed in, ensure profile exists
        if (session?.user) {
          await createOrUpdateUserProfile(session.user)
        }
      } catch (error) {
        console.error('Error getting initial session:', error)
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          setSession(null)
          setUser(null)
          setLoading(false)
          setIsSigningOut(false)
          // Clear profile creation attempts when user signs out
          profileCreationAttempted.current.clear()
        } else if (event === 'SIGNED_IN' && session?.user) {
          setSession(session)
          setUser(session.user)
          setLoading(false)
          // Only create profile for initial sign-in, not for session refreshes
          await createOrUpdateUserProfile(session.user)
        } else if (event === 'TOKEN_REFRESHED') {
          // Don't change loading state for token refreshes
          if (session) {
            setSession(session)
            setUser(session.user)
          }
        } else if (event === 'USER_UPDATED') {
          if (session) {
            setSession(session)
            setUser(session.user)
          }
          if (!isSigningOut) {
            setLoading(false)
          }
        } else {
          // For other events, update state but don't change loading
          setSession(session)
          setUser(session?.user ?? null)
          if (!isSigningOut) {
            setLoading(false)
          }
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase.auth, createOrUpdateUserProfile, isSigningOut])

  const signIn = async (provider: 'github' | 'google' | 'twitter') => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      })

      if (error) {
        console.error('Error signing in:', error)
        throw error
      }
    } catch (error) {
      console.error('Sign in error:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const manualSignOut = useCallback(() => {
    setIsSigningOut(false)
    setLoading(false)
    setUser(null)
    setSession(null)
    profileCreationAttempted.current.clear()
  }, [])

  const signOut = async () => {
    try {
      setIsSigningOut(true)
      setLoading(true)
      
      // Clear cookies manually as a backup
      document.cookie.split(";").forEach(function(c) { 
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
      });
      
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Error signing out:', error)
        throw error
      }
      
      // Set a timeout to ensure loading state is cleared even if auth state change doesn't fire
      setTimeout(() => {
        if (isSigningOut) {
          manualSignOut()
        }
      }, 2000) // Reduced to 2 second timeout
      
      // Also check if we're still signed in after a short delay
      setTimeout(async () => {
        if (isSigningOut) {
          try {
            const { data: { user: currentUser } } = await supabase.auth.getUser()
            if (!currentUser) {
              manualSignOut()
            } else {
              manualSignOut()
            }
          } catch {
            manualSignOut()
          }
        }
      }, 1000)
      
      // Don't set loading to false here - let the auth state change handler do it
    } catch (error) {
      console.error('Sign out error:', error)
      // Fallback to manual sign out on error
      manualSignOut()
      throw error
    }
  }

  const refreshUser = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error) {
        console.error('Error refreshing user:', error)
        return
      }
      setUser(user)
    } catch (error) {
      console.error('Error in refreshUser:', error)
    }
  }

  const value: AuthContextType = {
    user,
    session,
    loading,
    signIn,
    signOut,
    manualSignOut,
    refreshUser
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
