import React, { useState } from 'react';
import { View, Text, TextInput, Image, StyleSheet, TouchableOpacity } from 'react-native';
import axios from 'axios';
import config from '../../config'; // Make sure this path is correct
import MessageBox from '../../utils/MessageBox'; // Reusable message box
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Login({ navigation }) {
  const [emailOrMobile, setEmailOrMobile] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'success'|'error'|'warning', text: string }

  const handleLogin = async () => {
    // ✅ Fix validation
    if (!emailOrMobile || !password) {
      setMessage({ type: 'warning', text: 'Please enter both Email/Phone and Password' });
      return;
    }

    setLoading(true);
    setMessage(null);

    const url = `${config.BASE_URL}${config.ENDPOINTS.LOGIN}`;
    console.log('Login URL:', url);
    console.log('Request Payload:', { emailOrMobile, password });

    try {
      const response = await axios.post(url, { emailOrMobile, password });
      console.log('Login Response:', response);

      if (response.data.success) {
        const userName = response.data.data.name; // fallback
        const userId=String(response.data.data.userId);

         await AsyncStorage.setItem("token", response.data.data.token);
         await AsyncStorage.setItem("userName", userName)
         await AsyncStorage.setItem("userId" ,userId)

         console.log("Token",response.data.data.token);
        console.log(response.data);
        console.log(userName);
         console.log("User Id",userId);
        setMessage({
          type: 'success',
          text: `Welcome ${userName}! Login successful 🎉`,
        });
        // Redirect to Customer screen after 1 second
        setTimeout(() => {
          navigation.replace('Customer'); // make sure 'Customer' is registered in your navigator
        }, 1000);
      } else {
        setMessage({ type: 'error', text: response.data.message || 'Login failed' });
      }
    } catch (error) {
      console.error('Login Error:', error.response?.data || error.message);
      setMessage({ type: 'error', text: 'Something went wrong. Please try again!' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>

      {/* Logo */}
      <Image
        source={require('../../Assets/Images/logo.jpg')}
        style={styles.logo}
      />

      {/* Title */}
      <Text style={styles.title}>Login</Text>

      {/* Message Box */}
      {message && <MessageBox type={message.type} message={message.text} />}

      {/* Email / Phone Input */}
      <TextInput
        style={styles.input}
        placeholder="Email or Phone Number"
        placeholderTextColor="#666"
        value={emailOrMobile}
        onChangeText={setEmailOrMobile}
      />

      {/* Password */}
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#666"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {/* LOGIN BUTTON */}
      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Logging in...' : 'Login'}</Text>
      </TouchableOpacity>

    </View>
  );
}

// Styles remain the same
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF'
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 20,
    borderRadius: 60,
    resizeMode: 'cover'
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 20,
    color: '#0A1F44'
  },
  input: {
    width: '80%',
    height: 48,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 16,
    color: '#000'
  },
  button: {
    width: '80%',
    height: 48,
    backgroundColor: '#0A1F44',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    marginTop: 10
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600'
  }
});
