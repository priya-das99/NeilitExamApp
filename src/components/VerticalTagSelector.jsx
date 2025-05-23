// import React, { useState } from 'react';
// import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
// import Icon from 'react-native-vector-icons/MaterialIcons';

// const VerticalTagSelector = ({ allQuestions, selectedTags, onTagSelect }) => {
//   const [showTagDropdown, setShowTagDropdown] = useState(false);
//   const [selectedDifficulty, setSelectedDifficulty] = useState('easy');
//   const [showAllTags, setShowAllTags] = useState(false);

//   // Get tags based on current filter settings
//   const getFilteredTags = () => {
//     const tagsSet = new Set();
//     allQuestions.forEach(q => {
//       // If showing all tags or matches current difficulty
//       if (showAllTags || q.difficulty === selectedDifficulty) {
//         (Array.isArray(q.tags) ? q.tags : (q.tags ? q.tags.split(',').map(t => t.trim()) : [])).forEach(tag => tag && tagsSet.add(tag));
//       }
//     });
//     return Array.from(tagsSet).sort();
//   };

//   const filteredTags = getFilteredTags();

//   return (
//     <View style={styles.container}>
//       <TouchableOpacity 
//         style={styles.selectTagsButton}
//         onPress={() => setShowTagDropdown(!showTagDropdown)}
//       >
//         <Text style={styles.buttonText}>Select Tags</Text>
//         <Icon 
//           name={showTagDropdown ? 'arrow-drop-up' : 'arrow-drop-down'} 
//           size={24} 
//           color="#1976d2" 
//         />
//       </TouchableOpacity>

//       {showTagDropdown && (
//         <View style={styles.dropdownContainer}>
//           {/* All Tags Option */}
//           <TouchableOpacity
//             style={[styles.allTagsButton, showAllTags && styles.allTagsActive]}
//             onPress={() => setShowAllTags(!showAllTags)}
//           >
//             <Icon 
//               name={showAllTags ? 'check-box' : 'check-box-outline-blank'} 
//               size={20} 
//               color={showAllTags ? '#1976d2' : '#aaa'} 
//             />
//             <Text style={styles.allTagsText}>All Tags</Text>
//           </TouchableOpacity>

//           {/* Difficulty Selector */}
//           <ScrollView 
//             horizontal
//             showsHorizontalScrollIndicator={false}
//             style={styles.difficultyScroll}
//           >
//             {['easy', 'medium', 'hard'].map(difficulty => (
//               <TouchableOpacity
//                 key={difficulty}
//                 style={[
//                   styles.difficultyButton,
//                   !showAllTags && selectedDifficulty === difficulty && styles.selectedDifficulty
//                 ]}
//                 onPress={() => {
//                   setSelectedDifficulty(difficulty);
//                   setShowAllTags(false);
//                 }}
//                 disabled={showAllTags}
//               >
//                 <Text style={styles.difficultyText}>
//                   {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
//                 </Text>
//               </TouchableOpacity>
//             ))}
//           </ScrollView>

//           {/* Vertical Tags List */}
//           <ScrollView
//             style={styles.tagsContainer}
//             nestedScrollEnabled={true}
//             showsVerticalScrollIndicator={true}
//             keyboardShouldPersistTaps="handled"
//           >
//             {filteredTags.length > 0 ? (
//               filteredTags.map(tag => (
//                 <TouchableOpacity
//                   key={tag}
//                   style={[
//                     styles.tagItem,
//                     selectedTags.includes(tag) && styles.selectedTag
//                   ]}
//                   onPress={() => onTagSelect(tag)}
//                   activeOpacity={0.7}
//                 >
//                   <Icon
//                     name={selectedTags.includes(tag) ? 'check-box' : 'check-box-outline-blank'}
//                     size={20}
//                     color={selectedTags.includes(tag) ? '#1976d2' : '#aaa'}
//                   />
//                   <Text style={styles.tagText}>{tag}</Text>
//                 </TouchableOpacity>
//               ))
//             ) : (
//               <Text style={styles.emptyText}>No tags found</Text>
//             )}
//           </ScrollView>
//         </View>
//       )}
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     marginVertical: 10,
//     zIndex: 1000,
//   },
//   selectTagsButton: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     backgroundColor: '#e3f2fd',
//     paddingVertical: 10,
//     paddingHorizontal: 15,
//     borderRadius: 25,
//     borderWidth: 1,
//     borderColor: '#1976d2',
//     alignSelf: 'flex-start',
//   },
//   buttonText: {
//     color: '#1976d2',
//     fontWeight: 'bold',
//     marginRight: 5,
//   },
//   dropdownContainer: {
//     position: 'absolute',
//     top: 45,
//     left: 0,
//     right: 0,
//     backgroundColor: 'white',
//     borderRadius: 10,
//     padding: 10,
//     elevation: 5,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.2,
//     shadowRadius: 4,
//   },
//   allTagsButton: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginBottom: 8,
//     paddingVertical: 6,
//     paddingHorizontal: 8,
//     borderRadius: 6,
//   },
//   allTagsActive: {
//     backgroundColor: '#e0f2fe',
//   },
//   allTagsText: {
//     marginLeft: 8,
//     color: '#334155',
//     fontSize: 14,
//   },
//   difficultyScroll: {
//     marginBottom: 10,
//   },
//   difficultyButton: {
//     paddingHorizontal: 15,
//     paddingVertical: 8,
//     marginRight: 10,
//     borderRadius: 15,
//     backgroundColor: '#f5f5f5',
//   },
//   selectedDifficulty: {
//     backgroundColor: '#1976d2',
//   },
//   difficultyText: {
//     color: '#333',
//     fontWeight: '500',
//   },
//   tagsContainer: {
//     paddingVertical: 5,
//     maxHeight: 180,
//   },
//   tagItem: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     backgroundColor: '#f5f5f5',
//     borderRadius: 15,
//     paddingHorizontal: 12,
//     paddingVertical: 6,
//     marginBottom: 8,
//   },
//   selectedTag: {
//     backgroundColor: '#e3f2fd',
//     borderColor: '#1976d2',
//     borderWidth: 1,
//   },
//   tagText: {
//     marginLeft: 5,
//     color: '#333',
//   },
//   emptyText: {
//     color: '#aaa',
//     textAlign: 'center',
//     marginTop: 10,
//   },
// });

// export default VerticalTagSelector; 