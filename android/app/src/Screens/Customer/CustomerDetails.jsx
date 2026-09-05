import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  FlatList,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../API/axiosConfig';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS, FONTS, SIZES } from '../../utils/theme';
import config from '../../config';
import ScreenHeader from '../../components/ScreenHeader';
import { useToast } from '../../components/Toast';
import {
  MONTHS,
  fetchBillHistory,
  money,
  photoSource,
} from '../../API/billHistory';

const defaultCustomerImg = require('../../Assets/Images/logo.jpg');

// Green when settled, amber when part paid, red when nothing paid, grey when
// the month had no deliveries at all.
const MONTH_COLORS = {
  Paid: '#2E7D32',
  Partial: '#F9A825',
  Unpaid: '#C62828',
  NoActivity: '#D5D8DD',
};

// Soft background behind each month box, so twelve of them read as a calendar
// rather than twelve loud buttons.
const MONTH_TINTS = {
  Paid: '#E7F2E8',
  Partial: '#FDF3DA',
  Unpaid: '#FBE9E9',
  NoActivity: '#F1F3F5',
};

const PAGE_BG = '#F4F6F8';

const CustomerDetails = ({ route, navigation }) => {
  const { customer } = route.params;

  // One feedback surface for the whole app; replaces the mixed alert() and
  // MessageBox usage this screen had.
  const toast = useToast();

  const [userId, setUserId] = useState(null);
  const [milkEntries, setMilkEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // ---------- Month payment status grid ----------
  const [statusYear] = useState(new Date().getFullYear());
  const [monthStatuses, setMonthStatuses] = useState([]);
  const [statusLoading, setStatusLoading] = useState(false);
  const [selectedStatusMonth, setSelectedStatusMonth] = useState(null);

  // ---------- Bill modal ----------
  const [showBillModal, setShowBillModal] = useState(false);
  const [paymentType, setPaymentType] = useState('UPI');

  // Which month is being billed. September can bill August.
  const [billDate, setBillDate] = useState(new Date());
  const [showBillDatePicker, setShowBillDatePicker] = useState(false);

  // Calculated by GET /Bill/preview and shown read-only.
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [savingBill, setSavingBill] = useState(false);

  // The only editable figure. Previous balance and total payable are both
  // calculated by the server, so the carry-forward chain cannot drift.
  const [paidAmount, setPaidAmount] = useState('0');

  // ---------- Add Entry Modal ----------
  const [showAddModal, setShowAddModal] = useState(false);
  const [entryDate, setEntryDate] = useState(new Date());
  const [cowLitre, setCowLitre] = useState('');
  const [buffaloLitre, setBuffaloLitre] = useState('');
  const [cowRate, setCowRate] = useState(customer.cowRate);
  const [buffaloRate, setBuffaloRate] = useState(customer.buffaloRate);

  // ---------- Update Entry Modal ----------
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [showEntryModal, setShowEntryModal] = useState(false);

  const formatDate = date => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const totalAmount =
    Number(cowLitre || 0) * Number(cowRate || 0) +
    Number(buffaloLitre || 0) * Number(buffaloRate || 0);

  const resetEntryForm = () => {
    setEntryDate(new Date());
    setCowLitre('');
    setBuffaloLitre('');
    setCowRate(customer.cowRate);
    setBuffaloRate(customer.buffaloRate);
  };

  // Get userId
  useEffect(() => {
    const fetchUserId = async () => {
      const id = await AsyncStorage.getItem('userId');
      if (id) setUserId(Number(id));
    };
    fetchUserId();
  }, []);

  // Fetch milk entries
  useEffect(() => {
    if (userId) fetchMilkEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const fetchMilkEntries = async () => {
    setLoading(true);
    try {
      const response = await api.get(
        `${config.ENDPOINTS.GET_CUSTOMER_DETAILS}?customerId=${customer.customerId}&userId=${userId}`,
      );
      if (response.data?.data && Array.isArray(response.data.data)) {
        setMilkEntries(response.data.data);
      } else {
        setMilkEntries([]);
      }
    } catch (error) {
      const status = error.response?.status;
      if (status === 404) {
        // The API returns 404, rather than an empty array, when this customer
        // has no milk entries yet. Treat it as an empty list.
        setMilkEntries([]);
      } else {
        console.error(
          'Milk entries API error:',
          status,
          error.response?.data ?? error.message,
        );
        setMilkEntries([]);
        toast.error('Could not load milk entries');
      }
    } finally {
      setLoading(false);
    }
  };

  // ---------- Month payment status ----------

  // One call gives all twelve months for this customer, each with its total,
  // paid, remaining and status. The same endpoint both list screens use.
  const loadMonthStatuses = useCallback(async () => {
    setStatusLoading(true);
    try {
      const result = await fetchBillHistory({
        year: statusYear,
        customerId: customer.customerId,
      });
      const row = result.customers?.[0] ?? null;
      setMonthStatuses(row?.months ?? []);
    } catch (err) {
      console.log('[Bill] month status failed', err.response?.status);
      setMonthStatuses([]);
    } finally {
      setStatusLoading(false);
    }
  }, [customer.customerId, statusYear]);

  useEffect(() => {
    loadMonthStatuses();
  }, [loadMonthStatuses]);

  const statusOf = monthNumber =>
    monthStatuses.find(m => m.month === monthNumber) ?? null;

  const selectedStatus = selectedStatusMonth
    ? statusOf(selectedStatusMonth)
    : null;

  // ---------- Milk entry handlers ----------

  const handleAddEntry = async () => {
    if (!cowLitre && !buffaloLitre) {
      toast.warning('Enter cow or buffalo litres');
      return;
    }

    const payload = {
      customerId: customer.customerId,
      userId,
      date: formatDate(entryDate),
      cowLitre: Number(cowLitre || 0),
      buffaloLitre: Number(buffaloLitre || 0),
      cowRate: Number(cowRate || customer.cowRate),
      buffaloRate: Number(buffaloRate || customer.buffaloRate),
      totalAmount,
    };

    try {
      const response = await api.post(config.ENDPOINTS.ADD_MILK_ENTRY, payload);

      if (response.data.success) {
        toast.success('Milk entry added successfully');
        fetchMilkEntries();
        loadMonthStatuses();
        setTimeout(() => {
          resetEntryForm();
          setShowAddModal(false);
        }, 1200);
      } else {
        toast.error(response.data?.message || 'Failed to add entry');
      }
    } catch (err) {
      console.error(err);
      toast.error('Server error. Try again.');
    }
  };

  const handleUpdateEntry = async () => {
    if (!selectedEntry) return;

    // The API takes the entry id in the body, not the path.
    const payload = {
      entryId: selectedEntry.entryId,
      customerId: customer.customerId,
      userId,
      date: formatDate(entryDate),
      cowLitre: Number(cowLitre || 0),
      buffaloLitre: Number(buffaloLitre || 0),
      cowRate: Number(cowRate || 0),
      buffaloRate: Number(buffaloRate || 0),
      totalAmount:
        Number(cowLitre || 0) * Number(cowRate || 0) +
        Number(buffaloLitre || 0) * Number(buffaloRate || 0),
    };

    try {
      const response = await api.put(config.ENDPOINTS.UPDATE_MILK_ENTRY, payload);

      if (response.data.success) {
        fetchMilkEntries();
        loadMonthStatuses();
        setShowEntryModal(false);
      } else {
        toast.error(response.data.message || 'Update failed');
      }
    } catch (err) {
      console.error(
        'Update entry failed:',
        err.response?.status,
        err.response?.data ?? err.message,
      );
      toast.error('Server error. Please try again.');
    }
  };

  const handleDeleteEntry = async () => {
    if (!selectedEntry) return;

    try {
      const response = await api.delete(
        `${config.ENDPOINTS.DELETE_MILK_ENTRY}/${selectedEntry.entryId}`,
      );

      if (response.data.success) {
        fetchMilkEntries();
        loadMonthStatuses();
        setShowEntryModal(false);
      } else {
        toast.error(response.data.message || 'Delete failed');
      }
    } catch (err) {
      console.error(
        'Delete entry failed:',
        err.response?.status,
        err.response?.data ?? err.message,
      );
      toast.error('Server error. Please try again.');
    }
  };

  // ---------- Bill ----------

  // Loads what a bill for the selected month would contain, without saving.
  // Litres, amount and the suggested previous balance all come from the server,
  // so what the modal shows is exactly what a save would write.
  const loadBillPreview = useCallback(async () => {
    const month = billDate.getMonth() + 1;
    const year = billDate.getFullYear();
    const url =
      `${config.ENDPOINTS.BILL}/preview` +
      `?customerId=${customer.customerId}&month=${month}&year=${year}`;

    setPreviewLoading(true);
    try {
      const response = await api.get(url);
      const data = response?.data?.data ?? null;

      console.log('[Bill] preview', response?.status, {
        month,
        year,
        entryCount: data?.entryCount,
        totalAmount: data?.totalAmount,
        suggestedPreviousBalance: data?.suggestedPreviousBalance,
        billExists: data?.billExists,
        message: response?.data?.message,
      });

      setPreview(data);

      if (data?.billExists) {
        setPaymentType(data.existingPaymentType || 'UPI');
        setPaidAmount(String(data.existingPaidAmount ?? 0));
      } else {
        // Default to paying the whole thing; the user can lower it.
        const payable = Number(data?.totalPayable ?? 0);
        setPaidAmount(payable > 0 ? payable.toFixed(2) : '0');
      }
    } catch (err) {
      console.log(
        '[Bill] preview failed',
        err.response?.status,
        err.response?.data ?? err.message,
      );
      setPreview(null);
      toast.error('Could not load bill preview');
    } finally {
      setPreviewLoading(false);
    }
  }, [customer.customerId, billDate]);

  // Refresh whenever the modal opens or the month changes.
  useEffect(() => {
    if (showBillModal) {
      loadBillPreview();
    }
  }, [showBillModal, loadBillPreview]);

  // Both figures come straight from the preview: the server owns them.
  const previousBalance = Number(preview?.previousBalance ?? 0);
  const totalPayable = Number(preview?.totalPayable ?? 0);

  const remainingAfterPayment = Math.max(
    0,
    totalPayable - Number(paidAmount || 0),
  );

  const billSettled = !!preview?.billExists && !!preview?.existingIsPaymentDone;

  const handleSaveBill = async () => {
    if (billSettled) {
      toast.warning('This bill is already settled and cannot be changed');
      return;
    }

    if (Number(paidAmount || 0) < 0) {
      toast.warning('Paid amount cannot be negative');
      return;
    }

    // No previousBalance: the server recalculates it from the previous bill so
    // the chain stays correct even if this screen is out of date.
    const payload = {
      customerId: customer.customerId,
      month: billDate.getMonth() + 1,
      year: billDate.getFullYear(),
      paidAmount: Number(paidAmount || 0),
      paymentType,
    };

    console.log('[Bill] save', payload);

    setSavingBill(true);
    try {
      const response = await api.post(config.ENDPOINTS.BILL, payload);

      if (response.data.success) {
        const saved = response.data.data;
        setShowBillModal(false);
        loadMonthStatuses();
        toast.success(`${saved.monthName} ${saved.year} bill saved. Paid ${money(
            saved.paidAmount,
          )} of ${money(saved.totalPayable)}`);
      } else {
        toast.error(response.data.message || 'Could not save bill');
      }
    } catch (err) {
      // 409 means the bill for this month is already settled.
      const serverMessage = err.response?.data?.message;
      console.log(
        '[Bill] save failed',
        err.response?.status,
        serverMessage ?? err.message,
      );
      toast.error(serverMessage || 'Server error. Please try again.');
    } finally {
      setSavingBill(false);
    }
  };

  const currentDate = new Date();
  const formattedDate = currentDate.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <View style={styles.page}>
      <ScreenHeader title={customer.name || 'Customer'} />

      <ScrollView
        style={styles.topScroll}
        contentContainerStyle={styles.pageContent}
        showsVerticalScrollIndicator={false}
      >
      {/* ---------- Customer header ---------- */}
      <View style={styles.card}>
        <View style={styles.heroRow}>
          <Image
            source={photoSource(customer.photoUrl, defaultCustomerImg)}
            style={styles.avatar}
          />

          <View style={styles.heroInfo}>
            <Text style={styles.customerName} numberOfLines={1}>
              {customer.name}
            </Text>
            <Text style={styles.customerMeta} numberOfLines={1}>
              {customer.phoneNumber}
            </Text>
            <Text style={styles.customerMeta} numberOfLines={2}>
              {customer.address}
            </Text>
          </View>

          <View style={styles.heroDate}>
            <Text style={styles.heroDateLabel}>Today</Text>
            <Text style={styles.heroDateValue}>{formattedDate}</Text>
          </View>
        </View>

        <View style={styles.chipRow}>
          <View style={styles.chip}>
            <Text style={styles.chipLabel}>Cow</Text>
            <Text style={styles.chipValue}>₹ {customer.cowRate}</Text>
          </View>
          <View style={styles.chip}>
            <Text style={styles.chipLabel}>Buffalo</Text>
            <Text style={styles.chipValue}>₹ {customer.buffaloRate}</Text>
          </View>
          <View style={styles.chip}>
            <Text style={styles.chipLabel}>ID</Text>
            <Text style={styles.chipValue}>{customer.customerId}</Text>
          </View>
        </View>

        <View style={styles.contactRow}>
          <View style={styles.contactItem}>
            <Text style={styles.contactLabel}>WhatsApp</Text>
            <Text style={styles.contactValue} numberOfLines={1}>
              {customer.whatsappNumber || '-'}
            </Text>
          </View>
          <View style={styles.contactItem}>
            <Text style={styles.contactLabel}>Email</Text>
            <Text style={styles.contactValue} numberOfLines={1}>
              {customer.email || '-'}
            </Text>
          </View>
        </View>
      </View>

      {/* ---------- Actions ---------- */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionPrimary]}
          onPress={() => {
            resetEntryForm();
            setShowAddModal(true);
          }}
        >
          <Text style={styles.actionPrimaryText}>Add Entry</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() =>
            navigation.navigate('GenerateBill', { customer, milkEntries })
          }
        >
          <Text style={styles.actionText}>Print Bill</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => setShowBillModal(true)}
        >
          <Text style={styles.actionText}>Bill / Pay</Text>
        </TouchableOpacity>
      </View>

      {/* ---------- Payment status ---------- */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Payment status</Text>
          <View style={styles.cardHeaderRight}>
            {statusLoading && (
              <ActivityIndicator size="small" color={COLORS.primary} />
            )}
            <Text style={styles.cardHeaderYear}>{statusYear}</Text>
          </View>
        </View>

        {/* Four boxes per row, month name inside the box. */}
        <View style={styles.monthGrid}>
          {MONTHS.map(m => {
            const row = statusOf(m.value);
            const status = row?.paymentStatus ?? 'NoActivity';
            const active = selectedStatusMonth === m.value;

            return (
              <TouchableOpacity
                key={m.value}
                style={[
                  styles.monthBox,
                  { backgroundColor: MONTH_TINTS[status] },
                  active && styles.monthBoxActive,
                ]}
                onPress={() => setSelectedStatusMonth(active ? null : m.value)}
              >
                <View
                  style={[
                    styles.monthBar,
                    { backgroundColor: MONTH_COLORS[status] },
                  ]}
                />
                <Text
                  style={[
                    styles.monthBoxText,
                    {
                      color:
                        status === 'NoActivity'
                          ? COLORS.textSecondary
                          : MONTH_COLORS[status],
                    },
                  ]}
                >
                  {m.short}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Tapping a month shows what was paid for it */}
        {selectedStatusMonth && (
          <View style={styles.statusDetail}>
            <View style={styles.statusDetailHead}>
              <Text style={styles.statusDetailTitle}>
                {MONTHS.find(m => m.value === selectedStatusMonth)?.label}{' '}
                {statusYear}
              </Text>
              {selectedStatus &&
                selectedStatus.paymentStatus !== 'NoActivity' && (
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor:
                          MONTH_COLORS[selectedStatus.paymentStatus],
                      },
                    ]}
                  >
                    <Text style={styles.statusBadgeText}>
                      {selectedStatus.paymentStatus}
                    </Text>
                  </View>
                )}
            </View>

            {!selectedStatus || selectedStatus.paymentStatus === 'NoActivity' ? (
              <Text style={styles.statusDetailMuted}>No entries this month</Text>
            ) : (
              <View style={styles.statRow}>
                <View style={styles.statCell}>
                  <Text style={styles.statLabel}>Total</Text>
                  <Text style={styles.statValue}>
                    {money(selectedStatus.totalAmount)}
                  </Text>
                </View>
                <View style={styles.statCell}>
                  <Text style={styles.statLabel}>Paid</Text>
                  <Text style={[styles.statValue, { color: MONTH_COLORS.Paid }]}>
                    {money(selectedStatus.paidAmount)}
                  </Text>
                </View>
                <View style={styles.statCell}>
                  <Text style={styles.statLabel}>Remaining</Text>
                  <Text
                    style={[
                      styles.statValue,
                      {
                        color:
                          Number(selectedStatus.remainingAmount ?? 0) > 0
                            ? MONTH_COLORS.Unpaid
                            : COLORS.textPrimary,
                      },
                    ]}
                  >
                    {money(selectedStatus.remainingAmount)}
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        <View style={styles.legendRow}>
          {[
            { key: 'Paid', label: 'Paid' },
            { key: 'Partial', label: 'Part paid' },
            { key: 'Unpaid', label: 'Unpaid' },
            { key: 'NoActivity', label: 'No entries' },
          ].map(item => (
            <View key={item.key} style={styles.legendItem}>
              <View
                style={[
                  styles.legendDot,
                  { backgroundColor: MONTH_COLORS[item.key] },
                ]}
              />
              <Text style={styles.legendText}>{item.label}</Text>
            </View>
          ))}
        </View>
      </View>

      </ScrollView>

      {/* ---------- Milk entries ----------
           A sibling of the section above, not a child, so the two scroll areas
           never fight over the same gesture. Only the rows below the column
           header move. */}
      <View style={styles.entriesSection}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Milk entries</Text>
          <Text style={styles.cardHeaderYear}>
            {milkEntries.length} {milkEntries.length === 1 ? 'entry' : 'entries'}
          </Text>
        </View>

        <View style={styles.tableHeader}>
          <Text style={[styles.headerText, styles.colDate]}>Date</Text>
          <Text style={styles.headerText}>Cow L</Text>
          <Text style={styles.headerText}>Rate</Text>
          <Text style={styles.headerText}>Buff L</Text>
          <Text style={styles.headerText}>Rate</Text>
          <Text style={[styles.headerText, styles.colTotal]}>Total</Text>
        </View>

        {loading ? (
          <View style={styles.tableEmpty}>
            <ActivityIndicator size="small" color={COLORS.primary} />
          </View>
        ) : (
          <FlatList
            data={milkEntries}
            keyExtractor={(item, index) => String(item?.entryId ?? index)}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.tableListContent}
            ListEmptyComponent={
              <View style={styles.tableEmpty}>
                <Text style={styles.noEntries}>No milk entries found.</Text>
              </View>
            }
            renderItem={({ item: entry, index }) => (
            <TouchableOpacity
              key={entry.entryId}
              style={[styles.tableRow, index % 2 === 1 && styles.tableRowAlt]}
              onPress={() => {
                setSelectedEntry(entry);
                setEntryDate(new Date(entry.date));
                setCowLitre(String(entry.cowLitre));
                setBuffaloLitre(String(entry.buffaloLitre));
                setCowRate(String(entry.cowRate));
                setBuffaloRate(String(entry.buffaloRate));
                setShowEntryModal(true);
              }}
            >
              <Text style={[styles.rowText, styles.colDate]}>
                {new Date(entry.date).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                })}
              </Text>
              <Text style={styles.rowText}>{entry.cowLitre}</Text>
              <Text style={styles.rowText}>{entry.cowRate}</Text>
              <Text style={styles.rowText}>{entry.buffaloLitre}</Text>
              <Text style={styles.rowText}>{entry.buffaloRate}</Text>
              <Text style={[styles.rowTotal, styles.colTotal]}>
                ₹ {entry.totalAmount}
              </Text>
            </TouchableOpacity>
            )}
          />
        )}
      </View>

      {/* ---------- Add Entry Modal ---------- */}
      <Modal transparent visible={showAddModal} animationType="fade">
        <View style={styles.centeredModal}>
          <View style={styles.centeredContent}>
            <Text style={styles.modalTitle}>Add Milk Entry</Text>
            <Text style={styles.inputLabel}>Date</Text>
            <TouchableOpacity
              style={styles.datePickerBtn}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.datePickerText}>
                {entryDate.toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={entryDate}
                mode="date"
                display="default"
                onChange={(e, d) => {
                  setShowDatePicker(false);
                  if (d) setEntryDate(d);
                }}
              />
            )}

            <View style={styles.fieldRow}>
              <View style={styles.fieldHalf}>
                <Text style={styles.inputLabel}>Cow Litres</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={cowLitre}
                  onChangeText={setCowLitre}
                />
              </View>
              <View style={styles.fieldHalf}>
                <Text style={styles.inputLabel}>Cow Rate</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={String(cowRate)}
                  onChangeText={setCowRate}
                />
              </View>
            </View>

            <View style={styles.fieldRow}>
              <View style={styles.fieldHalf}>
                <Text style={styles.inputLabel}>Buffalo Litres</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={buffaloLitre}
                  onChangeText={setBuffaloLitre}
                />
              </View>
              <View style={styles.fieldHalf}>
                <Text style={styles.inputLabel}>Buffalo Rate</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={String(buffaloRate)}
                  onChangeText={setBuffaloRate}
                />
              </View>
            </View>

            <View style={styles.totalBanner}>
              <Text style={styles.totalBannerLabel}>Total</Text>
              <Text style={styles.totalBannerValue}>₹ {totalAmount}</Text>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.saveBtn, { marginRight: 5 }]}
                onPress={handleAddEntry}
              >
                <Text style={styles.btnText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.cancelBtn, { marginLeft: 5 }]}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.btnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ---------- Update Entry Modal ---------- */}
      <Modal transparent visible={showEntryModal} animationType="fade">
        <View style={styles.centeredModal}>
          <View style={styles.centeredContent}>
            <TouchableOpacity
              style={styles.crossBtn}
              onPress={() => setShowEntryModal(false)}
            >
              <Text style={styles.crossText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Update Milk Entry</Text>

            <Text style={styles.inputLabel}>Date</Text>
            <TouchableOpacity
              style={styles.datePickerBtn}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.datePickerText}>
                {entryDate.toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={entryDate}
                mode="date"
                display="default"
                onChange={(e, d) => {
                  setShowDatePicker(false);
                  if (d) setEntryDate(d);
                }}
              />
            )}

            <View style={styles.fieldRow}>
              <View style={styles.fieldHalf}>
                <Text style={styles.inputLabel}>Cow Litres</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={String(cowLitre)}
                  onChangeText={setCowLitre}
                />
              </View>
              <View style={styles.fieldHalf}>
                <Text style={styles.inputLabel}>Cow Rate</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={String(cowRate)}
                  onChangeText={setCowRate}
                />
              </View>
            </View>

            <View style={styles.fieldRow}>
              <View style={styles.fieldHalf}>
                <Text style={styles.inputLabel}>Buffalo Litres</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={String(buffaloLitre)}
                  onChangeText={setBuffaloLitre}
                />
              </View>
              <View style={styles.fieldHalf}>
                <Text style={styles.inputLabel}>Buffalo Rate</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={String(buffaloRate)}
                  onChangeText={setBuffaloRate}
                />
              </View>
            </View>

            <View style={styles.totalBanner}>
              <Text style={styles.totalBannerLabel}>Total</Text>
              <Text style={styles.totalBannerValue}>
                ₹{' '}
                {Number(cowLitre || 0) * Number(cowRate || 0) +
                  Number(buffaloLitre || 0) * Number(buffaloRate || 0)}
              </Text>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.saveBtn, { marginRight: 5 }]}
                onPress={handleUpdateEntry}
              >
                <Text style={styles.btnText}>Update</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.cancelBtn, { marginLeft: 5 }]}
                onPress={handleDeleteEntry}
              >
                <Text style={styles.btnText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ---------- Bill Modal ---------- */}
      <Modal transparent visible={showBillModal} animationType="fade">
        <View style={styles.centeredModal}>
          <View style={[styles.centeredContent, { maxHeight: '88%' }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <TouchableOpacity
                style={styles.crossBtn}
                onPress={() => setShowBillModal(false)}
              >
                <Text style={styles.crossText}>✕</Text>
              </TouchableOpacity>

              <Text style={styles.modalTitle}>
                {preview?.billExists ? 'Update Bill' : 'Generate Bill'}
              </Text>

              {/* Which month is being billed. September can bill August. */}
              <Text style={styles.inputLabel}>Bill month</Text>
              <TouchableOpacity
                style={styles.datePickerBtn}
                onPress={() => setShowBillDatePicker(true)}
              >
                <Text style={styles.datePickerText}>
                  {billDate.toLocaleDateString('en-GB', {
                    month: 'long',
                    year: 'numeric',
                  })}
                </Text>
              </TouchableOpacity>

              {showBillDatePicker && (
                <DateTimePicker
                  value={billDate}
                  mode="date"
                  display="default"
                  onChange={(e, d) => {
                    setShowBillDatePicker(false);
                    if (d) setBillDate(d);
                  }}
                />
              )}

              {previewLoading ? (
                <ActivityIndicator
                  size="small"
                  color={COLORS.primary}
                  style={{ marginVertical: 20 }}
                />
              ) : (
                <>
                  {preview?.billExists && (
                    <Text style={styles.billNote}>
                      {preview.existingIsPaymentDone
                        ? 'This bill is already settled and cannot be changed.'
                        : 'A bill exists for this month and will be recalculated.'}
                    </Text>
                  )}

                  {/* Everything here is calculated by the server: litres and
                      month total from the milk entries, previous balance from
                      the previous bill's unpaid amount. */}
                  <View style={styles.summaryBlock}>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>
                        Cow litres ({preview?.entryCount ?? 0} entries)
                      </Text>
                      <Text style={styles.summaryValue}>
                        {Number(preview?.totalCowLitre ?? 0).toFixed(2)}
                      </Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Buffalo litres</Text>
                      <Text style={styles.summaryValue}>
                        {Number(preview?.totalBuffaloLitre ?? 0).toFixed(2)}
                      </Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Month total</Text>
                      <Text style={styles.summaryValue}>
                        {money(preview?.totalAmount)}
                      </Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>
                        Previous balance
                        {preview?.previousBillMonth
                          ? ` (from ${preview.previousBillMonth}/${preview.previousBillYear})`
                          : ''}
                      </Text>
                      <Text
                        style={[
                          styles.summaryValue,
                          previousBalance > 0 && { color: MONTH_COLORS.Unpaid },
                        ]}
                      >
                        {money(previousBalance)}
                      </Text>
                    </View>
                    <View style={styles.summaryDivider} />
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabelStrong}>Total payable</Text>
                      <Text style={styles.summaryValueStrong}>
                        {money(totalPayable)}
                      </Text>
                    </View>
                  </View>

                  {preview?.laterBillCount > 0 && (
                    <Text style={styles.billNote}>
                      {preview.laterBillCount} later bill
                      {preview.laterBillCount === 1 ? '' : 's'} will be
                      recalculated when this is saved.
                    </Text>
                  )}

                  {/* Pre-filled with the full amount owed. Lower it for a part
                      payment; the difference carries to next month. */}
                  <View style={styles.payableLabelRow}>
                    <Text style={styles.inputLabel}>Paying now</Text>
                    {!billSettled && Number(paidAmount || 0) !== totalPayable && (
                      <TouchableOpacity
                        onPress={() => setPaidAmount(totalPayable.toFixed(2))}
                      >
                        <Text style={styles.payFullLink}>
                          Pay full {money(totalPayable)}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={paidAmount}
                    onChangeText={setPaidAmount}
                    editable={!billSettled}
                  />

                  <Text style={styles.inputLabel}>
                    Remaining, carries to next month
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      styles.readOnlyInput,
                      remainingAfterPayment > 0 && { color: MONTH_COLORS.Unpaid },
                    ]}
                    value={remainingAfterPayment.toFixed(2)}
                    editable={false}
                  />

                  {/* Payment Type */}
                  <Text style={styles.inputLabel}>Payment Type</Text>
                  <View style={styles.segment}>
                    {['UPI', 'Cash', 'Card'].map(type => {
                      const active = paymentType === type;
                      return (
                        <TouchableOpacity
                          key={type}
                          style={[
                            styles.segmentItem,
                            active && styles.segmentItemActive,
                          ]}
                          disabled={billSettled}
                          onPress={() => setPaymentType(type)}
                        >
                          <Text
                            style={[
                              styles.segmentText,
                              active && styles.segmentTextActive,
                            ]}
                          >
                            {type}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Settled is derived on the server from the amount paid, so
                      there is no Yes/No toggle to contradict it. */}
                  <Text
                    style={[
                      styles.billNote,
                      {
                        color:
                          remainingAfterPayment > 0
                            ? MONTH_COLORS.Partial
                            : MONTH_COLORS.Paid,
                      },
                    ]}
                  >
                    {remainingAfterPayment > 0
                      ? `Part payment. ${money(
                          remainingAfterPayment,
                        )} carries to the next month.`
                      : 'Full payment. This bill will be marked settled.'}
                  </Text>

                  <TouchableOpacity
                    style={[
                      styles.saveBtn,
                      (savingBill || billSettled) && styles.disabledBtn,
                    ]}
                    disabled={savingBill || billSettled}
                    onPress={handleSaveBill}
                  >
                    <Text style={styles.btnText}>
                      {savingBill ? 'Saving...' : 'Save Bill'}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default CustomerDetails;

// ============================ Styles ============================
const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: PAGE_BG,
  },
  pageContent: {
    padding: 12,
    paddingBottom: 4,
  },
  topScroll: {
    flexGrow: 0,
    flexShrink: 1,
  },

  // ---------- Shared card ----------
  card: {
    backgroundColor: COLORS.background,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ECEEF1',
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  cardTitle: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  cardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardHeaderYear: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: COLORS.textSecondary,
    marginLeft: 8,
  },

  // ---------- Customer header ----------
  heroRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatar: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 2,
    borderColor: '#ECEEF1',
  },
  heroInfo: {
    flex: 1,
    marginLeft: 12,
  },
  customerName: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.textPrimary,
  },
  customerMeta: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  heroDate: {
    alignItems: 'flex-end',
  },
  heroDateLabel: {
    fontFamily: FONTS.medium,
    fontSize: 9,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
  },
  heroDateValue: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: COLORS.primary,
    marginTop: 2,
  },
  chipRow: {
    flexDirection: 'row',
    marginTop: 12,
  },
  chip: {
    flex: 1,
    backgroundColor: '#F4F6F8',
    borderRadius: 10,
    paddingVertical: 7,
    alignItems: 'center',
    marginRight: 8,
  },
  chipLabel: {
    fontFamily: FONTS.medium,
    fontSize: 9,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
  },
  chipValue: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: COLORS.textPrimary,
    marginTop: 1,
  },
  contactRow: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F2F4',
  },
  contactItem: {
    flex: 1,
    paddingRight: 8,
  },
  contactLabel: {
    fontFamily: FONTS.medium,
    fontSize: 9,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
  },
  contactValue: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textPrimary,
    marginTop: 2,
  },

  // ---------- Actions ----------
  actionRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: '#DDE1E6',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
    marginRight: 8,
  },
  actionPrimary: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  actionText: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: COLORS.primary,
  },
  actionPrimaryText: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: COLORS.background,
  },

  // ---------- Month grid ----------
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  monthBox: {
    // Six per row rather than four: twelve months fit in two rows instead of
    // three, which is about 60px of page height back.
    width: '16.66%',
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'transparent',
    transform: [{ scale: 0.94 }],
  },
  monthBoxActive: {
    borderColor: COLORS.primary,
  },
  monthBar: {
    width: 14,
    height: 3,
    borderRadius: 2,
    marginBottom: 5,
  },
  monthBoxText: {
    fontFamily: FONTS.bold,
    fontSize: 10,
  },
  // Takes whatever height is left below the fixed section above, so the rows
  // are the only thing that scrolls here.
  entriesSection: {
    flex: 1,
    minHeight: 180,
    marginHorizontal: 12,
    marginBottom: 12,
    backgroundColor: COLORS.background,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ECEEF1',
    padding: 14,
    paddingBottom: 0,
  },
  tableListContent: {
    paddingBottom: 14,
  },

  statusDetail: {
    marginTop: 4,
    backgroundColor: '#F7F9FB',
    borderRadius: 10,
    padding: 10,
  },
  statusDetailHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statusDetailTitle: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: COLORS.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9,
  },
  statusBadgeText: {
    fontFamily: FONTS.medium,
    fontSize: 9,
    color: COLORS.background,
  },
  statusDetailMuted: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  statRow: {
    flexDirection: 'row',
  },
  statCell: {
    flex: 1,
  },
  statLabel: {
    fontFamily: FONTS.medium,
    fontSize: 9,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
  },
  statValue: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: COLORS.textPrimary,
    marginTop: 2,
  },

  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 2,
    marginRight: 4,
  },
  legendText: {
    fontFamily: FONTS.regular,
    fontSize: 9,
    color: COLORS.textSecondary,
  },

  // ---------- Entries table ----------
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  headerText: {
    flex: 1,
    textAlign: 'center',
    color: COLORS.background,
    fontFamily: FONTS.bold,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  colDate: {
    flex: 1.3,
    textAlign: 'left',
  },
  colTotal: {
    flex: 1.3,
    textAlign: 'right',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2F4',
  },
  tableRowAlt: {
    backgroundColor: '#FAFBFC',
  },
  rowText: {
    flex: 1,
    textAlign: 'center',
    color: COLORS.textPrimary,
    fontFamily: FONTS.regular,
    fontSize: 12,
  },
  rowTotal: {
    flex: 1.3,
    textAlign: 'right',
    color: COLORS.primary,
    fontFamily: FONTS.bold,
    fontSize: 12,
  },
  tableEmpty: {
    paddingVertical: 22,
    alignItems: 'center',
  },
  noEntries: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textSecondary,
  },

  // ---------- Modals ----------
  centeredModal: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  centeredContent: {
    width: '90%',
    backgroundColor: COLORS.background,
    padding: 18,
    borderRadius: 16,
    elevation: 10,
  },
  modalTitle: {
    fontFamily: FONTS.bold,
    fontSize: 17,
    marginBottom: 14,
    color: COLORS.textPrimary,
  },
  fieldRow: {
    flexDirection: 'row',
  },
  fieldHalf: {
    flex: 1,
    marginRight: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#DDE1E6',
    backgroundColor: '#FBFCFD',
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  readOnlyInput: {
    backgroundColor: '#F1F3F5',
    color: COLORS.textSecondary,
  },
  inputLabel: {
    fontFamily: FONTS.medium,
    fontSize: 10,
    color: COLORS.textSecondary,
    marginBottom: 5,
    textTransform: 'uppercase',
  },
  datePickerBtn: {
    borderWidth: 1,
    borderColor: '#DDE1E6',
    backgroundColor: '#FBFCFD',
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 12,
  },
  datePickerText: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  totalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F4F6F8',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 2,
    marginBottom: 14,
  },
  totalBannerLabel: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
  },
  totalBannerValue: {
    fontFamily: FONTS.bold,
    fontSize: 17,
    color: COLORS.primary,
  },
  summaryBlock: {
    backgroundColor: '#F7F9FB',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  summaryLabel: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  summaryValue: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: COLORS.textPrimary,
  },
  summaryLabelStrong: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  summaryValueStrong: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: COLORS.primary,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#E6E9EC',
    marginVertical: 6,
  },
  payableLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  payFullLink: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    color: COLORS.primary,
    marginBottom: 5,
  },
  billNote: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: '#F1F3F5',
    borderRadius: 10,
    padding: 3,
    marginBottom: 12,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  segmentItemActive: {
    backgroundColor: COLORS.primary,
  },
  segmentText: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  segmentTextActive: {
    color: COLORS.background,
    fontFamily: FONTS.bold,
  },
  modalButtons: {
    flexDirection: 'row',
  },
  cancelBtn: {
    backgroundColor: '#8A94A0',
    paddingVertical: 12,
    borderRadius: 10,
    flex: 1,
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 10,
    flex: 1,
  },
  disabledBtn: {
    backgroundColor: '#B0B7C3',
  },
  btnText: {
    color: COLORS.background,
    textAlign: 'center',
    fontFamily: FONTS.bold,
    fontSize: 13,
  },
  crossBtn: {
    position: 'absolute',
    top: 2,
    right: 2,
    padding: 6,
    zIndex: 2,
  },
  crossText: {
    fontSize: 18,
    color: COLORS.textSecondary,
  },
});
