import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  FlatList,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AdminSidebar from '../components/AdminSidebar';
import { databases, appwriteConfig, ID } from '../utils/appwriteConfig';
import { Query } from 'appwrite';
import DateTimePicker from '@react-native-community/datetimepicker';

// Mock data for exams
const mockExams = [
  {
    id: '1',
    title: 'Mathematics Final Exam',
    duration: 120,
    totalMarks: 100,
    passingMarks: 40,
    status: 'Active',
  },
  {
    id: '2',
    title: 'Science Midterm',
    duration: 90,
    totalMarks: 80,
    passingMarks: 32,
    status: 'Active',
  },
  {
    id: '3',
    title: 'History Quiz',
    duration: 45,
    totalMarks: 50,
    passingMarks: 20,
    status: 'Inactive',
  },
];

const ManageExams = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [exams, setExams] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const statusOptions = ['scheduled', 'ongoing', 'completed', 'cancelled'];
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingExam, setEditingExam] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [editQuestions, setEditQuestions] = useState([]);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [assigningExam, setAssigningExam] = useState(null);
  const [assignStudents, setAssignStudents] = useState([]);
  const [selectedAssignStudents, setSelectedAssignStudents] = useState([]);
  const [assignLoading, setAssignLoading] = useState(false);
  const [selectAllAssign, setSelectAllAssign] = useState(false);
  const [alreadyAssignedStudentIds, setAlreadyAssignedStudentIds] = useState([]);

  const fetchExams = async () => {
    try {
      setLoading(true);
      const res = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.examsCollectionId,
        [Query.orderDesc('createdAt')]
      );
      setExams(res.documents);
    } catch (err) {
      console.error('Failed to fetch exams:', err);
      Alert.alert('Error', 'Failed to load exams. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchExams();
  }, []);

  const handleEditExam = async (examId) => {
    const exam = exams.find(e => e.$id === examId);
    if (!exam) return;
    setEditingExam(exam);
    setEditForm({
      title: exam.title,
      description: exam.description,
      duration: String(exam.duration),
      totalMarks: String(exam.totalMarks),
      passingMarks: String(exam.passingMarks),
      startDate: new Date(exam.startTime),
      startTime: new Date(exam.startTime),
      endDate: new Date(exam.endTime),
      endTime: new Date(exam.endTime),
    });
    // Fetch questions for this exam
    try {
      const res = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.questionsCollectionId,
        [Query.equal('examId', examId)]
      );
      setEditQuestions(res.documents.map(q => ({
        ...q,
        text: q.questionText,
        options: q.options ? JSON.parse(q.options) : [],
        correctAnswers: q.correctAnswers ? JSON.parse(q.correctAnswers).map(a => a.charCodeAt(0) - 97) : [],
        tags: Array.isArray(q.tags) ? q.tags.join(', ') : (q.tags || '')
      })));
    } catch (err) {
      console.error('Failed to fetch questions:', err);
      setEditQuestions([]);
    }
    setEditModalVisible(true);
  };

  const handleEditFormChange = (field, value) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  // Question editing logic (add, remove, update)
  const handleEditQuestionChange = (idx, field, value) => {
    setEditQuestions(prev => prev.map((q, i) => i === idx ? { ...q, [field]: value } : q));
  };
  const handleEditOptionChange = (qIdx, optIdx, value) => {
    setEditQuestions(prev => prev.map((q, i) =>
      i === qIdx ? {
        ...q,
        options: q.options.map((o, oi) => oi === optIdx ? { ...o, text: value } : o)
      } : q
    ));
  };
  const handleEditCorrectAnswerChange = (qIdx, optIdx) => {
    setEditQuestions(prev => prev.map((q, i) => {
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
  const addEditQuestion = () => {
    setEditQuestions(prev => ([
      ...prev,
      {
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
      }
    ]));
  };
  const removeEditQuestion = (idx) => {
    setEditQuestions(prev => prev.filter((_, i) => i !== idx));
  };

  const handleEditSave = async () => {
    if (!editingExam) return;
    setSaving(true);
    try {
      // Combine date and time
      const getCombinedDateTime = (date, time) => {
        const combined = new Date(date);
        combined.setHours(time.getHours());
        combined.setMinutes(time.getMinutes());
        combined.setSeconds(0);
        combined.setMilliseconds(0);
        return combined;
      };
      const startTime = getCombinedDateTime(editForm.startDate, editForm.startTime);
      const endTime = getCombinedDateTime(editForm.endDate, editForm.endTime);
      await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.examsCollectionId,
        editingExam.$id,
        {
          title: editForm.title,
          description: editForm.description,
          duration: parseInt(editForm.duration),
          totalMarks: parseInt(editForm.totalMarks),
          passingMarks: parseInt(editForm.passingMarks),
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
        }
      );
      // Update or create questions
      for (const [idx, q] of editQuestions.entries()) {
        const data = {
          examId: editingExam.$id,
          questionId: q.questionId || `Q${idx + 1}`,
          subjectId: editingExam.subjectId,
          courseId: editingExam.courseId,
          type: q.type,
          questionText: q.text,
          imageId: q.imageId,
          options: JSON.stringify(q.options),
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
            undefined,
            data
          );
        }
      }
      fetchExams();
      setEditModalVisible(false);
      setEditingExam(null);
    } catch (err) {
      Alert.alert('Error', 'Failed to update exam');
    } finally {
      setSaving(false);
    }
  };

  // Real-time status calculation
  const getExamStatus = (exam) => {
    const now = new Date();
    const start = new Date(exam.startTime);
    const end = new Date(exam.endTime);
    if (now < start) return 'scheduled';
    if (now >= start && now < end) return 'ongoing';
    if (now >= end) return 'completed';
    return exam.status || 'scheduled';
  };

  const handleEditExamStatus = (examId, newStatus) => {
    const updatedExams = exams.map(exam =>
      exam.$id === examId ? { ...exam, status: newStatus } : exam
    );
    setExams(updatedExams);
    updateExamStatus(examId, newStatus);
  };

  const updateExamStatus = async (examId, newStatus) => {
    try {
      await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.examsCollectionId,
        examId,
        { status: newStatus }
      );
      handleEditExamStatus(examId, newStatus);
      Alert.alert('Success', `Exam status updated to ${newStatus}`);
    } catch (err) {
      console.error('Failed to update exam status:', err);
      Alert.alert('Error', 'Failed to update exam status. Please try again.');
    }
  };

  const handleDeleteExam = async (examId) => {
    Alert.alert(
      'Delete Exam',
      'Are you sure you want to delete this exam?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          onPress: async () => {
            try {
              await databases.deleteDocument(
                appwriteConfig.databaseId,
                appwriteConfig.examsCollectionId,
                examId
              );
              setExams(prevExams => prevExams.filter(exam => exam.$id !== examId));
              Alert.alert('Success', 'Exam deleted successfully');
            } catch (err) {
              console.error('Failed to delete exam:', err);
              Alert.alert('Error', 'Failed to delete exam. Please try again.');
            }
          },
        },
      ],
    );
  };

  const handleToggleStatus = (examId) => {
    const exam = exams.find(e => e.$id === examId);
    if (!exam) return;
    // Cycle through statuses: scheduled -> ongoing -> completed -> cancelled -> scheduled
    const idx = statusOptions.indexOf(exam.status);
    const nextStatus = statusOptions[(idx + 1) % statusOptions.length];
    updateExamStatus(exam.$id, nextStatus);
  };

  // Fetch students for assignment (by course) and already assigned students
  const fetchAssignStudents = async (courseId, examId) => {
    setAssignLoading(true);
    try {
      const [studentsRes, assignmentsRes] = await Promise.all([
        databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.studentsCollectionId,
          [Query.equal('courseId', courseId)]
        ),
        databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.examAssignmentsCollectionId,
          [Query.equal('examId', examId)]
        )
      ]);
      setAssignStudents(studentsRes.documents);
      const assignedIds = assignmentsRes.documents.map(a => a.studentId);
      setAlreadyAssignedStudentIds(assignedIds);
      // Pre-select already assigned students
      setSelectedAssignStudents(assignedIds);
      setSelectAllAssign(assignedIds.length === studentsRes.documents.length);
    } catch (err) {
      Alert.alert('Error', 'Failed to load students for assignment');
      setAssignStudents([]);
      setAlreadyAssignedStudentIds([]);
    } finally {
      setAssignLoading(false);
    }
  };

  // Open assign modal
  const handleOpenAssign = (exam) => {
    setAssigningExam(exam);
    fetchAssignStudents(exam.courseId, exam.$id);
    setAssignModalVisible(true);
  };

  // Toggle student selection
  const handleToggleAssignStudent = (studentId) => {
    setSelectedAssignStudents(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  // Select all students
  const handleSelectAllAssign = () => {
    if (selectAllAssign) {
      setSelectedAssignStudents([]);
      setSelectAllAssign(false);
    } else {
      setSelectedAssignStudents(assignStudents.map(s => s.$id));
      setSelectAllAssign(true);
    }
  };

  // Assign/Reassign exam to selected students
  const handleAssignExam = async () => {
    if (!assigningExam) {
      Alert.alert('Error', 'No exam selected');
      return;
    }
    setAssignLoading(true);
    try {
      // Get current assignments
      const currentAssignments = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.examAssignmentsCollectionId,
        [Query.equal('examId', assigningExam.$id)]
      );

      // Find students to remove (currently assigned but not in new selection)
      const studentsToRemove = currentAssignments.documents
        .filter(a => !selectedAssignStudents.includes(a.studentId));

      // Find students to add (in new selection but not currently assigned)
      const studentsToAdd = selectedAssignStudents
        .filter(id => !currentAssignments.documents.some(a => a.studentId === id));

      // Remove unselected students
      for (const assignment of studentsToRemove) {
        await databases.deleteDocument(
          appwriteConfig.databaseId,
          appwriteConfig.examAssignmentsCollectionId,
          assignment.$id
        );
      }

      // Add newly selected students
      for (const studentId of studentsToAdd) {
        const assignmentId = ID.unique();
        await databases.createDocument(
          appwriteConfig.databaseId,
          appwriteConfig.examAssignmentsCollectionId,
          assignmentId,
          {
            assignmentId,
            examId: assigningExam.$id,
            studentId,
            courseId: assigningExam.courseId,
            status: 'pending',
          }
        );
      }

      Alert.alert('Success', 'Exam assignments updated successfully', [
        { text: 'OK', onPress: () => setAssignModalVisible(false) }
      ]);
      setAssigningExam(null);
      setAssignStudents([]);
      setSelectedAssignStudents([]);
      setSelectAllAssign(false);
      setAlreadyAssignedStudentIds([]);
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to update exam assignments');
    } finally {
      setAssignLoading(false);
    }
  };

  const renderExamItem = ({ item }) => {
    const realTimeStatus = getExamStatus(item);
    return (
      <View style={styles.examCard}>
        <View style={styles.examHeader}>
          <Text style={styles.examTitle}>{item.title}</Text>
          <View style={[
            styles.statusBadge,
            { backgroundColor: realTimeStatus === 'scheduled' ? '#2196F3' : realTimeStatus === 'ongoing' ? '#4CAF50' : realTimeStatus === 'completed' ? '#9E9E9E' : '#FF9800' }
          ]}>
            <Text style={styles.statusText}>{realTimeStatus.charAt(0).toUpperCase() + realTimeStatus.slice(1)}</Text>
          </View>
        </View>
        <View style={styles.examDetails}>
          <View style={styles.detailItem}>
            <Icon name="timer" size={16} color="#666" />
            <Text style={styles.detailText}>{item.duration} minutes</Text>
          </View>
          <View style={styles.detailItem}>
            <Icon name="star" size={16} color="#666" />
            <Text style={styles.detailText}>{item.totalMarks} marks</Text>
          </View>
          <View style={styles.detailItem}>
            <Icon name="check-circle" size={16} color="#666" />
            <Text style={styles.detailText}>Pass: {item.passingMarks}</Text>
          </View>
        </View>
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.editButton]}
            onPress={() => handleEditExam(item.$id)}
          >
            <Icon name="edit" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.toggleButton]}
            onPress={() => handleToggleStatus(item.$id)}
          >
            <Icon
              name={realTimeStatus === 'ongoing' ? 'pause' : 'play-arrow'}
              size={20}
              color="#fff"
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDeleteExam(item.$id)}
          >
            <Icon name="delete" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#00e4d0' }]}
            onPress={() => handleOpenAssign(item)}
          >
            <Icon name="people" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <AdminSidebar isVisible={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setIsMenuOpen(true)}>
          <Icon name="menu" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Exams</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={exams}
        renderItem={renderExamItem}
        keyExtractor={item => item.$id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#00e4d0']}
            tintColor="#00e4d0"
          />
        }
      />

      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 20, width: '90%', maxWidth: 500 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>Edit Exam</Text>
            <ScrollView style={{ maxHeight: 400 }}>
              <Text style={styles.label}>Title *</Text>
              <TextInput
                style={styles.input}
                value={editForm.title}
                onChangeText={text => handleEditFormChange('title', text)}
                placeholder="Enter exam title"
              />
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={editForm.description}
                onChangeText={text => handleEditFormChange('description', text)}
                placeholder="Enter exam description"
                multiline
                numberOfLines={4}
              />
              <Text style={styles.label}>Duration (minutes) *</Text>
              <TextInput
                style={styles.input}
                value={editForm.duration}
                onChangeText={text => handleEditFormChange('duration', text)}
                placeholder="Enter exam duration"
                keyboardType="numeric"
              />
              <Text style={styles.label}>Total Marks *</Text>
              <TextInput
                style={styles.input}
                value={editForm.totalMarks}
                onChangeText={text => handleEditFormChange('totalMarks', text)}
                placeholder="Enter total marks"
                keyboardType="numeric"
              />
              <Text style={styles.label}>Passing Marks *</Text>
              <TextInput
                style={styles.input}
                value={editForm.passingMarks}
                onChangeText={text => handleEditFormChange('passingMarks', text)}
                placeholder="Enter passing marks"
                keyboardType="numeric"
              />
              <Text style={styles.label}>Start Date *</Text>
              <TouchableOpacity onPress={() => setShowStartDatePicker(true)} style={styles.input}>
                <Text>{editForm.startDate ? editForm.startDate.toLocaleDateString() : ''}</Text>
              </TouchableOpacity>
              {showStartDatePicker && (
                <DateTimePicker
                  value={editForm.startDate || new Date()}
                  mode="date"
                  display="default"
                  onChange={(e, date) => { setShowStartDatePicker(false); if (date) handleEditFormChange('startDate', date); }}
                />
              )}
              <Text style={styles.label}>Start Time *</Text>
              <TouchableOpacity onPress={() => setShowStartTimePicker(true)} style={styles.input}>
                <Text>{editForm.startTime ? editForm.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</Text>
              </TouchableOpacity>
              {showStartTimePicker && (
                <DateTimePicker
                  value={editForm.startTime || new Date()}
                  mode="time"
                  display="default"
                  onChange={(e, time) => { setShowStartTimePicker(false); if (time) handleEditFormChange('startTime', time); }}
                />
              )}
              <Text style={styles.label}>End Date *</Text>
              <TouchableOpacity onPress={() => setShowEndDatePicker(true)} style={styles.input}>
                <Text>{editForm.endDate ? editForm.endDate.toLocaleDateString() : ''}</Text>
              </TouchableOpacity>
              {showEndDatePicker && (
                <DateTimePicker
                  value={editForm.endDate || new Date()}
                  mode="date"
                  display="default"
                  onChange={(e, date) => { setShowEndDatePicker(false); if (date) handleEditFormChange('endDate', date); }}
                />
              )}
              <Text style={styles.label}>End Time *</Text>
              <TouchableOpacity onPress={() => setShowEndTimePicker(true)} style={styles.input}>
                <Text>{editForm.endTime ? editForm.endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</Text>
              </TouchableOpacity>
              {showEndTimePicker && (
                <DateTimePicker
                  value={editForm.endTime || new Date()}
                  mode="time"
                  display="default"
                  onChange={(e, time) => { setShowEndTimePicker(false); if (time) handleEditFormChange('endTime', time); }}
                />
              )}
              <Text style={styles.label}>Questions *</Text>
              {editQuestions.map((q, qIdx) => (
                <View key={qIdx} style={{ marginBottom: 20, borderWidth: 1, borderColor: '#eee', borderRadius: 8, padding: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <Text style={{ fontWeight: 'bold', fontSize: 16, marginRight: 8 }}>{`Question ${qIdx + 1}`}</Text>
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      value={q.text}
                      onChangeText={text => handleEditQuestionChange(qIdx, 'text', text)}
                      placeholder={`Enter question text`}
                    />
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <Text style={{ fontSize: 15, marginRight: 8 }}>Marks</Text>
                    <TextInput
                      style={[styles.input, { width: 80 }]}
                      value={q.marks ? String(q.marks) : ''}
                      onChangeText={text => handleEditQuestionChange(qIdx, 'marks', text.replace(/[^0-9]/g, ''))}
                      placeholder="1"
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={{ marginBottom: 8 }}>
                    <Text style={styles.label}>Type</Text>
                    <View style={{ borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, overflow: 'hidden', backgroundColor: '#fff', marginTop: 4 }}>
                      <Picker
                        selectedValue={q.type}
                        onValueChange={type => handleEditQuestionChange(qIdx, 'type', type)}
                        style={{ height: 51, width: '100%', fontSize: 18, paddingVertical: 10 }}
                        itemStyle={{ fontSize: 18, height: 48 }}
                        dropdownIconColor="#1976d2"
                      >
                        <Picker.Item label="MCQ" value="mcq" />
                        <Picker.Item label="MSQ" value="msq" />
                      </Picker>
                    </View>
                  </View>
                  <Text style={styles.label}>Options</Text>
                  {q.options.map((opt, optIdx) => (
                    <View key={optIdx} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                      <TouchableOpacity
                        onPress={() => handleEditCorrectAnswerChange(qIdx, optIdx)}
                        style={{ marginRight: 8 }}
                      >
                        <Icon
                          name={q.correctAnswers.includes(optIdx) ? 'check-box' : 'check-box-outline-blank'}
                          size={24}
                          color={q.correctAnswers.includes(optIdx) ? '#1976d2' : '#aaa'}
                        />
                      </TouchableOpacity>
                      <TextInput
                        style={[styles.input, { flex: 1 }]}
                        value={opt.text}
                        onChangeText={text => handleEditOptionChange(qIdx, optIdx, text)}
                        placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
                      />
                    </View>
                  ))}
                  <View style={{ marginBottom: 8 }}>
                    <Text style={styles.label}>Difficulty Level</Text>
                    <View style={{ borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, overflow: 'hidden', backgroundColor: '#fff', marginTop: 4 }}>
                      <Picker
                        selectedValue={q.difficulty}
                        onValueChange={value => handleEditQuestionChange(qIdx, 'difficulty', value)}
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
                    <Text style={styles.label}>Tags (comma separated)</Text>
                    <TextInput
                      style={styles.input}
                      value={q.tags}
                      onChangeText={text => handleEditQuestionChange(qIdx, 'tags', text)}
                      placeholder="e.g. algebra, geometry, trigonometry"
                    />
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
                    <TouchableOpacity onPress={() => removeEditQuestion(qIdx)} style={{ backgroundColor: '#f44336', padding: 8, borderRadius: 6 }}>
                      <Text style={{ color: '#fff' }}>Remove</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={addEditQuestion} style={{ backgroundColor: '#1976d2', padding: 8, borderRadius: 6 }}>
                      <Text style={{ color: '#fff' }}>Add Question</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
              {editQuestions.length === 0 && (
                <View style={{ alignItems: 'center', marginVertical: 20 }}>
                  <TouchableOpacity onPress={addEditQuestion} style={{ backgroundColor: '#1976d2', padding: 12, borderRadius: 8 }}>
                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>Add Question</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 }}>
              <TouchableOpacity onPress={() => setEditModalVisible(false)} style={{ backgroundColor: '#f44336', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, marginRight: 16 }}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleEditSave} disabled={saving} style={{ backgroundColor: '#1976d2', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 }}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: 'bold' }}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Assign Exam Modal */}
      <Modal
        visible={assignModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setAssignModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 20, width: '90%', maxWidth: 500 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
              {alreadyAssignedStudentIds.length > 0 ? 'Reassign Exam' : 'Assign Exam'}: {assigningExam?.title}
            </Text>
            {assignLoading ? (
              <ActivityIndicator size="large" color="#00e4d0" />
            ) : assignStudents.length === 0 ? (
              <Text style={{ color: '#888', textAlign: 'center' }}>No students found for this course.</Text>
            ) : (
              <ScrollView style={{ maxHeight: 350 }}>
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}
                  onPress={handleSelectAllAssign}
                >
                  <Icon
                    name={selectAllAssign ? 'check-box' : 'check-box-outline-blank'}
                    size={24}
                    color={selectAllAssign ? '#00e4d0' : '#666'}
                  />
                  <Text style={{ marginLeft: 8, fontWeight: 'bold' }}>Select All</Text>
                </TouchableOpacity>
                {assignStudents.map(student => (
                  <TouchableOpacity
                    key={student.$id}
                    style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, opacity: student.status !== 'active' ? 0.6 : 1 }}
                    onPress={() => student.status === 'active' && handleToggleAssignStudent(student.$id)}
                    disabled={student.status !== 'active'}
                  >
                    <Icon
                      name={selectedAssignStudents.includes(student.$id) ? 'check-box' : 'check-box-outline-blank'}
                      size={22}
                      color={selectedAssignStudents.includes(student.$id) ? '#00e4d0' : '#666'}
                    />
                    <Text style={{ marginLeft: 8 }}>{student.name} ({student.email})</Text>
                    <Text style={{ marginLeft: 8, color: student.status === 'active' ? '#4CAF50' : '#F44336', fontWeight: 'bold' }}>
                      {student.status}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 }}>
              <TouchableOpacity onPress={() => setAssignModalVisible(false)} style={{ backgroundColor: '#f44336', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, marginRight: 16 }}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={handleAssignExam} 
                disabled={assignLoading} 
                style={{ backgroundColor: '#00e4d0', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 }}
              >
                {assignLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>
                    {alreadyAssignedStudentIds.length > 0 ? 'Update Assignments' : 'Assign'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
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
  listContainer: {
    padding: 15,
  },
  examCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  examHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  examTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  examDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: '#2196F3',
  },
  toggleButton: {
    backgroundColor: '#FF9800',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  input: {
    padding: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    marginBottom: 10,
  },
  textArea: {
    height: 80,
  },
});

export default ManageExams; 