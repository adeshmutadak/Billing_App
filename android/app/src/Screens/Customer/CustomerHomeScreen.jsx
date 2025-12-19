import React, { useState, useEffect } from 'react';
import {View, Text, TouchableOpacity, TextInput, FlatList, Image, StyleSheet, Pressable
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import config from '../../config';
import MessageBox from '../../utils/MessageBox';
import { COLORS, FONTS, SIZES } from '../../utils/theme';
import AddCustomerScreen from './AddCustomerScreen';
import api from '../../API/axiosConfig'; 
const defaultCustomerImg = require('../../Assets/Images/logo.jpg');

const CustomerHomeScreen = ({ navigation }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [loggedUser, setLoggedUser] = useState("");
const [searchText, setSearchText] = useState('');


  //const api = axios.create();

  // Attach token to requests
  // useEffect(() => {
  //   api.interceptors.request.use(async (req) => {
  //     const token = await AsyncStorage.getItem("token");
  //     console.log("token",token)
  //     if (token) req.headers.Authorization = `Bearer ${token}`;
  //     return req;
  //   });
  // }, []);

  // Fetch logged user first letter
  useEffect(() => {
    const fetchUserName = async () => {
      const name = await AsyncStorage.getItem("userName");
      if (name) setLoggedUser(name.charAt(0).toUpperCase());
    };
    fetchUserName();
  }, []);

  useEffect(() => { fetchCustomers(); }, []);

const fetchCustomers = async () => {
  setLoading(true);
  setMessage(null);

  try {
    const response = await api.get(config.ENDPOINTS.GET_CUSTOMERS);

    if (response.data.success) {
      setCustomers(response.data.data || []);
    } else {
      setMessage({
        type: "error",
        text: response.data.message || "Failed to load customers",
      });
    }
  } catch (error) {
    console.log("Customer API Error:", error.response?.data || error.message);
    setMessage({
      type: "error",
      text: "Something went wrong while fetching customers",
    });
  } finally {
    setLoading(false);
  }
};


  // const renderCustomer = ({ item }) => (

    
  //   <View style={styles.card}>
  //     <Image source={defaultCustomerImg} style={styles.customerImg} />
  //     <View style={{ marginLeft: 70 }}>
  //       <Text style={styles.customerName}>{item.name}</Text>
  //       <Text style={styles.customerDetails}>{item.phoneNumber}</Text>
  //       <Text style={styles.customerDetails}>{item.address}</Text>
  //     </View>
  //   </View>
  // );

  const renderCustomer = ({ item }) => (
  <TouchableOpacity
    style={styles.card}
    onPress={() => navigation.navigate('CustomerDetails', { customer: item })}
  >
    <Image source={defaultCustomerImg} style={styles.customerImg} />
    <View style={{ marginLeft: 70, flexShrink: 1 }}>
  <Text style={styles.customerName}>{item.name}</Text>
  <Text style={styles.customerDetails}>{item.phoneNumber}</Text>
  <Text style={[styles.customerDetails, { flexShrink: 1 }]} numberOfLines={2} ellipsizeMode="tail">
    {item.address}
  </Text>
</View>

  </TouchableOpacity>
);

const searchCustomers = async (searchText) => {
  if (!searchText.trim()) return;

  setLoading(true);
  setMessage(null);

  let queryParam = '';

  // Phone number (only digits)
  if (/^\d+$/.test(searchText)) {
    queryParam = `phoneNumber=${encodeURIComponent(searchText)}`;
  } 
  // Address (contains space or common address chars)
  else if (searchText.includes(' ') || /[,.-]/.test(searchText)) {
    queryParam = `address=${encodeURIComponent(searchText)}`;
  } 
  // Name
  else {
    queryParam = `name=${encodeURIComponent(searchText)}`;
  }

  try {
    const response = await api.get(
      `${config.ENDPOINTS.SEARCH_CUSTOMER}?${queryParam}`
    );

    if (response.status === 200 && response.data?.data?.length > 0) {
      setCustomers(response.data.data);
    } else {
      setCustomers([]);
      setMessage({
        type: 'warning',
        text: 'No customers found',
      });
    }
  } catch (error) {
    console.log("Search error:", error.response?.data || error.message);
    setMessage({
      type: 'error',
      text: 'Failed to search customers',
    });
  } finally {
    setLoading(false);
  }
};







  return (
    <View style={styles.container}>
      {menuVisible && <Pressable style={styles.overlay} onPress={() => setMenuVisible(false)} />}

      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => setMenuVisible(!menuVisible)}>
          <Text style={styles.hamburger}>☰</Text>
        </TouchableOpacity>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{loggedUser}</Text>
        </View>
      </View>

      {menuVisible && (
        <View style={styles.menuBox}>
          <TouchableOpacity style={styles.menuItem}><Text style={styles.menuText}>Profile</Text></TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}><Text style={styles.menuText}>History</Text></TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={async () => { 
            await AsyncStorage.removeItem("token"); 
            setMessage({ type: "success", text: "Logged out successfully!" }); 
          }}>
            <Text style={[styles.menuText, { color: "red" }]}>Logout</Text>
          </TouchableOpacity>
        </View>
      )}

      {message && <MessageBox type={message.type} message={message.text} />}

   <View style={styles.searchContainer}>
  <View style={styles.searchInputWrapper}>
    <TextInput
      placeholder="Search by name, phone or address"
      style={styles.searchInput}
      value={searchText}
      onChangeText={setSearchText}
    />

    {searchText.length > 0 && (
      <TouchableOpacity
        style={styles.clearIcon}
        onPress={() => {
          setSearchText('');
          fetchCustomers();
        }}
      >
        <Ionicons name="close-circle" size={20} color={COLORS.textSecondary} />
      </TouchableOpacity>
    )}
  </View>

  <TouchableOpacity
    style={styles.searchBtn}
    onPress={() => {
      if (searchText.trim() === '') {
        fetchCustomers();
      } else {
        searchCustomers(searchText);
      }
    }}
  >
    <Text style={styles.searchBtnText}>Search</Text>
  </TouchableOpacity>
</View>





      {loading ? <Text style={{ textAlign: 'center', marginTop: 20, fontSize: 16 }}>Loading customers...</Text> :
        <FlatList data={customers} keyExtractor={(item) => item.customerId.toString()} renderItem={renderCustomer} contentContainerStyle={{ paddingBottom: 80 }} />
      }

      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navBtn}><Text style={styles.navText}>Home</Text></TouchableOpacity>
        <TouchableOpacity style={styles.navBtn} onPress={() => setShowAddModal(true)}>
          <Text style={styles.navText}>Add Customer</Text>
        </TouchableOpacity>
      </View>

      {/* Add Customer Modal */}
      <AddCustomerScreen
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={() => {
          setShowAddModal(false); // Close modal
          fetchCustomers();        // Refresh customer list
        }}
      />
    </View>
  );
};

export default CustomerHomeScreen;

// --- Styles (same as your original)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.3)",
    zIndex: 1,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: SIZES.padding,
    paddingVertical: 20,
    alignItems: "center",
  },
  hamburger: {
    fontSize: 30,
    color: COLORS.primary,
    fontFamily: FONTS.bold,
    zIndex: 2,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 50,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: COLORS.background,
    fontSize: 18,
    fontFamily: FONTS.bold,
  },
  menuBox: {
    position: "absolute",
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
  searchBar: {
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    borderRadius: SIZES.radius,
    marginHorizontal: SIZES.margin,
    marginBottom: 14,
    fontFamily: FONTS.regular,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
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
     flexShrink: 1,
  },
  bottomNav: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    backgroundColor: COLORS.background,
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 14,
    borderTopWidth: 1,
    borderColor: COLORS.border,
    elevation: 10,
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
  searchContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  marginHorizontal: SIZES.margin,
  marginBottom: 14,
},

searchInput: {
  flex: 1,
  borderWidth: 1,
  borderColor: COLORS.border,
  padding: 12,
  borderRadius: SIZES.radius,
  fontFamily: FONTS.regular,
},

searchBtn: {
  marginLeft: 8,
  backgroundColor: COLORS.primary,
  paddingHorizontal: 16,
  paddingVertical: 12,
  borderRadius: SIZES.radius,
},

searchBtnText: {
  color: COLORS.background,
  fontFamily: FONTS.bold,
},
searchInputWrapper: {
  flex: 1,
  position: 'relative',
},

clearIcon: {
  position: 'absolute',
  right: 12,
  top: '50%',
  transform: [{ translateY: -10 }],
},

});

