import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  Pressable,
} from 'react-native';

const ColorPickerModal = ({ 
  visible, 
  onClose, 
  onSelectColor, 
  currentColor = '#003399' 
}) => {
  const colorOptions = [
    { color: '#000000', label: 'Black' },
    { color: '#666666', label: 'Gray' },
    { color: '#dc3545', label: 'Red' },
    { color: '#9C27B0', label: 'Purple' },
    { color: '#1E88E5', label: 'Blue' },
    { color: '#00BCD4', label: 'Cyan' },
    { color: '#28a745', label: 'Green' },
    { color: '#8BC34A', label: 'Light Green' },
    { color: '#FFEB3B', label: 'Yellow' },
    { color: '#FF9800', label: 'Orange' },
  ];

  const modalAnimation = new Animated.Value(visible ? 1 : 0);

  React.useEffect(() => {
    Animated.timing(modalAnimation, {
      toValue: visible ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  const modalTranslateY = modalAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [300, 0],
  });

  const backdropOpacity = modalAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.5],
  });

  return (
    <Modal
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
      animationType="none"
    >
      <View style={styles.modalContainer}>
        <Animated.View
          style={[styles.backdrop, { opacity: backdropOpacity }]}
        >
          <Pressable style={styles.backdropPressable} onPress={onClose} />
        </Animated.View>
        
        <Animated.View
          style={[styles.modalContent, { transform: [{ translateY: modalTranslateY }] }]}
        >
          <View style={styles.headerContainer}>
            <Text style={styles.headerTitle}>Choose Theme Color</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.colorWheelContainer}>
            <View style={styles.colorWheel}>
              <View style={[styles.wheelCenter, { backgroundColor: currentColor }]} />
            </View>
          </View>
          
          <View style={styles.colorOptionsContainer}>
            {colorOptions.map((option) => (
              <TouchableOpacity
                key={option.color}
                style={[
                  styles.colorOption,
                  { backgroundColor: option.color },
                  currentColor === option.color && styles.selectedColor,
                ]}
                onPress={() => onSelectColor(option.color)}
              />
            ))}
          </View>
          
          <TouchableOpacity 
            style={[styles.applyButton, { backgroundColor: currentColor }]}
            onPress={onClose}
          >
            <Text style={styles.applyButtonText}>Apply</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'black',
  },
  backdropPressable: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    alignItems: 'center',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#333333',
  },
  colorWheelContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  colorWheel: {
    width: 150,
    height: 150,
    borderRadius: 75,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'conic-gradient(red, orange, yellow, green, blue, purple, red)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  wheelCenter: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#003399',
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  colorOptionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 20,
  },
  colorOption: {
    width: 30,
    height: 30,
    borderRadius: 15,
    margin: 6,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  selectedColor: {
    borderWidth: 2,
    borderColor: '#333333',
  },
  applyButton: {
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    width: '100%',
  },
  applyButtonText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: 'bold',
  },
});

export default ColorPickerModal;