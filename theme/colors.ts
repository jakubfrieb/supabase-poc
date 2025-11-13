/**
 * Modern Blue Theme Colors
 * Palette: Blue, Dark Blue, Turquoise/Petrol
 */

export const colors = {
  // Primary Blue Palette
  primary: '#1E88E5',        // Main blue
  primaryDark: '#0D47A1',    // Dark blue
  primaryLight: '#64B5F6',   // Light blue
  turquoise: '#00838F',      // Turquoise/Petrol
  teal: '#00695C',           // Deep teal

  // Backgrounds
  background: '#F5F7FA',     // Light blue-gray background
  backgroundDark: '#E3F2FD', // Slightly darker blue-tinted bg
  surface: '#FFFFFF',        // White cards/surfaces
  surfaceElevated: '#FAFBFC',

  // Text Colors
  text: '#1A1A2E',           // Dark blue-black for primary text
  textSecondary: '#546E7A',  // Blue-gray for secondary text
  textLight: '#90A4AE',      // Light gray text
  textOnPrimary: '#FFFFFF',  // White text on primary blue

  // Status Colors
  success: '#00C853',        // Green for success
  warning: '#FFB300',        // Amber for warnings
  error: '#E53935',          // Red for errors
  info: '#0288D1',           // Light blue for info

  // Issue Priority Colors
  priorityIdea: '#FFD700',    // Gold/Yellow for idea
  priorityNormal: '#81C784',  // Green
  priorityHigh: '#FFB74D',    // Orange
  priorityCritical: '#EF5350', // Red
  priorityUrgent: '#C62828',  // Dark red

  // Issue Status Colors
  statusOpen: '#42A5F5',     // Blue
  statusInProgress: '#FFA726', // Orange
  statusResolved: '#66BB6A', // Green
  statusClosed: '#78909C',   // Gray

  // UI Elements
  border: '#CFD8DC',         // Light blue-gray borders
  borderLight: '#ECEFF1',
  divider: '#E0E0E0',
  shadow: '#00000015',       // Subtle shadow

  // Button Variants
  buttonPrimary: '#1E88E5',
  buttonSecondary: '#00838F',
  buttonOutline: '#0D47A1',
  buttonDanger: '#E53935',

  // Special
  overlay: 'rgba(13, 71, 161, 0.1)', // Blue overlay
  disabled: '#B0BEC5',
  placeholder: '#90A4AE',
};

// Theme spacing
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

// Border radius
export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  round: 9999,
};

// Font sizes
export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

// Font weights
export const fontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

// Shadows
export const shadows = {
  sm: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
};
