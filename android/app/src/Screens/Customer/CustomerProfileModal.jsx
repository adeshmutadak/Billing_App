import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  Modal,
  ActivityIndicator,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary } from 'react-native-image-picker';
import api from '../../API/axiosConfig';
import config from '../../config';
import { useToast } from '../../components/Toast';
import { photoSource } from '../../API/billHistory';
import { COLORS, FONTS, SIZES } from '../../utils/theme';

const defaultCustomerImg = require('../../Assets/Images/logo.jpg');

/** One labelled read-only row. Module level so it is not remounted per render. */
const Field = ({ icon, label, value }) => (
  <View style={styles.field}>
    <Ionicons name={icon} size={16} color={COLORS.textSecondary} />
    <View style={styles.fieldText}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value || '-'}</Text>
    </View>
  </View>
);

/**
 * The customer profile, opened by tapping a customer's photo on the home
 * screen. Three states in one card: view, edit and delete confirmation.
 *
 * Deliberately not reachable from the history screen. History is a record of
 * what happened in a past year, so editing a customer from there would let a
 * rate change appear to rewrite a year that is already billed.
 *
 * @param {bool}   visible
 * @param {object} customer   the row object from the history response, which
 *                            already carries every field this form edits
 * @param {func}   onClose
 * @param {func}   onChanged  called after a successful save or delete, so the
 *                            home screen can reload the year
 */
const CustomerProfileModal = ({ visible, customer, onClose, onChanged }) => {
  const toast = useToast();

  const [mode, setMode] = useState('view'); // view | edit | confirmDelete
  const [record, setRecord] = useState(null);
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [email, setEmail] = useState('');
  const [cowRate, setCowRate] = useState('');
  const [buffaloRate, setBuffaloRate] = useState('');
  const [photoBase64, setPhotoBase64] = useState(null);

  const seed = useCallback(source => {
    setRecord(source);
    setName(source?.name ?? '');
    setAddress(source?.address ?? '');
    setPhoneNumber(source?.phoneNumber ?? '');
    setWhatsappNumber(source?.whatsappNumber ?? '');
    setEmail(source?.email ?? '');
    setCowRate(source?.cowRate == null ? '' : String(source.cowRate));
    setBuffaloRate(source?.buffaloRate == null ? '' : String(source.buffaloRate));
    setPhotoBase64(null);
  }, []);

  // Open straight from the row already in memory, then confirm against the
  // server. The list is loaded fresh, so the form is usable immediately and the
  // fetch only corrects it if something changed elsewhere.
  useEffect(() => {
    if (!visible || !customer) {
      return;
    }

    setMode('view');
    seed(customer);

    let cancelled = false;
    const refresh = async () => {
      try {
        const response = await api.get(
          `${config.ENDPOINTS.CUSTOMER}/${customer.customerId}`,
        );
        if (!cancelled && response.data?.success && response.data.data) {
          seed({ ...customer, ...response.data.data });
        }
      } catch (err) {
        // The row we already have is good enough to show; only log it.
        console.log('[CustomerProfile] refresh failed', err?.message);
      }
    };
    refresh();

    return () => {
      cancelled = true;
    };
  }, [visible, customer, seed]);

  const pickImage = () => {
    launchImageLibrary(
      {
        mediaType: 'photo',
        includeBase64: true,
        maxWidth: 500,
        maxHeight: 500,
        quality: 0.7,
      },
      response => {
        if (response.didCancel) {
          return;
        }
        if (response.errorCode) {
          toast.error(response.errorMessage || 'Could not open the gallery');
          return;
        }
        const asset = response.assets?.[0];
        if (asset?.base64) {
          setPhotoBase64(asset.base64);
        }
      },
    );
  };

  const handleSave = async () => {
    // The API has no validation of its own: an empty name would blank the
    // customer rather than be rejected, so it is caught here.
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }
    if (!phoneNumber.trim()) {
      toast.error('Phone number is required');
      return;
    }

    const cow = Number(cowRate);
    const buffalo = Number(buffaloRate);
    if (Number.isNaN(cow) || Number.isNaN(buffalo)) {
      toast.error('Rates must be numbers');
      return;
    }

    // Null means "leave unchanged" and an empty string means "clear", so every
    // text field is sent as a string. That way clearing an email actually
    // clears it instead of silently doing nothing.
    const payload = {
      customerId: record.customerId,
      name: name.trim(),
      address: address.trim(),
      whatsappNumber: whatsappNumber.trim(),
      phoneNumber: phoneNumber.trim(),
      email: email.trim(),
      cowRate: cow,
      buffaloRate: buffalo,
    };

    if (photoBase64) {
      payload.base64Photo = `data:image/jpeg;base64,${photoBase64}`;
    }

    setBusy(true);
    try {
      const response = await api.put(config.ENDPOINTS.CUSTOMER, payload);

      if (response.data?.success) {
        toast.success('Customer updated');
        seed({ ...record, ...(response.data.data ?? {}) });
        setMode('view');
        onChanged?.();
      } else {
        toast.error(response.data?.message || 'Could not update the customer');
      }
    } catch (err) {
      console.log('[CustomerProfile] update failed', err?.response?.data || err?.message);
      toast.error('Could not update the customer');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    setBusy(true);
    try {
      const response = await api.delete(
        `${config.ENDPOINTS.CUSTOMER}/${record.customerId}`,
      );

      if (response.data?.success) {
        toast.success(`${record.name} removed`);
        onChanged?.();
        onClose?.();
      } else {
        toast.error(response.data?.message || 'Could not remove the customer');
        setMode('view');
      }
    } catch (err) {
      console.log('[CustomerProfile] delete failed', err?.response?.data || err?.message);
      toast.error('Could not remove the customer');
      setMode('view');
    } finally {
      setBusy(false);
    }
  };

  if (!record) {
    return null;
  }

  const preview = photoBase64
    ? { uri: `data:image/jpeg;base64,${photoBase64}` }
    : photoSource(record.photoUrl, defaultCustomerImg);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.heading}>
              {mode === 'edit' ? 'Edit customer' : 'Customer'}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={22} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {mode === 'confirmDelete' ? (
            <View style={styles.confirmBody}>
              <Ionicons name="warning" size={38} color={COLORS.textSecondary} />
              <Text style={styles.confirmTitle}>Remove {record.name}?</Text>
              <Text style={styles.confirmText}>
                They stop appearing in the customer list. Past bills and milk
                entries are kept, so history stays intact.
              </Text>

              <View style={styles.footer}>
                <TouchableOpacity
                  style={[styles.btn, styles.btnGhost]}
                  disabled={busy}
                  onPress={() => setMode('view')}
                >
                  <Text style={styles.btnGhostText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, styles.btnDanger, busy && styles.btnBusy]}
                  disabled={busy}
                  onPress={handleDelete}
                >
                  <Text style={styles.btnPrimaryText}>
                    {busy ? 'Removing...' : 'Remove'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <ScrollView
                contentContainerStyle={styles.body}
                keyboardShouldPersistTaps="handled"
              >
                <TouchableOpacity
                  style={styles.photoWrap}
                  activeOpacity={mode === 'edit' ? 0.7 : 1}
                  onPress={mode === 'edit' ? pickImage : undefined}
                >
                  <Image source={preview} style={styles.photo} />
                  {mode === 'edit' && (
                    <View style={styles.photoBadge}>
                      <Ionicons name="camera" size={14} color={COLORS.background} />
                    </View>
                  )}
                </TouchableOpacity>

                {mode === 'view' ? (
                  <>
                    <Text style={styles.name}>{record.name}</Text>

                    <Field icon="call-outline" label="Phone" value={record.phoneNumber} />
                    <Field
                      icon="logo-whatsapp"
                      label="WhatsApp"
                      value={record.whatsappNumber}
                    />
                    <Field icon="mail-outline" label="Email" value={record.email} />
                    <Field
                      icon="location-outline"
                      label="Address"
                      value={record.address}
                    />

                    <View style={styles.rateRow}>
                      <View style={styles.rateBox}>
                        <Text style={styles.rateLabel}>Cow rate</Text>
                        <Text style={styles.rateValue}>
                          {'₹'}
                          {record.cowRate ?? 0}
                        </Text>
                      </View>
                      <View style={styles.rateBox}>
                        <Text style={styles.rateLabel}>Buffalo rate</Text>
                        <Text style={styles.rateValue}>
                          {'₹'}
                          {record.buffaloRate ?? 0}
                        </Text>
                      </View>
                    </View>
                  </>
                ) : (
                  <>
                    <Text style={styles.inputLabel}>Name</Text>
                    <TextInput
                      style={styles.input}
                      value={name}
                      onChangeText={setName}
                      placeholder="Name"
                      placeholderTextColor={COLORS.textSecondary}
                    />

                    <Text style={styles.inputLabel}>Phone number</Text>
                    <TextInput
                      style={styles.input}
                      value={phoneNumber}
                      onChangeText={setPhoneNumber}
                      keyboardType="phone-pad"
                      placeholder="Phone number"
                      placeholderTextColor={COLORS.textSecondary}
                    />

                    <Text style={styles.inputLabel}>WhatsApp number</Text>
                    <TextInput
                      style={styles.input}
                      value={whatsappNumber}
                      onChangeText={setWhatsappNumber}
                      keyboardType="phone-pad"
                      placeholder="WhatsApp number"
                      placeholderTextColor={COLORS.textSecondary}
                    />

                    <Text style={styles.inputLabel}>Email</Text>
                    <TextInput
                      style={styles.input}
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      placeholder="Email"
                      placeholderTextColor={COLORS.textSecondary}
                    />

                    <Text style={styles.inputLabel}>Address</Text>
                    <TextInput
                      style={[styles.input, styles.inputMultiline]}
                      value={address}
                      onChangeText={setAddress}
                      multiline
                      placeholder="Address"
                      placeholderTextColor={COLORS.textSecondary}
                    />

                    <View style={styles.rateRow}>
                      <View style={styles.rateInputBox}>
                        <Text style={styles.inputLabel}>Cow rate</Text>
                        <TextInput
                          style={styles.input}
                          value={cowRate}
                          onChangeText={setCowRate}
                          keyboardType="numeric"
                          placeholderTextColor={COLORS.textSecondary}
                        />
                      </View>
                      <View style={styles.rateInputBox}>
                        <Text style={styles.inputLabel}>Buffalo rate</Text>
                        <TextInput
                          style={styles.input}
                          value={buffaloRate}
                          onChangeText={setBuffaloRate}
                          keyboardType="numeric"
                          placeholderTextColor={COLORS.textSecondary}
                        />
                      </View>
                    </View>

                    <Text style={styles.hint}>
                      A rate change applies to entries added from now on. Bills
                      already generated are not recalculated.
                    </Text>
                  </>
                )}
              </ScrollView>

              <View style={styles.footer}>
                {mode === 'view' ? (
                  <>
                    <TouchableOpacity
                      style={[styles.btn, styles.btnGhostDanger]}
                      onPress={() => setMode('confirmDelete')}
                    >
                      <Ionicons name="trash-outline" size={16} color={COLORS.textSecondary} />
                      <Text style={styles.btnGhostText}>Remove</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.btn, styles.btnPrimary]}
                      onPress={() => setMode('edit')}
                    >
                      <Ionicons name="create-outline" size={16} color={COLORS.background} />
                      <Text style={styles.btnPrimaryText}>Edit</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <TouchableOpacity
                      style={[styles.btn, styles.btnGhost]}
                      disabled={busy}
                      onPress={() => {
                        seed(record);
                        setMode('view');
                      }}
                    >
                      <Text style={styles.btnGhostText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.btn, styles.btnPrimary, busy && styles.btnBusy]}
                      disabled={busy}
                      onPress={handleSave}
                    >
                      {busy ? (
                        <ActivityIndicator size="small" color={COLORS.background} />
                      ) : (
                        <Text style={styles.btnPrimaryText}>Save</Text>
                      )}
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

export default CustomerProfileModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: SIZES.padding,
  },
  card: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radiusCard,
    maxHeight: '88%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.padding,
    paddingVertical: SIZES.gapMd,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSoft,
  },
  heading: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: COLORS.primary,
  },

  body: {
    padding: SIZES.padding,
    paddingBottom: SIZES.gapMd,
  },
  photoWrap: {
    alignSelf: 'center',
    marginBottom: SIZES.gapMd,
  },
  photo: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.surfaceMuted,
  },
  photoBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.background,
  },
  name: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SIZES.gapMd,
  },

  field: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: SIZES.gapSm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSoft,
  },
  fieldText: {
    flex: 1,
    marginLeft: SIZES.gapMd,
  },
  fieldLabel: {
    fontFamily: FONTS.medium,
    fontSize: 10,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
  },
  fieldValue: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textPrimary,
    marginTop: 1,
  },

  rateRow: {
    flexDirection: 'row',
    marginTop: SIZES.gapMd,
  },
  rateBox: {
    flex: 1,
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: SIZES.radius,
    paddingVertical: SIZES.gapMd,
    alignItems: 'center',
    marginHorizontal: SIZES.gapXs,
  },
  rateLabel: {
    fontFamily: FONTS.medium,
    fontSize: 10,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
  },
  rateValue: {
    fontFamily: FONTS.bold,
    fontSize: 17,
    color: COLORS.primary,
    marginTop: 2,
  },
  rateInputBox: {
    flex: 1,
    marginHorizontal: SIZES.gapXs,
  },

  inputLabel: {
    fontFamily: FONTS.medium,
    fontSize: 10,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    marginTop: SIZES.gapSm,
    marginBottom: SIZES.gapXs,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.borderInput,
    backgroundColor: COLORS.surfaceInput,
    borderRadius: SIZES.radius,
    paddingHorizontal: SIZES.gapMd,
    paddingVertical: 9,
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  inputMultiline: {
    minHeight: 64,
    textAlignVertical: 'top',
  },
  hint: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: SIZES.gapMd,
  },

  confirmBody: {
    padding: SIZES.padding,
    alignItems: 'center',
  },
  confirmTitle: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: COLORS.textPrimary,
    marginTop: SIZES.gapSm,
    textAlign: 'center',
  },
  confirmText: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SIZES.gapXs,
  },

  footer: {
    flexDirection: 'row',
    padding: SIZES.padding,
    paddingTop: SIZES.gapMd,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSoft,
  },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: SIZES.radius,
    marginHorizontal: SIZES.gapXs,
  },
  btnPrimary: {
    backgroundColor: COLORS.primary,
  },
  btnPrimaryText: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.background,
    marginLeft: 6,
  },
  btnGhost: {
    backgroundColor: COLORS.surfaceMuted,
    borderWidth: 1,
    borderColor: COLORS.borderInput,
  },
  btnGhostDanger: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.borderInput,
  },
  btnGhostText: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.textSecondary,
    marginLeft: 6,
  },
  btnDanger: {
    backgroundColor: '#C62828',
  },
  btnBusy: {
    opacity: 0.7,
  },
});
