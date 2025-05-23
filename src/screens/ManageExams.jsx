import React, { useState, useEffect, useRef } from 'react';
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
  Image,
  TouchableWithoutFeedback,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import Icon from 'react-native-vector-icons/MaterialIcons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import AdminSidebar from '../components/AdminSidebar';
import { databases, appwriteConfig, ID } from '../utils/appwriteConfig';
import { Query } from 'appwrite';
import DateTimePicker from '@react-native-community/datetimepicker';
import { launchImageLibrary } from 'react-native-image-picker';
import { useNavigation } from '@react-navigation/native';

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
  const navigation = useNavigation();
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
  const [showTagModal, setShowTagModal] = useState([]);
  const [courses, setCourses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [filterCourse, setFilterCourse] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterDate, setFilterDate] = useState(null);
  const [showFilterDatePicker, setShowFilterDatePicker] = useState(false);
  const [filterRange, setFilterRange] = useState('today');
  const [filterStatus, setFilterStatus] = useState('');
  const [searchText, setSearchText] = useState('');
  const [customRange, setCustomRange] = useState({ from: null, to: null });
  const [showCustomRangePicker, setShowCustomRangePicker] = useState(false);
  const [selectedExams, setSelectedExams] = useState([]);
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [dateFilterLabel, setDateFilterLabel] = useState('Filter by Date');
  const [showSubjectDropdown, setShowSubjectDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

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

  // Fetch courses and subjects for filters
  const fetchCoursesAndSubjects = async () => {
    try {
      const [coursesRes, subjectsRes] = await Promise.all([
        databases.listDocuments(appwriteConfig.databaseId, appwriteConfig.coursesCollectionId),
        databases.listDocuments(appwriteConfig.databaseId, appwriteConfig.subjectsCollectionId),
      ]);
      setCourses(coursesRes.documents);
      setSubjects(subjectsRes.documents);
    } catch (err) {
      // Ignore errors for now
    }
  };

  useEffect(() => {
    fetchExams();
    fetchCoursesAndSubjects();
  }, []);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchExams();
  }, []);

  const fetchExamQuestions = async (examId) => {
    try {
      // Fetch questionIds from exam_questions with order
      const examQuestionsRes = await databases.listDocuments(
        appwriteConfig.databaseId,
        '681e4ca600017a3b9e84', // exam_questions collection ID
        [
          Query.equal('examId', examId),
          Query.orderAsc('order') // Sort by order to maintain question sequence
        ]
      );

      const questionIds = examQuestionsRes.documents.map(eq => eq.questionId);

      // If no questions found, return empty array
      if (questionIds.length === 0) {
        return [];
      }

      // Fetch all questions in a single query using $id
      const questionsRes = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.questionsCollectionId,
        [Query.equal('$id', questionIds)]
      );

      // Create a map of exam_questions data for each question
      const examQuestionsMap = {};
      examQuestionsRes.documents.forEach(eq => {
        examQuestionsMap[eq.questionId] = {
          order: eq.order,
          createdAt: eq.createdAt
        };
      });

      // Process and return the questions with their exam_questions data
      return questionsRes.documents.map(q => ({
        ...q,
        text: q.questionText || q.text || '',
        options: q.options ? JSON.parse(q.options) : [],
        correctAnswers: q.correctAnswers ? JSON.parse(q.correctAnswers).map(a => a.charCodeAt(0) - 97) : [],
        tags: Array.isArray(q.tags) ? q.tags : (q.tags ? q.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : []),
        // Add exam_questions specific data
        order: examQuestionsMap[q.$id]?.order || 0,
        examQuestionCreatedAt: examQuestionsMap[q.$id]?.createdAt
      }));

    } catch (err) {
      console.error('Error fetching exam questions:', err);
      return [];
    }
  };

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
      const examQuestions = await fetchExamQuestions(examId);
      setEditQuestions(examQuestions);
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
      // Validate required fields
      if (!editForm.title || !editForm.duration || !editForm.totalMarks || !editForm.passingMarks) {
        Alert.alert('Error', 'Please fill in all required fields');
        setSaving(false);
        return;
      }

      // Validate questions
      if (editQuestions.some(q => !q.text || q.options.some(o => !o.text) || q.correctAnswers.length === 0)) {
        Alert.alert('Error', 'Please complete all questions including options and correct answers');
        setSaving(false);
        return;
      }

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

      // Update exam details
      await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.examsCollectionId,
        editingExam.$id,
        {
          title: editForm.title,
          description: editForm.description || '',
          duration: parseInt(editForm.duration),
          totalMarks: parseInt(editForm.totalMarks),
          passingMarks: parseInt(editForm.passingMarks),
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
        }
      );

      // Update or create questions and create new mappings in exam_questions
      // First, delete existing mappings for this exam
      const existingMappings = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.examQuestionsCollectionId,
        [Query.equal("examId", editingExam.$id)]
      );
      for (const mapping of existingMappings.documents) {
        await databases.deleteDocument(
          appwriteConfig.databaseId,
          appwriteConfig.examQuestionsCollectionId,
          mapping.$id
        );
      }
      // Now update/create questions and create new mappings
      for (const [idx, q] of editQuestions.entries()) {
        let questionId;
        const questionData = {
          examId: editingExam.$id,
          subjectId: editingExam.subjectId,
          courseId: editingExam.courseId,
          type: q.type || 'mcq',
          questionText: q.text,
          imageId: q.imageId || null,
          options: JSON.stringify(q.options.map((opt, i) => ({
            optionId: String.fromCharCode(97 + i),
            text: opt.text
          }))),
          correctAnswers: JSON.stringify(q.correctAnswers.map(i => String.fromCharCode(97 + i))),
          marks: Number(q.marks) || 1,
          difficulty: q.difficulty || 'easy',
          tags: Array.isArray(q.tags) ? q.tags : (q.tags || '').split(',').map(tag => tag.trim()).filter(tag => tag !== ''),
          questionId: q.questionId || ID.unique()
        };
        if (q.$id) {
          await databases.updateDocument(
            appwriteConfig.databaseId,
            appwriteConfig.questionsCollectionId,
            q.$id,
            questionData
          );
          questionId = q.questionId;
        } else {
          const newQuestion = await databases.createDocument(
            appwriteConfig.databaseId,
            appwriteConfig.questionsCollectionId,
            ID.unique(),
            questionData
          );
          questionId = newQuestion.questionId;
        }
        // Check questionId before creating mapping
        console.log('About to create mapping:', { examId: editingExam.$id, questionId, idx });
        if (!questionId) {
          Alert.alert('Error', 'questionId is missing for mapping!');
          continue;
        }
        // Create mapping in exam_questions
        await databases.createDocument(
          appwriteConfig.databaseId,
          appwriteConfig.examQuestionsCollectionId,
          ID.unique(),
          {
            examId: editingExam.$id,
            questionId: questionId,
            order: idx + 1,
            createdAt: new Date().toISOString()
          }
        );
      }

      await fetchExams();
      setEditModalVisible(false);
      setEditingExam(null);
      Alert.alert('Success', 'Exam updated successfully');
    } catch (err) {
      console.error('Failed to update exam:', err);
      Alert.alert('Error', `Failed to update exam: ${err.message}`);
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

  // Image pickers for question and options
  const handleEditImagePick = async (qIdx) => {
    try {
      const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.8 });
      if (result.didCancel || result.errorCode) return;
      const image = result.assets[0];
      setEditQuestions(prev => prev.map((q, i) => i === qIdx ? { ...q, image } : q));
    } catch (err) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };
  const handleEditOptionImagePick = async (qIdx, optIdx) => {
    try {
      const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.8 });
      if (result.didCancel || result.errorCode) return;
      const image = result.assets[0];
      setEditQuestions(prev => prev.map((q, i) => i === qIdx ? {
        ...q,
        options: q.options.map((opt, oi) => oi === optIdx ? { ...opt, image } : opt)
      } : q));
    } catch (err) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };
  const handleEditRemoveImage = (qIdx) => {
    setEditQuestions(prev => prev.map((q, i) => i === qIdx ? { ...q, image: null } : q));
  };
  const handleEditOptionRemoveImage = (qIdx, optIdx) => {
    setEditQuestions(prev => prev.map((q, i) => i === qIdx ? {
      ...q,
      options: q.options.map((opt, oi) => oi === optIdx ? { ...opt, image: null } : opt)
    } : q));
  };

  // Helper for date range
  const isDateInRange = (date, range) => {
    const now = new Date();
    if (range === 'today') {
      return (
        date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth() &&
        date.getDate() === now.getDate()
      );
    }
    if (range === 'thisweek') {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0,0,0,0);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23,59,59,999);
      return date >= startOfWeek && date <= endOfWeek;
    }
    if (range === 'custom' && customRange.from && customRange.to) {
      return date >= customRange.from && date <= customRange.to;
    }
    return true;
  };

  // Update date filter logic
  const isDateInSelectedRange = (date) => {
    if (dateFilterLabel === 'Today') {
      const now = new Date();
      return (
        date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth() &&
        date.getDate() === now.getDate()
      );
    }
    if (dateFilterLabel === 'Last 7 Days') {
      const now = new Date();
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(now.getDate() - 6);
      sevenDaysAgo.setHours(0,0,0,0);
      return date >= sevenDaysAgo && date <= now;
    }
    if (dateFilterLabel === 'Custom Date' && filterDate) {
      return (
        date.getFullYear() === filterDate.getFullYear() &&
        date.getMonth() === filterDate.getMonth() &&
        date.getDate() === filterDate.getDate()
      );
    }
    return true;
  };

  // Update filteredExams logic
  const filteredExams = exams.filter(exam => {
    let match = true;
    const examDate = new Date(exam.startTime);
    if (dateFilterLabel !== 'Filter by Date' && !isDateInSelectedRange(examDate)) match = false;
    if (searchText && !exam.title.toLowerCase().includes(searchText.toLowerCase())) match = false;
    if (filterCourse && exam.courseId !== filterCourse) match = false;
    if (filterSubject && exam.subjectId !== filterSubject) match = false;
    return match;
  });

  const getStatusColor = (status) => {
    if (status === 'ongoing') return '#43a047'; // Green
    if (status === 'scheduled') return '#1976d2'; // Blue
    if (status === 'completed') return '#e53935'; // Red
    if (status === 'draft') return '#757575'; // Gray
    return '#757575';
  };

  const getStatusLabel = (status) => {
    if (status === 'ongoing') return 'Ongoing';
    if (status === 'scheduled') return 'Scheduled';
    if (status === 'completed') return 'Expired';
    if (status === 'draft') return 'Draft';
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const getExamProgress = (exam) => {
    const now = new Date();
    const start = new Date(exam.startTime);
    const end = new Date(exam.endTime);
    if (now < start) return 0;
    if (now > end) return 1;
    return (now - start) / (end - start);
  };

  const toggleSelectExam = (id) => {
    setSelectedExams((prev) => prev.includes(id) ? prev.filter(eid => eid !== id) : [...prev, id]);
  };

  const renderExamItem = ({ item }) => {
    const realTimeStatus = getExamStatus(item);
    const startDateObj = new Date(item.startTime);
    const endDateObj = new Date(item.endTime);
    const dateRange = `${startDateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} • ${startDateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${endDateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    const isDraft = realTimeStatus === 'draft';
    return (
      <TouchableOpacity
        activeOpacity={0.95}
        style={[
          styles.examCardRedesign,
          { shadowOpacity: 0.15, elevation: 3, borderColor: selectedExams.includes(item.$id) ? '#1976d2' : '#e0e0e0', backgroundColor: '#fff', marginTop: 0 }
        ]}
        onPressIn={() => {}}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          {/* Checkbox for bulk actions */}
          <TouchableOpacity onPress={() => toggleSelectExam(item.$id)} style={{ marginRight: 10, marginTop: 2 }}>
            <Icon name={selectedExams.includes(item.$id) ? 'check-box' : 'check-box-outline-blank'} size={22} color={selectedExams.includes(item.$id) ? '#1976d2' : '#bbb'} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#222', flexShrink: 1 }}>{item.title}</Text>
              {/* Status as colored text, not box */}
              <Text style={{ fontWeight: 'bold', color: getStatusColor(realTimeStatus), fontSize: 14, marginLeft: 8 }}>
                {getStatusLabel(realTimeStatus)}
              </Text>
            </View>
            <Text style={{ color: '#666', marginTop: 2, fontSize: 14 }}>{dateRange}</Text>
            <Text style={{ color: '#888', marginTop: 2, fontSize: 13 }}>{item.duration} mins • {item.totalMarks} marks</Text>
          </View>
          {/* Action buttons */}
          <View style={{ flexDirection: 'column', alignItems: 'flex-end', marginLeft: 10, gap: 8 }}>
            <TouchableOpacity style={{ marginBottom: 4 }} onPress={() => navigation.navigate('EditExam', { examId: item.$id })}>
              <Icon name="edit" size={22} color="#2196F3" />
            </TouchableOpacity>
            <TouchableOpacity style={{ marginBottom: 4 }} onPress={() => handleDeleteExam(item.$id)}>
              <Icon name="delete" size={22} color="#F44336" />
            </TouchableOpacity>
            {isDraft && (
              <TouchableOpacity style={{ marginBottom: 4 }} onPress={() => {/* Publish logic here */}}>
                <Icon name="publish" size={22} color="#4CAF50" />
              </TouchableOpacity>
            )}
            {/* Restore assignment icon */}
            <TouchableOpacity style={{ marginBottom: 4 }} onPress={() => handleOpenAssign(item)}>
              <Icon name="people" size={22} color="#00e4d0" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
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

      {/* Redesigned Filters Bar */}
      <View style={{ backgroundColor: '#f5f7fa', paddingVertical: 6, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: '#e0e0e0', flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-start' }}>
        {/* Date Filter Dropdown */}
        <View style={{ position: 'relative', flex: 1, minWidth: 80, maxWidth: 140, marginRight: 0 }}>
          <TouchableOpacity
            onPress={() => setShowDateDropdown(!showDateDropdown)}
            style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#1976d2', borderRadius: 16, paddingHorizontal: 8, paddingVertical: 4, width: '100%', minHeight: 32 }}
          >
            <MaterialIcons name="event" size={15} color="#1976d2" style={{ marginRight: 4 }} />
            <Text style={{ color: '#1976d2', fontWeight: 'bold', fontSize: 12, flexShrink: 1 }}>{dateFilterLabel}</Text>
            <MaterialIcons name={showDateDropdown ? 'arrow-drop-up' : 'arrow-drop-down'} size={18} color="#1976d2" style={{ marginLeft: 2 }} />
          </TouchableOpacity>
          {showDateDropdown && (
            <View style={{ position: 'absolute', top: 38, left: 0, right: 0, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#e0e0e0', zIndex: 10, minWidth: 100, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, elevation: 4 }}>
              <TouchableOpacity onPress={() => { setDateFilterLabel('Today'); setShowDateDropdown(false); }} style={{ padding: 8 }}>
                <Text style={{ color: '#1976d2', fontWeight: 'bold', fontSize: 12 }}>Today</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setDateFilterLabel('Last 7 Days'); setShowDateDropdown(false); }} style={{ padding: 8 }}>
                <Text style={{ color: '#1976d2', fontWeight: 'bold', fontSize: 12 }}>Last 7 Days</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setDateFilterLabel('Custom Date'); setShowDateDropdown(false); setShowFilterDatePicker(true); }} style={{ padding: 8 }}>
                <Text style={{ color: '#1976d2', fontWeight: 'bold', fontSize: 12 }}>Custom Date</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        {/* Custom Date Picker */}
        {showFilterDatePicker && (
          <DateTimePicker
            value={filterDate || new Date()}
            mode="date"
            display="default"
            onChange={(e, date) => { setShowFilterDatePicker(false); if (date) setFilterDate(date); }}
          />
        )}
        {/* Subject Filter Dropdown (styled like date filter) */}
        <View style={{ position: 'relative', flex: 1, minWidth: 80, maxWidth: 140, marginRight: 0 }}>
          <TouchableOpacity
            onPress={() => setShowSubjectDropdown(!showSubjectDropdown)}
            style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#1976d2', borderRadius: 16, paddingHorizontal: 8, paddingVertical: 4, width: '100%', minHeight: 32 }}
          >
            <MaterialIcons name="menu-book" size={15} color="#1976d2" style={{ marginRight: 4 }} />
            <Text style={{ color: '#1976d2', fontWeight: 'bold', fontSize: 12, flexShrink: 1 }}>{filterSubject ? (subjects.find(s => s.$id === filterSubject)?.name || 'Subject') : 'All Subjects'}</Text>
            <MaterialIcons name={showSubjectDropdown ? 'arrow-drop-up' : 'arrow-drop-down'} size={18} color="#1976d2" style={{ marginLeft: 2 }} />
          </TouchableOpacity>
          {showSubjectDropdown && (
            <View style={{ position: 'absolute', top: 38, left: 0, right: 0, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#e0e0e0', zIndex: 10, minWidth: 100, maxHeight: 200, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, elevation: 4 }}>
              <ScrollView>
                <TouchableOpacity onPress={() => { setFilterSubject(''); setShowSubjectDropdown(false); }} style={{ padding: 8 }}>
                  <Text style={{ color: '#1976d2', fontWeight: 'bold', fontSize: 12 }}>All Subjects</Text>
                </TouchableOpacity>
                {subjects.map(subject => (
                  <TouchableOpacity key={subject.$id} onPress={() => { setFilterSubject(subject.$id); setShowSubjectDropdown(false); }} style={{ padding: 8 }}>
                    <Text style={{ color: '#1976d2', fontWeight: 'bold', fontSize: 12 }}>{subject.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
        {/* Status Filter Dropdown (styled like date filter, rightmost) */}
        <View style={{ position: 'relative', flex: 1, minWidth: 80, maxWidth: 140 }}>
          <TouchableOpacity
            onPress={() => setShowStatusDropdown(!showStatusDropdown)}
            style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#1976d2', borderRadius: 16, paddingHorizontal: 8, paddingVertical: 4, width: '100%', minHeight: 32 }}
          >
            <MaterialIcons name="filter-list" size={15} color="#1976d2" style={{ marginRight: 4 }} />
            <Text style={{ color: '#1976d2', fontWeight: 'bold', fontSize: 12, flexShrink: 1 }}>{filterStatus ? (filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1)) : 'All Statuses'}</Text>
            <MaterialIcons name={showStatusDropdown ? 'arrow-drop-up' : 'arrow-drop-down'} size={18} color="#1976d2" style={{ marginLeft: 2 }} />
          </TouchableOpacity>
          {showStatusDropdown && (
            <View style={{ position: 'absolute', top: 38, left: 0, right: 0, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#e0e0e0', zIndex: 10, minWidth: 100, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, elevation: 4 }}>
              <TouchableOpacity onPress={() => { setFilterStatus(''); setShowStatusDropdown(false); }} style={{ padding: 8 }}>
                <Text style={{ color: '#1976d2', fontWeight: 'bold', fontSize: 12 }}>All Statuses</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setFilterStatus('draft'); setShowStatusDropdown(false); }} style={{ padding: 8 }}>
                <Text style={{ color: '#1976d2', fontWeight: 'bold', fontSize: 12 }}>Draft</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setFilterStatus('scheduled'); setShowStatusDropdown(false); }} style={{ padding: 8 }}>
                <Text style={{ color: '#1976d2', fontWeight: 'bold', fontSize: 12 }}>Scheduled</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setFilterStatus('ongoing'); setShowStatusDropdown(false); }} style={{ padding: 8 }}>
                <Text style={{ color: '#1976d2', fontWeight: 'bold', fontSize: 12 }}>Ongoing</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setFilterStatus('completed'); setShowStatusDropdown(false); }} style={{ padding: 8 }}>
                <Text style={{ color: '#1976d2', fontWeight: 'bold', fontSize: 12 }}>Expired</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      <FlatList
        data={filteredExams}
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

      {/* EditExam screen will now be used for editing exams */}

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
    paddingHorizontal: 15,
    paddingTop: 5,
    paddingBottom: 15,
  },
  examCardRedesign: {
    borderWidth: 2,
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#000',
    backgroundColor: '#fff',
    transition: 'box-shadow 0.2s',
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