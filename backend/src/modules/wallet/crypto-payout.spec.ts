import {
  maskCryptoAddress,
  normalizeCryptoAddress,
  normalizeCryptoAsset,
  normalizeCryptoNetwork,
  normalizeExternalTxHash,
} from './crypto-payout';

describe('crypto-payout', () => {
  it('normalizes USDT/USDC and common network aliases', () => {
    expect(normalizeCryptoAsset('usdt')).toBe('USDT');
    expect(normalizeCryptoAsset('USDC')).toBe('USDC');
    expect(normalizeCryptoAsset('btc')).toBeNull();
    expect(normalizeCryptoNetwork('trc20')).toBe('TRC20');
    expect(normalizeCryptoNetwork('Tron')).toBe('TRC20');
    expect(normalizeCryptoNetwork('ETH')).toBe('ERC20');
    expect(normalizeCryptoNetwork('bsc')).toBe('BEP20');
  });

  it('accepts Tron and EVM addresses for the matching network', () => {
    const tron = 'TXYZopYRdj2D9XRtbG411XZZWuW5NvtSiL';
    const evm = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0';
    expect(normalizeCryptoAddress(tron, 'TRC20')).toBe(tron);
    expect(normalizeCryptoAddress(` ${evm} `, 'ERC20')).toBe(evm);
    expect(normalizeCryptoAddress(evm, 'BEP20')).toBe(evm);
    expect(normalizeCryptoAddress(tron, 'ERC20')).toBeNull();
    expect(normalizeCryptoAddress(evm, 'TRC20')).toBeNull();
    expect(normalizeCryptoAddress('not-an-address', 'TRC20')).toBeNull();
  });

  it('masks addresses and sanitizes optional tx hashes', () => {
    expect(maskCryptoAddress('TXYZopYRdj2D9XRtbG411XZZWuW5NvtSiL')).toBe('TXYZop…tSiL');
    expect(normalizeExternalTxHash('  abcdef0123456789  ')).toBe('abcdef0123456789');
    expect(normalizeExternalTxHash('too')).toBeNull();
    expect(normalizeExternalTxHash('hash with spaces')).toBeNull();
  });
});
