import React, { useState, createContext, useContext, ReactNode, useCallback } from 'react';
import { Alert, Platform, Modal, View, Text, TouchableOpacity, StyleSheet, AlertButton } from 'react-native';

interface ConfirmationOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  confirmButtonStyle?: 'default' | 'destructive';
}

interface ConfirmationContextType {
  showConfirmation: (options: ConfirmationOptions) => void;
}

const ConfirmationContext = createContext<ConfirmationContextType | undefined>(undefined);

export const useConfirmation = () => {
  const context = useContext(ConfirmationContext);
  if (!context) {
    throw new Error('useConfirmation must be used within a ConfirmationModalProvider');
  }
  return context;
};

interface ConfirmationModalProviderProps {
  children: ReactNode;
}

export const ConfirmationModalProvider: React.FC<ConfirmationModalProviderProps> = ({ children }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [confirmationOptions, setConfirmationOptions] = useState<ConfirmationOptions | null>(null);

  const handleShowConfirmation = useCallback((options: ConfirmationOptions) => {
    if (Platform.OS === 'web') {
      setConfirmationOptions(options);
      setModalVisible(true);
    } else {
      const buttons: AlertButton[] = [];

      if (options.onCancel || options.cancelText) {
        buttons.push({
          text: options.cancelText || 'Cancel',
          onPress: () => {
            options.onCancel?.();
          },
          style: 'cancel',
        });
      }

      buttons.push({
        text: options.confirmText || 'OK',
        onPress: options.onConfirm,
        style: options.confirmButtonStyle === 'destructive' ? 'destructive' : 'default',
      });

      Alert.alert(options.title, options.message, buttons, { cancelable: false });
    }
  }, []);

  const handleConfirm = () => {
    confirmationOptions?.onConfirm();
    setModalVisible(false);
    setConfirmationOptions(null);
  };

  const handleCancel = () => {
    confirmationOptions?.onCancel?.();
    setModalVisible(false);
    setConfirmationOptions(null);
  };

  return (
    <ConfirmationContext.Provider value={{ showConfirmation: handleShowConfirmation }}>
      {children}
      {Platform.OS === 'web' && confirmationOptions && (
        <Modal
          animationType="fade"
          transparent={true}
          visible={modalVisible}
          onRequestClose={handleCancel}
        >
          <View style={styles.centeredView}>
            <View style={styles.modalView}>
              <Text style={styles.modalTitle}>{confirmationOptions.title}</Text>
              <Text style={styles.modalText}>{confirmationOptions.message}</Text>
              <View style={styles.buttonContainer}>
                {confirmationOptions.onCancel || confirmationOptions.cancelText ? (
                  <TouchableOpacity
                    style={[styles.button, styles.buttonCancel]}
                    onPress={handleCancel}
                  >
                    <Text style={styles.textStyleCancel}>{confirmationOptions.cancelText || 'Cancel'}</Text>
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity
                  style={[
                    styles.button,
                    confirmationOptions.confirmButtonStyle === 'destructive'
                      ? styles.buttonDestructive
                      : styles.buttonConfirm,
                  ]}
                  onPress={handleConfirm}
                >
                  <Text style={styles.textStyleConfirm}>{confirmationOptions.confirmText || 'OK'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </ConfirmationContext.Provider>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    maxWidth: 400,
  },
  modalTitle: {
    marginBottom: 15,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalText: {
    marginBottom: 25,
    textAlign: 'center',
    fontSize: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  button: {
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    elevation: 2,
    minWidth: 100,
    marginHorizontal: 10,
  },
  buttonConfirm: {
    backgroundColor: '#2196F3',
  },
  buttonCancel: {
    backgroundColor: '#6c757d',
  },
  buttonDestructive: {
    backgroundColor: '#f44336',
  },
  textStyleConfirm: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  textStyleCancel: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default useConfirmation;
