# Deployment Guide

This guide explains how to deploy the Trainer Management Portal to Digital Ocean (backend) and AWS S3 (frontend).

## Prerequisites

- Digital Ocean account
- AWS account with S3 access
- MongoDB Atlas (already configured)
- Domain name (optional)

## Backend Deployment (Digital Ocean)

### Option 1: Digital Ocean App Platform

1. Push your code to a GitHub repository.

2. In Digital Ocean dashboard, go to Apps > Create App.

3. Connect your GitHub repo.

4. Set the source directory to `backend/`.

5. Configure environment variables:
   - `MONGODB_URI`: Your MongoDB Atlas connection string
   - `JWT_SECRET`: A strong random string
   - `NODE_ENV`: production
   - `CORS_ORIGIN`: Your frontend URL (e.g., https://your-bucket.s3.amazonaws.com or your custom domain)

6. Set the run command to `npm start`.

7. Deploy the app.

### Option 2: Digital Ocean Droplet with Docker

1. Create a Droplet (Ubuntu recommended).

2. SSH into the Droplet.

3. Install Docker:
   ```bash
   sudo apt update
   sudo apt install docker.io
   sudo systemctl start docker
   sudo systemctl enable docker
   ```

4. Clone your repository and navigate to backend folder.

5. Build and run the Docker container:
   ```bash
   docker build -t trainer-backend .
   docker run -d -p 5000:5000 --env-file .env trainer-backend
   ```

6. Configure Nginx as reverse proxy (optional).

## Frontend Deployment (AWS S3)

1. Create an S3 bucket in AWS Console.

2. Enable static website hosting:
   - Go to bucket Properties > Static website hosting
   - Enable it, set index.html as index document

3. Set bucket policy for public read:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "PublicReadGetObject",
         "Effect": "Allow",
         "Principal": "*",
         "Action": "s3:GetObject",
         "Resource": "arn:aws:s3:::your-bucket-name/*"
       }
     ]
   }
   ```

4. Build the frontend:
   ```bash
   npm run build
   ```
   Or set production API URL:
   ```bash
   VITE_API_URL=https://your-backend-url npm run build
   ```

5. Upload the `dist/` folder contents to the S3 bucket.

6. Your frontend will be available at: http://your-bucket-name.s3-website-region.amazonaws.com

## Environment Variables

### Backend (.env)
```
MONGODB_URI=mongodb+srv://...
PORT=5000
NODE_ENV=production
JWT_SECRET=your-strong-secret
CORS_ORIGIN=https://your-frontend-url
```

### Frontend (.env.production)
```
VITE_API_URL=https://your-backend-app.digitalocean.app/api
```

## Post-Deployment

- Update the frontend API URL to point to the deployed backend.
- Test the application.
- Set up monitoring and backups.
- Consider using a custom domain with CloudFront for S3.