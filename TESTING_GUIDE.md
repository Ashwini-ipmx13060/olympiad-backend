# API Testing Guide

Comprehensive guide for testing all authentication, user management, and RBAC endpoints in the Olympiad Testing Platform API.

## Table of Contents

1. [Setup & Prerequisites](#setup--prerequisites)
2. [Testing Tools](#testing-tools)
3. [Authentication Endpoints](#authentication-endpoints)
4. [User Management Endpoints](#user-management-endpoints)
5. [RBAC Endpoints](#rbac-endpoints)
6. [Testing Sequence](#testing-sequence)
7. [Error Scenarios](#error-scenarios)
8. [Token Handling](#token-handling)
9. [Troubleshooting](#troubleshooting)
10. [Success Criteria Checklist](#success-criteria-checklist)

---

## Setup & Prerequisites

### Required Setup

1. **API Server Running**
   ```bash
   cd apps/api
   npm run dev
   # Server should be running on http://localhost:3001
   ```

2. **PocketBase Running**
   ```bash
   # PocketBase should be running on http://localhost:8090
   # Verify with: curl http://localhost:8090/api/health
   ```

3. **Environment Variables**
   - Ensure `.env` file is configured with:
     - `JWT_SECRET` (for token generation)
     - `JWT_REFRESH_SECRET` (for refresh tokens)
     - `POCKETBASE_URL=http://localhost:8090`
     - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` (for email testing)

4. **Test User Email**
   - Have a test email ready (e.g., `testuser@example.com`)
   - For OTP testing, use an email you can access

5. **Database Collections**
   - Ensure PocketBase has these collections:
     - `users` (with fields: email, password, firstName, lastName, emailVerified, active, role)
     - `user_roles` (with fields: userId, role)
     - `roles` (with fields: name, description)
     - `role_permissions` (with fields: roleId, permission)
     - `permissions` (with fields: name)
     - `otp_codes` (with fields: email, code, expiresAt, used)

---

## Testing Tools

### Option 1: cURL (Command Line)

**Advantages:**
- No installation needed (built-in on macOS/Linux)
- Easy to script and automate
- Perfect for CI/CD pipelines

**Installation (Windows):**
```bash
# Using Chocolatey
choco install curl

# Or download from: https://curl.se/download.html
```

**Basic Usage:**
```bash
curl -X POST http://localhost:3001/hcgi/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test@123456"}'
```

### Option 2: Postman

**Installation:**
1. Download from https://www.postman.com/downloads/
2. Create a new workspace
3. Create a new collection for "Olympiad API Tests"

**Setup Environment Variables:**
1. Click "Environments" → "Create New"
2. Add variables:
   - `base_url`: `http://localhost:3001/hcgi/api`
   - `access_token`: (will be populated after login)
   - `refresh_token`: (will be populated after login)
   - `user_id`: (will be populated after login)

**Using Variables in Requests:**
```
Authorization: Bearer {{access_token}}
```

### Option 3: Thunder Client (VS Code Extension)

**Installation:**
1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "Thunder Client"
4. Click Install

**Usage:**
- Click Thunder Client icon in sidebar
- Create new request
- Set method, URL, headers, body
- Click "Send"

### Option 4: REST Client (VS Code Extension)

**Installation:**
1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "REST Client"
4. Click Install

**Create `.http` file:**
```http
### Register User
POST http://localhost:3001/hcgi/api/auth/register
Content-Type: application/json

{
  "email": "testuser@example.com",
  "password": "Test@123456",
  "firstName": "Test",
  "lastName": "User"
}

### Login User
POST http://localhost:3001/hcgi/api/auth/login
Content-Type: application/json

{
  "email": "testuser@example.com",
  "password": "Test@123456"
}
```

Then click "Send Request" above each request.

---

## Authentication Endpoints

### 1. Register User

**Endpoint:** `POST /auth/register`

**Description:** Create a new user account

**Request Body:**
```json
{
  "email": "testuser@example.com",
  "password": "Test@123456",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Password Requirements:**
- Minimum 8 characters
- At least one uppercase letter (A-Z)
- At least one lowercase letter (a-z)
- At least one number (0-9)
- At least one special character (!@#$%^&*)

**cURL Command:**
```bash
curl -X POST http://localhost:3001/hcgi/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "Test@123456",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

**Expected Response (201 Created):**
```json
{
  "success": true,
  "user": {
    "id": "user_id_here",
    "email": "testuser@example.com",
    "firstName": "John",
    "lastName": "Doe"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Status Codes:**
- 201: User created successfully
- 400: Validation error (missing fields, weak password)
- 409: Email already registered
- 500: Server error

**Save for Later Use:**
```bash
# Save tokens from response
export ACCESS_TOKEN="eyJhbGciOiJIUzI1NiIs..."
export REFRESH_TOKEN="eyJhbGciOiJIUzI1NiIs..."
export USER_ID="user_id_here"
```

---

## User Management Endpoints

### 1. Get All Users

**Endpoint:** `GET /users`

**Description:** Get list of all users (admin only)

**Authentication:** Required (Bearer token)

**Authorization:** Requires `admin` role

**cURL Command:**
```bash
curl -X GET http://localhost:3001/hcgi/api/users \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "users": [
    {
      "id": "user_id_1",
      "email": "user1@example.com",
      "name": "John Doe",
      "firstName": "John",
      "lastName": "Doe",
      "role": {
        "id": "role_id",
        "name": "admin"
      }
    }
  ]
}
```

**Status Codes:**
- 200: Users retrieved successfully
- 401: Missing or invalid token
- 403: User does not have admin role
- 500: Server error

---

## RBAC Endpoints

### 1. Get My Role

**Endpoint:** `GET /rbac/my-role`

**Description:** Get authenticated user's role

**Authentication:** Required (Bearer token)

**cURL Command:**
```bash
curl -X GET http://localhost:3001/hcgi/api/rbac/my-role \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "role": {
    "id": "role_id_here",
    "name": "admin",
    "description": "Administrator with full access"
  }
}
```

**Status Codes:**
- 200: Role retrieved successfully
- 401: Missing or invalid token
- 500: Server error

### 2. Check Permission

**Endpoint:** `GET /rbac/check-permission?permission=<permissionName>`

**Description:** Check if user has specific permission

**Authentication:** Required (Bearer token)

**cURL Command:**
```bash
curl -X GET "http://localhost:3001/hcgi/api/rbac/check-permission?permission=edit_users" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "hasPermission": true
}
```

**Status Codes:**
- 200: Permission check completed
- 400: Missing permission parameter
- 401: Missing or invalid token
- 500: Server error

---

## Testing Sequence

Follow this sequence to test all endpoints in a logical order:

### Step 1: Register User
```bash
curl -X POST http://localhost:3001/hcgi/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "Test@123456",
    "firstName": "John",
    "lastName": "Doe"
  }'

# Save tokens from response
export ACCESS_TOKEN="<accessToken from response>"
export REFRESH_TOKEN="<refreshToken from response>"
export USER_ID="<id from response>"
```

### Step 2: Get Current User
```bash
curl -X GET http://localhost:3001/hcgi/api/auth/me \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

### Step 3: Get My Role
```bash
curl -X GET http://localhost:3001/hcgi/api/rbac/my-role \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

### Step 4: Check Permission
```bash
curl -X GET "http://localhost:3001/hcgi/api/rbac/check-permission?permission=edit_users" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

### Step 5: Change Password
```bash
curl -X POST http://localhost:3001/hcgi/api/auth/change-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "oldPassword": "Test@123456",
    "newPassword": "NewTest@123456"
  }'
```

### Step 6: Logout
```bash
curl -X POST http://localhost:3001/hcgi/api/auth/logout \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

### Step 7: Login with New Password
```bash
curl -X POST http://localhost:3001/hcgi/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "NewTest@123456"
  }'

# Save new tokens
export ACCESS_TOKEN="<new accessToken>"
export REFRESH_TOKEN="<new refreshToken>"
```

### Step 8: Refresh Token
```bash
curl -X POST http://localhost:3001/hcgi/api/auth/refresh-token \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "'$REFRESH_TOKEN'"
  }'

# Save new tokens
export ACCESS_TOKEN="<new accessToken>"
export REFRESH_TOKEN="<new refreshToken>"
```

### Step 9: Request OTP
```bash
curl -X POST http://localhost:3001/hcgi/api/auth/otp-request \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com"
  }'

# Check email for OTP code
```

### Step 10: Verify OTP
```bash
curl -X POST http://localhost:3001/hcgi/api/auth/otp-verify \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "code": "123456"
  }'
```

### Step 11: Forgot Password
```bash
curl -X POST http://localhost:3001/hcgi/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com"
  }'

# Check email for reset link with token
```

### Step 12: Reset Password
```bash
curl -X POST http://localhost:3001/hcgi/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token": "<token from email>",
    "newPassword": "FinalTest@123456"
  }'
```

### Step 13: User Management (Admin Only)

**Note:** These endpoints require admin role. First, assign admin role to test user via PocketBase.

```bash
# Get all users
curl -X GET http://localhost:3001/hcgi/api/users \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# Get specific user
curl -X GET http://localhost:3001/hcgi/api/users/$USER_ID \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# Update user role
curl -X PUT http://localhost:3001/hcgi/api/users/$USER_ID/role \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "roleId": "role_id_here"
  }'

# Delete user
curl -X DELETE http://localhost:3001/hcgi/api/users/$USER_ID \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

---

## Error Scenarios

### Authentication Errors

#### Missing Authorization Header
```bash
curl -X GET http://localhost:3001/hcgi/api/auth/me
```

**Response (401 Unauthorized):**
```json
{
  "error": "Unauthorized"
}
```

#### Invalid Token Format
```bash
curl -X GET http://localhost:3001/hcgi/api/auth/me \
  -H "Authorization: InvalidToken"
```

**Response (401 Unauthorized):**
```json
{
  "error": "Unauthorized"
}
```

#### Expired Token
```bash
# Wait for token to expire (1 hour) or use an old token
curl -X GET http://localhost:3001/hcgi/api/auth/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Response (401 Unauthorized):**
```json
{
  "error": "Invalid or expired token"
}
```

### Registration Errors

#### Email Already Registered
```bash
curl -X POST http://localhost:3001/hcgi/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "Test@123456",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

**Response (409 Conflict):**
```json
{
  "error": "Email already registered"
}
```

#### Weak Password
```bash
curl -X POST http://localhost:3001/hcgi/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "weak",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

**Response (400 Bad Request):**
```json
{
  "error": "Password must be at least 8 characters long, Password must contain at least one uppercase letter, Password must contain at least one number, Password must contain at least one special character"
}
```

#### Missing Required Fields
```bash
curl -X POST http://localhost:3001/hcgi/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com"
  }'
```

**Response (400 Bad Request):**
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "password",
      "message": "\"password\" is required"
    }
  ]
}
```

### Login Errors

#### Invalid Credentials
```bash
curl -X POST http://localhost:3001/hcgi/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "WrongPassword@123"
  }'
```

**Response (401 Unauthorized):**
```json
{
  "error": "Invalid email or password"
}
```

#### Inactive User Account
```bash
curl -X POST http://localhost:3001/hcgi/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "inactiveuser@example.com",
    "password": "Test@123456"
  }'
```

**Response (403 Forbidden):**
```json
{
  "error": "User account is inactive"
}
```

### OTP Errors

#### Invalid OTP Code
```bash
curl -X POST http://localhost:3001/hcgi/api/auth/otp-verify \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "code": "000000"
  }'
```

**Response (401 Unauthorized):**
```json
{
  "error": "Invalid OTP code"
}
```

#### Expired OTP Code
```bash
curl -X POST http://localhost:3001/hcgi/api/auth/otp-verify \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "code": "123456"
  }'
```

**Response (401 Unauthorized):**
```json
{
  "error": "OTP code has expired"
}
```

#### Rate Limited OTP Requests
```bash
curl -X POST http://localhost:3001/hcgi/api/auth/otp-request \
  -H "Content-Type: application/json" \
  -d '{"email": "testuser@example.com"}'
```

**Response (429 Too Many Requests):**
```json
{
  "error": "Too many OTP requests, please try again later"
}
```

### RBAC Errors

#### Insufficient Permissions
```bash
curl -X GET http://localhost:3001/hcgi/api/users \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN"
```

**Response (403 Forbidden):**
```json
{
  "error": "Forbidden"
}
```

#### Missing Permission Parameter
```bash
curl -X GET http://localhost:3001/hcgi/api/rbac/check-permission \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

**Response (400 Bad Request):**
```json
{
  "error": "Permission parameter required"
}
```

### User Management Errors

#### User Not Found
```bash
curl -X GET http://localhost:3001/hcgi/api/users/nonexistent_id \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

**Response (404 Not Found):**
```json
{
  "error": "User not found"
}
```

#### Unauthorized Access to Other User's Profile
```bash
curl -X GET http://localhost:3001/hcgi/api/users/other_user_id \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN"
```

**Response (403 Forbidden):**
```json
{
  "error": "Forbidden"
}
```

#### Missing Role ID in Update
```bash
curl -X PUT http://localhost:3001/hcgi/api/users/$USER_ID/role \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_ACCESS_TOKEN" \
  -d '{}'
```

**Response (400 Bad Request):**
```json
{
  "error": "roleId required"
}
```

---

## Token Handling

### Understanding JWT Tokens

JWT tokens have three parts separated by dots:
```
header.payload.signature
```

**Example Token:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyXzEyMyIsIm9yZ2FuaXphdGlvbklkIjpudWxsLCJ0eXBlIjoiYWNjZXNzIiwiaWF0IjoxNjk0NzY1NDMyLCJleHAiOjE2OTQ3NjkwMzIsImlzcyI6Im9seW1waWFkLWFwaSJ9.abc123...
```

### Saving Tokens

#### In Bash/Shell
```bash
# After login/register, save tokens
export ACCESS_TOKEN="eyJhbGciOiJIUzI1NiIs..."
export REFRESH_TOKEN="eyJhbGciOiJIUzI1NiIs..."
export USER_ID="user_id_here"

# Use in subsequent requests
curl -X GET http://localhost:3001/hcgi/api/auth/me \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

#### In Postman
1. After login request, go to "Tests" tab
2. Add script to save tokens:
```javascript
if (pm.response.code === 200 || pm.response.code === 201) {
  const data = pm.response.json();
  pm.environment.set('access_token', data.accessToken);
  pm.environment.set('refresh_token', data.refreshToken);
  pm.environment.set('user_id', data.user.id);
}
```
3. Use in headers: `Authorization: Bearer {{access_token}}`

#### In REST Client (VS Code)
```http
@base_url = http://localhost:3001/hcgi/api
@access_token = 
@refresh_token = 
@user_id = 

### Login and save tokens
POST {{base_url}}/auth/login
Content-Type: application/json

{
  "email": "testuser@example.com",
  "password": "Test@123456"
}

# After response, manually update @access_token, @refresh_token, @user_id

### Use token in next request
GET {{base_url}}/auth/me
Authorization: Bearer {{access_token}}
```

### Token Expiration Times

| Token Type | Expiration | Use Case |
|------------|------------|----------|
| Access Token | 1 hour | Authenticate API requests |
| Refresh Token | 7 days | Get new access token |
| Reset Token | 1 hour | Reset password |
| OTP Code | 10 minutes | Verify email |

### Refreshing Expired Access Token

When access token expires (401 response):

```bash
# Use refresh token to get new access token
curl -X POST http://localhost:3001/hcgi/api/auth/refresh-token \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "'$REFRESH_TOKEN'"
  }'

# Response contains new tokens
# Update your saved tokens
export ACCESS_TOKEN="<new accessToken>"
export REFRESH_TOKEN="<new refreshToken>"
```

### Decoding Tokens (For Debugging)

Use https://jwt.io to decode tokens and see payload:

1. Copy your token
2. Paste in jwt.io
3. View decoded payload
4. Check `exp` field for expiration timestamp

**Example Decoded Payload:**
```json
{
  "userId": "user_123",
  "organizationId": null,
  "type": "access",
  "iat": 1694765432,
  "exp": 1694769032,
  "iss": "olympiad-api"
}
```

---

## Troubleshooting

### CORS Errors

**Error Message:**
```
Access to XMLHttpRequest at 'http://localhost:3001/hcgi/api/auth/login' from origin 'http://localhost:5173' has been blocked by CORS policy
```

**Solution:**
1. Check `.env` file has correct `CORS_ORIGIN`:
   ```
   CORS_ORIGIN=http://localhost:5173
   ```
2. Restart API server
3. Clear browser cache
4. Check request includes `Content-Type: application/json` header

**For cURL (no CORS issues):**
- cURL requests don't have CORS restrictions
- CORS only applies to browser requests

### Token Expiration Issues

**Error Message:**
```json
{
  "error": "Invalid or expired token"
}
```

**Solution:**
1. Check token hasn't expired (1 hour for access token)
2. Use refresh token to get new access token:
   ```bash
   curl -X POST http://localhost:3001/hcgi/api/auth/refresh-token \
     -H "Content-Type: application/json" \
     -d '{"refreshToken": "'$REFRESH_TOKEN'"}'
   ```
3. If refresh token also expired, login again

### Email Not Sent

**Issue:** OTP or password reset emails not received

**Troubleshooting:**
1. Check SMTP configuration in `.env`:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your_email@gmail.com
   SMTP_PASS=your_app_password
   SMTP_FROM=noreply@olympiad.test
   ```

2. For Gmail:
   - Use App Password, not regular password
   - Generate at: https://myaccount.google.com/apppasswords
   - Enable "Less secure app access" if needed

3. Check API logs for email errors

4. Test email manually:
   ```bash
   curl -X POST http://localhost:3001/hcgi/api/auth/otp-request \
     -H "Content-Type: application/json" \
     -d '{"email": "your_email@gmail.com"}'
   ```

### Invalid OTP Code

**Error Message:**
```json
{
  "error": "Invalid OTP code"
}
```

**Troubleshooting:**
1. Check OTP code is exactly 6 digits
2. Verify code hasn't expired (10 minutes)
3. Check code matches email in request
4. Ensure code hasn't been used already
5. Request new OTP if needed:
   ```bash
   curl -X POST http://localhost:3001/hcgi/api/auth/otp-request \
     -H "Content-Type: application/json" \
     -d '{"email": "testuser@example.com"}'
   ```

### Rate Limiting

**Error Message:**
```json
{
  "error": "Too many requests, please try again later"
}
```

**Rate Limits:**
- Global: 100 requests per 5 minutes
- Login: 10 attempts per 15 minutes
- OTP Request: 3 requests per 15 minutes
- Password Reset: 3 requests per 15 minutes

**Solution:**
- Wait for rate limit window to expire
- Check if making too many requests
- Use different IP address if testing multiple accounts

### Database Connection Issues

**Error Message:**
```json
{
  "error": "Failed to connect to PocketBase"
}
```

**Troubleshooting:**
1. Verify PocketBase is running:
   ```bash
   curl http://localhost:8090/api/health
   ```

2. Check PocketBase URL in `.env`:
   ```
   POCKETBASE_URL=http://localhost:8090
   ```

3. Verify database collections exist

4. Check PocketBase admin credentials in `.env`

### Invalid Password

**Error Message:**
```json
{
  "error": "Password must be at least 8 characters long..."
}
```

**Password Requirements:**
- Minimum 8 characters
- At least one uppercase letter (A-Z)
- At least one lowercase letter (a-z)
- At least one number (0-9)
- At least one special character (!@#$%^&*)

**Valid Examples:**
- `Test@123456`
- `MyPassword!2024`
- `Secure#Pass99`

### Server Not Running

**Error Message:**
```
Cannot GET /hcgi/api/auth/me
```

**Solution:**
1. Start API server:
   ```bash
   cd apps/api
   npm run dev
   ```

2. Verify server is running:
   ```bash
   curl http://localhost:3001/hcgi/api/health
   ```

3. Check for errors in terminal output

### Wrong API URL

**Error Message:**
```
Failed to fetch
```

**Troubleshooting:**
1. Verify API URL format:
   - Correct: `http://localhost:3001/hcgi/api/auth/login`
   - Wrong: `http://localhost:3001/api/auth/login` (missing `/hcgi`)
   - Wrong: `http://localhost:3001/auth/login` (missing `/hcgi/api`)

2. Check port number:
   - API runs on port 3001 (not 3000)
   - PocketBase runs on port 8090

---

## Success Criteria Checklist

Use this checklist to verify all endpoints are working correctly:

### Authentication Endpoints

- [ ] **Register**
  - [ ] Returns 201 status code
  - [ ] Response includes `success: true`
  - [ ] Response includes `user` object with id, email, firstName, lastName
  - [ ] Response includes `accessToken` and `refreshToken`
  - [ ] Returns 409 when email already exists
  - [ ] Returns 400 for weak password
  - [ ] Returns 400 for missing fields

- [ ] **Login**
  - [ ] Returns 200 status code
  - [ ] Response includes `success: true`
  - [ ] Response includes `user` object
  - [ ] Response includes `accessToken` and `refreshToken`
  - [ ] Returns 401 for invalid credentials
  - [ ] Returns 403 for inactive user
  - [ ] Returns 400 for missing fields

- [ ] **Get Me**
  - [ ] Returns 200 status code
  - [ ] Response includes `success: true`
  - [ ] Response includes complete user profile
  - [ ] Returns 401 without token
  - [ ] Returns 401 with invalid token

- [ ] **Change Password**
  - [ ] Returns 200 status code
  - [ ] Response includes `success: true`
  - [ ] Password is actually changed (can login with new password)
  - [ ] Returns 401 for incorrect old password
  - [ ] Returns 400 for weak new password
  - [ ] Returns 401 without token

- [ ] **Refresh Token**
  - [ ] Returns 200 status code
  - [ ] Response includes new `accessToken`
  - [ ] Response includes new `refreshToken`
  - [ ] New token works for authenticated requests
  - [ ] Returns 401 for invalid refresh token
  - [ ] Returns 400 for missing token

- [ ] **Logout**
  - [ ] Returns 200 status code
  - [ ] Response includes `success: true`
  - [ ] Returns 401 without token

- [ ] **Forgot Password**
  - [ ] Returns 200 status code
  - [ ] Response includes `success: true`
  - [ ] Email is sent (check inbox)
  - [ ] Returns 400 for invalid email format
  - [ ] Returns 429 when rate limited

- [ ] **Reset Password**
  - [ ] Returns 200 status code
  - [ ] Response includes `success: true`
  - [ ] Password is actually changed
  - [ ] Returns 401 for invalid/expired token
  - [ ] Returns 400 for weak password

- [ ] **Request OTP**
  - [ ] Returns 200 status code
  - [ ] Response includes `success: true`
  - [ ] Email with OTP is sent
  - [ ] Returns 400 for invalid email
  - [ ] Returns 429 when rate limited

- [ ] **Verify OTP**
  - [ ] Returns 200 status code
  - [ ] Response includes `success: true`
  - [ ] Response includes `user` object
  - [ ] Response includes tokens
  - [ ] Returns 401 for invalid code
  - [ ] Returns 401 for expired code
  - [ ] Returns 400 for invalid code format

- [ ] **Google OAuth**
  - [ ] Returns 200 status code
  - [ ] Response includes `success: true`
  - [ ] Response includes `user` object
  - [ ] Response includes tokens
  - [ ] Returns 401 for invalid token
  - [ ] Returns 400 for missing token

### User Management Endpoints

- [ ] **Get All Users**
  - [ ] Returns 200 status code
  - [ ] Response includes `success: true`
  - [ ] Response includes array of users
  - [ ] Each user has id, email, name, role
  - [ ] Returns 403 without admin role
  - [ ] Returns 401 without token

- [ ] **Get User by ID**
  - [ ] Returns 200 status code
  - [ ] Response includes `success: true`
  - [ ] Response includes user object
  - [ ] User can view own profile
  - [ ] Admin can view any profile
  - [ ] Non-admin cannot view other profiles (403)
  - [ ] Returns 404 for non-existent user
  - [ ] Returns 401 without token

- [ ] **Update User Role**
  - [ ] Returns 200 status code
  - [ ] Response includes `success: true`
  - [ ] Response includes updated user with new role
  - [ ] Role is actually updated in database
  - [ ] Returns 403 without admin role
  - [ ] Returns 400 for missing roleId
  - [ ] Returns 401 without token

- [ ] **Delete User**
  - [ ] Returns 200 status code
  - [ ] Response includes `success: true`
  - [ ] User is actually deleted from database
  - [ ] Returns 403 without admin role
  - [ ] Returns 401 without token

### RBAC Endpoints

- [ ] **Get My Role**
  - [ ] Returns 200 status code
  - [ ] Response includes `success: true`
  - [ ] Response includes role object with id, name, description
  - [ ] Returns null if user has no role
  - [ ] Returns 401 without token

- [ ] **Check Permission**
  - [ ] Returns 200 status code
  - [ ] Response includes `success: true`
  - [ ] Response includes `hasPermission: boolean`
  - [ ] Returns correct permission status
  - [ ] Returns 400 for missing permission parameter
  - [ ] Returns 401 without token

### General Requirements

- [ ] All error responses include descriptive error messages
- [ ] All successful responses include `success: true` field
- [ ] Auth middleware properly protects routes
- [ ] RBAC checks work correctly
- [ ] Rate limiting is enforced
- [ ] CORS headers are present in responses
- [ ] Tokens are properly validated
- [ ] Database operations are atomic
- [ ] Sensitive data (passwords) is never returned
- [ ] Logs are generated for important operations

---

## Additional Resources

### API Documentation
- Base URL: `http://localhost:3001/hcgi/api`
- All endpoints return JSON
- All POST/PUT requests require `Content-Type: application/json`

### Environment Variables
- See `.env` file for all configuration options
- Never commit `.env` to version control
- Use different values for development, staging, production

### Security Best Practices
1. Never expose tokens in logs or error messages
2. Always use HTTPS in production
3. Rotate secrets regularly
4. Use strong passwords (follow requirements)
5. Implement rate limiting
6. Validate all user input
7. Use RBAC for authorization
8. Log all authentication attempts

### Performance Tips
1. Cache user roles and permissions
2. Use pagination for large user lists
3. Implement request timeouts
4. Monitor API response times
5. Use connection pooling for database

---

## Support

For issues or questions:
1. Check Troubleshooting section
2. Review API logs
3. Verify environment configuration
4. Check database collections exist
5. Ensure all services are running
