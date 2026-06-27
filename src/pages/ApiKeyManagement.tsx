import React, { useState, useRef } from 'react';
import { CreateKeyModal } from '../components/CreateKeyModal';

export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  scopes: ('read' | 'write' | 'admin')[];
  status: 'active' | 'revoked';
  createdAt: string;
  lastUsedAt: string;
}

export const ApiKeyManagement: React.FC = () => {
  const [keys, setKeys] = useState<ApiKey[]>([
    {
      id: 'key_01',
      name: 'Production Read-Only Client',
      prefix: 'vts_live_7k2x...',
      scopes: ['read'],
      status: 'active',
      createdAt: '2026-05-12',
      lastUsedAt: '2026-06-24',
    },
    {
      id: 'key_02',
      name: 'CI/CD Automated Attestation Worker',
      prefix: 'vts_live_9p1m...',
      scopes: ['read', 'write'],
      status: 'active',
      createdAt: '2026-06-01',
      lastUsedAt: '2026-06-25',
    }
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const toastRef = useRef<HTMLDivElement>(null);

  const handleCreateSuccess = (newKey: ApiKey) => {
    setKeys((prev) => [newKey, ...prev]);
  };

  const handleRevoke = (id: string) => {
    const activeAdminKeys = keys.filter(k => k.status === 'active' && k.scopes.includes('admin'));
    const targetKey = keys.find(k => k.id === id);
    
    if (targetKey?.scopes.includes('admin') && activeAdminKeys.length <= 1) {
      alert('Security Protection Alert: Cannot revoke the last remaining administrator token.');
      return;
    }

    if (window.confirm('Are you absolutely sure you want to revoke this API key? This action is immediate and permanent.')) {
      setKeys((prev) =>
        prev.map((k) => (k.id === id ? { ...k, status: 'revoked' as const } : k))
      );
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-200 pb-5 dark:border-zinc-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">API Key Management</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Authenticate external software components with the Veritasor attestation pipeline.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="w-full sm:w-auto inline-flex justify-center items-center rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-600"
        >
          Create New Key
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm">
        <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800 text-left text-sm">
          <thead className="bg-zinc-50 dark:bg-zinc-900/50 text-zinc-500 dark:text-zinc-400 font-medium">
            <tr>
              <th scope="col" className="px-6 py-3.5">Name</th>
              <th scope="col" className="px-6 py-3.5">Secret Key Token</th>
              <th scope="col" className="px-6 py-3.5">Allowed Scopes</th>
              <th scope="col" className="px-6 py-3.5">Status</th>
              <th scope="col" className="px-6 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-700 dark:text-zinc-300">
            {keys.map((key) => (
              <tr key={key.id} className={key.status === 'revoked' ? 'opacity-50 bg-zinc-50/50 dark:bg-zinc-900/20' : ''}>
                <td className="px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100 max-w-xs truncate">
                  {key.name}
                </td>
                <td className="px-6 py-4 font-mono text-xs tracking-wider">
                  {key.prefix}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex gap-1.5">
                    {key.scopes.map(s => (
                      <span key={s} className="inline-flex items-center rounded-md bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-xs font-medium uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                        {s}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                    key.status === 'active' 
                      ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400' 
                      : 'bg-zinc-100 text-zinc-600 ring-zinc-500/20 dark:bg-zinc-800 dark:text-zinc-400'
                  }`}>
                    {key.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right whitespace-nowrap font-medium space-x-3">
                  {key.status === 'active' && (
                    <button
                      type="button"
                      onClick={() => handleRevoke(key.id)}
                      className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 focus:outline-none focus:underline"
                    >
                      Revoke
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div id="sr-toast-container" ref={toastRef} role="status" aria-live="polite" className="sr-only" />

      <CreateKeyModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={handleCreateSuccess}
      />
    </div>
  );
};