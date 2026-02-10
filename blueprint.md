# SurgiVerse Application Blueprint

## Overview

SurgiVerse is a web-based platform designed for surgical education and training. It provides a virtual environment where students can practice surgical procedures, and professors can create, manage, and evaluate surgical simulations. The platform also includes features for user management, analytics, and AI-powered feedback.

## Implemented Features

### User Roles and Permissions

*   **Student:** Can view and practice surgeries, review their attempts, and receive AI-assisted feedback.
*   **TA (Teaching Assistant):** Can grade student attempts and view analytics.
*   **Professor:** Has full access to the platform, including adding new surgeries, managing resources, grading students, viewing analytics, and managing user roles.

### Core Functionality

*   **Authentication:** Users can sign up and log in using Firebase Authentication.
*   **Dashboard:** Displays a list of available surgeries.
*   **Surgery Details:** Provides detailed information about each surgery, including default metrics and required steps.
*   **Add Surgery:** Professors can add new surgeries with detailed parameters, including `sceneName` and `viewSceneName` for Unity integration.
*   **Grade Students:** Professors and TAs can grade student attempts.
*   **Add Resources:** Professors can add educational resources.
*   **Analytics:** Professors and TAs can view performance analytics.
*   **Manage Users:** Professors can manage user roles.
*   **AI Assistant:** Provides AI-powered feedback on student attempts.
*   **Profile Page:** Users can view and update their profile information.
*   **Dynamic Navbar:** The navigation bar dynamically adjusts its content based on the user's role.

## Current Task: Add `sceneName` and `viewSceneName`

### Plan

1.  **Update `AddSurgery.jsx`:** Add new input fields for `sceneName` and `viewSceneName` to the "Add Surgery" form.
2.  **Update `SurgeryDetails.jsx`:** Display the `sceneName` and `viewSceneName` on the "Surgery Details" page.
3.  **Update `blueprint.md`:** Document the new fields and the updated functionality.
