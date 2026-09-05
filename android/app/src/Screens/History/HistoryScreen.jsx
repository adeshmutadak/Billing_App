import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  FlatList,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Modal,
  RefreshControl,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { COLORS, FONTS, SIZES } from '../../utils/theme';
import ScreenHeader from '../../components/ScreenHeader';
import { useToast } from '../../components/Toast';
import {
  MONTHS,
  STATUS_COLORS,
  statusLabel,
  photoSource,
  money,
  shortDate,
  yearOptions,
  fetchBillHistory,
} from '../../API/billHistory';

const defaultCustomerImg = require('../../Assets/Images/logo.jpg');

// Reads bills.IsPaymentDone through the month's isPaid flag.
// Filters on paymentStatus rather than the isPaid boolean, so a part paid
// month is not lumped in with the ones nothing has been received for.
const STATUS_FILTERS = [
  { value: null, label: 'All' },
  { value: 'Paid', label: 'Paid' },
  { value: 'Partial', label: 'Part paid' },
  { value: 'Unpaid', label: 'Unpaid' },
];

/** Tappable pill that opens a single-choice list. */
const Dropdown = ({ label, value, onPress }) => (
  <TouchableOpacity style={styles.dropdown} onPress={onPress}>
    <View style={{ flex: 1 }}>
      <Text style={styles.dropdownLabel}>{label}</Text>
      <Text style={styles.dropdownValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
    <Ionicons name="chevron-down" size={18} color={COLORS.primary} />
  </TouchableOpacity>
);

const PickerModal = ({ visible, title, options, selected, onSelect, onClose }) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={onClose}>
      <View style={styles.pickerCard}>
        <Text style={styles.pickerTitle}>{title}</Text>
        <ScrollView>
          {options.map(option => {
            const active = selected === option.value;
            return (
              <TouchableOpacity
                key={String(option.value)}
                style={styles.pickerRow}
                onPress={() => onSelect(option.value)}
              >
                <Text
                  style={[styles.pickerRowText, active && styles.pickerRowActive]}
                >
                  {option.label}
                </Text>
                {active && (
                  <Ionicons name="checkmark" size={18} color={COLORS.primary} />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </TouchableOpacity>
  </Modal>
);

const HistoryScreen = ({ navigation }) => {
  const now = new Date();

  const toast = useToast();

  // No server endpoint for the year list any more, so it is built locally.
  const years = useMemo(() => yearOptions(5), []);

  const [year, setYear] = useState(years[0]);
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [statusFilter, setStatusFilter] = useState(null);

  const [customers, setCustomers] = useState([]);
  const [message, setMessage] = useState(null);

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [yearPickerOpen, setYearPickerOpen] = useState(false);
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [detail, setDetail] = useState(null);

  // One request per year. Month and status are applied locally, so tapping a
  // chip or changing the month costs no network call.
  const loadYear = useCallback(async selectedYear => {
    if (!selectedYear) {
      return;
    }
    setError(null);
    try {
      const result = await fetchBillHistory({
        year: selectedYear,
        includeDetail: true,
      });
      setCustomers(result.customers);
      setMessage(result.message);
    } catch (err) {
      toast.error('Could not load history');
      setCustomers([]);
      setMessage(null);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      await loadYear(year);
      if (!cancelled) {
        setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [year, loadYear]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadYear(year);
    setRefreshing(false);
  };

  // One row per customer for the selected month, so the list reads exactly like
  // the customer screen.
  const rows = useMemo(() => {
    return customers
      .map(customer => {
        const monthData = (customer.months ?? []).find(m => m.month === month);
        return {
          customer,
          month: monthData ?? null,
          status: monthData?.paymentStatus ?? 'NoActivity',
          totalAmount: Number(monthData?.totalAmount ?? 0),
          remainingAmount: Number(monthData?.remainingAmount ?? 0),
          isPaid: !!monthData?.isPaid,
        };
      })
      .filter(row => {
        if (statusFilter === null) {
          return true;
        }
        return row.status === statusFilter;
      });
  }, [customers, month, statusFilter]);

  const monthLabel = MONTHS.find(m => m.value === month)?.label ?? '';

  // Reuses the existing bill screen for printing, by shaping the day rows into
  // the milkEntries structure GenerateBill already expects.
  const openBill = () => {
    if (!detail?.month) {
      return;
    }
    const milkEntries = (detail.month.days ?? [])
      .filter(d => d.entryId != null)
      .map(d => ({
        entryId: d.entryId,
        date: d.date,
        cowLitre: d.cowLitre,
        cowRate: d.cowRate,
        buffaloLitre: d.buffaloLitre,
        buffaloRate: d.buffaloRate,
        totalAmount: d.totalAmount,
      }));

    const customerForBill = {
      ...detail.customer,
      remainingAmount: detail.month.remainingAmount,
    };

    setDetail(null);
    navigation.navigate('GenerateBill', { customer: customerForBill, milkEntries });
  };

  const monthDetail = detail?.month ?? null;
  const entries = (monthDetail?.days ?? []).filter(d => d.entryId != null);

  return (
    <View style={styles.container}>
      <ScreenHeader title="History" />

      {/* Year on the left, month on the right */}
      <View style={styles.filterRow}>
        <Dropdown
          label="Year"
          value={year ? String(year) : '-'}
          onPress={() => setYearPickerOpen(true)}
        />
        <View style={{ width: 12 }} />
        <Dropdown
          label="Month"
          value={monthLabel}
          onPress={() => setMonthPickerOpen(true)}
        />
      </View>

      <View style={styles.statusRow}>
        {STATUS_FILTERS.map(option => {
          const active = statusFilter === option.value;
          return (
            <TouchableOpacity
              key={String(option.value)}
              style={[styles.statusChip, active && styles.statusChipActive]}
              onPress={() => setStatusFilter(option.value)}
            >
              <Text
                style={[styles.statusChipText, active && styles.statusChipTextActive]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={item => String(item.customer.customerId)}
          contentContainerStyle={{ paddingBottom: 30, paddingTop: 4 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {customers.length === 0
                ? message || `No customers for ${year}`
                : `No customers match this filter for ${monthLabel} ${year}`}
            </Text>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() =>
                setDetail({ customer: item.customer, month: item.month })
              }
            >
              <Image
                source={photoSource(item.customer.photoUrl, defaultCustomerImg)}
                style={styles.customerImg}
              />

              <View style={styles.cardBody}>
                <Text style={styles.customerName} numberOfLines={1}>
                  {item.customer.name}
                </Text>
                <Text style={styles.customerDetails} numberOfLines={1}>
                  {item.customer.phoneNumber}
                </Text>
                <Text style={styles.customerDetails} numberOfLines={1}>
                  {item.customer.address}
                </Text>
              </View>

              <View style={styles.cardRight}>
                <Text style={styles.cardAmount}>{money(item.totalAmount)}</Text>
                <View
                  style={[
                    styles.statusPill,
                    { backgroundColor: STATUS_COLORS[item.status] },
                  ]}
                >
                  <Text style={styles.statusPillText}>
                    {statusLabel(item.status)}
                  </Text>
                </View>
                {item.remainingAmount > 0 && (
                  <Text style={styles.cardDue}>
                    {money(item.remainingAmount)} due
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      <PickerModal
        visible={yearPickerOpen}
        title="Select year"
        options={years.map(y => ({ value: y, label: String(y) }))}
        selected={year}
        onSelect={value => {
          setYear(value);
          setYearPickerOpen(false);
        }}
        onClose={() => setYearPickerOpen(false)}
      />

      <PickerModal
        visible={monthPickerOpen}
        title="Select month"
        options={MONTHS}
        selected={month}
        onSelect={value => {
          setMonth(value);
          setMonthPickerOpen(false);
        }}
        onClose={() => setMonthPickerOpen(false)}
      />

      {/* Read-only bill-style popup. Nothing here edits the customer. */}
      <Modal
        visible={!!detail}
        transparent
        animationType="slide"
        onRequestClose={() => setDetail(null)}
      >
        <View style={styles.detailOverlay}>
          <View style={styles.detailCard}>
            <View style={styles.detailHeader}>
              <Text style={styles.detailTitle}>
                {monthLabel} {year}
              </Text>
              <TouchableOpacity onPress={() => setDetail(null)}>
                <Ionicons name="close" size={24} color={COLORS.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.detailBody}>
              <View style={styles.readOnlyBanner}>
                <Ionicons name="lock-closed" size={13} color={COLORS.textSecondary} />
                <Text style={styles.readOnlyText}>View only</Text>
              </View>

              <View style={styles.customerHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.billName}>{detail?.customer?.name}</Text>
                  <Text style={styles.billText}>
                    {detail?.customer?.phoneNumber}
                  </Text>
                  <Text style={styles.billText}>{detail?.customer?.address}</Text>
                  <Text style={styles.billText}>
                    Cow ₹{detail?.customer?.cowRate} | Buffalo ₹
                    {detail?.customer?.buffaloRate}
                  </Text>
                </View>
                <Image
                  source={photoSource(detail?.customer?.photoUrl, defaultCustomerImg)}
                  style={styles.photo}
                />
              </View>

              <View style={styles.tableHeader}>
                <Text style={[styles.header, { flex: 0.6 }]}>Sr</Text>
                <Text style={[styles.header, { flex: 1.3 }]}>Date</Text>
                <Text style={styles.header}>Cow L</Text>
                <Text style={styles.header}>Cow ₹</Text>
                <Text style={styles.header}>Buff L</Text>
                <Text style={styles.header}>Buff ₹</Text>
                <Text style={[styles.header, { flex: 1.3 }]}>Total</Text>
              </View>

              {entries.length === 0 ? (
                <Text style={styles.noEntries}>No entries for this month</Text>
              ) : (
                entries.map((item, index) => (
                  <View key={String(item.entryId)} style={styles.tableRow}>
                    <Text style={[styles.cell, { flex: 0.6 }]}>{index + 1}</Text>
                    <Text style={[styles.cell, { flex: 1.3 }]}>
                      {shortDate(item.date)}
                    </Text>
                    <Text style={styles.cell}>
                      {Number(item.cowLitre ?? 0).toFixed(2)}
                    </Text>
                    <Text style={styles.cell}>
                      {Number(item.cowRate ?? 0).toFixed(0)}
                    </Text>
                    <Text style={styles.cell}>
                      {Number(item.buffaloLitre ?? 0).toFixed(2)}
                    </Text>
                    <Text style={styles.cell}>
                      {Number(item.buffaloRate ?? 0).toFixed(0)}
                    </Text>
                    <Text style={[styles.totalCell, { flex: 1.3 }]}>
                      {money(item.totalAmount)}
                    </Text>
                  </View>
                ))
              )}

              <View style={styles.summaryCard}>
                <View style={styles.summaryLine}>
                  <Text style={styles.summaryLeft}>Cow litres</Text>
                  <Text style={styles.summaryPlain}>
                    {Number(monthDetail?.totalCowLitre ?? 0).toFixed(2)}
                  </Text>
                </View>
                <View style={styles.summaryLine}>
                  <Text style={styles.summaryLeft}>Buffalo litres</Text>
                  <Text style={styles.summaryPlain}>
                    {Number(monthDetail?.totalBuffaloLitre ?? 0).toFixed(2)}
                  </Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.summaryLine}>
                  <Text style={styles.summaryLeft}>Total</Text>
                  <Text style={styles.summaryRight}>
                    {money(monthDetail?.totalAmount)}
                  </Text>
                </View>
                {/* Brought forward from earlier months. Without this row, a month
                    showing Total 200 and Received 300 looks wrong; the extra 100
                    settled an older bill. */}
                <View style={styles.summaryLine}>
                  <Text style={styles.summaryLeft}>Previous balance</Text>
                  <Text
                    style={[
                      styles.summaryRight,
                      Number(monthDetail?.previousBalance ?? 0) > 0 && {
                        color: STATUS_COLORS.Unpaid,
                      },
                    ]}
                  >
                    {money(monthDetail?.previousBalance)}
                  </Text>
                </View>
                <View style={styles.summaryLine}>
                  <Text style={styles.summaryLeft}>Total payable</Text>
                  <Text style={styles.summaryRight}>
                    {money(monthDetail?.payableAmount)}
                  </Text>
                </View>

                <View style={styles.summaryLine}>
                  <Text style={styles.summaryLeft}>Received</Text>
                  <Text style={[styles.summaryRight, { color: STATUS_COLORS.Paid }]}>
                    {money(monthDetail?.paidAmount)}
                  </Text>
                </View>
                <View style={styles.summaryLine}>
                  <Text style={styles.summaryLeft}>Remaining</Text>
                  <Text
                    style={[
                      styles.summaryRight,
                      {
                        color:
                          Number(monthDetail?.remainingAmount ?? 0) > 0
                            ? STATUS_COLORS.Unpaid
                            : COLORS.textPrimary,
                      },
                    ]}
                  >
                    {money(monthDetail?.remainingAmount)}
                  </Text>
                </View>
                <View style={styles.summaryLine}>
                  <Text style={styles.summaryLeft}>Status</Text>
                  <Text
                    style={[
                      styles.summaryRight,
                      {
                        color:
                          STATUS_COLORS[monthDetail?.paymentStatus] ??
                          COLORS.textPrimary,
                      },
                    ]}
                  >
                    {monthDetail?.paymentStatus ?? '-'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.billBtn, entries.length === 0 && styles.billBtnDisabled]}
                disabled={entries.length === 0}
                onPress={openBill}
              >
                <Text style={styles.billBtnText}>Open bill / Print</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default HistoryScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.padding,
    paddingVertical: 16,
  },
  screenTitle: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
  },
  filterRow: {
    flexDirection: 'row',
    marginHorizontal: SIZES.margin,
  },
  dropdown: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radius,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dropdownLabel: {
    fontSize: 10,
    fontFamily: FONTS.medium,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
  },
  dropdownValue: {
    fontSize: 15,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
  },
  statusRow: {
    flexDirection: 'row',
    marginHorizontal: SIZES.margin,
    marginTop: 12,
    marginBottom: 8,
  },
  statusChip: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 8,
  },
  statusChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  statusChipText: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: COLORS.textPrimary,
  },
  statusChipTextActive: {
    color: COLORS.background,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radius,
    marginHorizontal: SIZES.margin,
    marginBottom: 12,
    padding: 15,
    elevation: 2,
  },
  customerImg: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  cardBody: {
    flex: 1,
    marginLeft: 14,
  },
  customerName: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
  },
  customerDetails: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  cardRight: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  cardAmount: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
  },
  statusPill: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusPillText: {
    color: COLORS.background,
    fontSize: 10,
    fontFamily: FONTS.medium,
  },
  cardDue: {
    marginTop: 4,
    fontSize: 11,
    fontFamily: FONTS.regular,
    color: STATUS_COLORS.Unpaid,
  },
  errorText: {
    marginHorizontal: SIZES.margin,
    marginTop: 8,
    fontFamily: FONTS.regular,
    color: STATUS_COLORS.Unpaid,
    fontSize: 13,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    marginHorizontal: SIZES.margin,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
  },

  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  pickerCard: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radius,
    maxHeight: '60%',
    paddingVertical: 12,
  },
  pickerTitle: {
    fontSize: 15,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  pickerRowText: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.textPrimary,
  },
  pickerRowActive: {
    fontFamily: FONTS.bold,
    color: COLORS.primary,
  },

  detailOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  detailCard: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    maxHeight: '92%',
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.padding,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  detailTitle: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
  },
  detailBody: {
    padding: SIZES.padding,
    paddingBottom: 30,
  },
  readOnlyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#F1F2F4',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  readOnlyText: {
    marginLeft: 5,
    fontSize: 11,
    fontFamily: FONTS.medium,
    color: COLORS.textSecondary,
  },
  customerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  billName: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.textPrimary,
  },
  billText: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  photo: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    paddingVertical: 6,
    marginTop: 10,
  },
  header: {
    flex: 1,
    textAlign: 'center',
    color: '#fff',
    fontFamily: FONTS.bold,
    fontSize: 11,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  cell: {
    flex: 1,
    textAlign: 'center',
    fontFamily: FONTS.medium,
    fontSize: 11,
    color: COLORS.textPrimary,
  },
  totalCell: {
    flex: 1,
    textAlign: 'center',
    fontFamily: FONTS.bold,
    fontSize: 11,
    color: COLORS.secondary,
  },
  noEntries: {
    textAlign: 'center',
    paddingVertical: 20,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
  },
  summaryCard: {
    marginTop: 20,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  summaryLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  summaryLeft: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  summaryPlain: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  summaryRight: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: COLORS.primary,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 8,
  },
  billBtn: {
    marginTop: 22,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: SIZES.radius,
  },
  billBtnDisabled: {
    backgroundColor: '#B0B7C3',
  },
  billBtnText: {
    color: COLORS.background,
    textAlign: 'center',
    fontFamily: FONTS.bold,
    fontSize: 15,
  },
});
