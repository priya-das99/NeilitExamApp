import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  ImageBackground,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAppwrite } from '../utils/AppwriteContext';
import { databases, appwriteConfig } from '../utils/appwriteConfig';
import { Query } from 'appwrite';
import MainLayout from '../components/MainLayout';

const CandidateProfile = () => {
  const { user } = useAppwrite();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [courseName, setCourseName] = useState('');

  useEffect(() => {
    const fetchStudent = async () => {
      if (!user || !user.email) return;
      console.log('User object:', user);
      try {
        const res = await databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.studentsCollectionId,
          [Query.equal('email', user.email)]
        );
        console.log('Student fetch result:', res.documents);
        if (res.documents.length > 0) {
          setStudent(res.documents[0]);
          // Fetch course name if courseId exists
          if (res.documents[0].courseId) {
            try {
              const courseRes = await databases.getDocument(
                appwriteConfig.databaseId,
                appwriteConfig.coursesCollectionId, // Make sure this is your actual courses collection ID
                res.documents[0].courseId
              );
              setCourseName(courseRes.name || 'N/A');
            } catch (err) {
              setCourseName('N/A');
            }
          } else {
            setCourseName('N/A');
          }
        }
      } catch (err) {
        setStudent(null);
        setCourseName('N/A');
      } finally {
        setLoading(false);
      }
    };
    fetchStudent();
  }, [user]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <MainLayout>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <ImageBackground
          source={require('../../assets/images/back.jpg')}
          style={styles.backgroundImage}
          resizeMode="cover"
        >
          <View style={styles.profileCard}>
            <View style={styles.profileImageContainer}>
              <Image
                source={student && student.profileImage ? { uri: student.profileImage } : require('../../assets/images/user.png')}
                style={styles.profileImage}
              />
            </View>
            <Text style={styles.sectionTitle}>Your Information</Text>
            {loading ? (
              <ActivityIndicator size="large" color="#003399" style={{ marginTop: 24 }} />
            ) : student ? (
              <>
                <TextInput
                  style={styles.input}
                  value={student.name || ''}
                  placeholder="Name"
                  editable={false}
                  placeholderTextColor="#aaa"
                />
                <TextInput
                  style={styles.input}
                  value={student.email || ''}
                  placeholder="Email Id"
                  editable={false}
                  placeholderTextColor="#aaa"
                />
                <TextInput
                  style={styles.input}
                  value={courseName || ''}
                  placeholder="Course"
                  editable={false}
                  placeholderTextColor="#aaa"
                />
                <TextInput
                  style={styles.input}
                  value={formatDate(student.$createdAt)}
                  placeholder="Date of Joining"
                  editable={false}
                  placeholderTextColor="#aaa"
                />
              </>
            ) : (
              <Text style={styles.errorText}>Profile not found.</Text>
            )}
          </View>
        </ImageBackground>
      </SafeAreaView>
    </MainLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    width: 340,
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#003399',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 18,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  input: {
    width: 280,
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#f8f8f8',
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#222',
    marginBottom: 14,
  },
  errorText: {
    color: '#dc3545',
    fontSize: 16,
    marginTop: 16,
  },
});

export default CandidateProfile;