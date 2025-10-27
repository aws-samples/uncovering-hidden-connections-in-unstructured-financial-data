# React + Vite

This project has been migrated from Create React App to [Vite](https://vitejs.dev/) for faster development and build times.

## Available Scripts

In the project directory, you can run:

### `npm run dev`

Runs the app in development mode with Vite's lightning-fast HMR (Hot Module Replacement).\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload instantly when you make changes.\
You'll see any lint errors in the console.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

### `npm run preview`

Locally preview the production build.

## Environment Configuration

The app uses environment variables loaded from `/public/env.js`. This file contains:
- `API_GATEWAY_ENDPOINT`: The API Gateway endpoint URL
- `API_GATEWAY_APIKEY`: The API Gateway API key

These are available globally via `window.env`.

## Learn More

- [Vite Documentation](https://vitejs.dev/)
- [React Documentation](https://reactjs.org/)
