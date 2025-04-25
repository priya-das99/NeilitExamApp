import { Client, Account, Databases, ID, Permission, Role } from 'appwrite';

const client = new Client()
    .setEndpoint('https://cloud.appwrite.io/v1')
    .setProject('67d11cca000ef033049c');

const account = new Account(client);
const databases = new Databases(client);

const appwriteConfig = {
    databaseId: '67dbbe13001047853991',
    studentsCollectionId: '6808b11b00223a691906',
    adminRole: 'admin',
    studentRole: 'student'
};

export { 
    client,
    account,
    databases,
    appwriteConfig,
    ID,
    Permission,
    Role
};