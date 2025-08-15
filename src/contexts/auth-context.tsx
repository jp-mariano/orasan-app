'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (provider: 'github' | 'google' | 'twitter') => Promise<void>
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const createOrUpdateUserProfile = useCallback(async (user: User) => {
    try {
      console.log('Creating/updating user profile for:', user.email)
      console.log('User metadata:', user.user_metadata)
      console.log('User ID:', user.id)
      
      // First check if user profile already exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .single()

      if (existingUser) {
        console.log('User profile already exists, skipping creation')
        return
      }
      
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
      } else {
        console.log('User profile created/updated successfully')
      }
    } catch (error) {
      console.error('Error in createOrUpdateUserProfile:', error)
    }
  }, [supabase])

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
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)

        // Only create profile for initial sign-in, not for session refreshes
        if (event === 'SIGNED_IN' && session?.user) {
          try {
            await createOrUpdateUserProfile(session.user)
          } catch (error) {
            console.error('Error creating user profile after sign in:', error)
          }
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase.auth, createOrUpdateUserProfile])

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

  const signOut = async () => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Error signing out:', error)
        throw error
      }
    } catch (error) {
      console.error('Sign out error:', error)
      throw error
    } finally {
      setLoading(false)
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
