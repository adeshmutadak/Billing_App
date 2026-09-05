import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { COLORS, FONTS, SIZES, STATUS } from '../utils/theme';

/**
 * One feedback mechanism for the whole app.
 *
 * Before this, three different things were in use: the animated MessageBox on
 * some screens, Alert.alert on others, and on the history screen a message that
 * was set in state but never rendered at all. Anything user-facing now goes
 * through useToast(), so success and failure look the same everywhere.
 */

const ToastContext = createContext(null);

const VARIANTS = {
  success: { color: STATUS.Paid, icon: 'checkmark-circle' },
  error: { color: STATUS.Unpaid, icon: 'alert-circle' },
  warning: { color: STATUS.Partial, icon: 'warning' },
  info: { color: COLORS.primary, icon: 'information-circle' },
};

const DEFAULT_DURATION = 2800;

export const ToastProvider = ({ children }) => {
  const [toast, setToast] = useState(null);
  const slide = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef(null);

  const hide = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    Animated.parallel([
      Animated.timing(slide, { toValue: -120, duration: 220, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(() => setToast(null));
  }, [slide, opacity]);

  const show = useCallback(
    (message, variant = 'info', duration = DEFAULT_DURATION) => {
      if (!message) {
        return;
      }

      if (timer.current) {
        clearTimeout(timer.current);
      }

      setToast({ message: String(message), variant });

      slide.setValue(-120);
      opacity.setValue(0);

      Animated.parallel([
        Animated.timing(slide, { toValue: 0, duration: 260, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 260, useNativeDriver: true }),
      ]).start();

      timer.current = setTimeout(hide, duration);
    },
    [slide, opacity, hide],
  );

  useEffect(() => () => timer.current && clearTimeout(timer.current), []);

  const api = useMemo(
    () => ({
      show,
      hide,
      success: (m, d) => show(m, 'success', d),
      error: (m, d) => show(m, 'error', d),
      warning: (m, d) => show(m, 'warning', d),
      info: (m, d) => show(m, 'info', d),

      /** Pulls the most useful message out of an axios error. */
      fromError: (err, fallback = 'Something went wrong') =>
        show(err?.response?.data?.message || err?.message || fallback, 'error'),
    }),
    [show, hide],
  );

  const variant = VARIANTS[toast?.variant] ?? VARIANTS.info;

  return (
    <ToastContext.Provider value={api}>
      {children}

      {toast && (
        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.wrap,
            { transform: [{ translateY: slide }], opacity },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={hide}
            style={[styles.toast, { borderLeftColor: variant.color }]}
          >
            <Ionicons name={variant.icon} size={20} color={variant.color} />
            <Text style={styles.message} numberOfLines={3}>
              {toast.message}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
};

/** Returns a no-op shaped like the real API when used outside the provider,
 *  so a forgotten provider degrades to silence rather than a crash. */
export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (ctx) {
    return ctx;
  }
  const noop = () => {};
  return {
    show: noop,
    hide: noop,
    success: noop,
    error: noop,
    warning: noop,
    info: noop,
    fromError: noop,
  };
};

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 44,
    paddingHorizontal: SIZES.margin,
    zIndex: 9999,
    elevation: 9999,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radiusCard,
    borderLeftWidth: 4,
    paddingVertical: 12,
    paddingHorizontal: 14,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  message: {
    flex: 1,
    marginLeft: 10,
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: COLORS.textPrimary,
  },
});
