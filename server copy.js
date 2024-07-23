const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const cors = require('cors');

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

const port = 5000;

const folderPath = path.join(__dirname, 'dataset');

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Improved regex for person names
function isPersonName(word) {
  return /^[A-Z][a-z]+(?: [A-Z][a-z]+)*$/.test(word);
}

function isLocation(word) {
  return word.toLowerCase().includes('location');
}

function isDate(word) {
  return /^\d{4}-\d{2}-\d{2}$/.test(word);
}

function isOrganization(word) {
  return word.toLowerCase().includes('organization');
}

function extractContentElements(content) {
  const excludedWords = new Set(['at', 'the', 'it', 'you', 'this', 'his', 'our', 'let', 'he', 'on', 'they', 'this', 'later', 'will', 'we', 'my', 'very', 'can', 'new', 
  'in', 'these', 'also', 'how', 'end', 'first', 'then','but', 'what', 'do', 'type', 'then', 'while', 'like', 'she', 'all', 'an']);
  const words = content.split(/\s+/);
  const entities = words.filter(word => {
    const lowercaseWord = word.toLowerCase();
    return (isPersonName(word) || isLocation(word) || isOrganization(word)) && !excludedWords.has(lowercaseWord);
  });
  return entities;
}


function clusterDocuments(documents) {
  const clusters = {};

  documents.forEach(doc => {
    const contentElements = extractContentElements(doc.content);

    contentElements.forEach(element => {
      if (!clusters[element]) {
        clusters[element] = [];
      }
      clusters[element].push(doc);
    });
  });

  const clusterArray = Object.entries(clusters).map(([element, documents]) => ({
    clusterName: element,
    documents: documents
  }));

  return clusterArray;
}

app.get('/api/files', (req, res) => {
  fs.readdir(folderPath, (err, files) => {
    if (err) {
      console.error('Error reading folder:', err);
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }

    const fileContents = {};

    files.forEach(file => {
      const filePath = path.join(folderPath, file);
      const content = fs.readFileSync(filePath, 'utf8');
      fileContents[file] = content;
    });

    res.json({ files, fileContents });
  });
});

app.get('/api/files/:fileName', (req, res) => {
  const fileName = req.params.fileName;
  const filePath = path.join(folderPath, fileName);

  fs.readFile(filePath, 'utf8', (err, content) => {
    if (err) {
      console.error(`Error reading file ${fileName}:`, err);
      res.status(404).json({ error: 'File not found' });
      return;
    }

    res.json({ fileName, content });
  });
});

app.post('/api/extractEntities', async (req, res) => {
  const { text } = req.body;
  try {
    const entities = extractContentElements(text);
    res.json({ entities });
  } catch (error) {
    console.error('Error extracting entities:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/api/clusterDocuments', async (req, res) => {
  const { documents } = req.body;
  try {
    const clusters = clusterDocuments(documents);
    res.json({ clusters });
  } catch (error) {
    console.error('Error clustering documents:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

async function extractEntitiesFromDocument(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const entities = extractContentElements(content);
    return entities;
  } catch (error) {
    console.error('Error extracting entities:', error);
    return [];
  }
}

// Function to build the document-entity matrix
async function buildDocumentEntityMatrix() {
  try {
      const documents = fs.readdirSync(folderPath);
      const matrix = [];

      for (const document of documents) {
          const filePath = path.join(folderPath, document);
          const entities = await extractEntitiesFromDocument(filePath);
          matrix.push(entities);
      }

      return matrix;
  } catch (error) {
      console.error('Error building document-entity matrix:', error);
      return [];
  }
}

// Endpoint to get the document-entity matrix
app.get('/api/documentEntityMatrix', async (req, res) => {
  try {
      const matrix = await buildDocumentEntityMatrix();
      res.json({ matrix });
  } catch (error) {
      console.error('Error fetching document-entity matrix:', error);
      res.status(500).json({ error: 'Internal Server Error' });
  }
});


app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});