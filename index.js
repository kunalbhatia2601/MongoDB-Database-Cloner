const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Store cloning jobs in memory (in production, use a database)
const cloningJobs = new Map();

// Utility function to connect to MongoDB
async function connectToMongoDB(connectionString) {
    try {
        const client = new MongoClient(connectionString);
        await client.connect();
        return client;
    } catch (error) {
        throw new Error(`Connection failed: ${error.message}`);
    }
}

// API Routes

// Test MongoDB connection and get databases
app.post('/api/test-connection', async (req, res) => {
    const { connectionString } = req.body;
    
    if (!connectionString) {
        return res.status(400).json({ error: 'Connection string is required' });
    }

    try {
        const client = await connectToMongoDB(connectionString);
        const adminDb = client.db().admin();
        const databases = await adminDb.listDatabases();
        await client.close();
        
        res.json({
            success: true,
            databases: databases.databases.map(db => ({
                name: db.name,
                sizeOnDisk: db.sizeOnDisk || 0,
                empty: db.empty || false
            }))
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

// Start database cloning
app.post('/api/clone-database', async (req, res) => {
    const { sourceConnection, targetConnection, databaseName } = req.body;
    
    if (!sourceConnection || !targetConnection || !databaseName) {
        return res.status(400).json({ 
            error: 'Source connection, target connection, and database name are required' 
        });
    }

    const jobId = Date.now().toString();
    
    // Initialize job status
    cloningJobs.set(jobId, {
        id: jobId,
        status: 'starting',
        progress: 0,
        details: 'Initializing clone operation...',
        startTime: new Date(),
        collections: [],
        currentCollection: null,
        totalCollections: 0,
        processedCollections: 0,
        totalDocuments: 0,
        processedDocuments: 0,
        errors: []
    });

    // Start cloning process asynchronously
    cloneDatabase(jobId, sourceConnection, targetConnection, databaseName);
    
    res.json({
        success: true,
        jobId: jobId,
        message: 'Cloning process started'
    });
});

// Get cloning job status
app.get('/api/clone-status/:jobId', (req, res) => {
    const { jobId } = req.params;
    const job = cloningJobs.get(jobId);
    
    if (!job) {
        return res.status(404).json({ error: 'Job not found' });
    }
    
    res.json(job);
});

// Get all jobs
app.get('/api/jobs', (req, res) => {
    const jobs = Array.from(cloningJobs.values());
    res.json(jobs);
});

// Delete a job
app.delete('/api/jobs/:jobId', (req, res) => {
    const { jobId } = req.params;
    const deleted = cloningJobs.delete(jobId);
    
    if (deleted) {
        res.json({ success: true, message: 'Job deleted' });
    } else {
        res.status(404).json({ error: 'Job not found' });
    }
});

// Cloning function
async function cloneDatabase(jobId, sourceConnection, targetConnection, databaseName) {
    const job = cloningJobs.get(jobId);
    let sourceClient = null;
    let targetClient = null;

    try {
        // Update job status
        job.status = 'connecting';
        job.details = 'Connecting to source and target databases...';
        
        // Connect to both databases
        sourceClient = await connectToMongoDB(sourceConnection);
        targetClient = await connectToMongoDB(targetConnection);
        
        const sourceDb = sourceClient.db(databaseName);
        const targetDb = targetClient.db(databaseName);
        
        job.status = 'analyzing';
        job.details = 'Analyzing source database structure...';
        
        // Get all collections
        const collections = await sourceDb.listCollections().toArray();
        job.totalCollections = collections.length;
        job.collections = collections.map(col => col.name);
        
        // Count total documents
        let totalDocs = 0;
        for (const collection of collections) {
            const count = await sourceDb.collection(collection.name).countDocuments();
            totalDocs += count;
        }
        job.totalDocuments = totalDocs;
        
        job.status = 'cloning';
        job.details = `Starting to clone ${collections.length} collections...`;
        
        // Clone each collection
        for (let i = 0; i < collections.length; i++) {
            const collectionName = collections[i].name;
            job.currentCollection = collectionName;
            job.details = `Cloning collection: ${collectionName}`;
            
            const sourceCollection = sourceDb.collection(collectionName);
            const targetCollection = targetDb.collection(collectionName);
            
            // Drop target collection if it exists
            try {
                await targetCollection.drop();
            } catch (error) {
                // Collection might not exist, ignore error
            }
            
            // Get documents from source
            const documents = await sourceCollection.find({}).toArray();
            
            if (documents.length > 0) {
                // Insert documents in batches
                const batchSize = 1000;
                for (let j = 0; j < documents.length; j += batchSize) {
                    const batch = documents.slice(j, j + batchSize);
                    await targetCollection.insertMany(batch);
                    job.processedDocuments += batch.length;
                    
                    // Update progress
                    job.progress = Math.round((job.processedDocuments / job.totalDocuments) * 100);
                }
            }
            
            // Copy indexes
            const indexes = await sourceCollection.listIndexes().toArray();
            for (const index of indexes) {
                if (index.name !== '_id_') { // Skip default _id index
                    try {
                        const indexSpec = { ...index };
                        delete indexSpec.v;
                        delete indexSpec.name;
                        delete indexSpec.ns;
                        await targetCollection.createIndex(indexSpec.key, indexSpec);
                    } catch (error) {
                        job.errors.push(`Failed to create index ${index.name} on ${collectionName}: ${error.message}`);
                    }
                }
            }
            
            job.processedCollections++;
        }
        
        job.status = 'completed';
        job.progress = 100;
        job.details = `Successfully cloned database '${databaseName}' with ${job.totalCollections} collections and ${job.totalDocuments} documents`;
        job.endTime = new Date();
        
    } catch (error) {
        job.status = 'failed';
        job.details = `Error: ${error.message}`;
        job.errors.push(error.message);
        job.endTime = new Date();
    } finally {
        if (sourceClient) await sourceClient.close();
        if (targetClient) await targetClient.close();
    }
}

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`MongoDB Cloner server running on http://localhost:${PORT}`);
});


module.exports = app;