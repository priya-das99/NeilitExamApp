import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import CheckBox from '@react-native-community/checkbox';

const OptionItem = ({ 
  option, // display text
  value,  // unique value for selection
  isSelected, 
  onSelect, 
  questionType, 
  onSingleSelect
}) => {
  const handleSelection = () => {
    if (questionType === 'mcq') {
      if (isSelected) {
        onSingleSelect(null);
      } else {
        onSingleSelect(value);
      }
    } else if (questionType === 'msq') {
      onSelect(value);
    }
  };

  return (
    <TouchableOpacity 
      style={[styles.container, isSelected && styles.selectedContainer]} 
      onPress={handleSelection} 
      activeOpacity={0.7}
    >
      <View style={styles.optionRow}>
        <CheckBox
          value={isSelected}
          onValueChange={handleSelection}
          tintColors={{ true: '#3B82F6', false: '#4B5563' }}
          style={styles.checkbox}
        />
        <Text selectable={false} style={[styles.optionText, isSelected && styles.selectedText]}>{option}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E7FF',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  selectedContainer: {
    backgroundColor: '#EBF5FF',
    borderBottomColor: '#3B82F6',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checkbox: {
    marginRight: 12,
  },
  optionText: {
    fontSize: 16,
    color: '#1F2937',
    flex: 1,
  },
  selectedText: {
    color: '#3B82F6',
    fontWeight: '500',
  },
});

export default OptionItem;