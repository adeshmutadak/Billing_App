import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { COLORS, FONTS, SIZES } from '../../utils/theme';
import config from '../../config'
import { Modal, TextInput, TouchableOpacity, Pressable } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import MessageBox from '../../utils/MessageBox';


const defaultCustomerImg = require('../../Assets/Images/logo.jpg');



const CustomerDetails = ({ route ,navigation }) => {
  const { customer } = route.params;
 const api = React.useMemo(() => axios.create(), []);
  console.log("Customer",customer);
  const [userId, setUserId] = useState(null);
  const [milkEntries, setMilkEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [message, setMessage] = useState(null);

  //Add the entry Start
const [showAddModal, setShowAddModal] = useState(false);

const [entryDate, setEntryDate] = useState(new Date());
const [cowLitre, setCowLitre] = useState('');
const [buffaloLitre, setBuffaloLitre] = useState('');

const [cowRate, setCowRate] = useState(customer.cowRate);
const [buffaloRate, setBuffaloRate] = useState(customer.buffaloRate);

const totalAmount =
  (Number(cowLitre || 0) * Number(cowRate || 0)) +
  (Number(buffaloLitre || 0) * Number(buffaloRate || 0));
//Add the entry End 


const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const resetEntryForm = () => {
  setEntryDate(new Date());
  setCowLitre('');
  setBuffaloLitre('');
  setCowRate(customer.cowRate);
  setBuffaloRate(customer.buffaloRate);
  setMessage(null);
};


  
  useEffect(() => {
  api.interceptors.request.use(async (req) => {
    const token = await AsyncStorage.getItem("token");
    if (token) req.headers.Authorization = `Bearer ${token}`;
    return req;
  });
}, [api]);

  // Get logged userId
  useEffect(() => {
    const fetchUserId = async () => {
      const id = await AsyncStorage.getItem('userId');
      if (id) setUserId(Number(id));
       console.log("Userr Id",id);
    };
    
    fetchUserId();
  }, []);

  // Fetch milk entries for this customer
  useEffect(() => {
    if (userId) fetchMilkEntries();
  }, [userId]);



const handleSaveEntry = async () => {
  if (!cowLitre && !buffaloLitre) {
    setMessage({
      type: 'warning',
      text: 'Please enter at least cow or buffalo litres',
    });
    return;
  }

  const payload = {
    customerId: customer.customerId,
    userId,
    date: formatDate(entryDate), // ✅ FIXED,
    cowLitre: Number(cowLitre || 0),
    buffaloLitre: Number(buffaloLitre || 0),
    cowRate: Number(cowRate || customer.cowRate),
    buffaloRate: Number(buffaloRate || customer.buffaloRate),
    totalAmount,
  };


  console.log("This is payload",payload)
  try {
    const response = await api.post(
      `${config.BASE_URL}${config.ENDPOINTS.ADD_MILK_ENTRY}`,
      payload
    );

    const apiData = response.data;

    console.log("API data",apiData)

    // ✅ REAL SUCCESS CHECK (backend-driven)
   if (apiData.success === true) {
  setMessage({
    type: 'success',
    text: 'Milk entry added successfully',
  });

  fetchMilkEntries();

  setTimeout(() => {
    resetEntryForm();
    setShowAddModal(false);
  }, 1200);
}
 else {
      // ❌ Business failure (even if HTTP 200)
      setMessage({
        type: 'error',
        text: apiData?.message || 'Unable to add milk entry',
      });
    }

  } catch (error) {
    console.error('Add entry error:', error.response || error.message);

    setMessage({
      type: 'error',
      text: 'Server error. Please try again later.',
    });
  }
};




  
  const fetchMilkEntries = async () => {
    setLoading(true);
    console.log("Base URLL" ,`${config.BASE_URL}${config.ENDPOINTS.GET_CUSTOMER_DETAILS}?customerId=${customer.customerId}&userId=${userId}`);
    try {
    const response = await api.get(
  `${config.BASE_URL}${config.ENDPOINTS.GET_CUSTOMER_DETAILS}?customerId=${customer.customerId}&userId=${userId}`
);

console.log("Base URLL" ,`${config.BASE_URL}${config.ENDPOINTS.GET_CUSTOMER_DETAILS}?customerId=${customer.customerId}&userId=${userId}`);

console.log("Base URLLLLLLLLLLL" ,response);
      if (response.data?.data && Array.isArray(response.data.data)) {

        console.log("Dataaaaaaaa",response.data.data.date)
        setMilkEntries(response.data.data);
      } else {
        setMilkEntries([]);
      }
    } catch (error) {
      console.log('Milk entries API error:', error.message);
      setMilkEntries([]);
    } finally {
      setLoading(false);
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



<View style={styles.addButtonContainer}>
  <Text style={styles.addButton} onPress={() => setShowAddModal(true)}>
    + Add Entry
  </Text>
</View>
<View style={styles.addButtonContainer}>
  <Text
    style={styles.addButton}
    onPress={() =>
      navigation.navigate('GenerateBill', {
        customer,
        milkEntries,
      })
    }
  >
    🧾 Generate Bill
  </Text>
</View>

      {/* Customer Details Card */}
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
        <Text style={{ textAlign: 'center', marginTop: 10 }}>Loading entries...</Text>
      ) : milkEntries.length > 0 ? (
        milkEntries.map((entry) => (
          <View key={entry.entryId} style={styles.tableRow}>
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
          </View>
        ))
      ) : (
        <Text style={{ textAlign: 'center', marginTop: 10, color: COLORS.textSecondary }}>
          No milk entries found.
        </Text>
      )}


<Modal transparent visible={showAddModal} animationType="slide">
  {/* Tap outside to close */}
  <Pressable
    style={styles.modalOverlay}
    onPress={() => setShowAddModal(false)}
  />

  <View style={styles.bottomSheet}>

    {/* Drag Indicator */}
    <View style={styles.dragIndicator} />

   {message && (
  <MessageBox type={message.type} message={message.text} />
)}

    {/* Date Picker Button */}
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
        onChange={(event, selectedDate) => {
          setShowDatePicker(false);
          if (selectedDate) setEntryDate(selectedDate);
        }}
      />
    )}
<Text style={styles.inputLabel}>Add cow liters</Text>
<TextInput
  placeholder="Cow Litre"
  keyboardType="numeric"
  value={cowLitre}
  onChangeText={setCowLitre}
  style={styles.input}
/>
<Text style={styles.inputLabel}>Add Buffalo liters</Text>
    <TextInput
      placeholder="Buffalo Litre"
      keyboardType="numeric"
      value={buffaloLitre}
      onChangeText={setBuffaloLitre}
      style={styles.input}
    />

    <TextInput
      placeholder="Cow Rate"
      keyboardType="numeric"
      value={String(cowRate)}
      onChangeText={setCowRate}
      style={styles.input}
    />

    <TextInput
      placeholder="Buffalo Rate"
      keyboardType="numeric"
      value={String(buffaloRate)}
      onChangeText={setBuffaloRate}
      style={styles.input}
    />

    <Text style={styles.totalText}>
      Total Amount: ₹ {totalAmount}
    </Text>

    <View style={styles.modalButtons}>
      <TouchableOpacity
        style={styles.cancelBtn}
        onPress={() => {
    resetEntryForm();
    setShowAddModal(false);
  }} 
      >
        <Text style={styles.btnText}>Cancel</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.saveBtn}
        onPress={handleSaveEntry}
      >
        <Text style={styles.btnText}>Save</Text>
      </TouchableOpacity>
    </View>

  </View>
</Modal>



    </ScrollView>
  );
};

export default CustomerDetails;

// Styles (reuse previous styles + table)
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


modalOverlay: {
 flex: 1,
  backgroundColor: 'rgba(0,0,0,0.4)'
},

modalContainer: {
  width: '90%',
  backgroundColor: COLORS.background,
  borderRadius: 10,
  padding: 16,
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
  marginRight: 5,
},

saveBtn: {
  backgroundColor: COLORS.primary,
  padding: 10,
  borderRadius: 6,
  flex: 1,
  marginLeft: 5,
},

btnText: {
  color: COLORS.background,
  textAlign: 'center',
  fontFamily: FONTS.bold,
},
dragIndicator: {
  width: 40,
  height: 5,
  backgroundColor: COLORS.border,
  borderRadius: 3,
  alignSelf: 'center',
  marginBottom: 10,
},

bottomSheet: {
  position: 'absolute',
  bottom: 0,
  width: '100%',
  backgroundColor: COLORS.background,
  borderTopLeftRadius: 20,
  borderTopRightRadius: 20,
  padding: 16,
  elevation: 10,
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


});

