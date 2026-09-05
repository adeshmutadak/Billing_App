import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { COLORS, FONTS, SIZES } from '../utils/theme';

/**
 * The one header for every pushed screen.
 *
 * Every route sets headerShown: false, and only the history screen drew its own
 * back arrow, so customer details and the bill screen had no visible way back.
 * This gives all of them the same affordance in the same place.
 *
 * @param {string} title
 * @param {node}   [right]     optional control on the right, e.g. a Clear link
 * @param {func}   [onBack]    override the default goBack
 * @param {bool}   [showBack]  set false on a root screen
 */
const ScreenHeader = ({ title, right = null, onBack, showBack = true }) => {
  const navigation = useNavigation();

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  return (
    <View style={styles.header}>
      {showBack ? (
        <TouchableOpacity
          onPress={handleBack}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={styles.side}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      ) : (
        <View style={styles.side} />
      )}

      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>

      {/* Fixed-width sides keep the title optically centred whether or not
          there is a control on the right. */}
      <View style={[styles.side, styles.sideRight]}>{right}</View>
    </View>
  );
};

export default ScreenHeader;

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.padding,
    paddingVertical: 14,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSoft,
  },
  side: {
    width: 64,
  },
  sideRight: {
    alignItems: 'flex-end',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.primary,
  },
});
