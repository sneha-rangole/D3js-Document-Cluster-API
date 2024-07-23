Here is a styled version of the README file for the backend of the Document Clustering and Visualization project:

---

# Document Clustering and Visualization Backend

This backend server is part of the Document Clustering and Visualization project. It handles API requests for extracting content elements, clustering documents, and providing data for visualizations.

## Getting Started

### Prerequisites

- **Node.js** (v12 or later)
- **npm** (v6 or later)

### Installation

1. **Clone the repository:**

    ```bash
    git clone https://github.com/your-username/document-clustering-visualization.git
    cd document-clustering-visualization/visualAnalyticsServer
    ```

2. **Install dependencies:**

    ```bash
    npm install
    ```

### Running the Server

1. **Start the server:**

    ```bash
    node server.js
    ```

    The server will start on `http://localhost:3000`.

## API Endpoints

1. **Extract Entities**

    - **Endpoint:** `/api/extractEntities`
    - **Method:** `POST`
    - **Description:** Extracts content elements from the documents using NLP techniques.
    - **Request Body:** JSON containing the documents.
    - **Response:** JSON with extracted entities like person names, locations, dates, and organizations.

2. **Cluster Documents**

    - **Endpoint:** `/api/clusterDocuments`
    - **Method:** `POST`
    - **Description:** Clusters documents based on their content using clustering algorithms.
    - **Request Body:** JSON containing the documents.
    - **Response:** JSON with clustering results.

3. **Document Entity Matrix**

    - **Endpoint:** `/api/documentEntityMatrix`
    - **Method:** `POST`
    - **Description:** Builds a document-entity matrix with entity counts for each document.
    - **Request Body:** JSON containing the documents.
    - **Response:** JSON with the document-entity matrix.

4. **Multidimensional Scaling (MDS)**

    - **Endpoint:** `/api/mds`
    - **Method:** `POST`
    - **Description:** Computes distances between documents based on entity counts for lower-dimensional visualization.
    - **Request Body:** JSON containing the document-entity matrix.
    - **Response:** JSON with reduced dimension data for each document.

## Implementation Details

### Technologies Used

- **Node.js:** Platform for building scalable server-side applications.
- **Express.js:** Framework for handling API requests and responses.
- **Body-parser:** Middleware for parsing incoming request bodies.
- **CORS:** Middleware for allowing cross-origin requests from the frontend.

### MDS Computation Details

- **Matrix Construction:** Extracts content elements from each document and builds a matrix with entity counts.
- **Dimension Reduction via MDS:** Uses linear algebra techniques, including mean-centering of data, covariance matrix calculation, and eigenvalue decomposition, to compute the principal components representing the documents in a reduced dimensional space.

---

This README provides an overview of the backend setup and usage for the Document Clustering and Visualization project. For any questions or further assistance, please refer to the project's documentation or contact the maintainers.
