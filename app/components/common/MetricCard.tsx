import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react-native';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactElement;
  trend?: {
    value: string;
    direction: 'up' | 'down' | 'neutral';
  };
  subtitle?: string;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  onPress?: () => void;
}

export default function MetricCard({
  title,
  value,
  icon,
  trend,
  subtitle,
  variant = 'default',
  onPress,
}: MetricCardProps) {
  const getVariantColors = () => {
    switch (variant) {
      case 'success':
        return {
          iconBg: '#dcfce7',
          iconColor: '#22c55e',
          accentColor: '#22c55e',
        };
      case 'warning':
        return {
          iconBg: '#fef3c7',
          iconColor: '#f59e0b',
          accentColor: '#f59e0b',
        };
      case 'error':
        return {
          iconBg: '#fee2e2',
          iconColor: '#ef4444',
          accentColor: '#ef4444',
        };
      case 'info':
        return {
          iconBg: '#dbeafe',
          iconColor: '#3b82f6',
          accentColor: '#3b82f6',
        };
      default:
        return {
          iconBg: '#f0fdf4',
          iconColor: '#22c55e',
          accentColor: '#22c55e',
        };
    }
  };

  const getTrendColor = () => {
    if (!trend) return '#737373';
    switch (trend.direction) {
      case 'up':
        return '#22c55e';
      case 'down':
        return '#ef4444';
      default:
        return '#737373';
    }
  };

  const getTrendIcon = () => {
    if (!trend) return null;
    const color = getTrendColor();
    const size = 16;

    switch (trend.direction) {
      case 'up':
        return <TrendingUp size={size} color={color} />;
      case 'down':
        return <TrendingDown size={size} color={color} />;
      default:
        return <Minus size={size} color={color} />;
    }
  };

  const colors = getVariantColors();

  const CardContent = () => (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {icon && (
          <View
            style={[styles.iconContainer, { backgroundColor: colors.iconBg }]}
          >
            {icon}
          </View>
        )}
      </View>

      {/* Value */}
      <Text style={[styles.value, { color: colors.accentColor }]}>{value}</Text>

      {/* Footer */}
      <View style={styles.footer}>
        {trend && (
          <View style={styles.trend}>
            {getTrendIcon()}
            <Text style={[styles.trendValue, { color: getTrendColor() }]}>
              {trend.value}
            </Text>
          </View>
        )}
        {subtitle && (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        style={styles.container}
      >
        <CardContent />
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <CardContent />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minWidth: 140,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  title: {
    fontSize: 13,
    color: '#737373',
    fontWeight: '500',
    flex: 1,
    marginRight: 8,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  trend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 12,
    color: '#a3a3a3',
    flex: 1,
  },
});
