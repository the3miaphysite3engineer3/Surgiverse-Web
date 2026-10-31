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
  - **Supabase:**
    - **Authentication:** For user sign-up, sign-in, password reset, and role-based access control (roles on the `users` table).
    - **Postgres:** Stores all application data — surgeries, user attempts, chat messages, settings — with row-level security mirroring the former Firestore rules.
- **Reporting:**
  - **jsPDF & html2canvas:** For generating and downloading PDF reports of surgery attempts.

## Getting Started

Follow these instructions to set up and run the project in your local environment.

### Prerequisites
- Node.js (v18 or later)
- An active Supabase project (schema under `supabase/migrations/`; AI catalog via `npm run seed:models`)

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

3.  **Configure environment variables:**
    - Create a `.env` file in the project root (see `.env.example`).
    - Add the Supabase URL + anon key (Project settings → API) and the OpenRouter key:
    ```dotenv
    VITE_SUPABASE_URL=https://<project-ref>.supabase.co
    VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
    VITE_OPENROUTER=YOUR_OPENROUTER_API_KEY
    ```
    - The app loads these values through `import.meta.env.VITE_*` in `src/supabase.js` and the AI assistant.

4.  **Run the development server:**
    ```sh
    npm run dev
    ```
    The application will be available at `https://surgiverse-web.vercel.app`.

## Project Structure

The project follows a standard React application structure:

-   `src/components`: Contains reusable UI components (e.g., `Navbar`, `ProtectedRoute`).
-   `src/pages`: Contains the main page components for each route (e.g., `Dashboard`, `Profile`, `AddSurgery`).
-   `src/hooks`: Contains custom React hooks (e.g., `useAuth` for authentication state).
-   `src/firebase.js`: Firebase configuration and initialization.
-   `src/App.jsx`: The main application component where routing is defined.
-   `src/styles.css`: Global styles for the application.
