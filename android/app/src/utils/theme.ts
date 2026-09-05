// utils/theme.ts

export const COLORS = {
  primary: '#0A1F44',      // Deep Navy Blue
  secondary: '#1C3D73',    // Slightly lighter navy
  background: '#FFFFFF',   // Pure white
  textPrimary: '#000000',  // Black
  textSecondary: '#4F4F4F',// Soft dark grey
  button: '#0A1F44',       // Navy button
  border: '#E0E0E0',       // Light grey border

  // Page and card surfaces. Screens sit on `page`, cards on `background`.
  page: '#F4F6F8',
  surfaceMuted: '#F7F9FB',
  surfaceInput: '#FBFCFD',
  borderSoft: '#ECEEF1',
  borderInput: '#DDE1E6',
  disabled: '#B0B7C3',
};

// Payment state. Previously duplicated across three screens; import from here
// so a colour change lands everywhere at once.
export const STATUS = {
  Paid: '#2E7D32',
  Partial: '#F9A825',
  Unpaid: '#C62828',
  NoActivity: '#9E9E9E',
};

// Soft background behind each month box, so twelve of them read as a calendar
// rather than twelve loud buttons.
export const STATUS_TINT = {
  Paid: '#E7F2E8',
  Partial: '#FDF3DA',
  Unpaid: '#FBE9E9',
  NoActivity: '#F1F3F5',
};

export const FONTS = {
  regular: 'Roboto-Regular',
  medium: 'Roboto-Medium',
  bold: 'Roboto-Bold',
  SemiBold: 'Roboto-SemiBold',
  Thin: 'Roboto-Thin',
};

export const SIZES = {
  padding: 16,
  margin: 16,
  radius: 8,

  radiusCard: 14,
  radiusPill: 16,

  gapXs: 4,
  gapSm: 8,
  gapMd: 12,
  gapLg: 16,
};

export const TEXT = {
  screenTitle: { fontFamily: FONTS.bold, fontSize: 20, color: COLORS.primary },
  cardTitle: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.textPrimary },
  body: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.textPrimary },
  meta: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.textSecondary },
  label: {
    fontFamily: FONTS.medium,
    fontSize: 10,
    color: COLORS.textSecondary,
    textTransform: 'uppercase' as const,
  },
};
