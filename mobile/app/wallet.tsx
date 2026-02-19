import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Linking,
  Alert,
  RefreshControl,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = `${(process.env.EXPO_PUBLIC_API_URL || 'http://localhost:6001').replace(/\/$/, '')}/api/v1`;

interface IapProduct {
  productId: string;
  amountGhs: number;
  label: string;
}

interface Transaction {
  id: number;
  type: string;
  amount: number;
  status: string;
  description: string | null;
  createdAt: string;
}

interface PayoutMethod {
  id: number;
  type: string;
  displayName: string;
  accountMasked: string | null;
}

interface Withdrawal {
  id: number;
  amount: number;
  status: string;
  createdAt: string;
}

export default function WalletScreen() {
  const [user, setUser] = useState<{ role: string } | null>(null);
  const [balance, setBalance] = useState<{ balance: number; currency: string } | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [payoutMethods, setPayoutMethods] = useState<PayoutMethod[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositLoading, setDepositLoading] = useState(false);
  const [depositError, setDepositError] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawError, setWithdrawError] = useState('');
  const [showPayoutForm, setShowPayoutForm] = useState(false);
  const [payoutForm, setPayoutForm] = useState({
    type: 'mobile_money' as 'mobile_money' | 'bank',
    name: '',
    phone: '',
    provider: 'mtn_gh',
    accountNumber: '',
    bankCode: '',
  });
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [payoutError, setPayoutError] = useState('');
  const [iapProducts, setIapProducts] = useState<IapProduct[]>([]);
  const [iapLoading, setIapLoading] = useState<string | null>(null);
  const [iapError, setIapError] = useState('');

  const loadData = async () => {
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      router.replace('/');
      return;
    }
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const [uRes, balRes, txRes, payRes, wdrRes, iapRes] = await Promise.all([
        fetch(`${API_BASE}/users/me`, { headers }),
        fetch(`${API_BASE}/wallet/balance`, { headers }),
        fetch(`${API_BASE}/wallet/transactions`, { headers }),
        fetch(`${API_BASE}/wallet/payout-methods`, { headers }),
        fetch(`${API_BASE}/wallet/withdrawals`, { headers }),
        fetch(`${API_BASE}/wallet/iap/products`, { headers }),
      ]);
      const u = uRes.ok ? await uRes.json() : null;
      const bal = balRes.ok ? await balRes.json() : { balance: 0, currency: 'GHS' };
      const txs = txRes.ok ? await txRes.json() : [];
      const payouts = payRes.ok ? await payRes.json() : [];
      const wdrs = wdrRes.ok ? await wdrRes.json() : [];
      const iapList = iapRes.ok ? await iapRes.json() : [];
      setUser(u);
      setBalance(bal);
      setTransactions(Array.isArray(txs) ? txs : []);
      setPayoutMethods(Array.isArray(payouts) ? payouts : []);
      setWithdrawals(Array.isArray(wdrs) ? wdrs : []);
      setIapProducts(Array.isArray(iapList) ? iapList : []);
    } catch {
      setBalance({ balance: 0, currency: 'GHS' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount);
    if (!amount || amount < 1 || amount > 10000) {
      setDepositError('Enter GHS 1–10,000');
      return;
    }
    setDepositError('');
    setDepositLoading(true);
    const token = await AsyncStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/wallet/deposit/initialize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed');
      if (data.authorizationUrl) {
        const supported = await Linking.canOpenURL(data.authorizationUrl);
        if (supported) {
          await Linking.openURL(data.authorizationUrl);
          Alert.alert(
            'Complete payment',
            'Finish payment in your browser, then return to the app.',
            [{ text: 'OK' }],
          );
        } else {
          setDepositError('Cannot open payment link');
        }
      } else {
        setDepositError('Could not get payment link');
      }
    } catch (e) {
      setDepositError(e instanceof Error ? e.message : 'Deposit failed');
    } finally {
      setDepositLoading(false);
    }
  };

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount < 5 || amount > 5000) {
      setWithdrawError('Enter GHS 5–5,000');
      return;
    }
    setWithdrawError('');
    setWithdrawLoading(true);
    const token = await AsyncStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/wallet/withdraw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Withdrawal failed');
      setWithdrawAmount('');
      loadData();
    } catch (e) {
      setWithdrawError(e instanceof Error ? e.message : 'Withdrawal failed');
    } finally {
      setWithdrawLoading(false);
    }
  };

  const handleIapVerify = async (product: IapProduct) => {
    setIapError('');
    setIapLoading(product.productId);
    const token = await AsyncStorage.getItem('token');
    if (!token) return;
    try {
      const platform = Platform.OS === 'ios' ? 'ios' : 'android';
      const transactionId = `sim_${platform}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const res = await fetch(`${API_BASE}/wallet/iap/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          platform,
          productId: product.productId,
          transactionId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Verify failed');
      if (data.credited) {
        Alert.alert('Success', `GHS ${data.amount.toFixed(2)} added to your wallet.`);
        loadData();
      }
    } catch (e) {
      setIapError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setIapLoading(null);
    }
  };

  const handleAddPayoutMethod = async () => {
    if (payoutForm.type === 'mobile_money') {
      if (!payoutForm.name.trim() || !payoutForm.phone.trim()) {
        setPayoutError('Name and phone required');
        return;
      }
    } else {
      if (!payoutForm.name.trim() || !payoutForm.accountNumber.trim() || !payoutForm.bankCode.trim()) {
        setPayoutError('Name, account number and bank code required');
        return;
      }
    }
    setPayoutError('');
    setPayoutLoading(true);
    const token = await AsyncStorage.getItem('token');
    if (!token) return;
    try {
      const body =
        payoutForm.type === 'mobile_money'
          ? { type: 'mobile_money', name: payoutForm.name, phone: payoutForm.phone, provider: payoutForm.provider }
          : { type: 'bank', name: payoutForm.name, accountNumber: payoutForm.accountNumber, bankCode: payoutForm.bankCode };
      const res = await fetch(`${API_BASE}/wallet/payout-methods`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed');
      setShowPayoutForm(false);
      setPayoutForm({ type: 'mobile_money', name: '', phone: '', provider: 'mtn_gh', accountNumber: '', bankCode: '' });
      loadData();
    } catch (e) {
      setPayoutError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setPayoutLoading(false);
    }
  };

  const isTipster = user?.role === 'tipster' || user?.role === 'admin';

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loading}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Pressable style={styles.back} onPress={() => router.back()}>
        <Text style={styles.backText}>← Back</Text>
      </Pressable>
      <Text style={styles.title}>Wallet</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Available Balance</Text>
        <Text style={styles.balance}>
          {balance?.currency} {Number(balance?.balance ?? 0).toFixed(2)}
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Amount (GHS)"
          value={depositAmount}
          onChangeText={setDepositAmount}
          keyboardType="decimal-pad"
        />
        {depositError ? <Text style={styles.error}>{depositError}</Text> : null}
        <Pressable
          style={[styles.button, depositLoading && styles.buttonDisabled]}
          onPress={handleDeposit}
          disabled={depositLoading}
        >
          <Text style={styles.buttonText}>{depositLoading ? 'Redirecting...' : 'Deposit (Paystack)'}</Text>
        </Pressable>
      </View>

      {iapProducts.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Top up via {Platform.OS === 'ios' ? 'App Store' : 'Google Play'}</Text>
          <Text style={styles.muted}>
            In production, purchase in the store then the app will verify and credit automatically. For testing:
          </Text>
          {iapError ? <Text style={styles.error}>{iapError}</Text> : null}
          <View style={styles.row}>
            {iapProducts.map((p) => (
              <Pressable
                key={p.productId}
                style={[styles.chip, iapLoading === p.productId && styles.buttonDisabled]}
                onPress={() => handleIapVerify(p)}
                disabled={!!iapLoading}
              >
                <Text style={styles.chipText}>{iapLoading === p.productId ? '...' : p.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {isTipster && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Withdraw (Tipsters)</Text>
          {payoutMethods.length === 0 ? (
            <>
              {!showPayoutForm ? (
                <Pressable style={styles.secondaryButton} onPress={() => setShowPayoutForm(true)}>
                  <Text style={styles.secondaryButtonText}>Add payout method</Text>
                </Pressable>
              ) : (
                <View style={styles.form}>
                  <TextInput
                    style={styles.input}
                    placeholder="Account name"
                    value={payoutForm.name}
                    onChangeText={(t) => setPayoutForm((p) => ({ ...p, name: t }))}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Phone (mobile) or Account # (bank)"
                    value={payoutForm.type === 'mobile_money' ? payoutForm.phone : payoutForm.accountNumber}
                    onChangeText={(t) =>
                      setPayoutForm((p) =>
                        p.type === 'mobile_money' ? { ...p, phone: t } : { ...p, accountNumber: t },
                      )
                    }
                    keyboardType={payoutForm.type === 'bank' ? 'numeric' : 'phone-pad'}
                  />
                  {payoutForm.type === 'mobile_money' ? (
                    <View style={styles.row}>
                      {(['mtn_gh', 'vodafone_gh', 'airteltigo_gh'] as const).map((p) => (
                        <Pressable
                          key={p}
                          style={[styles.chip, payoutForm.provider === p && styles.chipActive]}
                          onPress={() => setPayoutForm((x) => ({ ...x, provider: p }))}
                        >
                          <Text style={payoutForm.provider === p ? styles.chipTextActive : styles.chipText}>
                            {p === 'mtn_gh' ? 'MTN' : p === 'vodafone_gh' ? 'Vodafone' : 'AirtelTigo'}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  ) : (
                    <TextInput
                      style={styles.input}
                      placeholder="Bank code"
                      value={payoutForm.bankCode}
                      onChangeText={(t) => setPayoutForm((p) => ({ ...p, bankCode: t }))}
                    />
                  )}
                  <View style={styles.row}>
                    <Pressable
                      style={[styles.chip, payoutForm.type === 'mobile_money' && styles.chipActive]}
                      onPress={() => setPayoutForm((p) => ({ ...p, type: 'mobile_money' }))}
                    >
                      <Text style={payoutForm.type === 'mobile_money' ? styles.chipTextActive : styles.chipText}>
                        Mobile
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[styles.chip, payoutForm.type === 'bank' && styles.chipActive]}
                      onPress={() => setPayoutForm((p) => ({ ...p, type: 'bank' }))}
                    >
                      <Text style={payoutForm.type === 'bank' ? styles.chipTextActive : styles.chipText}>Bank</Text>
                    </Pressable>
                  </View>
                  {payoutError ? <Text style={styles.error}>{payoutError}</Text> : null}
                  <View style={styles.row}>
                    <Pressable
                      style={[styles.button, styles.buttonSmall, payoutLoading && styles.buttonDisabled]}
                      onPress={handleAddPayoutMethod}
                      disabled={payoutLoading}
                    >
                      <Text style={styles.buttonText}>
                        {payoutLoading ? 'Saving...' : 'Save'}
                      </Text>
                    </Pressable>
                    <Pressable style={styles.secondaryButtonSmall} onPress={() => setShowPayoutForm(false)}>
                      <Text style={styles.secondaryButtonText}>Cancel</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </>
          ) : (
            <>
              <Text style={styles.muted}>
                {payoutMethods[0].displayName} {payoutMethods[0].accountMasked && `(${payoutMethods[0].accountMasked})`}
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Amount (GHS)"
                value={withdrawAmount}
                onChangeText={setWithdrawAmount}
                keyboardType="decimal-pad"
              />
              {withdrawError ? <Text style={styles.error}>{withdrawError}</Text> : null}
              <Pressable
                style={[styles.button, styles.buttonGreen, withdrawLoading && styles.buttonDisabled]}
                onPress={handleWithdraw}
                disabled={withdrawLoading}
              >
                <Text style={styles.buttonText}>{withdrawLoading ? 'Processing...' : 'Withdraw'}</Text>
              </Pressable>
              {withdrawals.length > 0 && (
                <View style={styles.withdrawals}>
                  <Text style={styles.muted}>Recent</Text>
                  {withdrawals.slice(0, 5).map((w) => (
                    <View key={w.id} style={styles.withdrawRow}>
                      <Text>GHS {Number(w.amount).toFixed(2)}</Text>
                      <Text
                        style={
                          w.status === 'completed'
                            ? styles.statusOk
                            : w.status === 'failed'
                              ? styles.statusFail
                              : styles.statusPending
                        }
                      >
                        {w.status}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        {transactions.length === 0 ? (
          <Text style={styles.muted}>No transactions yet.</Text>
        ) : (
          transactions.map((t) => (
            <View key={t.id} style={styles.txRow}>
              <View>
                <Text style={styles.txType}>{t.type}</Text>
                <Text style={styles.muted}>{t.description || new Date(t.createdAt).toLocaleString()}</Text>
              </View>
              <Text style={Number(t.amount) >= 0 ? styles.txPos : styles.txNeg}>
                {Number(t.amount) >= 0 ? '+' : ''}GHS {Math.abs(Number(t.amount)).toFixed(2)}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24, paddingBottom: 48 },
  loading: { textAlign: 'center', color: '#666', marginTop: 48 },
  back: { marginBottom: 16 },
  backText: { color: '#DC2626', fontSize: 16 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 24 },
  card: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  label: { fontSize: 12, color: '#666', marginBottom: 4 },
  balance: { fontSize: 28, fontWeight: 'bold', marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 14,
    marginBottom: 12,
    fontSize: 16,
  },
  error: { color: '#dc2626', fontSize: 14, marginBottom: 8 },
  button: {
    backgroundColor: '#DC2626',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonGreen: { backgroundColor: '#059669' },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  buttonSmall: { flex: 1, marginRight: 8 },
  secondaryButton: {
    borderWidth: 2,
    borderColor: '#DC2626',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryButtonSmall: {
    borderWidth: 2,
    borderColor: '#d1d5db',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
  },
  secondaryButtonText: { color: '#DC2626', fontSize: 16, fontWeight: '600' },
  form: { gap: 12 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  chipActive: { backgroundColor: '#DC2626', borderColor: '#DC2626' },
  chipText: { color: '#666' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  muted: { fontSize: 14, color: '#666', marginBottom: 8 },
  withdrawals: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  withdrawRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  statusOk: { color: '#059669' },
  statusFail: { color: '#dc2626' },
  statusPending: { color: '#d97706' },
  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  txType: { fontWeight: '600', marginBottom: 2 },
  txPos: { color: '#059669', fontWeight: '600' },
  txNeg: { color: '#dc2626', fontWeight: '600' },
});
