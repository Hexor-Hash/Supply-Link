import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WalletRecoveryDialog } from '@/components/wallet/WalletRecoveryDialog';

describe('WalletRecoveryDialog', () => {
  const onClose = vi.fn();
  const onRetry = vi.fn();
  const onReadOnly = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <WalletRecoveryDialog
        isOpen={false}
        onClose={onClose}
        onRetry={onRetry}
        onReadOnly={onReadOnly}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders recovery options when isOpen is true', () => {
    render(
      <WalletRecoveryDialog
        isOpen={true}
        onClose={onClose}
        onRetry={onRetry}
        onReadOnly={onReadOnly}
      />,
    );
    expect(screen.getByText('Wallet Unavailable')).toBeInTheDocument();
    expect(screen.getByText('Retry Connection')).toBeInTheDocument();
    expect(screen.getByText('Continue in Read-Only Mode')).toBeInTheDocument();
  });

  it('calls onRetry when retry button is clicked', () => {
    render(
      <WalletRecoveryDialog
        isOpen={true}
        onClose={onClose}
        onRetry={onRetry}
        onReadOnly={onReadOnly}
      />,
    );
    fireEvent.click(screen.getByText('Retry Connection'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('calls onReadOnly when read-only button is clicked', () => {
    render(
      <WalletRecoveryDialog
        isOpen={true}
        onClose={onClose}
        onRetry={onRetry}
        onReadOnly={onReadOnly}
      />,
    );
    fireEvent.click(screen.getByText('Continue in Read-Only Mode'));
    expect(onReadOnly).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when X button is clicked', () => {
    render(
      <WalletRecoveryDialog
        isOpen={true}
        onClose={onClose}
        onRetry={onRetry}
        onReadOnly={onReadOnly}
      />,
    );
    fireEvent.click(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows Freighter install guidance', () => {
    render(
      <WalletRecoveryDialog
        isOpen={true}
        onClose={onClose}
        onRetry={onRetry}
        onReadOnly={onReadOnly}
      />,
    );
    expect(screen.getByText("Don't have Freighter?")).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /freighter\.app/i })).toHaveAttribute(
      'href',
      'https://freighter.app',
    );
  });
});
