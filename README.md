# SurgiVerse: A Surgical Simulation Platform

SurgiVerse is a web-based platform designed for managing VR based surgical education and training. It provides an immersive and interactive environment where students can practice surgical procedures, receive AI-powered feedback, and track their progress. Professors and teaching assistants can manage courses, evaluate student performance, and customize the learning experience.

## Key Features

The application supports three distinct user roles: **Professors**, **Teaching Assistants (TAs)**, and **Students**.

### For Students
- **Dashboard:** View and access a list of available surgical simulations.
- **Practice Surgeries:** Launch simulations to practice procedures in a realistic 3D environment.
- **Performance Review:** Review detailed logs and metrics from each practice attempt.
- **AI-Powered Feedback:** Engage with an AI assistant to get personalized feedback and insights on performance.
- **Customizable Settings:** Adjust personal in-game settings such as volume, graphics, and anti-aliasing.
- **Downloadable Reports:** Generate and download PDF reports for each surgery attempt.

### For Professors
- **All Student Features**
- **Surgery Management:** Add, edit, and manage the list of available surgical procedures, including setting default performance metrics and required steps.
- **User Management:** Onboard and manage user roles (Students, TAs).
- **Student Grading:** Review and grade student surgery attempts.
- **Analytics Dashboard:** View analytics on student performance and engagement.
- **AI Context Management:** Add and manage markdown-based resources to provide the AI assistant with up-to-date context and information.
- **Global Configuration:** Configure global game settings that apply to all users and simulations.

### For Teaching Assistants (TAs)
- **Student Grading:** Review and grade student attempts.
- **Analytics Dashboard:** Access and monitor student performance data.

## Technologies Used

- **Frontend:**
  - **React:** A JavaScript library for building user interfaces.
  - **Vite:** A fast build tool and development server.
  - **Material-UI (MUI):** A comprehensive React UI component library.
  - **React Router:** For declarative routing and navigation.
- **Backend & Database:**
  - **Firebase:**
    - **Authentication:** For user sign-up, sign-in, and role-based access control.
    - **Firestore:** A NoSQL database for storing all application data, including surgeries, user attempts, and settings.
- **Reporting:**
  - **jsPDF & html2canvas:** For generating and downloading PDF reports of surgery attempts.

## Getting Started

Follow these instructions to set up and run the project in your local environment.

### Prerequisites
- Node.js (v18 or later)
- An active Firebase project

### Installation & Setup

1.  **Clone the repository:**
    ```sh
    git clone <your-repository-url>
    cd <your-repository-name>
    ```

2.  **Install dependencies:**
    ```sh
    npm install
    ```

3.  **Configure Firebase:**
    - Create a `firebase.js` file in the `src` directory (`src/firebase.js`).
    - Go to your Firebase project settings and copy your web app's Firebase configuration object.
    - Paste the configuration into `src/firebase.js` and export the necessary Firebase services:
    ```javascript
    import { initializeApp } from "firebase/app";
    import { getAuth } from "firebase/auth";
    import { getFirestore } from "firebase/firestore";

    // Your web app's Firebase configuration
    const firebaseConfig = {
      apiKey: "YOUR_API_KEY",
      authDomain: "YOUR_AUTH_DOMAIN",
      projectId: "YOUR_PROJECT_ID",
      storageBucket: "YOUR_STORAGE_BUCKET",
      messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
      appId: "YOUR_APP_ID"
    };

    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);

    export { auth, db };
    ```

4.  **Run the development server:**
    ```sh
    npm run dev
    ```
    The application will be available at `https://surgiverse.web.app`.

## Project Structure

The project follows a standard React application structure:

-   `src/components`: Contains reusable UI components (e.g., `Navbar`, `ProtectedRoute`).
-   `src/pages`: Contains the main page components for each route (e.g., `Dashboard`, `Profile`, `AddSurgery`).
-   `src/hooks`: Contains custom React hooks (e.g., `useAuth` for authentication state).
-   `src/firebase.js`: Firebase configuration and initialization.
-   `src/App.jsx`: The main application component where routing is defined.
-   `src/styles.css`: Global styles for the application.
