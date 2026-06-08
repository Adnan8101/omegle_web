'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  FiChevronLeft,
  FiChevronRight,
  FiRefreshCw,
  FiFilter,
  FiX,
} from 'react-icons/fi';

interface AutoModLog {
  id: string;
  guild_id: string;
  user_id: string;
  channel_id: string;
  rule_name: string;
  rule_type: string;
  reason: string;
  message_content?: string;
  action_summary: string;
  created_at: string;
}

interface GuildInfo {
  id: string;
  name: string;
}

export default function AutoModLogsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [logs, setLogs] = useState<AutoModLog[]>([]);
  const [guilds, setGuilds] = useState<GuildInfo[]>([]);
  const [selectedGuild, setSelectedGuild] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({ userId: '', ruleName: '' });
  const [showFilters, setShowFilters] = useState(false);

  
  useEffect(() => {
    if (!session?.user?.id) return;

    const loadGuilds = async () => {
      try {
        const res = await fetch('/api/automod/guilds');
        const data = await res.json();
        if (data.data?.length > 0) {
          setGuilds(data.data);
          setSelectedGuild(data.data[0].id);
        }
      } catch (err) {
        console.error('Failed to load guilds:', err);
      }
    };

    loadGuilds();
  }, [session]);

  
  useEffect(() => {
    if (!selectedGuild) return;

    const loadLogs = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          guild_id: selectedGuild,
          limit: pageSize.toString(),
          offset: ((page - 1) * pageSize).toString(),
          ...(filters.userId && { user_id: filters.userId }),
          ...(filters.ruleName && { rule_name: filters.ruleName }),
        });

        const res = await fetch(`/api/automod/logs?${params}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || 'Failed to load logs');
          return;
        }

        setLogs(data.data || []);
        setTotal(data.pagination?.total || 0);
      } catch (err) {
        setError('Failed to fetch automod logs');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadLogs();
  }, [selectedGuild, page, pageSize, filters]);

  if (!session) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-400">Please sign in</p>
      </div>
    );
  }

  const totalPages = Math.ceil(total / pageSize);
  const guild = guilds.find(g => g.id === selectedGuild);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-700 rounded transition"
          title="Go back"
        >
          <FiChevronLeft size={20} />
        </button>
        <h1 className="text-3xl font-bold text-white">AutoMod Logs</h1>
      </div>

      {}
      <div className="bg-gray-800 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1">
            <label className="text-gray-300 text-sm mb-2 block">Guild</label>
            <select
              value={selectedGuild}
              onChange={(e) => {
                setSelectedGuild(e.target.value);
                setPage(1);
              }}
              className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600 focus:border-blue-500 outline-none"
            >
              <option value="">Select a guild...</option>
              {guilds.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={() => setPage(1)}
              className="p-2 bg-blue-600 hover:bg-blue-700 rounded transition text-white"
              title="Refresh logs"
            >
              <FiRefreshCw size={18} />
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="p-2 bg-gray-700 hover:bg-gray-600 rounded transition text-white"
              title="Toggle filters"
            >
              <FiFilter size={18} />
            </button>
          </div>
        </div>

        {}
        {showFilters && (
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-700">
            <div>
              <label className="text-gray-300 text-sm mb-2 block">User ID</label>
              <input
                type="text"
                value={filters.userId}
                onChange={(e) => {
                  setFilters(f => ({ ...f, userId: e.target.value }));
                  setPage(1);
                }}
                placeholder="Filter by user ID..."
                className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600 focus:border-blue-500 outline-none text-sm"
              />
            </div>
            <div>
              <label className="text-gray-300 text-sm mb-2 block">Rule Name</label>
              <input
                type="text"
                value={filters.ruleName}
                onChange={(e) => {
                  setFilters(f => ({ ...f, ruleName: e.target.value }));
                  setPage(1);
                }}
                placeholder="Filter by rule name..."
                className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600 focus:border-blue-500 outline-none text-sm"
              />
            </div>
            {(filters.userId || filters.ruleName) && (
              <button
                onClick={() => {
                  setFilters({ userId: '', ruleName: '' });
                  setPage(1);
                }}
                className="col-span-2 p-2 bg-gray-700 hover:bg-gray-600 rounded transition text-white text-sm flex items-center justify-center gap-2"
              >
                <FiX size={16} /> Clear Filters
              </button>
            )}
          </div>
        )}
      </div>

      {}
      {!loading && logs.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <p className="text-gray-300 text-sm">
            Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} logs
          </p>
        </div>
      )}

      {}
      {error && (
        <div className="bg-red-900 text-red-200 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      {}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-gray-800 rounded-lg p-8 text-center text-gray-400">
          No automod logs found for this guild
        </div>
      ) : (
        <>
          {}
          <div className="overflow-x-auto bg-gray-800 rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-gray-900 border-b border-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-gray-300">User</th>
                  <th className="px-4 py-3 text-left text-gray-300">Rule</th>
                  <th className="px-4 py-3 text-left text-gray-300">Reason</th>
                  <th className="px-4 py-3 text-left text-gray-300">Action</th>
                  <th className="px-4 py-3 text-left text-gray-300">Channel</th>
                  <th className="px-4 py-3 text-left text-gray-300">Time</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-gray-700 hover:bg-gray-700/50 transition">
                    <td className="px-4 py-3 text-blue-400">
                      <a
                        href={`https://discord.com/users/${log.user_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                      >
                        {log.user_id}
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      <span className="bg-gray-700 px-2 py-1 rounded text-xs text-gray-200">
                        {log.rule_name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-300 max-w-xs truncate">
                      {log.reason}
                    </td>
                    <td className="px-4 py-3">
                      <span className="bg-red-900 text-red-200 px-2 py-1 rounded text-xs">
                        {log.action_summary}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {log.channel_id}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {new Date(log.created_at).toLocaleDateString()} {new Date(log.created_at).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {}
          <div className="flex items-center justify-between mt-6">
            <div className="flex items-center gap-2">
              <label className="text-gray-300 text-sm">per page:</label>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(parseInt(e.target.value));
                  setPage(1);
                }}
                className="bg-gray-700 text-white rounded px-2 py-1 border border-gray-600 text-sm"
              >
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded transition text-white"
              >
                <FiChevronLeft size={18} />
              </button>

              <span className="text-gray-300 text-sm px-4">
                Page {page} of {totalPages}
              </span>

              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded transition text-white"
              >
                <FiChevronRight size={18} />
              </button>
            </div>

            <div className="text-gray-400 text-sm">
              Total: {total} logs
            </div>
          </div>
        </>
      )}
    </div>
  );
}
