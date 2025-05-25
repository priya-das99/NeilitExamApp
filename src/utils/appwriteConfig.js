import { Client, Account, Databases, ID, Permission, Role, Storage } from 'appwrite';

// Initialize the client with proper configuration
const client = new Client()
    .setEndpoint('https://cloud.appwrite.io/v1')
    .setProject('67d11cca000ef033049c')
    // .setSelfSigned(true); // Enable self-signed certificates for development

// Initialize services with the client
const account = new Account(client);
const databases = new Databases(client);
const storage = new Storage(client);

const appwriteConfig = {
    projectId: '67d11cca000ef033049c',
    databaseId: '67dbbe13001047853991',
    studentsCollectionId: '6808b11b00223a691906',
    coursesCollectionId: '680d05a00009a4884d60',
    examsCollectionId: '680d0b9200175db93bd8',
    questionsCollectionId: '680d1acf003974e31f77',
    subjectsCollectionId: '680d06730031ebc56457',
    examQuestionsCollectionId: '681e4ca600017a3b9e84',
    examAssignmentsCollectionId: '680d1e10001b5a3229dc',
    examAttemptsCollectionId: '681e4ca600017a3b9e85',
    adminRole: 'admin',
    studentRole: 'student',
    bucketId: '680f5c59001ad28a1efe'
};

// Export the initialized services
export { 
    client,
    account,
    databases,
    storage,
    appwriteConfig,
    ID,
    Permission,
    Role
};