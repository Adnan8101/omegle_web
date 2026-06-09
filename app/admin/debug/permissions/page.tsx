'use client';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
export default function DebugPermissionsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [apiResult, setApiResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const testPermissions = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/debug/permissions');
      const data = await res.json();
      setApiResult(data);
    } catch (error) {
      setApiResult({ error: String(error) });
    } finally {
      setLoading(false);
    }
  };
  const forceRefresh = async () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {}
    await signOut({ redirect: false });
    router.push('/admin');
  };
  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">🔧 Permission Debug Tool</h1>
        <div className="bg-gray-800 rounded-lg p-6 space-y-4">
          <h2 className="text-xl font-semibold">Session Status</h2>
          <div className="space-y-2">
            <div><strong>Status:</strong> <span className={status === 'authenticated' ? 'text-green-400' : 'text-red-400'}>{status}</span></div>
            <div><strong>User ID:</strong> {session?.user?.id || 'N/A'}</div>
            <div><strong>Has Access Token:</strong> {session?.accessToken ? '✅ Yes' : '❌ No'}</div>
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-6 space-y-4">
          <h2 className="text-xl font-semibold">Permissions</h2>
          <pre className="bg-gray-900 p-4 rounded overflow-auto text-sm">
            {JSON.stringify(session?.user?.permissions, null, 2)}
          </pre>
        </div>
        <div className="bg-gray-800 rounded-lg p-6 space-y-4">
          <h2 className="text-xl font-semibold">API Test</h2>
          <button
            onClick={testPermissions}
            disabled={loading || status !== 'authenticated'}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Test Permission Fetch'}
          </button>
          {apiResult && (
            <pre className="bg-gray-900 p-4 rounded overflow-auto text-sm">
              {JSON.stringify(apiResult, null, 2)}
            </pre>
          )}
        </div>
        <div className="bg-gray-800 rounded-lg p-6 space-y-4">
          <h2 className="text-xl font-semibold">Actions</h2>
          <div className="flex gap-4">
            <button
              onClick={forceRefresh}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded"
            >
              🔄 Force Sign Out & Refresh
            </button>
            <button
              onClick={() => router.push('/admin/casino')}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded"
            >
              Go to Casino Dashboard
            </button>
          </div>
        </div>
        <div className="bg-yellow-900/50 border border-yellow-600 rounded-lg p-6 space-y-2">
          <h3 className="font-semibold">💡 How to Fix</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Click "Force Sign Out & Refresh"</li>
            <li>Sign in again with Discord</li>
            <li>Check if permissions are populated</li>
            <li>If still empty, check Discord OAuth app settings</li>
          </ol>
        </div>
      </div>
    </div>
  );
}