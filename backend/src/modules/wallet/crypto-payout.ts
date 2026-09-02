export const CRYPTO_ASSETS = ['USDT', 'USDC'] as const;
export type CryptoAsset = (typeof CRYPTO_ASSETS)[number];

export const CRYPTO_NETWORKS = ['TRC20', 'ERC20', 'BEP20'] as const;
export type CryptoNetwork = (typeof CRYPTO_NETWORKS)[number];

const TRON_ADDRESS = /^T[1-9A-HJ-NP-Za-km-z]{33}$/;
const EVM_ADDRESS = /^0x[a-fA-F0-9]{40}$/;

export function normalizeCryptoAsset(input: string | undefined | null): CryptoAsset | null {
  if (!input?.trim()) return null;
  const v = input.trim().toUpperCase();
  return (CRYPTO_ASSETS as readonly string[]).includes(v) ? (v as CryptoAsset) : null;
}

export function normalizeCryptoNetwork(input: string | undefined | null): CryptoNetwork | null {
  if (!input?.trim()) return null;
  const v = input.trim().toUpperCase().replace(/[\s-]+/g, '');
  if (v === 'TRC20' || v === 'TRON') return 'TRC20';
  if (v === 'ERC20' || v === 'ETH' || v === 'ETHEREUM') return 'ERC20';
  if (v === 'BEP20' || v === 'BSC' || v === 'BNB' || v === 'BNBCHAIN') return 'BEP20';
  return (CRYPTO_NETWORKS as readonly string[]).includes(v) ? (v as CryptoNetwork) : null;
}

export function normalizeCryptoAddress(
  address: string | undefined | null,
  network: CryptoNetwork,
): string | null {
  if (!address) return null;
  const trimmed = address.trim();
  if (!trimmed) return null;
  if (network === 'TRC20') return TRON_ADDRESS.test(trimmed) ? trimmed : null;
  return EVM_ADDRESS.test(trimmed) ? trimmed : null;
}

export function maskCryptoAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function normalizeExternalTxHash(input: string | undefined | null): string | null {
  if (!input?.trim()) return null;
  const v = input.trim();
  if (v.length < 8 || v.length > 128) return null;
  if (!/^[0-9a-zA-Z]+$/.test(v)) return null;
  return v;
}
