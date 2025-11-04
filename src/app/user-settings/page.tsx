'use client';

import { useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';

import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { DeletionStatus } from '@/components/ui/deletion-status';
import { Header } from '@/components/ui/header';
import { InlineEdit } from '@/components/ui/inline-edit';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/auth-context';
import { useAccountDeletion } from '@/hooks/useAccountDeletion';
import { useDataExport } from '@/hooks/useDataExport';
import { useUser } from '@/hooks/useUser';
import { validateEmail, validatePhone } from '@/lib/validation';

export default function UserSettingsPage() {
  const { user: authUser, loading: authLoading } = useAuth();
  const { user, loading, error, updateUser, refreshUser } = useUser();
  const router = useRouter();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Account deletion state
  const {
    isDeleting,
    error: deletionError,
    requestAccountDeletion,
  } = useAccountDeletion();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState('');

  // Data export
  const {
    isExporting,
    error: exportError,
    retryAfter,
    exportUserData,
  } = useDataExport();
  const [includeActivityLog, setIncludeActivityLog] = useState(false);
  const [timeUntilRetry, setTimeUntilRetry] = useState<string | null>(null);

  // Auth redirect effect
  useEffect(() => {
    if (!authLoading && !authUser) {
      router.push('/auth/signin');
    }
  }, [authLoading, authUser, router]);

  // Update time until retry countdown
  useEffect(() => {
    if (!retryAfter) {
      setTimeUntilRetry(null);
      return;
    }

    const updateCountdown = () => {
      const now = new Date();
      const diff = retryAfter.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeUntilRetry(null);
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (hours > 0) {
        setTimeUntilRetry(`${hours}h ${minutes}m`);
      } else if (minutes > 0) {
        setTimeUntilRetry(`${minutes}m ${seconds}s`);
      } else {
        setTimeUntilRetry(`${seconds}s`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [retryAfter]);

  // Handle account deletion
  const handleDeleteAccount = async () => {
    if (!authUser || !user) return;

    const success = await requestAccountDeletion(
      authUser.id,
      authUser.email || ''
    );
    if (success) {
      setShowDeleteConfirm(false);
      setConfirmEmail('');
      // Refresh user data to get updated deletion status
      await refreshUser();
    }
  };

  // Handle field updates
  const handleSaveField = async (
    field: string,
    value: string | number | null
  ): Promise<void> => {
    try {
      setFieldErrors(prev => ({ ...prev, [field]: '' }));

      // Validate email if it's the business_email field
      if (field === 'business_email' && typeof value === 'string') {
        const emailError = validateEmail(value);
        if (emailError) {
          setFieldErrors(prev => ({ ...prev, [field]: emailError }));
          throw new Error(emailError);
        }
      }

      // Validate phone if it's the business_phone field
      if (field === 'business_phone' && typeof value === 'string') {
        const phoneError = validatePhone(value);
        if (phoneError) {
          setFieldErrors(prev => ({ ...prev, [field]: phoneError }));
          throw new Error(phoneError);
        }
      }

      const success = await updateUser({ [field]: value || '' });
      if (!success) {
        throw new Error('Failed to update field');
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to update field';
      setFieldErrors(prev => ({ ...prev, [field]: errorMessage }));
      throw err;
    }
  };

  // Show loading screen
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="animate-pulse space-y-6">
              <div className="h-8 bg-gray-200 rounded w-1/4"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Redirect if not authenticated
  if (!authUser) {
    return null;
  }

  // Show error if user data failed to load
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-6">
                <p className="text-red-600">{error}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* Settings Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <Breadcrumb
          items={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'User Settings', href: '/user-settings' },
          ]}
          className="mb-6"
        />

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            User Settings
          </h1>
        </div>

        <div className="space-y-6">
          {/* Business Information Section */}
          <div>
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-gray-900">
                Business Information
              </h2>
              <p className="text-gray-600">
                Your business details for invoicing and professional
                communication
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Business Profile</CardTitle>
                <CardDescription>
                  This information will appear on your invoices and professional
                  documents
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Business Name and Email */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-500">
                      Business Name
                    </Label>
                    <InlineEdit
                      value={user?.business_name || ''}
                      onSave={async value =>
                        await handleSaveField('business_name', value)
                      }
                      onError={error =>
                        setFieldErrors(prev => ({
                          ...prev,
                          business_name: error,
                        }))
                      }
                      error={fieldErrors.business_name}
                      placeholder="Enter your business name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-500">
                      Business Email
                    </Label>
                    <InlineEdit
                      value={user?.business_email || ''}
                      onSave={async value =>
                        await handleSaveField('business_email', value)
                      }
                      onError={error =>
                        setFieldErrors(prev => ({
                          ...prev,
                          business_email: error,
                        }))
                      }
                      error={fieldErrors.business_email}
                      placeholder="Enter your business email"
                    />
                  </div>
                </div>

                {/* Business Address */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-500">
                    Business Address
                  </Label>
                  <InlineEdit
                    value={user?.business_address || ''}
                    onSave={async value =>
                      await handleSaveField('business_address', value)
                    }
                    onError={error =>
                      setFieldErrors(prev => ({
                        ...prev,
                        business_address: error,
                      }))
                    }
                    error={fieldErrors.business_address}
                    placeholder="Enter your business address"
                  />
                </div>

                {/* Business Phone and Tax ID */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-500">
                      Business Phone
                    </Label>
                    <InlineEdit
                      value={user?.business_phone || ''}
                      onSave={async value =>
                        await handleSaveField('business_phone', value)
                      }
                      onError={error =>
                        setFieldErrors(prev => ({
                          ...prev,
                          business_phone: error,
                        }))
                      }
                      error={fieldErrors.business_phone}
                      placeholder="Enter your business phone number"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-500">
                      Tax ID
                    </Label>
                    <InlineEdit
                      value={user?.tax_id || ''}
                      onSave={async value =>
                        await handleSaveField('tax_id', value)
                      }
                      onError={error =>
                        setFieldErrors(prev => ({ ...prev, tax_id: error }))
                      }
                      error={fieldErrors.tax_id}
                      placeholder="Enter your tax ID"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Account Information Section */}
          <div>
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-gray-900">
                Account Information
              </h2>
              <p className="text-gray-600">
                Your personal account details and preferences
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Account Profile</CardTitle>
                <CardDescription>
                  Manage your personal account information and preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Display Name and Email */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-500">
                      Display Name
                    </Label>
                    <InlineEdit
                      value={user?.name || ''}
                      onSave={async value =>
                        await handleSaveField('name', value)
                      }
                      onError={error =>
                        setFieldErrors(prev => ({ ...prev, name: error }))
                      }
                      error={fieldErrors.name}
                      placeholder="Enter your name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-500">
                      Email
                    </Label>
                    <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-600">
                      {user?.email || 'No email available'}
                    </div>
                    <p className="text-xs text-blue-800 font-medium">
                      This email cannot be changed here. It is managed by your
                      OAuth provider (GitHub, Google, etc.). To change this
                      email, update it in your provider account settings.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Account Deletion Section */}
          <div>
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-gray-900">
                Account Management
              </h2>
              <p className="text-gray-600">Manage your account and data</p>
            </div>

            {/* Data Export Card */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Download your data</CardTitle>
                <CardDescription>
                  Export your projects, tasks, time entries, work sessions, and
                  invoices as JSON and CSV.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {exportError && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-3">
                      <p className="text-red-700 text-sm font-medium">
                        {exportError}
                      </p>
                      {retryAfter && timeUntilRetry && (
                        <p className="text-red-600 text-xs mt-1">
                          You can try again in {timeUntilRetry}
                        </p>
                      )}
                    </div>
                  )}
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="includeActivityLog"
                      checked={includeActivityLog}
                      onChange={e => setIncludeActivityLog(e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      disabled={isExporting || !!retryAfter}
                    />
                    <Label
                      htmlFor="includeActivityLog"
                      className={`text-sm font-normal ${
                        isExporting || retryAfter
                          ? 'text-gray-400'
                          : 'cursor-pointer'
                      }`}
                    >
                      Include activity log (may be large)
                    </Label>
                  </div>
                  <Button
                    onClick={() => exportUserData(includeActivityLog)}
                    disabled={isExporting || !!retryAfter}
                  >
                    {isExporting
                      ? 'Preparing export…'
                      : retryAfter
                        ? `Try again in ${timeUntilRetry || '...'}`
                        : 'Download My Data'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Show deletion status if there's a pending deletion */}
            {user &&
              (user.deletion_requested_at || user.deletion_confirmed_at) && (
                <div className="mb-6">
                  <DeletionStatus
                    user={user}
                    onCancelled={async () => {
                      await refreshUser();
                    }}
                  />
                </div>
              )}

            {/* Delete Account Card */}
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="text-red-800">Delete Account</CardTitle>
                <CardDescription className="text-red-700">
                  Permanently delete your account and all associated data. This
                  action cannot be undone.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-red-50 border border-red-200 rounded-md p-4">
                    <h4 className="text-red-800 font-medium text-sm mb-2">
                      What happens when you delete your account:
                    </h4>
                    <ul className="text-red-700 text-sm space-y-1">
                      <li>
                        • All your projects, tasks, and time entries will be
                        permanently deleted
                      </li>
                      <li>
                        • All active timers will be paused before deletion
                      </li>
                      <li>
                        • Your account will be marked for deletion with a 7-day
                        grace period
                      </li>
                    </ul>
                  </div>

                  {deletionError && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-3">
                      <p className="text-red-700 text-sm">{deletionError}</p>
                    </div>
                  )}

                  {!showDeleteConfirm ? (
                    <Button
                      variant="destructive"
                      onClick={() => setShowDeleteConfirm(true)}
                      disabled={isDeleting || !!user?.deletion_requested_at}
                    >
                      Delete My Account
                    </Button>
                  ) : (
                    <div className="space-y-4">
                      <div className="rounded-md p-4">
                        <h4 className="font-medium text-sm">
                          To confirm deletion, please enter your email address
                          exactly as shown:
                        </h4>
                        <div className="my-1 space-y-2">
                          <div>
                            <input
                              type="email"
                              value={confirmEmail}
                              onChange={e => setConfirmEmail(e.target.value)}
                              placeholder={authUser?.email}
                              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                            />
                          </div>
                        </div>
                        <p className="text-blue-800 text-xs">
                          <strong>Important:</strong> After confirming deletion,
                          you&apos;ll receive an email with a confirmation link.
                          You can cancel the deletion anytime during the 7-day
                          grace period by clicking the &quot;Cancel
                          Deletion&quot; button that will appear on this page.
                        </p>
                      </div>
                      <div className="flex gap-3">
                        <Button
                          variant="destructive"
                          onClick={handleDeleteAccount}
                          disabled={
                            isDeleting || confirmEmail !== authUser?.email
                          }
                        >
                          {isDeleting
                            ? 'Deleting Account...'
                            : 'Yes, Delete My Account'}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowDeleteConfirm(false);
                            setConfirmEmail('');
                          }}
                          disabled={isDeleting}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
