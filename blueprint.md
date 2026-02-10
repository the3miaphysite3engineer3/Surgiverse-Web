# Genkit App Blueprint

This document outlines the plan for creating a simple web application that uses Genkit to generate content.

## Overview

The application will have a simple front-end that allows users to input a topic. The front-end will send a request to a Genkit flow, which will use a generative model to create content based on the topic. The generated content will then be displayed on the front-end.

## Plan

1.  **Install Dependencies:** Install the necessary dependencies for Genkit and Firebase Functions.
2.  **Create Genkit Flow:** Create a simple "hello world" Genkit flow.
3.  **Update Front-end:** Update the front-end to interact with the Genkit flow.
4.  **Configure Proxy:** Configure a proxy to forward requests from the front-end to the Genkit flow.
5.  **Update `package.json`:** Add a `dev` script to run the Genkit flow concurrently with the Vite dev server.
