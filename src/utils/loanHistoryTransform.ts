import { LoanEvent } from '../services/loanService';
import { formatEther } from 'ethers/lib/utils';

/**
 * Loan history item format expected by the UI
 */
export interface UILoanHistoryItem {
  id: string | number;
  type: 'borrow' | 'repay' | 'roll' | 'add_collateral';
  user: string;
  amount?: number;
  duration?: number;
  collateral?: number;
  time: Date;
  txHash: string;
  shortTxHash: string;
  vaultAddress?: string;
  vaultSymbol?: string;
}

/**
 * Transform LoanEvent from API to UI format
 */
export function transformLoanEventToUI(event: LoanEvent): UILoanHistoryItem {
  const time = new Date(event.timestamp);
  const txHash = event.transactionHash || '';
  const shortTxHash = txHash ? `${txHash.slice(0, 6)}...${txHash.slice(-4)}` : '';

  // Base fields common to all events
  const baseItem: UILoanHistoryItem = {
    id: event.id || '',
    type: 'borrow', // Default, will be overridden
    user: event.args?.who || '',
    time,
    txHash,
    shortTxHash,
    vaultAddress: event.vaultAddress,
    vaultSymbol: event.vaultSymbol
  };

  // Transform based on event type
  switch (event.eventName) {
    case 'Borrow':
      return {
        ...baseItem,
        type: 'borrow',
        amount: event.args.borrowAmount ? parseFloat(formatEther(event.args.borrowAmount)) : 0,
        duration: event.args.duration ? parseInt(event.args.duration) / 86400 : 0, // Convert seconds to days
      };

    case 'Payback':
      return {
        ...baseItem,
        type: 'repay',
        amount: event.args.amount ? parseFloat(formatEther(event.args.amount)) : 0
      };

    case 'RollLoan':
      return {
        ...baseItem,
        type: 'roll'
      };

    default:
      return baseItem;
  }
}

/**
 * Transform array of LoanEvents to UI format
 */
export function transformLoanEventsToUI(events: LoanEvent[]): UILoanHistoryItem[] {
  return events.map(transformLoanEventToUI);
}
