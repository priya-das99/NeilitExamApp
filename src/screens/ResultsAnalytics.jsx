import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AdminSidebar from '../components/AdminSidebar';

// Mock data for results
const mockResults = [
  {
    id: '1',
    examName: 'Mathematics Final Exam',
    totalStudents: 50,
    averageScore: 75,
    passPercentage: 85,
    topScore: 98,
    date: '2024-03-15',
  },
  {
    id: '2',
    examName: 'Science Midterm',
    totalStudents: 45,
    averageScore: 68,
    passPercentage: 78,
    topScore: 95,
    date: '2024-03-10',
  },
  {
    id: '3',
    examName: 'History Quiz',
    totalStudents: 40,
    averageScore: 82,
    passPercentage: 90,
    topScore: 100,
    date: '2024-03-05',
  },
];

const ResultsAnalytics = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const renderResultItem = ({ item }) => (
    <View style={styles.resultCard}>
      <View style={styles.resultHeader}>
        <Text style={styles.examName}>{item.examName}</Text>
        <Text style={styles.date}>{item.date}</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Icon name="people" size={20} color="#666" />
          <Text style={styles.statValue}>{item.totalStudents}</Text>
          <Text style={styles.statLabel}>Students</Text>
        </View>
        <View style={styles.statItem}>
          <Icon name="trending-up" size={20} color="#666" />
          <Text style={styles.statValue}>{item.averageScore}%</Text>
          <Text style={styles.statLabel}>Average</Text>
        </View>
        <View style={styles.statItem}>
          <Icon name="check-circle" size={20} color="#666" />
          <Text style={styles.statValue}>{item.passPercentage}%</Text>
          <Text style={styles.statLabel}>Pass Rate</Text>
        </View>
        <View style={styles.statItem}>
          <Icon name="star" size={20} color="#666" />
          <Text style={styles.statValue}>{item.topScore}%</Text>
          <Text style={styles.statLabel}>Top Score</Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.container}>
        <AdminSidebar isVisible={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
        
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setIsMenuOpen(true)}>
            <Icon name="menu" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Results Analytics</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.content}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Overall Performance</Text>
            <View style={styles.summaryStats}>
              <View style={styles.summaryStat}>
                <Text style={styles.summaryValue}>85%</Text>
                <Text style={styles.summaryLabel}>Average Pass Rate</Text>
              </View>
              <View style={styles.summaryStat}>
                <Text style={styles.summaryValue}>135</Text>
                <Text style={styles.summaryLabel}>Total Students</Text>
              </View>
              <View style={styles.summaryStat}>
                <Text style={styles.summaryValue}>3</Text>
                <Text style={styles.summaryLabel}>Active Exams</Text>
              </View>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Recent Exam Results</Text>
          <FlatList
            data={mockResults}
            renderItem={renderResultItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.resultsList}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryStat: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00e4d0',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  resultsList: {
    gap: 15,
  },
  resultCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  examName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  date: {
    fontSize: 14,
    color: '#666',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
});

export default ResultsAnalytics; 