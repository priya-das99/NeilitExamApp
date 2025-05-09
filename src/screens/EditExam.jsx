import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  StatusBar,
  SafeAreaView,
  Image,
  Modal,
  ActivityIndicator,
  Button,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AdminSidebar from '../components/AdminSidebar';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { launchImageLibrary } from 'react-native-image-picker';
import { databases, appwriteConfig, ID, storage } from '../utils/appwriteConfig';
import { useNavigation, useRoute } from '@react-navigation/native';
import mime from 'react-native-mime-types';
import RNFetchBlob from 'rn-fetch-blob';
import { Query } from 'appwrite';
import { Image as RNImage } from 'react-native';
import ImageResizer from 'react-native-image-resizer';
import QuestionSearch from '../components/QuestionSearch';

const EditExam = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [examData, setExamData] = useState({
    title: '',
    description: '',
    duration: '',
    totalMarks: '',
    passingMarks: '',
    status: 'scheduled',
  });
  const [startDate, setStartDate] = useState(new Date());
  const [startTime, setStartTime] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date());
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [questions, setQuestions] = useState([]);
  const navigation = useNavigation();
  const route = useRoute();
  const { examId } = route.params;
  const [students, setStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingExam, setLoadingExam] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showQuestionSearch, setShowQuestionSearch] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoadingExam(true);
    try {
      // Fetch courses
      const coursesRes = await databases.listDocuments(appwriteConfig.databaseId, appwriteConfig.coursesCollectionId);
      setCourses(coursesRes.documents);
      // Fetch exam
      const examRes = await databases.getDocument(appwriteConfig.databaseId, appwriteConfig.examsCollectionId, examId);
      setExamData({
        title: examRes.title,
        description: examRes.description,
        duration: String(examRes.duration),
        totalMarks: String(examRes.totalMarks),
        passingMarks: String(examRes.passingMarks),
        status: examRes.status || 'scheduled',
      });
      setSelectedCourse(examRes.courseId);
      setSubjectName(examRes.subjectId || '');
      setStartDate(new Date(examRes.startTime));
      setStartTime(new Date(examRes.startTime));
      setEndDate(new Date(examRes.endTime));
      setEndTime(new Date(examRes.endTime));
      // Fetch questions
      const questionsRes = await databases.listDocuments(appwriteConfig.databaseId, appwriteConfig.questionsCollectionId, [Query.equal('examId', examId)]);
      setQuestions(questionsRes.documents.map(q => ({
        ...q,
        text: q.questionText,
        options: q.options ? JSON.parse(q.options) : [
          { text: '', image: null },
          { text: '', image: null },
          { text: '', image: null },
          { text: '', image: null }
        ],
        correctAnswers: q.correctAnswers ? JSON.parse(q.correctAnswers).map(a => a.charCodeAt(0) - 97) : [],
        image: q.imageId ? { uri: `https://cloud.appwrite.io/v1/storage/buckets/${appwriteConfig.bucketId}/files/${q.imageId}/view` } : null,
        type: q.type || 'mcq',
        marks: q.marks || 1,
        difficulty: q.difficulty || 'easy',
        tags: Array.isArray(q.tags) ? q.tags.join(', ') : (q.tags || '')
      })));
    } catch (err) {
      Alert.alert('Error', 'Failed to load exam details');
    } finally {
      setLoadingExam(false);
    }
  };

  const handleInputChange = (field, value) => {
    setExamData(prev => ({ ...prev, [field]: value }));
  };
  const handleQuestionChange = (idx, field, value) => {
    setQuestions(prev => prev.map((q, i) => i === idx ? { ...q, [field]: value } : q));
  };
  const handleOptionChange = (qIdx, optIdx, value) => {
    setQuestions(prev => prev.map((q, i) =>
      i === qIdx ? {
        ...q,
        options: q.options.map((o, oi) => oi === optIdx ? { ...o, text: value } : o)
      } : q
    ));
  };
  const handleQuestionTypeChange = (qIdx, type) => {
    setQuestions(prev => prev.map((q, i) => {
      if (i === qIdx) {
        const correctAnswers = type === 'mcq' && q.correctAnswers.length > 0 
          ? [q.correctAnswers[0]] 
          : [];
        return { ...q, type, correctAnswers };
      }
      return q;
    }));
  };
  const handleCorrectAnswerChange = (qIdx, optIdx) => {
    setQuestions(prev => prev.map((q, i) => {
      if (i === qIdx) {
        if (q.type === 'mcq') {
          return { ...q, correctAnswers: [optIdx] };
        } else {
          return { 
            ...q, 
            correctAnswers: q.correctAnswers.includes(optIdx) 
              ? q.correctAnswers.filter(a => a !== optIdx) 
              : [...q.correctAnswers, optIdx] 
          };
        }
      }
      return q;
    }));
  };
  const checkImageResolution = (uri, minWidth = 1200, minHeight = 1600) => {
    return new Promise((resolve, reject) => {
      RNImage.getSize(uri, (width, height) => {
        if (width >= minWidth && height >= minHeight) {
          resolve(true);
        } else {
          resolve(false);
        }
      }, reject);
    });
  };
  const handleImagePick = async (qIdx) => {
    const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.8 });
    if (result.assets && result.assets[0]) {
      const asset = result.assets[0];
      const isValid = await checkImageResolution(asset.uri);
      if (!isValid) {
        Alert.alert('Image too small', 'Please select an image with at least 1200x1600 pixels (2MP) for clarity.');
        return;
      }
      try {
        const resized = await ImageResizer.createResizedImage(
          asset.uri,
          150, // width
          120, // height
          'JPEG',
          80 // quality
        );
        setQuestions(prev => prev.map((q, i) => i === qIdx ? { ...q, image: { ...asset, uri: resized.uri } } : q));
      } catch (err) {
        Alert.alert('Resize Error', 'Failed to resize image.');
      }
    }
  };
  const handleRemoveImage = (qIdx) => {
    setQuestions(prev => prev.map((q, i) => i === qIdx ? { ...q, image: null } : q));
  };
  const addQuestion = () => {
    setQuestions([...questions, {
      text: '',
      options: [
        { text: '', image: null },
        { text: '', image: null },
        { text: '', image: null },
        { text: '', image: null }
      ],
      correctAnswers: [],
      image: null,
      type: 'mcq',
      marks: 1,
      difficulty: 'easy',
      tags: ''
    }]);
  };
  const removeQuestion = (idx) => {
    setQuestions(prev => prev.filter((_, i) => i !== idx));
  };
  const uploadImageToAppwrite = async (image) => {
    try {
      const fileId = ID.unique();
      const response = await RNFetchBlob.fetch(
        'POST',
        `https://cloud.appwrite.io/v1/storage/buckets/${appwriteConfig.bucketId}/files`,
        {
          'Content-Type': 'multipart/form-data',
          'X-Appwrite-Project': appwriteConfig.projectId,
        },
        [
          { name: 'fileId', data: fileId },
          {
            name: 'file',
            filename: image.fileName || 'photo.jpg',
            type: image.type || 'image/jpeg',
            data: RNFetchBlob.wrap(image.uri),
          },
        ]
      );
      const data = JSON.parse(response.data);
      if (response.respInfo.status !== 201) {
        throw new Error(data.message || 'Upload failed');
      }
      return data.$id;
    } catch (err) {
      console.error('Image upload failed:', err);
      throw err;
    }
  };
  const fetchStudents = async (courseId) => {
    try {
      setLoadingStudents(true);
      const res = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.studentsCollectionId,
        [
          Query.equal('courseId', courseId)
        ]
      );
      setStudents(res.documents);
    } catch (err) {
      console.error('Failed to fetch students:', err);
      Alert.alert('Error', 'Failed to load students');
    } finally {
      setLoadingStudents(false);
    }
  };
  const handleCourseSelect = (courseId) => {
    setSelectedCourse(courseId);
    if (courseId) {
      fetchStudents(courseId);
    }
  };
  const handleStudentSelect = (studentId, status) => {
    if (status !== 'active') {
      Alert.alert('Cannot Select', 'Only active students can be assigned exams');
      return;
    }
    setSelectedStudents(prev => {
      if (prev.includes(studentId)) {
        return prev.filter(id => id !== studentId);
      } else {
        return [...prev, studentId];
      }
    });
  };
  const handleOptionImagePick = async (qIdx, optIdx) => {
    const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.8 });
    if (result.assets && result.assets[0]) {
      const asset = result.assets[0];
      const isValid = await checkImageResolution(asset.uri);
      if (!isValid) {
        Alert.alert('Image too small', 'Please select an image with at least 1200x1600 pixels (2MP) for clarity.');
        return;
      }
      try {
        const resized = await ImageResizer.createResizedImage(
          asset.uri,
          150, // width
          120, // height
          'JPEG',
          80 // quality
        );
        setQuestions(prev => prev.map((q, i) =>
          i === qIdx ? {
            ...q,
            options: q.options.map((o, oi) => oi === optIdx ? { ...o, image: { ...asset, uri: resized.uri } } : o)
          } : q
        ));
      } catch (err) {
        Alert.alert('Resize Error', 'Failed to resize option image.');
      }
    }
  };
  const handleOptionRemoveImage = (qIdx, optIdx) => {
    setQuestions(prev => prev.map((q, i) =>
      i === qIdx ? {
        ...q,
        options: q.options.map((o, oi) => oi === optIdx ? { ...o, image: null } : o)
      } : q
    ));
  };

  const handleSubmit = async () => {
    if (!selectedCourse || !subjectName || !examData.title || !examData.duration || !examData.totalMarks || !examData.passingMarks) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    if (!startDate || !startTime || !endDate || !endTime) {
      Alert.alert('Error', 'Please select start and end date and time');
      return;
    }
    if (questions.some(q => !q.text || q.options.some(o => !o.text) || q.correctAnswers.length === 0 || !q.difficulty || !q.tags)) {
      Alert.alert('Error', 'Please complete all questions including difficulty level and tags');
      return;
    }
    setSaving(true);
    try {
      const combinedStart = new Date(startDate);
      combinedStart.setHours(startTime.getHours());
      combinedStart.setMinutes(startTime.getMinutes());
      combinedStart.setSeconds(0);
      combinedStart.setMilliseconds(0);
      const combinedEnd = new Date(endDate);
      combinedEnd.setHours(endTime.getHours());
      combinedEnd.setMinutes(endTime.getMinutes());
      combinedEnd.setSeconds(0);
      combinedEnd.setMilliseconds(0);
      // Update exam
      await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.examsCollectionId,
        examId,
        {
          ...examData,
          courseId: selectedCourse,
          subjectId: subjectName,
          duration: parseInt(examData.duration),
          totalMarks: parseInt(examData.totalMarks),
          passingMarks: parseInt(examData.passingMarks),
          startTime: combinedStart.toISOString(),
          endTime: combinedEnd.toISOString(),
        }
      );
      // Update or create questions
      for (const [idx, q] of questions.entries()) {
        let imageId = q.imageId;
        if (q.image && q.image.uri && !q.imageId) {
          imageId = await uploadImageToAppwrite(q.image);
        }
        const optionsWithImages = await Promise.all(q.options.map(async (opt, i) => {
          let optionImageId = opt.imageId;
          if (opt.image && opt.image.uri && !opt.imageId) {
            optionImageId = await uploadImageToAppwrite(opt.image);
          }
          return {
            optionId: String.fromCharCode(97 + i),
            text: opt.text,
            imageId: optionImageId
          };
        }));
        const data = {
          examId: examId,
          questionId: q.questionId || `Q${idx + 1}`,
          subjectId: subjectName,
          courseId: selectedCourse,
          type: q.type,
          questionText: q.text,
          imageId: imageId,
          options: JSON.stringify(optionsWithImages),
          correctAnswers: JSON.stringify(q.correctAnswers.map(i => String.fromCharCode(97 + i))),
          marks: Number(q.marks) || 1,
          difficulty: q.difficulty,
          tags: q.tags.split(',').map(tag => tag.trim()).filter(tag => tag !== '')
        };
        if (q.$id) {
          await databases.updateDocument(
            appwriteConfig.databaseId,
            appwriteConfig.questionsCollectionId,
            q.$id,
            data
          );
        } else {
          await databases.createDocument(
            appwriteConfig.databaseId,
            appwriteConfig.questionsCollectionId,
            ID.unique(),
            data
          );
        }
      }
      Alert.alert('Success', 'Exam updated successfully', [
        { text: 'OK', onPress: () => navigation.navigate('ManageExams') }
      ]);
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to update exam');
    } finally {
      setSaving(false);
    }
  };

  const handleQuestionSelect = (selectedQuestion) => {
    const newQuestion = {
      text: selectedQuestion.text,
      type: selectedQuestion.type || 'mcq',
      marks: selectedQuestion.marks || 1,
      difficulty: selectedQuestion.difficulty || 'medium',
      tags: selectedQuestion.tags,
      options: selectedQuestion.options || [],
      correctAnswers: selectedQuestion.correctAnswers || [],
      image: selectedQuestion.image || null,
    };

    setQuestions(prev => [...prev, newQuestion]);
    setShowQuestionSearch(false);
  };

  if (loadingExam) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#1976d2" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.container}>
        <AdminSidebar isVisible={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setIsMenuOpen(true)}>
            <Icon name="menu" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Exam</Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView style={styles.content}>
          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Course *</Text>
              <View style={{ borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8 }}>
                <Picker
                  selectedValue={selectedCourse}
                  onValueChange={handleCourseSelect}
                  style={{ height: 50 }}
                >
                  <Picker.Item label="Select Course" value="" />
                  {courses.map(course => (
                    <Picker.Item key={course.$id} label={course.name} value={course.$id} />
                  ))}
                </Picker>
              </View>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Subject Name *</Text>
              <TextInput
                style={styles.input}
                value={subjectName}
                onChangeText={setSubjectName}
                placeholder="Enter subject name"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Exam Title *</Text>
              <TextInput
                style={styles.input}
                value={examData.title}
                onChangeText={text => handleInputChange('title', text)}
                placeholder="Enter exam title"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={examData.description}
                onChangeText={text => handleInputChange('description', text)}
                placeholder="Enter exam description"
                multiline
                numberOfLines={4}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Duration (minutes) *</Text>
              <TextInput
                style={styles.input}
                value={examData.duration}
                onChangeText={text => handleInputChange('duration', text)}
                placeholder="Enter exam duration"
                keyboardType="numeric"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Total Marks *</Text>
              <TextInput
                style={styles.input}
                value={examData.totalMarks}
                onChangeText={text => handleInputChange('totalMarks', text)}
                placeholder="Enter total marks"
                keyboardType="numeric"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Passing Marks *</Text>
              <TextInput
                style={styles.input}
                value={examData.passingMarks}
                onChangeText={text => handleInputChange('passingMarks', text)}
                placeholder="Enter passing marks"
                keyboardType="numeric"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Start Date *</Text>
              <TouchableOpacity onPress={() => setShowStartDatePicker(true)} style={styles.input}>
                <Text>{startDate.toLocaleDateString()}</Text>
              </TouchableOpacity>
              {showStartDatePicker && (
                <DateTimePicker
                  value={startDate}
                  mode="date"
                  display="default"
                  onChange={(e, date) => { setShowStartDatePicker(false); if (date) setStartDate(date); }}
                />
              )}
              <Text style={styles.label}>Start Time *</Text>
              <TouchableOpacity onPress={() => setShowStartTimePicker(true)} style={styles.input}>
                <Text>{startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
              </TouchableOpacity>
              {showStartTimePicker && (
                <DateTimePicker
                  value={startTime}
                  mode="time"
                  display="default"
                  onChange={(e, time) => { setShowStartTimePicker(false); if (time) setStartTime(time); }}
                />
              )}
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>End Date *</Text>
              <TouchableOpacity onPress={() => setShowEndDatePicker(true)} style={styles.input}>
                <Text>{endDate.toLocaleDateString()}</Text>
              </TouchableOpacity>
              {showEndDatePicker && (
                <DateTimePicker
                  value={endDate}
                  mode="date"
                  display="default"
                  onChange={(e, date) => { setShowEndDatePicker(false); if (date) setEndDate(date); }}
                />
              )}
              <Text style={styles.label}>End Time *</Text>
              <TouchableOpacity onPress={() => setShowEndTimePicker(true)} style={styles.input}>
                <Text>{endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
              </TouchableOpacity>
              {showEndTimePicker && (
                <DateTimePicker
                  value={endTime}
                  mode="time"
                  display="default"
                  onChange={(e, time) => { setShowEndTimePicker(false); if (time) setEndTime(time); }}
                />
              )}
            </View>
            <View style={styles.inputGroup}>
              <View style={styles.questionHeader}>
                <Text style={styles.label}>Questions *</Text>
                <TouchableOpacity 
                  style={styles.searchButton}
                  onPress={() => setShowQuestionSearch(true)}
                >
                  <Icon name="search" size={20} color="#fff" />
                  <Text style={styles.searchButtonText}>Search Questions</Text>
                </TouchableOpacity>
              </View>
              
              {showQuestionSearch ? (
                <View style={styles.searchContainer}>
                  <QuestionSearch
                    onQuestionSelect={handleQuestionSelect}
                    onTagsChange={() => {}}
                  />
                </View>
              ) : (
                <>
                  {questions.map((q, qIdx) => (
                    <View key={qIdx} style={{ marginBottom: 20, borderWidth: 1, borderColor: '#eee', borderRadius: 8, padding: 10 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                        <Text style={{ fontWeight: 'bold', fontSize: 16, marginRight: 8 }}>{`Question ${qIdx + 1}`}</Text>
                        <TextInput
                          style={[styles.input, { flex: 1 }]}
                          value={q.text}
                          onChangeText={text => handleQuestionChange(qIdx, 'text', text)}
                          placeholder={`Enter question text`}
                        />
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                        <Text style={{ fontSize: 15, marginRight: 8 }}>Marks</Text>
                        <TextInput
                          style={[styles.input, { width: 80 }]}
                          value={q.marks ? String(q.marks) : ''}
                          onChangeText={text => handleQuestionChange(qIdx, 'marks', text.replace(/[^0-9]/g, ''))}
                          placeholder="1"
                          keyboardType="numeric"
                        />
                      </View>
                      <View style={{ marginBottom: 8 }}>
                        <Text style={styles.label}>Type</Text>
                        <View style={{ borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, overflow: 'hidden', backgroundColor: '#fff', marginTop: 4 }}>
                          <Picker
                            selectedValue={q.type}
                            onValueChange={type => handleQuestionTypeChange(qIdx, type)}
                            style={{ height: 51, width: '100%', fontSize: 18, paddingVertical: 10 }}
                            itemStyle={{ fontSize: 18, height: 48 }}
                            dropdownIconColor="#1976d2"
                          >
                            <Picker.Item label="MCQ" value="mcq" />
                            <Picker.Item label="MSQ" value="msq" />
                          </Picker>
                        </View>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                        <TouchableOpacity onPress={() => handleImagePick(qIdx)} style={{ marginRight: 10, flexDirection: 'row', alignItems: 'center' }}>
                          <Icon name="image" size={20} color="#1976d2" />
                          <Text style={{ color: '#1976d2', marginLeft: 5 }}>Upload an Image</Text>
                        </TouchableOpacity>
                        {q.image && (
                          <TouchableOpacity onPress={() => handleRemoveImage(qIdx)} style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Icon name="close" size={20} color="#f44336" />
                            <Text style={{ color: '#f44336', marginLeft: 5 }}>Remove Image</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                      {q.image && (
                        <View
                          style={{
                            width: '100%',
                            maxWidth: 320,
                            height: 180,
                            alignSelf: 'center',
                            marginBottom: 10,
                            borderRadius: 12,
                            backgroundColor: '#fff',
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.15,
                            shadowRadius: 4,
                            elevation: 3,
                            overflow: 'hidden',
                            justifyContent: 'center',
                            alignItems: 'center'
                          }}
                        >
                          <Image
                            source={{ uri: q.image.uri }}
                            style={{
                              width: '100%',
                              height: '100%',
                              resizeMode: 'contain'
                            }}
                          />
                        </View>
                      )}
                      <View style={{ marginBottom: 8 }}>
                        <Text style={styles.label}>Difficulty Level *</Text>
                        <View style={{ borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, overflow: 'hidden', backgroundColor: '#fff', marginTop: 4 }}>
                          <Picker
                            selectedValue={q.difficulty}
                            onValueChange={value => handleQuestionChange(qIdx, 'difficulty', value)}
                            style={{ height: 51, width: '100%', fontSize: 18, paddingVertical: 10 }}
                            itemStyle={{ fontSize: 18, height: 48 }}
                            dropdownIconColor="#1976d2"
                          >
                            <Picker.Item label="Easy" value="easy" />
                            <Picker.Item label="Medium" value="medium" />
                            <Picker.Item label="Hard" value="hard" />
                          </Picker>
                        </View>
                      </View>
                      <View style={{ marginBottom: 8 }}>
                        <Text style={styles.label}>Tags (comma separated) *</Text>
                        <TextInput
                          style={styles.input}
                          value={q.tags}
                          onChangeText={text => handleQuestionChange(qIdx, 'tags', text)}
                          placeholder="e.g. algebra, geometry, trigonometry"
                        />
                      </View>
                      <Text style={styles.label}>Options</Text>
                      {q.options.map((opt, optIdx) => (
                        <View key={optIdx} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                          <TouchableOpacity
                            onPress={() => handleCorrectAnswerChange(qIdx, optIdx)}
                            style={{ marginRight: 8 }}
                          >
                            <Icon
                              name={q.correctAnswers.includes(optIdx) ? 'check-box' : 'check-box-outline-blank'}
                              size={24}
                              color={q.correctAnswers.includes(optIdx) ? '#1976d2' : '#aaa'}
                            />
                          </TouchableOpacity>
                          {opt.image ? (
                            <View style={{ flex: 1, alignItems: 'center', marginBottom: 8 }}>
                              <View style={{
                                width: '100%',
                                maxWidth: 320,
                                height: 180,
                                borderRadius: 12,
                                backgroundColor: '#fff',
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.15,
                                shadowRadius: 4,
                                elevation: 3,
                                overflow: 'hidden',
                                justifyContent: 'center',
                                alignItems: 'center',
                                marginBottom: 4
                              }}>
                                <Image
                                  source={{ uri: opt.image.uri }}
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    resizeMode: 'contain'
                                  }}
                                />
                              </View>
                              <TouchableOpacity onPress={() => handleOptionRemoveImage(qIdx, optIdx)} style={{ marginTop: 2 }}>
                                <Icon name="close" size={22} color="#f44336" />
                              </TouchableOpacity>
                            </View>
                          ) : (
                            <>
                              <TextInput
                                style={[styles.input, { flex: 1 }]}
                                value={opt.text}
                                onChangeText={text => handleOptionChange(qIdx, optIdx, text)}
                                placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
                              />
                              <TouchableOpacity onPress={() => handleOptionImagePick(qIdx, optIdx)} style={{ marginLeft: 8 }}>
                                <Icon name="image" size={20} color="#1976d2" />
                              </TouchableOpacity>
                            </>
                          )}
                        </View>
                      ))}
                      {q.correctAnswers.length > 0 && (
                        <View style={{ backgroundColor: '#f7f0ff', borderRadius: 8, padding: 10, marginTop: 10 }}>
                          <Text style={{ color: '#8e24aa', fontWeight: 'bold' }}>Correct Answer:</Text>
                          <Text style={{ color: '#8e24aa', marginTop: 2 }}>
                            {q.correctAnswers.map(i => `Option ${i + 1}`).join(', ')}
                          </Text>
                        </View>
                      )}
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
                        <TouchableOpacity onPress={() => removeQuestion(qIdx)} style={{ backgroundColor: '#f44336', padding: 8, borderRadius: 6 }}>
                          <Text style={{ color: '#fff' }}>Remove</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={addQuestion} style={{ backgroundColor: '#1976d2', padding: 8, borderRadius: 6 }}>
                          <Text style={{ color: '#fff' }}>Add Question</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                  {questions.length === 0 && (
                    <View style={{ alignItems: 'center', marginVertical: 20 }}>
                      <TouchableOpacity onPress={addQuestion} style={{ backgroundColor: '#1976d2', padding: 12, borderRadius: 8 }}>
                        <Text style={{ color: '#fff', fontWeight: 'bold' }}>Add Question</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              )}
            </View>
            <View style={{ paddingBottom: 30, paddingHorizontal: 10, backgroundColor: '#fff' }}>
              <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={saving}>
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Update Exam</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  content: {
    flex: 1,
  },
  formContainer: {
    padding: 10,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 10,
  },
  textArea: {
    height: 80,
  },
  submitButton: {
    backgroundColor: '#1976d2',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1976d2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  searchButtonText: {
    color: '#fff',
    marginLeft: 4,
    fontSize: 14,
  },
  searchContainer: {
    height: 400,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    overflow: 'hidden',
  },
});

export default EditExam; 