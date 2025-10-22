import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  Animated,
  Dimensions,
  StyleSheet,
} from 'react-native';
import {
  X,
  BarChart3,
  DollarSign,
  MessageSquare,
  Settings as SettingsIcon,
  User,
  LogOut,
} from 'lucide-react-native';
import { router, usePathname } from 'expo-router';
import { useAuth } from '../../../lib/auth';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const DRAWER_WIDTH = width * 0.85; // 85% of screen width

interface DrawerNavigationProps {
  visible: boolean;
  onClose: () => void;
}

interface DrawerItem {
  icon: React.ReactNode;
  label: string;
  route: string;
  description: string;
}

export default function DrawerNavigation({
  visible,
  onClose,
}: DrawerNavigationProps) {
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  const slideAnim = React.useRef(new Animated.Value(-DRAWER_WIDTH)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -DRAWER_WIDTH,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const drawerItems: DrawerItem[] = [
    {
      icon: <BarChart3 size={24} color="#22c55e" />,
      label: 'Analytics',
      route: '/(admin)/analytics',
      description: 'Revenue trends & insights',
    },
    {
      icon: <DollarSign size={24} color="#22c55e" />,
      label: 'Billing Hub',
      route: '/(admin)/billing',
      description: 'Payments & invoices',
    },
    {
      icon: <MessageSquare size={24} color="#22c55e" />,
      label: 'Feedback',
      route: '/(admin)/feedback',
      description: 'Customer reviews',
    },
    {
      icon: <SettingsIcon size={24} color="#22c55e" />,
      label: 'Settings',
      route: '/(admin)/settings',
      description: 'App configuration',
    },
  ];

  const handleItemPress = (route: string) => {
    onClose();
    setTimeout(() => {
      router.push(route as any);
    }, 300);
  };

  const handleLogout = async () => {
    onClose();
    await signOut();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Overlay */}
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={onClose}
        />

        {/* Drawer */}
        <Animated.View
          style={[
            styles.drawer,
            {
              transform: [{ translateX: slideAnim }],
            },
          ]}
        >
          <LinearGradient
            colors={['#22c55e', '#16a34a']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.header}
          >
            <View style={styles.headerContent}>
              <View>
                <Text style={styles.headerTitle}>Admin Menu</Text>
                <Text style={styles.headerSubtitle}>
                  {user?.email || 'Administrator'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </LinearGradient>

          <ScrollView style={styles.content} bounces={false}>
            {/* Drawer Items */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Quick Access</Text>
              {drawerItems.map((item, index) => {
                const isActive = pathname.includes(
                  item.route.replace('/(admin)', '')
                );
                return (
                  <TouchableOpacity
                    key={index}
                    style={[styles.item, isActive && styles.itemActive]}
                    onPress={() => handleItemPress(item.route)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.iconContainer}>{item.icon}</View>
                    <View style={styles.itemContent}>
                      <Text
                        style={[
                          styles.itemLabel,
                          isActive && styles.itemLabelActive,
                        ]}
                      >
                        {item.label}
                      </Text>
                      <Text style={styles.itemDescription}>
                        {item.description}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Account Section */}
            <View style={[styles.section, styles.sectionBorder]}>
              <Text style={styles.sectionTitle}>Account</Text>
              <TouchableOpacity
                style={[
                  styles.item,
                  pathname.includes('/notification-preferences') &&
                    styles.itemActive,
                ]}
                onPress={() => {
                  onClose();
                  router.push('/(admin)/notification-preferences' as any);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.iconContainer}>
                  <User size={24} color="#737373" />
                </View>
                <View style={styles.itemContent}>
                  <Text
                    style={[
                      styles.itemLabel,
                      pathname.includes('/notification-preferences') &&
                        styles.itemLabelActive,
                    ]}
                  >
                    Preferences
                  </Text>
                  <Text style={styles.itemDescription}>
                    Notification settings
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.item, styles.logoutButton]}
                onPress={handleLogout}
                activeOpacity={0.7}
              >
                <View style={styles.iconContainer}>
                  <LogOut size={24} color="#ef4444" />
                </View>
                <View style={styles.itemContent}>
                  <Text style={[styles.itemLabel, styles.logoutText]}>
                    Logout
                  </Text>
                  <Text style={styles.itemDescription}>
                    Sign out of admin account
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* App Version */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>RefreshLawn Admin v1.0.0</Text>
              <Text style={styles.footerSubtext}>
                © 2025 GreenScape Services
              </Text>
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  drawer: {
    width: DRAWER_WIDTH,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#dcfce7',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionBorder: {
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#737373',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  itemActive: {
    backgroundColor: '#dcfce7',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemContent: {
    flex: 1,
  },
  itemLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#171717',
    marginBottom: 2,
  },
  itemLabelActive: {
    fontWeight: '700',
  },
  itemDescription: {
    fontSize: 13,
    color: '#737373',
  },
  logoutButton: {
    marginTop: 8,
  },
  logoutText: {
    color: '#ef4444',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
    marginTop: 20,
  },
  footerText: {
    fontSize: 12,
    color: '#737373',
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 11,
    color: '#a3a3a3',
  },
});
