'use client';

import { useEffect, useState } from 'react';
import { ExternalLink, LogOut, Eye } from 'lucide-react';
import { getWalletAddress, FreighterNotInstalledError } from '@/lib/stellar/client';
import { getWalletNetwork, isNetworkMatching } from '@/lib/stellar/network';
import { getXlmBalance, formatBalance } from '@/lib/stellar/balance';
import { accountUrl } from '@/lib/stellar/explorer';
import { useStore } from '@/lib/state/store';
import { FreighterNotInstalledModal } from './FreighterNotInstalledModal';
import { WalletRecoveryDialog } from './WalletRecoveryDialog';
import { recordDependency, recordOperation } from '@/lib/api/metrics';

export function WalletConnect() {
  const {
    walletAddress,
    setWalletAddress,
    xlmBalance,
    setXlmBalance,
    setNetworkMismatch,
    validateWalletConnection,
    disconnect,
  } = useStore();
  const [loading, setLoading] = useState(false);
  const [showFreighterModal, setShowFreighterModal] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [readOnly, setReadOnly] = useState(false);

  useEffect(() => {
    validateWalletConnection();
  }, [validateWalletConnection]);

  async function connect() {
    setLoading(true);
    setShowRecovery(false);
    try {
      const address = await getWalletAddress();
      setWalletAddress(address);
      setReadOnly(false);

      if (address) {
        const networkInfo = await getWalletNetwork();
        if (networkInfo && !isNetworkMatching(networkInfo.passphrase)) {
          setNetworkMismatch(true);
        } else {
          setNetworkMismatch(false);
        }

        try {
          const balance = await getXlmBalance(address);
          setXlmBalance(balance);
        } catch {
          // balance fetch failure is non-fatal
        }
      }
      recordDependency('freighter', true);
      recordOperation('wallet.connect', 'success');
    } catch (error) {
      recordDependency('freighter', false);
      recordOperation('wallet.connect_failed', 'failure');
      if (error instanceof FreighterNotInstalledError) {
        setShowFreighterModal(true);
      } else {
        // Transient failure — offer recovery
        setShowRecovery(true);
      }
    } finally {
      setLoading(false);
    }
  }

  function handleReadOnly() {
    setShowRecovery(false);
    setReadOnly(true);
  }

  function handleDisconnect() {
    setReadOnly(false);
    recordOperation('wallet.disconnect', 'success');
    disconnect();
  }

  if (walletAddress) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={() => window.open(accountUrl(walletAddress), '_blank', 'noopener,noreferrer')}
          className="text-sm font-mono text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 flex items-center gap-1 transition-colors"
          title="View on Stellar Expert"
        >
          {walletAddress.slice(0, 6)}…{walletAddress.slice(-4)}
          <ExternalLink size={14} />
        </button>
        {xlmBalance && (
          <span className="text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
            {formatBalance(xlmBalance)}
          </span>
        )}
        <button
          onClick={handleDisconnect}
          className="p-2 rounded hover:bg-[var(--muted-bg)] text-[var(--foreground)]"
          aria-label="Disconnect wallet"
          title="Disconnect wallet"
        >
          <LogOut size={18} />
        </button>
      </div>
    );
  }

  if (readOnly) {
    return (
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 px-2 py-1 rounded">
          <Eye size={12} />
          Read-only
        </span>
        <button
          onClick={() => {
            setReadOnly(false);
            connect();
          }}
          className="text-xs text-violet-600 hover:underline"
        >
          Connect wallet
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={connect}
        disabled={loading}
        className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm disabled:opacity-50 hover:bg-violet-700 transition-colors"
      >
        {loading ? 'Connecting…' : 'Connect Freighter'}
      </button>
      <FreighterNotInstalledModal
        isOpen={showFreighterModal}
        onClose={() => setShowFreighterModal(false)}
      />
      <WalletRecoveryDialog
        isOpen={showRecovery}
        onClose={() => setShowRecovery(false)}
        onRetry={connect}
        onReadOnly={handleReadOnly}
      />
    </>
  );
}
