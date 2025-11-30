import React, { useState, useEffect } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, Image, ScrollView, Alert, Modal, TouchableWithoutFeedback 
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import config from '../../config';
import { COLORS, FONTS, SIZES } from '../../utils/theme';

const AddCustomerScreen = ({ visible, onSave, onClose }) => {
  const [userId, setUserId] = useState(null);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [email, setEmail] = useState('');
  const [cowRate, setCowRate] = useState('');
  const [buffaloRate, setBuffaloRate] = useState('');
  const [photoBase64, setPhotoBase64] = useState(null);

  useEffect(() => {
    const fetchUserId = async () => {
      const id = await AsyncStorage.getItem('userId');
      if (id) setUserId(Number(id));
    };
    fetchUserId();
  }, []);

  const pickImage = () => {
    launchImageLibrary(
      { mediaType: 'photo', includeBase64: true, maxWidth: 500, maxHeight: 500, quality: 0.7 },
      (response) => {
        if (response.didCancel) return;
        if (response.errorCode) return Alert.alert('Error', response.errorMessage);
        if (response.assets && response.assets.length > 0) setPhotoBase64(response.assets[0].base64);
      }
    );
  };

  const handleSave = async () => {
    if (!name || !address || !phoneNumber || !cowRate || !buffaloRate) {
      Alert.alert("Error", "Please fill all required fields");
      return;
    }
    if (!userId) {
      Alert.alert("Error", "User ID not found");
      return;
    }

    const payload = {
      userId,
      name,
      address,
      photoUrl: photoBase64 ? `data:image/jpeg;base64,${photoBase64}` : null,
      whatsappNumber,
      phoneNumber,
      email,
      cowRate: parseFloat(cowRate),
      buffaloRate: parseFloat(buffaloRate)
    };

    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.post(
        `${config.BASE_URL}${config.ENDPOINTS.ADD_CUSTOMER}`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        Alert.alert("Success", "Customer added successfully!");
        onSave?.(); // trigger callback to refresh customer list
      } else {
        Alert.alert("Error", response.data.message || "Failed to add customer");
      }
    } catch (error) {
      console.log("Add Customer API Error:", error.response?.data || error.message);
      Alert.alert("Error", "Something went wrong");
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay} />
      </TouchableWithoutFeedback>

      <View style={styles.modalContainerWrapper}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.heading}>Add New Customer</Text>
            <TouchableOpacity onPress={onClose}><Text style={styles.closeBtn}>✕</Text></TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
            <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
              {photoBase64 ? <Image source={{ uri: `data:image/jpeg;base64,${photoBase64}` }} style={styles.customerImg} />
              : <Text style={styles.imagePickerText}>Pick a Profile Image</Text>}
            </TouchableOpacity>

            <TextInput placeholder="Name*" value={name} onChangeText={setName} style={styles.input} placeholderTextColor={COLORS.textPrimary} />
            <TextInput placeholder="Address*" value={address} onChangeText={setAddress} style={styles.input} placeholderTextColor={COLORS.textPrimary} />
            <TextInput placeholder="Phone Number*" value={phoneNumber} onChangeText={setPhoneNumber} keyboardType="phone-pad" style={styles.input} placeholderTextColor={COLORS.textPrimary} />
            <TextInput placeholder="Whatsapp Number" value={whatsappNumber} onChangeText={setWhatsappNumber} keyboardType="phone-pad" style={styles.input} placeholderTextColor={COLORS.textPrimary} />
            <TextInput placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" style={styles.input} placeholderTextColor={COLORS.textPrimary} />
            <TextInput placeholder="Cow Rate*" value={cowRate} onChangeText={setCowRate} keyboardType="numeric" style={styles.input} placeholderTextColor={COLORS.textPrimary} />
            <TextInput placeholder="Buffalo Rate*" value={buffaloRate} onChangeText={setBuffaloRate} keyboardType="numeric" style={styles.input} placeholderTextColor={COLORS.textPrimary} />

            <View style={styles.footer}>
              <TouchableOpacity style={[styles.submitBtn, { backgroundColor: COLORS.border }]} onPress={onClose}>
                <Text style={[styles.submitBtnText, { color: COLORS.textPrimary }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.submitBtn} onPress={handleSave}>
                <Text style={styles.submitBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export default AddCustomerScreen;

// --- Styles same as your original ---


// --- Styles ---
const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  modalContainerWrapper: {
    position: 'absolute',
    top: '10%',
    left: '5%',
    right: '5%',
    bottom: '10%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '100%',
    maxHeight: '100%',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: SIZES.padding,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  heading: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
  },
  closeBtn: {
    fontSize: 22,
    color: COLORS.textPrimary,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radius,
    padding: 12,
    fontFamily: FONTS.regular,
    marginBottom: 12,
    color: COLORS.textSecondary,
  },
  imagePicker: {
    alignItems: 'center',
    marginBottom: 15,
  },
  imagePickerText: {
    fontFamily: FONTS.medium,
    color: COLORS.primary,
  },
  customerImg: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  submitBtn: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  submitBtnText: {
    fontFamily: FONTS.bold,
    color: COLORS.background,
    fontSize: 16,
  },
});

