'use client'

import Link from 'next/link'
import { Clock, FolderOpen, Shield, Wifi, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/contexts/auth-context'
import { useState } from 'react'

export default function HomePage() {
  const { user, signOut, manualSignOut } = useAuth()
  const [isSigningOut, setIsSigningOut] = useState(false)

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true)
      await signOut()
    } catch (error) {
      console.error('Sign out failed, using manual fallback:', error)
      manualSignOut()
    } finally {
      setIsSigningOut(false)
    }
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
          <nav className="hidden md:flex items-center space-x-6">
            <Link href="#features" className="text-gray-600 hover:text-gray-900 transition-colors">
              Features
            </Link>
            <Link href="#pricing" className="text-gray-600 hover:text-gray-900 transition-colors">
              Pricing
            </Link>
            {user ? (
              <>
                <Link href="/dashboard">
                  <Button variant="outline">Dashboard</Button>
                </Link>
                <Button onClick={handleSignOut} variant="ghost" disabled={isSigningOut}>
                  {isSigningOut ? 'Signing Out...' : 'Sign Out'}
                </Button>
              </>
            ) : (
              <>
                <Link href="/auth/signin">
                  <Button variant="outline">Sign In</Button>
                </Link>
                <Link href="/auth/register">
                  <Button>Get Started</Button>
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Track Time,{' '}
            <span className="text-blue-600">Boost Productivity</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Orasan is a Filipino-inspired time tracking app designed for freelancers. 
            Manage projects, track tasks, and stay productive with our offline-first approach.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {user ? (
              <Link href="/dashboard">
                <Button size="lg" className="text-lg px-8 py-6">
                  Go to Dashboard
                </Button>
              </Link>
            ) : (
              <Link href="/auth/register">
                <Button size="lg" className="text-lg px-8 py-6">
                  Start Free Trial
                </Button>
              </Link>
            )}
            <Link href="#demo">
              <Button variant="outline" size="lg" className="text-lg px-8 py-6">
                Watch Demo
              </Button>
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div id="features" className="mt-24 grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <Clock className="h-12 w-12 text-blue-600 mb-4" />
              <CardTitle>Smart Time Tracking</CardTitle>
              <CardDescription>
                Start, stop, and pause timers with ease. Track time spent on tasks and projects automatically.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <FolderOpen className="h-12 w-12 text-green-600 mb-4" />
              <CardTitle>Project Management</CardTitle>
              <CardDescription>
                Organize your work with projects and tasks. Set hourly rates and track client work efficiently.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <Shield className="h-12 w-12 text-purple-600 mb-4" />
              <CardTitle>Privacy First</CardTitle>
              <CardDescription>
                Your data is protected with row-level security. Full control over your information.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <Wifi className="h-12 w-12 text-orange-600 mb-4" />
              <CardTitle>Offline Capable</CardTitle>
              <CardDescription>
                Work without internet. Your data syncs automatically when connection is restored.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <Zap className="h-12 w-12 text-yellow-600 mb-4" />
              <CardTitle>Lightning Fast</CardTitle>
              <CardDescription>
                Built with Next.js 15 and modern technologies for the best performance.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <div className="h-12 w-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-lg mb-4">
                $
              </div>
              <CardTitle>Subscription Ready</CardTitle>
              <CardDescription>
                Free tier available. Upgrade to Pro for unlimited projects and advanced features.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white/80 backdrop-blur-sm mt-24">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-gray-600">
            <p>&copy; 2025 Orasan. Built with ❤️ for freelancers everywhere.</p>
            <p className="mt-2">
              <Link href="/license" className="text-blue-600 hover:underline">
                MIT License
              </Link>
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
