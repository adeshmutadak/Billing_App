import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  Image,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Modal,
  RefreshControl,
  Keyboard,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import RNPrint from 'react-native-print';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useToast } from '../../components/Toast';
import { allCustomersBillHtml, withPhotos } from '../../utils/billHtml';
import { COLORS, FONTS, SIZES } from '../../utils/theme';
import AddCustomerScreen from './AddCustomerScreen';
import {
  MONTHS,
  STATUS_COLORS,
  statusLabel,
  photoSource,
  money,
  fetchBillHistory,
} from '../../API/billHistory';

const defaultCustomerImg = require('../../Assets/Images/logo.jpg');

// Filters on paymentStatus rather than the isPaid boolean, so a part paid
// month is not lumped in with the ones nothing has been received for.
const STATUS_FILTERS = [
  { value: null, label: 'All' },
  { value: 'Paid', label: 'Paid' },
  { value: 'Partial', label: 'Part paid' },
  { value: 'Unpaid', label: 'Unpaid' },
];

const MAX_SUGGESTIONS = 8;

const normalize = value => String(value ?? '').toLowerCase();

const CustomerHomeScreen = ({ navigation }) => {
  const now = new Date();

  // The home screen is always the current year. The history screen is the same
  // screen logic against a past year, through the same endpoint.
  const year = now.getFullYear();

  const [month, setMonth] = useState(now.getMonth() + 1);
  const [statusFilter, setStatusFilter] = useState(null);

  const [customers, setCustomers] = useState([]);
  const [message, setMessage] = useState(null);
  const toast = useToast();

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [printingAll, setPrintingAll] = useState(false);

  const [searchText, setSearchText] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [loggedUser, setLoggedUser] = useState('');

  useEffect(() => {
    const fetchUserName = async () => {
      const name = await AsyncStorage.getItem('userName');
      if (name) {
        setLoggedUser(name.charAt(0).toUpperCase());
      }
    };
    fetchUserName();
  }, []);

  // One request for the whole year. Month, status and search are applied
  // locally, so every filter tap is instant.
  const loadYear = useCallback(async () => {
    try {
      const result = await fetchBillHistory({ year, includeDetail: true });
      setCustomers(result.customers);
      setMessage(result.message);
    } catch (err) {
      setCustomers([]);
      setMessage(null);
      toast.error('Could not load customers');
    }
  }, [year]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      await loadYear();
      if (!cancelled) {
        setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [loadYear]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadYear();
    setRefreshing(false);
  };

  // One row per customer for the selected month.
  const rows = useMemo(() => {
    const needle = searchText.trim().toLowerCase();

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
        if (statusFilter !== null && row.status !== statusFilter) {
          return false;
        }

        if (!needle) {
          return true;
        }

        const c = row.customer;
        return (
          normalize(c.name).includes(needle) ||
          normalize(c.phoneNumber).includes(needle) ||
          normalize(c.address).includes(needle)
        );
      });
  }, [customers, month, statusFilter, searchText]);

  // The whole year is already loaded, so search needs no request.
  const suggestions = useMemo(() => {
    if (!searchText.trim()) {
      return [];
    }
    return rows.slice(0, MAX_SUGGESTIONS);
  }, [rows, searchText]);

  const monthLabel = MONTHS.find(m => m.value === month)?.label ?? '';

  // Every customer's bill for the selected month in one print job, four to an
  // A4 sheet. The year is already loaded with includeDetail, so each month
  // carries its own days and no extra request is needed.
  const printAllBills = async () => {
    const withEntries = customers.filter(c => {
      const m = (c.months ?? []).find(x => x.month === month);
      return (m?.days ?? []).some(d => d.entryId != null);
    });

    if (withEntries.length === 0) {
      toast.warning(`No customer has entries for ${monthLabel} ${year}`);
      return;
    }

    setPrintingAll(true);
    try {
      await RNPrint.print({
        // Photos are downloaded and inlined in parallel first; one that fails
        // is simply omitted rather than blocking the whole job.
        html: allCustomersBillHtml({
          customers: await withPhotos(withEntries),
          month,
          year,
        }),
        fileName: `Bills_${monthLabel}_${year}`,
        jobName: `Milk bills ${monthLabel} ${year}`,
      });
    } catch (err) {
      console.log('[PrintAll] failed', err);
      toast.error('Could not print the bills');
    } finally {
      setPrintingAll(false);
    }
  };

  const openCustomer = customer => {
    setShowSuggestions(false);
    Keyboard.dismiss();
    // The customer object carries customerId, name, phoneNumber, cowRate and
    // buffaloRate, which is everything CustomerDetails needs.
    navigation.navigate('CustomerDetails', { customer });
  };

  const keyOf = (item, index) => String(item?.customer?.customerId ?? index);

  return (
    <View style={styles.container}>
      {menuVisible && (
        <Pressable style={styles.overlay} onPress={() => setMenuVisible(false)} />
      )}

      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => setMenuVisible(!menuVisible)}>
          <Text style={styles.hamburger}>&#9776;</Text>
        </TouchableOpacity>
        <Text style={styles.yearLabel}>{year}</Text>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{loggedUser}</Text>
        </View>
      </View>

      {menuVisible && (
        <View style={styles.menuBox}>
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuText}>Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              setMenuVisible(false);
              navigation.navigate('History');
            }}
          >
            <Text style={styles.menuText}>History</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={async () => {
              await AsyncStorage.removeItem('token');
              toast.success('Logged out successfully');
            }}
          >
            <Text style={[styles.menuText, { color: 'red' }]}>Logout</Text>
          </TouchableOpacity>
        </View>
      )}


      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Ionicons
            name="search"
            size={18}
            color={COLORS.textSecondary}
            style={styles.searchIcon}
          />
          <TextInput
            placeholder="Search by name, phone or address"
            placeholderTextColor={COLORS.textSecondary}
            style={styles.searchInput}
            value={searchText}
            onChangeText={text => {
              setSearchText(text);
              setShowSuggestions(text.trim().length > 0);
            }}
            onFocus={() => setShowSuggestions(searchText.trim().length > 0)}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />

          {searchText.length > 0 && (
            <TouchableOpacity
              style={styles.trailingIcon}
              onPress={() => {
                setSearchText('');
                setShowSuggestions(false);
              }}
            >
              <Ionicons name="close-circle" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}

          {showSuggestions && (
            <View style={styles.suggestionBox}>
              {suggestions.length === 0 ? (
                <Text style={styles.suggestionEmpty}>No matches</Text>
              ) : (
                <FlatList
                  data={suggestions}
                  keyExtractor={keyOf}
                  keyboardShouldPersistTaps="handled"
                  nestedScrollEnabled
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.suggestionItem}
                      onPress={() => openCustomer(item.customer)}
                    >
                      <Text style={styles.suggestionName} numberOfLines={1}>
                        {item.customer.name}
                      </Text>
                      <Text style={styles.suggestionMeta} numberOfLines={1}>
                        {[item.customer.phoneNumber, item.customer.address]
                          .filter(Boolean)
                          .join(' - ')}
                      </Text>
                    </TouchableOpacity>
                  )}
                />
              )}
            </View>
          )}
        </View>
      </View>

      {/* Month and payment filters, the same set the history screen uses */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={styles.monthPill}
          onPress={() => setMonthPickerOpen(true)}
        >
          <Text style={styles.monthPillText}>{monthLabel}</Text>
          <Ionicons name="chevron-down" size={16} color={COLORS.primary} />
        </TouchableOpacity>

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

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={keyOf}
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={() => setShowSuggestions(false)}
          contentContainerStyle={{ paddingBottom: 90 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {customers.length === 0
                ? message || `No customers for ${year}`
                : `No customers match this filter for ${monthLabel}`}
            </Text>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => openCustomer(item.customer)}
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
                <Text style={styles.customerDetails} numberOfLines={2}>
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

      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={[styles.navBtn, printingAll && styles.navBtnBusy]}
          disabled={printingAll}
          onPress={printAllBills}
        >
          <Text style={styles.navText}>
            {printingAll ? 'Preparing...' : `Print ${monthLabel} bills`}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navBtn} onPress={() => setShowAddModal(true)}>
          <Text style={styles.navText}>Add Customer</Text>
        </TouchableOpacity>
      </View>

      {/* Month picker */}
      <Modal
        visible={monthPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMonthPickerOpen(false)}
      >
        <TouchableOpacity
          style={styles.pickerOverlay}
          activeOpacity={1}
          onPress={() => setMonthPickerOpen(false)}
        >
          <View style={styles.pickerCard}>
            <Text style={styles.pickerTitle}>Select month</Text>
            <ScrollView>
              {MONTHS.map(option => {
                const active = month === option.value;
                return (
                  <TouchableOpacity
                    key={String(option.value)}
                    style={styles.pickerRow}
                    onPress={() => {
                      setMonth(option.value);
                      setMonthPickerOpen(false);
                    }}
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

      <AddCustomerScreen
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={() => {
          setShowAddModal(false);
          loadYear();
        }}
      />
    </View>
  );
};

export default CustomerHomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    zIndex: 1,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SIZES.padding,
    paddingVertical: 20,
  },
  hamburger: {
    fontSize: 30,
    color: COLORS.primary,
    fontFamily: FONTS.bold,
    zIndex: 2,
  },
  yearLabel: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 50,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: COLORS.background,
    fontSize: 18,
    fontFamily: FONTS.bold,
  },
  menuBox: {
    position: 'absolute',
    top: 65,
    left: 15,
    width: 150,
    backgroundColor: COLORS.background,
    paddingVertical: 10,
    borderRadius: 10,
    elevation: 5,
    zIndex: 3,
  },
  menuItem: {
    paddingVertical: 12,
    paddingHorizontal: 15,
  },
  menuText: {
    fontSize: 15,
    fontFamily: FONTS.medium,
    color: COLORS.textPrimary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SIZES.margin,
    zIndex: 20,
  },
  searchInputWrapper: {
    flex: 1,
    position: 'relative',
    justifyContent: 'center',
  },
  searchIcon: {
    position: 'absolute',
    left: 12,
    zIndex: 1,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 12,
    paddingLeft: 38,
    paddingRight: 40,
    borderRadius: SIZES.radius,
    fontFamily: FONTS.regular,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.background,
  },
  trailingIcon: {
    position: 'absolute',
    right: 12,
  },
  suggestionBox: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    maxHeight: 260,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radius,
    elevation: 8,
    zIndex: 30,
    overflow: 'hidden',
  },
  suggestionItem: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  suggestionName: {
    fontSize: 15,
    fontFamily: FONTS.medium,
    color: COLORS.textPrimary,
  },
  suggestionMeta: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  suggestionEmpty: {
    padding: 14,
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SIZES.margin,
    marginTop: 12,
    marginBottom: 10,
  },
  monthPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 10,
  },
  monthPillText: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
    marginRight: 4,
  },
  statusChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
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
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    marginHorizontal: SIZES.margin,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: COLORS.background,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 14,
    borderTopWidth: 1,
    borderColor: COLORS.border,
    elevation: 10,
  },
  navBtnBusy: {
    backgroundColor: '#B0B7C3',
  },
  navBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 15,
    elevation: 3,
  },
  navText: {
    fontFamily: FONTS.medium,
    color: COLORS.background,
    fontSize: 15,
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
});
