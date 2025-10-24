import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Header } from '@/components/ui/header';

export default function UserSettingsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* Settings Content */}
      <main className="container mx-auto px-4 py-8">
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
              <CardContent>
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg
                      className="w-6 h-6 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                      />
                    </svg>
                  </div>
                  <p className="text-gray-600 mb-2">Business Information</p>
                  <p className="text-sm text-gray-500">
                    Coming soon: Business name, email, address, phone, and tax
                    ID management
                  </p>
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
              <CardContent>
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg
                      className="w-6 h-6 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                  </div>
                  <p className="text-gray-600 mb-2">Account Information</p>
                  <p className="text-sm text-gray-500">
                    Coming soon: Name, email, subscription, and account
                    preferences
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
