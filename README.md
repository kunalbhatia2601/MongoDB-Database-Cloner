# MongoDB Database Cloner & CRUD Explorer

A comprehensive Express.js application that allows you to clone entire MongoDB databases between different MongoDB instances with real-time progress tracking, plus a full CRUD interface for exploring and managing MongoDB documents.

## Features

### Database Cloning
- **Connection Testing**: Test MongoDB connections before cloning
- **Database Selection**: View and select from available databases in the source connection
- **Full Database Cloning**: Clone all collections, documents, and indexes
- **Real-time Progress**: Track cloning progress with detailed status updates using polling
- **Job Management**: View cloning history and manage jobs
- **Error Handling**: Comprehensive error reporting and handling

### CRUD Explorer
- **Database Browser**: Connect to any MongoDB instance and browse all databases
- **Collection Explorer**: View all collections with document counts and schema preview
- **Document Management**: Full CRUD operations (Create, Read, Update, Delete)
- **Schema Analysis**: Automatic schema detection from sample documents
- **Advanced Filtering**: JSON-based document filtering
- **Pagination**: Handle large collections with pagination
- **JSON Editor**: Built-in JSON editor for creating and editing documents

### UI Features
- **Responsive Design**: Clean, modern web interface that works on all devices
- **Real-time Updates**: Live progress tracking and status updates
- **Intuitive Navigation**: Easy switching between cloning and CRUD modes

## Installation

1. Make sure you have Node.js installed
2. Install dependencies:
   ```bash
   bun install
   # or
   npm install
   ```

## Usage

1. **Start the server**:
   ```bash
   bun start
   # or
   npm start
   ```

2. **Open your browser** and navigate to `http://localhost:3000`

3. **Choose your mode**:
   - **Database Cloner**: Clone entire databases between MongoDB instances
   - **CRUD Explorer**: Browse and manage individual documents

### Database Cloning

3. **Configure connections**:
   - Enter your source MongoDB connection string (where you want to clone FROM)
   - Enter your target MongoDB connection string (where you want to clone TO)
   - Test both connections to ensure they work

4. **Select database**:
   - After testing the source connection, available databases will be displayed
   - Click on the database you want to clone

5. **Start cloning**:
   - Click "Clone Selected Database" to start the process
   - Monitor real-time progress in the progress panel

6. **Track progress**:
   - View detailed progress including:
     - Overall completion percentage
     - Current collection being processed
     - Number of collections and documents processed
     - Time elapsed
     - Any errors encountered

### CRUD Operations

3. **Connect to database**:
   - Enter your MongoDB connection string
   - Click "Connect & Load Databases"

4. **Browse data**:
   - Select a database from the sidebar
   - Choose a collection to view its documents
   - View automatically generated schema information

5. **Manage documents**:
   - **Create**: Click "Create Document" and enter JSON data
   - **Read**: Browse documents with pagination and filtering
   - **Update**: Click "Edit" on any document to modify it
   - **Delete**: Click "Delete" to remove documents
   - **Filter**: Use JSON queries to filter documents (e.g., `{"status": "active"}`)

6. **Advanced features**:
   - View collection schema with field types and presence percentages
   - Use pagination to handle large collections
   - Apply JSON filters for complex queries

## API Endpoints

### Database Cloning APIs

### `POST /api/test-connection`
Test a MongoDB connection string.

**Request Body:**
```json
{
  "connectionString": "mongodb://user:password@host:port/database"
}
```

**Response:**
```json
{
  "success": true,
  "databases": [
    {
      "name": "mydb",
      "sizeOnDisk": 1048576,
      "empty": false
    }
  ]
}
```

### `POST /api/clone-database`
Start a database cloning operation.

**Request Body:**
```json
{
  "sourceConnection": "mongodb://source-host:port/",
  "targetConnection": "mongodb://target-host:port/",
  "databaseName": "mydb"
}
```

**Response:**
```json
{
  "success": true,
  "jobId": "1694188800000",
  "message": "Cloning process started"
}
```

### `GET /api/clone-status/:jobId`
Get the status of a cloning job.

**Response:**
```json
{
  "id": "1694188800000",
  "status": "cloning",
  "progress": 45,
  "details": "Cloning collection: users",
  "startTime": "2023-09-08T10:00:00.000Z",
  "collections": ["users", "orders", "products"],
  "currentCollection": "users",
  "totalCollections": 3,
  "processedCollections": 1,
  "totalDocuments": 10000,
  "processedDocuments": 4500,
  "errors": []
}
```

### `GET /api/jobs`
Get all cloning jobs.

### `DELETE /api/jobs/:jobId`
Delete a specific job from the history.

### CRUD APIs

### `POST /api/database/collections`
Get collections for a specific database.

**Request Body:**
```json
{
  "connectionString": "mongodb://host:port/",
  "databaseName": "mydb"
}
```

**Response:**
```json
{
  "success": true,
  "collections": [
    {
      "name": "users",
      "type": "collection",
      "documentCount": 1500,
      "sampleSchema": ["_id", "name", "email", "createdAt"]
    }
  ]
}
```

### `POST /api/collection/documents`
Get documents from a collection with pagination and filtering.

**Request Body:**
```json
{
  "connectionString": "mongodb://host:port/",
  "databaseName": "mydb",
  "collectionName": "users",
  "page": 1,
  "limit": 20,
  "filter": {"status": "active"}
}
```

**Response:**
```json
{
  "success": true,
  "documents": [...],
  "pagination": {
    "currentPage": 1,
    "totalPages": 10,
    "totalDocuments": 200,
    "documentsPerPage": 20
  },
  "schema": {
    "name": {
      "types": ["string"],
      "requiredPercentage": 100,
      "examples": ["John Doe", "Jane Smith"]
    }
  }
}
```

### `POST /api/document/create`
Create a new document.

**Request Body:**
```json
{
  "connectionString": "mongodb://host:port/",
  "databaseName": "mydb",
  "collectionName": "users",
  "document": {"name": "New User", "email": "user@example.com"}
}
```

### `PUT /api/document/update`
Update an existing document.

**Request Body:**
```json
{
  "connectionString": "mongodb://host:port/",
  "databaseName": "mydb",
  "collectionName": "users",
  "documentId": "507f1f77bcf86cd799439011",
  "updates": {"status": "inactive"}
}
```

### `DELETE /api/document/delete`
Delete a document.

**Request Body:**
```json
{
  "connectionString": "mongodb://host:port/",
  "databaseName": "mydb",
  "collectionName": "users",
  "documentId": "507f1f77bcf86cd799439011"
}
```

### `POST /api/document/get`
Get a specific document by ID.

**Request Body:**
```json
{
  "connectionString": "mongodb://host:port/",
  "databaseName": "mydb",
  "collectionName": "users",
  "documentId": "507f1f77bcf86cd799439011"
}
```

## How It Works

### Database Cloning
1. **Connection Testing**: The app connects to MongoDB instances to verify credentials and list available databases
2. **Database Analysis**: Before cloning, the app analyzes the source database to count collections and documents
3. **Incremental Cloning**: Data is cloned in batches to handle large databases efficiently
4. **Index Preservation**: All indexes (except the default `_id` index) are recreated on the target database
5. **Progress Tracking**: The frontend polls the backend every 2 seconds for real-time updates
6. **Error Handling**: Any errors during cloning are captured and displayed to the user

### CRUD Operations
1. **Schema Detection**: Automatically analyzes collections to determine field types and presence
2. **Pagination**: Efficiently handles large collections by loading documents in pages
3. **JSON Filtering**: Supports MongoDB query syntax for filtering documents
4. **Real-time Updates**: Changes are immediately reflected in the UI
5. **Type Safety**: Validates JSON input before sending to MongoDB
6. **Error Recovery**: Comprehensive error handling with user-friendly messages

## Connection String Examples

- **Local MongoDB**: `mongodb://localhost:27017/`
- **MongoDB with authentication**: `mongodb://username:password@host:27017/`
- **MongoDB Atlas**: `mongodb+srv://username:password@cluster.mongodb.net/`
- **Replica Set**: `mongodb://host1:27017,host2:27017,host3:27017/database?replicaSet=myReplicaSet`

## Notes

- The app uses in-memory storage for job tracking. In a production environment, you might want to persist job data in a database
- Large databases may take significant time to clone depending on network speed and database size
- The target database will be completely overwritten if it already exists
- System databases (admin, local, config) are filtered out from the selection list
- The app handles connection cleanup automatically to prevent memory leaks

## Troubleshooting

- **Connection Failed**: Check your connection strings, network connectivity, and MongoDB credentials
- **Cloning Stuck**: Check the job status for detailed error messages
- **High Memory Usage**: Large databases might require chunked processing for very large collections
- **Permission Errors**: Ensure your MongoDB user has read access on source and write access on target