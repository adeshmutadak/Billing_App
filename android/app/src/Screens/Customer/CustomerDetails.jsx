import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  Modal,
  TextInput,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS, FONTS, SIZES } from '../../utils/theme';
import config from '../../config';
import MessageBox from '../../utils/MessageBox';

const defaultCustomerImg = require('../../Assets/Images/logo.jpg');

const CustomerDetails = ({ route, navigation }) => {
  const { customer } = route.params;
  const api = React.useMemo(() => axios.create(), []);

  const [userId, setUserId] = useState(null);
  const [milkEntries, setMilkEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [message, setMessage] = useState(null);

  // Add Entry Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [entryDate, setEntryDate] = useState(new Date());
  const [cowLitre, setCowLitre] = useState('');
  const [buffaloLitre, setBuffaloLitre] = useState('');
  const [cowRate, setCowRate] = useState(customer.cowRate);
  const [buffaloRate, setBuffaloRate] = useState(customer.buffaloRate);

  // Update Entry Modal
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [showEntryModal, setShowEntryModal] = useState(false);

  const formatDate = (date) => {
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
    setMessage(null);
  };

  // Axios interceptor
  useEffect(() => {
    api.interceptors.request.use(async (req) => {
      const token = await AsyncStorage.getItem('token');
      if (token) req.headers.Authorization = `Bearer ${token}`;
      return req;
    });
  }, [api]);

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
  }, [userId]);

  const fetchMilkEntries = async () => {
    setLoading(true);
    try {
      const response = await api.get(
        `${config.BASE_URL}${config.ENDPOINTS.GET_CUSTOMER_DETAILS}?customerId=${customer.customerId}&userId=${userId}`
      );
      if (response.data?.data && Array.isArray(response.data.data)) {
        setMilkEntries(response.data.data);
      } else {
        setMilkEntries([]);
      }
    } catch (error) {
      console.error('Milk entries API error:', error.message);
      setMilkEntries([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEntry = async () => {
    if (!cowLitre && !buffaloLitre) {
      setMessage({ type: 'warning', text: 'Enter cow or buffalo litres' });
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
      const response = await api.post(
        `${config.BASE_URL}${config.ENDPOINTS.ADD_MILK_ENTRY}`,
        payload
      );

      if (response.data.success) {
        setMessage({ type: 'success', text: 'Milk entry added successfully' });
        fetchMilkEntries();
        setTimeout(() => {
          resetEntryForm();
          setShowAddModal(false);
        }, 1200);
      } else {
        setMessage({ type: 'error', text: response.data?.message || 'Failed to add entry' });
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Server error. Try again.' });
    }
  };

  const handleUpdateEntry = async () => {
console.log("Update Button Clicked")

    if (!selectedEntry) return;

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
 console.log("Updaye Payload", payload);
    try {
      const updateUrl=`${config.BASE_URL}${config.ENDPOINTS.UPDATE_MILK_ENTRY}/${selectedEntry.entryId}`;
  console.log("Update URl " , updateUrl);
      const response = await api.put(
        `${config.BASE_URL}${config.ENDPOINTS.UPDATE_MILK_ENTRY}`,
        payload
      );

 

      if (response.data.success) {
        fetchMilkEntries();
        setShowEntryModal(false);
      } else {
        alert(response.data.message || 'Update failed');
      }
    } catch (err) {
      console.error(err);
      alert('Server error. Please try again.');
    }
  };

  const handleDeleteEntry = async () => {
 console.log("Delete Button clicked")

const deleteUrl = `${config.BASE_URL}${config.ENDPOINTS.DELETE_MILK_ENTRY}/${selectedEntry.entryId}`;

console.log("Delete milk entry Base URl",deleteUrl);
    
    if (!selectedEntry) return;

    
    try {
      const response = await api.delete(
        `${config.BASE_URL}${config.ENDPOINTS.DELETE_MILK_ENTRY}/${selectedEntry.entryId}`
      );
          ;
      if (response.data.success) {
        fetchMilkEntries();
        setShowEntryModal(false);
      } else {
        alert(response.data.message || 'Delete failed');
      }
    } catch (err) {
      console.error(err);
      alert('Server error. Please try again.');
    }
  };

  const currentDate = new Date();
  const formattedDate = currentDate.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <ScrollView style={styles.container}>
      {/* Photo */}
      <View style={styles.photoContainer}>
        <Image source={defaultCustomerImg} style={styles.photo} />
      </View>

      {/* Current Date */}
      <View style={styles.dateContainer}>
        <Text style={styles.dateText}>{formattedDate}</Text>
      </View>

      {/* Add & Generate Bill Buttons */}
      <View style={styles.addButtonContainer}>
        <Text
          style={styles.addButton}
          onPress={() => {
            resetEntryForm();
            setShowAddModal(true);
          }}
        >
          + Add Entry
        </Text>
      </View>
      <View style={styles.addButtonContainer}>
        <Text
          style={styles.addButton}
          onPress={() =>
            navigation.navigate('GenerateBill', { customer, milkEntries })
          }
        >
          🧾 Generate Bill
        </Text>
      </View>

      {/* Customer Card */}
      <View style={styles.card}>
        <View style={styles.column}>
          <Text style={styles.label}>Name:</Text>
          <Text style={styles.value}>{customer.name}</Text>
          <Text style={styles.label}>Phone:</Text>
          <Text style={styles.value}>{customer.phoneNumber}</Text>
          <Text style={styles.label}>WhatsApp:</Text>
          <Text style={styles.value}>{customer.whatsappNumber}</Text>
          <Text style={styles.label}>Email:</Text>
          <Text style={styles.value}>{customer.email}</Text>
        </View>
        <View style={styles.column}>
          <Text style={styles.label}>Address:</Text>
          <Text style={styles.value}>{customer.address}</Text>
          <Text style={styles.label}>Cow Rate:</Text>
          <Text style={styles.value}>{customer.cowRate}</Text>
          <Text style={styles.label}>Buffalo Rate:</Text>
          <Text style={styles.value}>{customer.buffaloRate}</Text>
          <Text style={styles.label}>Customer ID:</Text>
          <Text style={styles.value}>{customer.customerId}</Text>
        </View>
      </View>

      {/* Milk Entries Table */}
      <View style={styles.tableHeader}>
        <Text style={styles.headerText}>Date</Text>
        <Text style={styles.headerText}>Cow L</Text>
        <Text style={styles.headerText}>Cow Rate</Text>
        <Text style={styles.headerText}>Buff L</Text>
        <Text style={styles.headerText}>Buff Rate</Text>
        <Text style={styles.headerText}>Total</Text>
      </View>

      {loading ? (
        <Text style={styles.noEntries}>Loading entries...</Text>
      ) : milkEntries.length > 0 ? (
        milkEntries.map((entry) => (
          <TouchableOpacity
            key={entry.entryId}
            style={styles.tableRow}
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
            <Text style={styles.rowText}>
              {new Date(entry.date).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </Text>
            <Text style={styles.rowText}>{entry.cowLitre}</Text>
            <Text style={styles.rowText}>{entry.cowRate}</Text>
            <Text style={styles.rowText}>{entry.buffaloLitre}</Text>
            <Text style={styles.rowText}>{entry.buffaloRate}</Text>
            <Text style={styles.totalAmount}>₹ {entry.totalAmount}</Text>
          </TouchableOpacity>
        ))
      ) : (
        <Text style={styles.noEntries}>No milk entries found.</Text>
      )}

      {/* Add Entry Modal */}
      <Modal transparent visible={showAddModal} animationType="fade">
        <View style={styles.centeredModal}>
          <View style={styles.centeredContent}>
            <Text style={styles.modalTitle}>Add Milk Entry</Text>
            {message && <MessageBox type={message.type} message={message.text} />}
            {/* Date picker & Inputs */}
            <TouchableOpacity
              style={styles.datePickerBtn}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.dateText}>
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
            <Text style={styles.inputLabel}>Cow Litres</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={cowLitre}
              onChangeText={setCowLitre}
            />
            <Text style={styles.inputLabel}>Cow Rate</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={String(cowRate)}
              onChangeText={setCowRate}
            />
            <Text style={styles.inputLabel}>Buffalo Litres</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={buffaloLitre}
              onChangeText={setBuffaloLitre}
            />
            <Text style={styles.inputLabel}>Buffalo Rate</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={String(buffaloRate)}
              onChangeText={setBuffaloRate}
            />
            <Text style={styles.totalText}>Total: ₹ {totalAmount}</Text>
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

      {/* Update Entry Modal */}
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

            {/* Date picker & Inputs */}
            <TouchableOpacity
              style={styles.datePickerBtn}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.dateText}>
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

            <Text style={styles.inputLabel}>Cow Litres</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={cowLitre}
              onChangeText={setCowLitre}
            />
            <Text style={styles.inputLabel}>Cow Rate</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={cowRate}
              onChangeText={setCowRate}
            />
            <Text style={styles.inputLabel}>Buffalo Litres</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={buffaloLitre}
              onChangeText={setBuffaloLitre}
            />
            <Text style={styles.inputLabel}>Buffalo Rate</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={buffaloRate}
              onChangeText={setBuffaloRate}
            />
            <Text style={styles.totalText}>
              Total: ₹{' '}
              {Number(cowLitre || 0) * Number(cowRate || 0) +
                Number(buffaloLitre || 0) * Number(buffaloRate || 0)}
            </Text>

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
    </ScrollView>
  );
};

export default CustomerDetails;

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: SIZES.padding,
  },
  dateContainer: {
    alignItems: 'flex-end',
    marginHorizontal: 10,
    marginVertical: SIZES.margin / 2,
  },
  dateText: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  photoContainer: {
    alignItems: 'center',
    marginVertical: SIZES.margin,
  },
  photo: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radius,
    padding: SIZES.padding,
    marginBottom: 5,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  column: {
    flex: 1,
    marginHorizontal: 8,
  },
  label: {
    fontFamily: FONTS.medium,
    fontSize: 8,
    color: COLORS.textSecondary,
    marginTop: 0,
  },
  value: {
    fontFamily: FONTS.regular,
    fontSize: 16,
    color: COLORS.textPrimary,
    marginBottom: 5,
    flexWrap: 'wrap',
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: SIZES.radius,
    marginTop: 5,
  },
  headerText: {
    flex: 1,
    textAlign: 'center',
    color: COLORS.background,
    fontFamily: FONTS.bold,
    fontSize: 13,
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.background,
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: SIZES.radius,
    marginTop: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  rowText: {
    flex: 1,
    textAlign: 'center',
    color: COLORS.textPrimary,
    fontFamily: FONTS.medium,
    fontSize: 14,
  },
  totalAmount: {
    flex: 1,
    textAlign: 'center',
    color: COLORS.secondary,
    fontFamily: FONTS.bold,
    fontSize: 15,
  },
  addButtonContainer: {
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  addButton: {
    backgroundColor: COLORS.primary,
    color: COLORS.background,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    fontFamily: FONTS.bold,
    fontSize: 14,
  },
  noEntries: {
    textAlign: 'center',
    marginTop: 10,
    color: COLORS.textSecondary,
  },
  centeredModal: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  centeredContent: {
    width: '90%',
    backgroundColor: COLORS.background,
    padding: 16,
    borderRadius: 12,
    elevation: 10,
  },
  modalTitle: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    marginBottom: 12,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    padding: 10,
    marginBottom: 10,
    fontFamily: FONTS.medium,
  },
  totalText: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 10,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelBtn: {
    backgroundColor: COLORS.textSecondary,
    padding: 10,
    borderRadius: 6,
    flex: 1,
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    padding: 10,
    borderRadius: 6,
    flex: 1,
  },
  btnText: {
    color: COLORS.background,
    textAlign: 'center',
    fontFamily: FONTS.bold,
  },
  datePickerBtn: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    padding: 12,
    marginBottom: 10,
  },
  inputLabel: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  crossBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  crossText: {
    fontSize: 20,
    color: COLORS.textSecondary,
  },
});
