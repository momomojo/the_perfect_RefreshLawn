import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  Inbox,
  Calendar,
  Users,
  FileText,
  AlertCircle,
  CheckCircle,
  Search,
  Package,
} from 'lucide-react-native';

interface EmptyStateProps {
  type?:
    | 'inbox'
    | 'calendar'
    | 'users'
    | 'documents'
    | 'error'
    | 'success'
    | 'search'
    | 'package';
  title: string;
  message: string;
  action?: React.ReactNode;
  iconColor?: string;
}

export default function EmptyState({
  type = 'inbox',
  title,
  message,
  action,
  iconColor = '#22c55e',
}: EmptyStateProps) {
  const getIcon = () => {
    const iconSize = 64;
    const color = iconColor;

    switch (type) {
      case 'calendar':
        return <Calendar size={iconSize} color={color} strokeWidth={1.5} />;
      case 'users':
        return <Users size={iconSize} color={color} strokeWidth={1.5} />;
      case 'documents':
        return <FileText size={iconSize} color={color} strokeWidth={1.5} />;
      case 'error':
        return (
          <AlertCircle size={iconSize} color="#ef4444" strokeWidth={1.5} />
        );
      case 'success':
        return (
          <CheckCircle size={iconSize} color="#22c55e" strokeWidth={1.5} />
        );
      case 'search':
        return <Search size={iconSize} color={color} strokeWidth={1.5} />;
      case 'package':
        return <Package size={iconSize} color={color} strokeWidth={1.5} />;
      default:
        return <Inbox size={iconSize} color={color} strokeWidth={1.5} />;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <View style={[styles.iconCircle, { borderColor: iconColor }]}>
          {getIcon()}
        </View>
      </View>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>

      {action && <View style={styles.actionContainer}>{action}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  iconContainer: {
    marginBottom: 24,
  },
  iconCircle: {
    width: 128,
    height: 128,
    borderRadius: 64,
    borderWidth: 2,
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#171717',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 15,
    color: '#737373',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  actionContainer: {
    width: '100%',
    maxWidth: 300,
  },
});
