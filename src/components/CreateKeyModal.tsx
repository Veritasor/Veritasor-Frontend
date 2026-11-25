import React, { useState, useEffect, useRef } from 'react';
import { ApiKey } from '../pages/ApiKeyManagement';

interface CreateKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (key: ApiKey) => void;
}

export const CreateKeyModal: React.FC<CreateKeyModalProps> = ({ isOpen, onClose, onCreated }) => {
  const [step, setStep] = useState<'configure' | 'reveal'>('configure');
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState<('read' | 'write' | 'admin')[]>(['read']);
  const [generatedKeyString, setGeneratedKeyString] = useState('');
  const [hasCopied, setHasCopied] = useState(false);

  const firstFocusRef = useRef<HTMLInputElement>(null);
  const copyBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setStep('configure');
    setName('');
    setScopes(['read']);
    setHasCopied(false);
    setTimeout(() => firstFocusRef.current?.focus(), 50);
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const pseudoRandomToken = `vts_live_${Math.random().toString(36).substring(2, 14)}${Math.random().toString(36).substring(2, 14)}`;
    setGeneratedKeyString(pseudoRandomToken);
    
    const spawnedKey: ApiKey = {
      id: `key_${Date.now()}`,
      name: name.trim(),
      prefix: `${pseudoRandomToken.substring(0, 12)}...`,
      scopes,
      status: 'active',
      createdAt: new Date().toISOString().split('T')[0],
      lastUsedAt: 'Never'
    };

    onCreated(spawnedKey);
    setStep('reveal');
  };

  const handleScopeToggle = (scope: 'read' | 'write' | 'admin') => {
    if (scopes.includes(scope)) {
      if (scopes.length > 1) setScopes(scopes.filter(s => s !== scope));
    } else {
      setScopes([...scopes, scope]);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedKeyString);
    setHasCopied(true);
    setTimeout(() => copyBtnRef.current?.focus(), 50);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs" role="dialog" aria-modal="true">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
        
        {step === 'configure' ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Generate API Authentication Token</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Configure client metadata scopes before minting keys.</p>
            </div>

            <div>
              <label htmlFor="key-name" className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300">Application Key Name</label>
              <input
                id="key-name"
                ref={firstFocusRef}
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. CI/CD Attestation Worker"
                className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-zinc-50 dark:focus:ring-zinc-50"
              />
            </div>

            <div>
              <span className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Scope Permissions Mapping</span>
              <div className="grid grid-cols-3 gap-2">
                {(['read', 'write', 'admin'] as const).map((scope) => (
                  <button
                    key={scope}
                    type="button"
                    onClick={() => handleScopeToggle(scope)}
                    aria-pressed={scopes.includes(scope)}
                    className={`rounded-lg border p-2.5 text-xs font-semibold uppercase tracking-wider transition-all ${
                      scopes.includes(scope)
                        ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
                        : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800'
                    }`}
                  >
                    {scope}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={onClose} className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">
                Cancel
              </button>
              <button type="submit" className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200">
                Generate Secret Token
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-5">
            <div className="border-l-4 border-amber-500 bg-amber-50 dark:bg-amber-950/20 p-4 rounded-r-lg text-amber-900 dark:text-amber-200">
              <h2 className="text-sm font-bold uppercase tracking-wider">Secret Token Storage Requirement</h2>
              <p className="text-xs mt-1 font-medium">
                Copy this credential string now. It will not be revealed again for security reasons.
              </p>
            </div>

            <div className="relative rounded-lg bg-zinc-950 p-4 border border-zinc-800">
              <input
                id="revealed-token"
                type="text"
                readOnly
                value={generatedKeyString}
                className="w-full bg-transparent font-mono text-xs pr-20 text-emerald-400 focus:outline-none border-none tracking-wider"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button
                ref={copyBtnRef}
                type="button"
                onClick={handleCopy}
                className="absolute right-2 top-2 rounded bg-zinc-800 px-2.5 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 dark:bg-zinc-800"
              >
                {hasCopied ? 'Copied!' : 'Copy'}
              </button>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                disabled={!hasCopied}
                onClick={onClose}
                className="w-full sm:w-auto rounded-lg bg-zinc-900 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                I Have Saved This Secret Token Safely
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};