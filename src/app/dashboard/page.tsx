'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Clock, FolderOpen, TrendingUp } from 'lucide-react'

export default function DashboardPage() {
  const { user, loading, signOut, manualSignOut } = useAuth()
  const router = useRouter()
  const [isSigningOut, setIsSigningOut] = useState(false)

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true)
      
      // Set a timeout to force redirect if sign out takes too long
      const timeoutId = setTimeout(() => {
        console.log('Sign out timeout reached, forcing redirect')
        setIsSigningOut(false)
        router.push('/')
      }, 3000)
      
      await signOut()
      
      // Clear timeout if sign out completes normally
      clearTimeout(timeoutId)
      
      // Force redirect after sign out
      router.push('/')
    } catch (error) {
      console.error('Sign out failed, using manual fallback:', error)
      manualSignOut()
      router.push('/')
    } finally {
      setIsSigningOut(false)
    }
  }

  const handleManualSignOut = () => {
    console.log('Manual sign out triggered from dashboard')
    manualSignOut()
    router.push('/')
  }

  // Auth redirect effect - only handle redirects, let auth context handle profile creation
  useEffect(() => {
    if (!loading && !user && !isSigningOut) {
      console.log('No user found, redirecting to signin')
      router.push('/auth/signin')
    }
  }, [loading, user, router, isSigningOut])



  // Show loading screen only when auth context is loading
  if (loading && !isSigningOut) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // If signing out, show signing out state instead of loading
  if (isSigningOut) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Signing out...</p>
            <Button 
              onClick={handleManualSignOut} 
              variant="ghost" 
              size="sm" 
              className="mt-4 text-red-600 hover:text-red-700"
            >
              Force Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!user) {
    return null // Will redirect to signin
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold text-gray-900">Orasan</span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-gray-600">Welcome, {user.user_metadata?.full_name || user.user_metadata?.name || user.email}</span>
            <Button onClick={handleSignOut} variant="outline" disabled={isSigningOut}>
              {isSigningOut ? 'Signing Out...' : 'Sign Out'}
            </Button>
            {isSigningOut && (
              <Button onClick={handleManualSignOut} variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                Force Sign Out
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Dashboard Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-gray-600">Track your time and manage your projects</p>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">
                No projects yet
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Time Today</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0h 0m</div>
              <p className="text-xs text-muted-foreground">
                No time tracked today
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Week</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0h 0m</div>
              <p className="text-xs text-muted-foreground">
                No time tracked this week
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Get started with your first project
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button className="w-full">
              Create New Project
            </Button>
            <Button variant="outline" className="w-full">
              Start Time Tracking
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
