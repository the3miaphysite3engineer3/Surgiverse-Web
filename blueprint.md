# SurgiVerse Application Blueprint

## Overview

SurgiVerse is a web-based platform for viewing and analyzing surgical simulation data. It provides a dashboard for instructors and students to track performance, review procedures, and manage user settings. This application is built using React and Material-UI, connected to a Firebase backend.

## Implemented Features and Design

### Initial Version

*   **Firebase Integration:** The application is connected to a Firebase project to handle backend services.
*   **Routing:** `react-router-dom` is used for navigation between different pages.
*   **Component Library:** Material-UI is used for a consistent and modern user interface.
*   **Dashboard:** A main dashboard that displays a list of available surgical procedures.
*   **Authentication:** A secure login/registration page with protected routes.
*   **Navbar:** A navigation bar that displays the user's email and a logout button.
*   **Styling:**
    *   **Color Palette:** A vibrant color palette with a mix of deep purples, blues, and pinks to create an energetic and modern look.
    *   **Typography:** Expressive fonts are used to create a clear visual hierarchy.
    *   **Visual Effects:** Cards have a soft, multi-layered drop shadow to create a "lifted" effect. A subtle noise texture is applied to the background for a premium feel.
    *   **Iconography:** Icons are used to supplement text and enhance navigation.

### Data Fetching from Firestore

*   **Firestore Seeding:** The Firestore database was seeded with sample surgical data.
*   **Dynamic Dashboard:** The dashboard now dynamically fetches and displays the list of surgical procedures from the `surgeries` collection in Firestore.

### Schema Update

*   **Profile Page:** The profile page has been updated to reflect the new data schemas. It now fetches and displays user information (like name, email, role) from the `users` collection and in-game settings (like graphics level, volume) from the `userSettings` collection.
*   **Dashboard:** The dashboard has been updated to align with the new schemas for surgeries and attempts. It now correctly fetches and displays a user's attempts for each surgery, using the `surgery_id` to link attempts to surgeries and displaying the `completionTimeSeconds`.
*   **Surgery Details Page:** The surgery details page has been updated to correctly display the `defaultMetrics` for each surgery (target time, bleeding level, etc.). The query for fetching a user's attempts has also been fixed to use the correct field names (`surgery_id` and `uid`), and the attempts are now sorted by date and display more detailed information.

### AI Assistant for Attempts

*   **Gemini API Integration:** An AI assistant powered by the Google Gemini API has been integrated into the application. This allows students to discuss their performance on a given surgical attempt.
*   **`AIAssistant` Component:** A new chat component has been created to provide a user-friendly interface for interacting with the AI.
*   **Modal Integration:** On the `SurgeryDetails` page, a "Discuss with AI" button has been added to each attempt. Clicking this button opens the AI assistant in a modal, providing the full context of the attempt (logs, metrics, etc.) to the AI.
*   **Environment Variable:** The Gemini API key is expected to be available as a `REACT_APP_GEMINI_API_KEY` environment variable.

### Detailed Attempt View

*   **Accordion View:** On the `SurgeryDetails` page, each attempt is now displayed in an expandable accordion, showing a summary of the attempt.
*   **Detailed Logs:** Expanding the accordion reveals the detailed logs for that specific attempt, providing students with a more in-depth understanding of their performance.

## Current Request Plan

There are no pending requests.
