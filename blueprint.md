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

## Current Request Plan

The current goal is to fetch the surgical data from Firestore instead of using mock data.

1.  **DONE** Update the `blueprint.md` file.
2.  **NEXT** Seed the Firestore database with sample data by creating and running a temporary script.
3.  Update the `Dashboard.jsx` to fetch data from the `surgeries` collection in Firestore.
