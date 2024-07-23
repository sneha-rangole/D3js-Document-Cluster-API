const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const cors = require('cors');

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

const numeric = require('numeric');
const math = require('mathjs');

const port = 5000;

const folderPath = path.join(__dirname, 'dataset');

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

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

// Endpoint to build the document-entity matrix
app.get('/api/documentEntityMatrix', (req, res) => {
  fs.readdir(folderPath, (err, files) => {
    if (err) {
      console.error('Error reading folder:', err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    const matrix = files.map(file => {
      const filePath = path.join(folderPath, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const words = extractContentElements(content);
      return {
        id: file, 
        data: [
          words.filter(isPersonName).length,
          words.filter(isLocation).length,
          words.filter(isDate).length,
          words.filter(isOrganization).length,
        ]
      };
    });

    res.json(matrix);
  });
});

function mean(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function computeMDS(matrix) {
  if (!Array.isArray(matrix) || !matrix.every(row => Array.isArray(row))) {
      throw new TypeError("Expected a matrix of arrays");
  }
  // Calculate column means
  const columnMeans = matrix[0].map((_, idx) => {
    const colMean = math.mean(matrix.map(row => row[idx]));
    return colMean;
  });

  // Subtract the mean from each column element
  const meanCentered = matrix.map(row => 
    row.map((val, idx) => {
        const adjustedVal = val - columnMeans[idx];
        return adjustedVal;
    })
  );
  // Computing the covariance matrix
  const covarianceMatrix = numeric.dotMMbig(numeric.transpose(meanCentered), meanCentered);
  // Calculating eigenvalues and eigenvectors
  const eig = numeric.eig(covarianceMatrix);
  // Extracting the principal components (you might adjust how many components you extract)
  const principalComponents = eig.E.x.map(col => 
      numeric.dot(meanCentered, col).slice(0, 2)
  );
  return principalComponents;
}

app.get('/api/mds', async (req, res) => {
try {
  const matrixResponse = await fetch('http://localhost:5000/api/documentEntityMatrix');
  const matrixWithData = await matrixResponse.json(); // Expecting array of {id, data}

  // Extract numerical part of the matrix data for MDS computation
  const matrix = matrixWithData.map(item => item.data);

  // Compute MDS
  const mdsResults = computeMDS(matrix);

  const mdsResultsWithIds = matrixWithData.map((item, index) => ({
      id: item.id,
      mds: mdsResults[index]
  }));

  res.json(mdsResultsWithIds);
} catch (error) {
  console.error('Error computing MDS:', error);
  res.status(500).json({ error: 'Internal Server Error' });
}
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});