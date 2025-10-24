'use client';

import { useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';

import { Breadcrumb } from '@/components/ui/breadcrumb';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Header } from '@/components/ui/header';
import { InlineEdit } from '@/components/ui/inline-edit';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/auth-context';
import { useUser } from '@/hooks/useUser';
import { validateEmail, validatePhone } from '@/lib/validation';

export default function UserSettingsPage() {
  const { user: authUser, loading: authLoading } = useAuth();
  const { user, loading, error, updateUser } = useUser();
  const router = useRouter();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Auth redirect effect
  useEffect(() => {
    if (!authLoading && !authUser) {
      router.push('/auth/signin');
    }
  }, [authLoading, authUser, router]);

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
                {/* Business Name */}
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

                {/* Business Email */}
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

                {/* Business Phone */}
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

                {/* Tax ID */}
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
                {/* Name */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-500">
                    Display Name
                  </Label>
                  <InlineEdit
                    value={user?.name || ''}
                    onSave={async value => await handleSaveField('name', value)}
                    onError={error =>
                      setFieldErrors(prev => ({ ...prev, name: error }))
                    }
                    error={fieldErrors.name}
                    placeholder="Enter your name"
                  />
                </div>

                {/* Email (Read-only) */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-500">
                    Email
                  </Label>
                  <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-600">
                    {user?.email || 'No email available'}
                  </div>
                  <p className="text-xs text-red-600 font-medium">
                    This email cannot be changed here. It is managed by your
                    OAuth provider (GitHub, Google, etc.). To change this email,
                    update it in your provider account settings.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
