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
  FlatList,
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

import VerticalTagSelector from '../components/VerticalTagSelector';

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
  const [allTags, setAllTags] = useState([]);
  const [allQuestions, setAllQuestions] = useState([]);
  const [filteredQuestions, setFilteredQuestions] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [questionUI, setQuestionUI] = useState([]);
  const [questionSuggestions, setQuestionSuggestions] = useState([]);
  const [showSuggestionDropdown, setShowSuggestionDropdown] = useState([]);
  const [showTagModal, setShowTagModal] = useState(Array(questions.length).fill(false));
  const [showAllTagsMode, setShowAllTagsMode] = useState(Array(questions.length).fill(false));

  useEffect(() => {
    const fetchAllQuestions = async () => {
      try {
        const res = await databases.listDocuments(appwriteConfig.databaseId, appwriteConfig.questionsCollectionId);
        const questions = res.documents.map(q => ({
          ...q,
          options: q.options ? JSON.parse(q.options) : [],
          correctAnswers: q.correctAnswers ? JSON.parse(q.correctAnswers).map(a => a.charCodeAt(0) - 97) : [],
          tags: typeof q.tags === 'string' ? q.tags.split(',').map(tag => tag.trim()).filter(tag => tag !== '') : Array.isArray(q.tags) ? q.tags : [],
        }));
        setAllQuestions(questions);
        setFilteredQuestions(questions);
        
        // Extract all unique tags
        const tagSet = new Set();
        questions.forEach(q => q.tags.forEach(tag => tag && tagSet.add(tag)));
        setAllTags(Array.from(tagSet));
      } catch (err) {
        Alert.alert('Error', 'Failed to load questions from question bank');
      }
    };
    fetchAllQuestions();
  }, []);

  // Add new useEffect for filtering questions
  useEffect(() => {
    const query = searchQuery.trim().toLowerCase();
    setFilteredQuestions(
      allQuestions.filter(q => {
        const matchesSearch = !query || 
          (q.questionText || q.text || '').toLowerCase().includes(query) ||
          (Array.isArray(q.tags) && q.tags.some(tag => tag.toLowerCase().includes(query)));
        const matchesTags = selectedTags.length === 0 || 
          (Array.isArray(q.tags) && selectedTags.every(tag => q.tags.includes(tag)));
        return matchesSearch && matchesTags;
      })
    );
  }, [searchQuery, selectedTags, allQuestions]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoadingExam(true);
    try {
      // Fetch courses
      const coursesRes = await databases.listDocuments(appwriteConfig.databaseId, appwriteConfig.coursesCollectionId);
      setCourses(coursesRes.documents);
      console.log('Courses loaded:', coursesRes.documents);

      // Fetch exam
      const examRes = await databases.getDocument(appwriteConfig.databaseId, appwriteConfig.examsCollectionId, examId);
      console.log('Fetched exam document:', examRes);
      setExamData({
        title: examRes.title,
        description: examRes.description,
        duration: String(examRes.duration),
        totalMarks: String(examRes.totalMarks),
        passingMarks: String(examRes.passingMarks),
        status: examRes.status || 'scheduled',
      });
      // Map courseId (code) to $id if needed
      let courseIdToSelect = examRes.courseId;
      const foundCourse = coursesRes.documents.find(c => c.courseId === examRes.courseId);
      if (foundCourse) {
        courseIdToSelect = foundCourse.$id;
      }
      setSelectedCourse(courseIdToSelect);

      // Fetch subject name using subjectId
      if (examRes.subjectId) {
        try {
          console.log('Exam subjectId:', examRes.subjectId);
          const subjectRes = await databases.getDocument(
            appwriteConfig.databaseId,
            appwriteConfig.subjectsCollectionId,
            examRes.subjectId
          );
          console.log('Fetched subject document:', subjectRes);
          setSubjectName(subjectRes.subjectName || '[No subjectName field]');
        } catch (err) {
          console.log('Error fetching subject for subjectId', examRes.subjectId, err);
          setSubjectName('[Subject not found]');
        }
      } else {
        console.log('No subjectId found in exam document');
        setSubjectName('[No subjectId]');
      }

      setStartDate(new Date(examRes.startTime));
      setStartTime(new Date(examRes.startTime));
      setEndDate(new Date(examRes.endTime));
      setEndTime(new Date(examRes.endTime));

      // Fetch questions through exam_questions mapping
      const examQuestionsRes = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.examQuestionsCollectionId,
        [Query.equal('examId', examId), Query.orderAsc('order')]
      );
      console.log('Fetched exam_questions:', examQuestionsRes.documents);
      const questionIds = examQuestionsRes.documents.map(eq => eq.questionId);
      if (questionIds.length === 0) {
        setQuestions([]);
        console.log('No exam questions found for this exam.');
        return;
      }
      // Fetch all questions in a single query using questionId
      const questionsRes = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.questionsCollectionId,
        [Query.equal('questionId', questionIds)]
      );
      console.log('Fetched questions:', questionsRes.documents);
      if (!questionsRes.documents || questionsRes.documents.length === 0) {
        setQuestions([]);
        console.log('No questions found for the given questionIds:', questionIds);
        return;
      }

      // Create a map of exam_questions data for ordering
      const examQuestionsMap = {};
      examQuestionsRes.documents.forEach(eq => {
        examQuestionsMap[eq.questionId] = {
          order: eq.order,
          createdAt: eq.createdAt
        };
      });

      // Process and set questions with their order from exam_questions
      const processedQuestions = questionsRes.documents.map(q => ({
        ...q,
        text: q.questionText || q.text || '',
        options: Array.isArray(q.options)
          ? q.options
          : (q.options ? JSON.parse(q.options) : [
              { text: '', image: null },
              { text: '', image: null },
              { text: '', image: null },
              { text: '', image: null }
            ]),
        correctAnswers: Array.isArray(q.correctAnswers)
          ? q.correctAnswers.map(a =>
              typeof a === 'string'
                ? (isNaN(Number(a))
                    ? a.toUpperCase().charCodeAt(0) - 65 // 'A' → 0
                    : Number(a) - 1 // '1' → 0
                  )
                : a
            )
          : (q.correctAnswers
              ? JSON.parse(q.correctAnswers).map(a =>
                  typeof a === 'string'
                    ? (isNaN(Number(a))
                        ? a.toUpperCase().charCodeAt(0) - 65
                        : Number(a) - 1
                      )
                    : a
                )
              : []
            ),
        difficulty: q.difficulty || '',
        tags: typeof q.tags === 'string' ? q.tags.split(',').map(tag => tag.trim()).filter(tag => tag !== '') : Array.isArray(q.tags) ? q.tags : [],
        image: q.imageId ? { uri: `https://cloud.appwrite.io/v1/storage/buckets/${appwriteConfig.bucketId}/files/${q.imageId}/view` } : null,
        type: q.type || 'mcq',
        marks: q.marks || 1,
        order: examQuestionsMap[q.questionId]?.order || 0
      }));

      // Sort questions by order
      processedQuestions.sort((a, b) => a.order - b.order);
      setQuestions(processedQuestions);

    } catch (err) {
      Alert.alert('Error', 'Failed to load exam details');
    } finally {
      setLoadingExam(false);
    }
  };

  useEffect(() => {
    setQuestionUI(questions.map(q => ({
      searchText: '',
      selectedTags: typeof q.tags === 'string' ? q.tags.split(',').map(t => t.trim()) : (Array.isArray(q.tags) ? q.tags : []),
      showTagDropdown: false,
      suggestions: [],
      selectedDifficulty: q.difficulty || 'easy',
      showAllTags: false,
    })));
  }, [questions.length]);

  useEffect(() => {
    // Initialize suggestion states for each question
    setQuestionSuggestions(questions.map(() => []));
    setShowSuggestionDropdown(questions.map(() => false));
  }, [questions.length]);

  // Add new useEffect for tag modal states
  useEffect(() => {
    setShowTagModal(Array(questions.length).fill(false));
    setShowAllTagsMode(Array(questions.length).fill(false));
  }, [questions.length]);

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
    // Ensure tags are always an array of strings
    const normalizedQuestions = questions.map(q => ({
      ...q,
      tags: typeof q.tags === 'string' ? q.tags.split(',').map(tag => tag.trim()).filter(tag => tag !== '') : Array.isArray(q.tags) ? q.tags : [],
    }));
    console.log('Questions for validation:', JSON.stringify(normalizedQuestions, null, 2));
    let firstInvalid = null;
    normalizedQuestions.forEach((q, idx) => {
      if (!q.text && !firstInvalid) { console.log(`Q${idx+1} missing text`, q); firstInvalid = idx+1; }
      if (!Array.isArray(q.options) && !firstInvalid) { console.log(`Q${idx+1} options not array`, q.options); firstInvalid = idx+1; }
      if (q.options && q.options.some(o => !o.text || o.text.trim() === '') && !firstInvalid) { console.log(`Q${idx+1} has empty option`, q.options); firstInvalid = idx+1; }
      if (!Array.isArray(q.correctAnswers) || q.correctAnswers.length === 0 && !firstInvalid) { console.log(`Q${idx+1} missing correctAnswers`, q.correctAnswers); firstInvalid = idx+1; }
      if (!q.difficulty || q.difficulty.trim() === '' && !firstInvalid) { console.log(`Q${idx+1} missing difficulty`, q.difficulty); firstInvalid = idx+1; }
    });
    if (
      normalizedQuestions.some(q =>
        !q.text ||
        !Array.isArray(q.options) ||
        q.options.some(o => !o.text || o.text.trim() === '') ||
        !Array.isArray(q.correctAnswers) || q.correctAnswers.length === 0 ||
        !q.difficulty || q.difficulty.trim() === ''
      )
    ) {
      Alert.alert('Error', `Please complete all questions including difficulty level${firstInvalid ? ` (see Question ${firstInvalid})` : ''}`);
      return;
    }
    setSaving(true);
    try {
      // SUBJECT LOGIC: Always create a new subject for the entered name
      let subjectId = '';
      if (subjectName) {
        const newSubjectId = ID.unique();
        await databases.createDocument(
          appwriteConfig.databaseId,
          appwriteConfig.subjectsCollectionId,
          newSubjectId, // Appwrite document ID
          {
            subjectId: newSubjectId, // Unique subject ID field
            subjectName: subjectName.trim(), // The name entered by the user
            courseId: selectedCourse
          }
        );
        subjectId = newSubjectId;
      }
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
          subjectId: subjectId,
          duration: parseInt(examData.duration),
          totalMarks: parseInt(examData.totalMarks),
          passingMarks: parseInt(examData.passingMarks),
          startTime: combinedStart.toISOString(),
          endTime: combinedEnd.toISOString(),
        }
      );

      // Delete existing exam_questions mappings
      const existingMappings = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.examQuestionsCollectionId,
        [Query.equal("examId", examId)]
      );
      for (const mapping of existingMappings.documents) {
        await databases.deleteDocument(
          appwriteConfig.databaseId,
          appwriteConfig.examQuestionsCollectionId,
          mapping.$id
        );
      }
      // Now update/create questions and create new mappings
      for (const [idx, q] of questions.entries()) {
        let questionId = q.questionId;
        // Deduplication: Check if a question with the same text exists in allQuestions
        if (!questionId) {
          const existing = allQuestions.find(qq =>
            (qq.questionText || qq.text || '').trim().toLowerCase() === (q.text || '').trim().toLowerCase()
          );
          if (existing && existing.questionId) {
            questionId = existing.questionId;
          } else {
            // New question: create in questions collection
            questionId = ID.unique();
            await databases.createDocument(
              appwriteConfig.databaseId,
              appwriteConfig.questionsCollectionId,
              questionId,
              {
                examId: examId,
                questionId: questionId,
                subjectId: subjectId,
                courseId: selectedCourse,
                type: q.type,
                questionText: q.text,
                options: JSON.stringify(q.options.map((opt, i) => ({
                  optionId: String.fromCharCode(97 + i),
                  text: opt.text
                }))),
                correctAnswers: JSON.stringify(q.correctAnswers.map(i => String.fromCharCode(97 + i))),
                marks: Number(q.marks) || 1,
                difficulty: q.difficulty || 'easy',
                tags: typeof q.tags === 'string' ? q.tags.split(',').map(tag => tag.trim()).filter(tag => tag !== '') : Array.isArray(q.tags) ? q.tags : [],
              }
            );
          }
        }
        // Always create mapping in exam_questions
        await databases.createDocument(
          appwriteConfig.databaseId,
          appwriteConfig.examQuestionsCollectionId,
          ID.unique(),
          {
            examId: examId,
            questionId: questionId,
            order: idx + 1,
            createdAt: new Date().toISOString()
          }
        );
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
      questionId: selectedQuestion.questionId
    };

    setQuestions(prev => [...prev, newQuestion]);
    setShowQuestionSearch(false);
  };

  const handleSearchTextChange = (qIdx, text) => {
    setSearchQuery(text);
    setQuestionUI(prev => prev.map((ui, i) => i === qIdx ? { ...ui, searchText: text } : ui));
    updateSuggestions(qIdx, text, questionUI[qIdx]?.selectedTags || []);
  };
  const handleTagDropdownToggle = (qIdx) => {
    setQuestionUI(prev => prev.map((ui, i) => i === qIdx ? { ...ui, showTagDropdown: !ui.showTagDropdown } : ui));
  };
  const handleTagSelect = (qIdx, tag) => {
    setSelectedTags(prev => {
      const newTags = prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag];
      return newTags;
    });
    setQuestionUI(prev => prev.map((ui, i) => {
      if (i !== qIdx) return ui;
      const selected = ui.selectedTags.includes(tag)
        ? ui.selectedTags.filter(t => t !== tag)
        : [...ui.selectedTags, tag];
      updateSuggestions(qIdx, ui.searchText, selected);
      return { ...ui, selectedTags: selected };
    }));
  };
  const handleDifficultyChange = (qIdx, diff) => {
    setQuestionUI(prev => prev.map((ui, i) => i === qIdx ? { ...ui, selectedDifficulty: diff } : ui));
    // Reset selected tags if current tags are not in the new tag list
    const newTags = getTagsForQuestion(diff, questionUI[qIdx].showAllTags);
    const filteredSelectedTags = questionUI[qIdx].selectedTags.filter(tag => newTags.includes(tag));
    setQuestionUI(prev => prev.map((ui, i) => i === qIdx ? { ...ui, selectedTags: filteredSelectedTags } : ui));
    updateSuggestions(qIdx, questionUI[qIdx].searchText, filteredSelectedTags);
  };
  const handleAllTagsToggle = (qIdx) => {
    setQuestionUI(prev => prev.map((ui, i) => i === qIdx ? { ...ui, showAllTags: !ui.showAllTags } : ui));
    // Reset selected tags if current tags are not in the new tag list
    const newTags = getTagsForQuestion(questionUI[qIdx].selectedDifficulty, !questionUI[qIdx].showAllTags);
    const filteredSelectedTags = questionUI[qIdx].selectedTags.filter(tag => newTags.includes(tag));
    setQuestionUI(prev => prev.map((ui, i) => i === qIdx ? { ...ui, selectedTags: filteredSelectedTags } : ui));
    updateSuggestions(qIdx, questionUI[qIdx].searchText, filteredSelectedTags);
  };
  const updateSuggestions = (qIdx, search, tags) => {
    const query = (search || '').trim().toLowerCase();
    const selectedTags = Array.isArray(tags) ? tags : [];
    const hasSearch = !!query;
    const hasTags = selectedTags.length > 0;

    // Get current question texts to avoid suggesting duplicates
    const currentQuestionTexts = questions.map(q => (q.text || '').trim().toLowerCase());
    
    // Split search query into words for better matching
    const searchWords = query.split(/\s+/).filter(word => word.length > 0);
    
    let filtered = allQuestions.filter(q => {
      // Skip if question is already in the exam
      if (currentQuestionTexts.includes((q.questionText || '').trim().toLowerCase())) {
        return false;
      }

      const qTags = typeof q.tags === 'string' ? q.tags.split(',').map(t => t.trim()) : (Array.isArray(q.tags) ? q.tags : []);
      const questionText = (q.questionText || '').toLowerCase();
      
      // If tags are selected, question must have at least one of the selected tags
      if (hasTags) {
        const hasMatchingTag = selectedTags.some(tag => qTags.includes(tag));
        if (!hasMatchingTag) return false;
      }

      // If search query exists, question must match the search
      if (hasSearch) {
        // Check if any search word matches the question text or tags
        const matchesSearch = searchWords.some(word => {
          // Match in question text
          if (questionText.includes(word)) return true;
          
          // Match in tags
          if (qTags.some(tag => tag.toLowerCase().includes(word))) return true;
          
          return false;
        });
        
        if (!matchesSearch) return false;
      }

      return true;
    });

    // Sort by relevance
    filtered.sort((a, b) => {
      const aTags = typeof a.tags === 'string' ? a.tags.split(',').map(t => t.trim()) : (Array.isArray(a.tags) ? a.tags : []);
      const bTags = typeof b.tags === 'string' ? b.tags.split(',').map(t => t.trim()) : (Array.isArray(b.tags) ? b.tags : []);
      const aText = (a.questionText || '').toLowerCase();
      const bText = (b.questionText || '').toLowerCase();
      
      // Calculate relevance scores
      const calculateScore = (text, tags) => {
        let score = 0;
        
        // Count matching words in text
        searchWords.forEach(word => {
          if (text.includes(word)) score += 2;
        });
        
        // Count matching tags
        if (hasTags) {
          const matchingTags = tags.filter(tag => selectedTags.includes(tag)).length;
          score += matchingTags * 3;
        }
        
        // Bonus for exact matches
        if (text.includes(query)) score += 5;
        
        return score;
      };
      
      const aScore = calculateScore(aText, aTags);
      const bScore = calculateScore(bText, bTags);
      
      return bScore - aScore;
    });

    filtered = filtered.slice(0, 5);
    setQuestionSuggestions(prev => prev.map((arr, i) => i === qIdx ? filtered : arr));
    setShowSuggestionDropdown(prev => prev.map((val, i) => i === qIdx ? filtered.length > 0 : val));
  };
  const handleSuggestionSelect = (qIdx, suggestion) => {
    setQuestions(prev => prev.map((q, i) => i === qIdx ? {
      ...q,
      text: suggestion.questionText || '',
      questionId: suggestion.questionId,
      type: suggestion.type || q.type,
      marks: suggestion.marks || q.marks,
      difficulty: suggestion.difficulty || q.difficulty,
      tags: typeof suggestion.tags === 'string' ? suggestion.tags.split(',').map(tag => tag.trim()).filter(tag => tag !== '') : Array.isArray(suggestion.tags) ? suggestion.tags : [],
      options: suggestion.options || q.options,
      correctAnswers: suggestion.correctAnswers || q.correctAnswers,
    } : q));
    setShowSuggestionDropdown(prev => prev.map((val, i) => i === qIdx ? false : val));
  };

  const getTagsForQuestion = (selectedDifficulty, showAllTags) => {
    if (showAllTags) return allTags;
    // Only tags used by questions of this difficulty
    const tagsSet = new Set();
    allQuestions.forEach(q => {
      if ((q.difficulty || 'easy') === selectedDifficulty) {
        (typeof q.tags === 'string' ? q.tags.split(',').map(t => t.trim()) : (Array.isArray(q.tags) ? q.tags : [])).forEach(tag => tagsSet.add(tag));
      }
    });
    return Array.from(tagsSet);
  };

  // Update renderQuestionSearch function
  const renderQuestionSearch = (qIdx) => {
    const hasSearch = questionUI[qIdx]?.searchText?.trim();
    const hasTags = questionUI[qIdx]?.selectedTags?.length > 0;
    
    return (
      <View style={{ marginBottom: 10, position: 'relative' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ 
            flex: 1, 
            flexDirection: 'row', 
            alignItems: 'center', 
            backgroundColor: '#f5f7fa', 
            borderRadius: 24, 
            paddingHorizontal: 12, 
            height: 40, 
            borderWidth: 1, 
            borderColor: '#e0e0e0' 
          }}>
            <Icon name="search" size={20} color="#1976d2" style={{ marginRight: 6 }} />
            <TextInput
              style={{ flex: 1, fontSize: 15, color: '#222' }}
              placeholder="Search questions or keywords"
              value={questionUI[qIdx]?.searchText || ''}
              onChangeText={text => handleSearchTextChange(qIdx, text)}
              placeholderTextColor="#aaa"
            />
          </View>
          
          <TouchableOpacity
            style={{ 
              marginLeft: 10, 
              backgroundColor: '#e3f0fc', 
              borderRadius: 20, 
              paddingHorizontal: 14, 
              height: 40, 
              justifyContent: 'center', 
              alignItems: 'center', 
              borderWidth: 1, 
              borderColor: '#1976d2' 
            }}
            onPress={() => setShowTagModal(prev => prev.map((v, i) => i === qIdx ? true : false))}
          >
            <Text style={{ color: '#1976d2', fontWeight: 'bold', fontSize: 15 }}>+ Select Tags</Text>
          </TouchableOpacity>
        </View>
        
        {/* Selected Tags Display */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
          {(questionUI[qIdx]?.selectedTags || []).map((tag, tIdx) => (
            <View key={tIdx} style={{ 
              backgroundColor: '#1976d2', 
              borderRadius: 12, 
              paddingHorizontal: 10, 
              paddingVertical: 4, 
              marginRight: 6, 
              marginBottom: 6, 
              flexDirection: 'row', 
              alignItems: 'center' 
            }}>
              <Text style={{ color: '#fff', fontSize: 13 }}>{tag}</Text>
              <TouchableOpacity 
                onPress={() => handleTagSelect(qIdx, tag)} 
                style={{ marginLeft: 4 }}
              >
                <Icon name="close" size={15} color="#fff" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
        
        {showSuggestionDropdown[qIdx] && questionSuggestions[qIdx]?.length > 0 && (hasSearch || hasTags) && (
          <View style={styles.suggestionContainer}>
            <ScrollView 
              style={styles.scrollableBox}
              nestedScrollEnabled={true}
            >
              {questionSuggestions[qIdx].map((question, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.suggestionItem}
                  onPress={() => handleSuggestionSelect(qIdx, question)}
                >
                  <Text style={styles.questionText}>{question.questionText || question.text}</Text>
                  <Text style={styles.tagText}>
                    Tags: {typeof question.tags === 'string' ? question.tags.split(',').map(tag => tag.trim()).filter(tag => tag !== '') : Array.isArray(question.tags) ? question.tags.join(', ') : question.tags}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
        
        {renderTagDropdown(qIdx)}
      </View>
    );
  };

  // Update the tag dropdown rendering to use VerticalTagSelector
  const renderTagDropdown = (qIdx) => {
    if (!showTagModal[qIdx]) return null;

    // Filter tags by selected difficulty for this question
    const filteredTags = allQuestions
      .filter(qq => qq.difficulty === questions[qIdx].difficulty)
      .flatMap(qq => typeof qq.tags === 'string' ? qq.tags.split(',').map(t => t.trim()) : (Array.isArray(qq.tags) ? qq.tags : []));
    const uniqueFilteredTags = Array.from(new Set(filteredTags));
    const tagsToShow = showAllTagsMode[qIdx] ? allTags : uniqueFilteredTags;

    return (
      <Modal
        visible={showTagModal[qIdx]}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTagModal(prev => prev.map((v, i) => i === qIdx ? false : v))}
      >
        <TouchableOpacity 
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.2)' }} 
          activeOpacity={1} 
          onPress={() => setShowTagModal(prev => prev.map((v, i) => i === qIdx ? false : v))}
        >
          <View style={{ 
            position: 'absolute', 
            top: 120, 
            left: 30, 
            right: 30, 
            backgroundColor: '#fff', 
            borderRadius: 12, 
            padding: 18, 
            elevation: 5 
          }}>
            <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 10 }}>Select Tags</Text>
            
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}
              onPress={() => {
                setShowAllTagsMode(prev => prev.map((v, i) => i === qIdx ? !v : v));
              }}
            >
              <Icon 
                name={showAllTagsMode[qIdx] ? 'check-box' : 'check-box-outline-blank'} 
                size={18} 
                color={showAllTagsMode[qIdx] ? '#1976d2' : '#aaa'} 
                style={{ marginRight: 8 }} 
              />
              <Text style={{ color: '#1976d2', fontWeight: 'bold' }}>Show All Tags</Text>
            </TouchableOpacity>
            
            <ScrollView style={{ maxHeight: 180 }}>
              {tagsToShow.map(tag => (
                <TouchableOpacity
                  key={tag}
                  style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}
                  onPress={() => handleTagSelect(qIdx, tag)}
                >
                  <Icon 
                    name={questionUI[qIdx]?.selectedTags?.includes(tag) ? 'check-box' : 'check-box-outline-blank'} 
                    size={18} 
                    color={questionUI[qIdx]?.selectedTags?.includes(tag) ? '#1976d2' : '#aaa'} 
                    style={{ marginRight: 8 }} 
                  />
                  <Text style={{ color: '#333', fontSize: 15 }}>{tag}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <TouchableOpacity 
              style={{ alignSelf: 'flex-end', marginTop: 10 }} 
              onPress={() => setShowTagModal(prev => prev.map((v, i) => i === qIdx ? false : v))}
            >
              <Text style={{ color: '#1976d2', fontWeight: 'bold' }}>Done</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    );
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
        <ScrollView style={styles.content} nestedScrollEnabled={true}>
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
              <Text style={styles.label}>Questions *</Text>
              {questions.map((q, qIdx) => (
                <View key={qIdx} style={{ marginBottom: 20, borderWidth: 1, borderColor: '#eee', borderRadius: 8, padding: 10 }}>
                  {/* Question Numbering */}
                  <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 6 }}>Question {qIdx + 1}</Text>
                  {renderQuestionSearch(qIdx)}
                  {renderTagDropdown(qIdx)}
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
                  <View style={{ marginBottom: 8 }}>
                    <Text style={styles.label}>Question Text *</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      value={q.text}
                      onChangeText={text => handleQuestionChange(qIdx, 'text', text)}
                      placeholder="Enter your question"
                      multiline
                      numberOfLines={4}
                    />
                  </View>
                  <Text style={styles.label}>Options</Text>
                  {q.options.map((opt, optIdx) => (
                    <View key={optIdx} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                      {/* Option label as A, B, C, D */}
                      <Text style={{ fontWeight: 'bold', marginRight: 8 }}>{String.fromCharCode(65 + optIdx)}.</Text>
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
                        {q.correctAnswers.map(idx => String.fromCharCode(65 + idx)).join(', ')}
                      </Text>
                    </View>
                  )}
                  <View style={{ marginBottom: 8 }}>
                    <Text style={styles.label}>Tags (comma separated) *</Text>
                    <TextInput
                      style={styles.input}
                      value={typeof q.tags === 'string' ? q.tags.split(',').map(tag => tag.trim()).filter(tag => tag !== '').join(', ') : (Array.isArray(q.tags) ? q.tags.join(', ') : '')}
                      onChangeText={text => handleQuestionChange(qIdx, 'tags', text)}
                      placeholder="e.g. algebra, geometry, trigonometry"
                    />
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
  suggestionContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderRadius: 8,
    elevation: 4,
    zIndex: 1000,
    maxHeight: 200,
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  scrollableBox: {
    flex: 1,
    paddingHorizontal: 8,
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  questionText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  tagText: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
  },
  tagDropdownContainer: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    backgroundColor: '#fff',
    maxHeight: 200,
    overflow: 'hidden',
    elevation: 2,
    zIndex: 999,
  },
});

export default EditExam; 