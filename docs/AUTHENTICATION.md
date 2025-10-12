# Authentication System Documentation

## Overview

The PM Puzzle application now has an enhanced authentication system with username/email support, bcrypt password hashing, and reusable authentication modules.

## Key Features

### 1. Enhanced Security
- **Bcrypt Password Hashing**: Passwords are hashed using bcrypt (10 salt rounds)
- **Session Management**: 24-hour sessions with automatic cleanup
- **Rate Limiting**: 5 attempts max, 15-minute lockout on failure
- **IP Verification**: Optional session IP checking for additional security

### 2. Email-Based Authentication
- Login now uses email and password (modern approach)
- Email address serves as the unique identifier
- Username stored for display purposes only

### 3. Multiple Endpoint Support
The system supports both legacy and new authentication endpoints:

#### New Endpoints (Recommended)
- `/api/auth/login` - User login
- `/api/auth/verify` - Token verification
- `/api/auth/logout` - User logout

#### Legacy Endpoint (Backward Compatible)
- `/api/admin-auth` - All-in-one endpoint with action parameter

### 4. Shared Session Store
- Centralized session management (`/api/auth/session-store.js`)
- Automatic expired session cleanup
- Session extension on activity

## Setup Instructions

### 1. Environment Variables

Set the following environment variables in Vercel or your deployment platform:

```bash
ADMIN_EMAIL=admin@pmpuzzle.com    # Email for login (required)
ADMIN_PASSWORD=$2b$10$...         # Bcrypt hashed password (required)
ADMIN_USERNAME=Admin               # Display name (optional)
```

### 2. Generate Password Hash

Use the provided script to generate a bcrypt hash:

```bash
node scripts/hash-password.js "YourSecurePassword123!"
```

This will output:
- The bcrypt hash to use as `ADMIN_PASSWORD`
- Complete environment variable configuration
- Verification that the hash is valid

### 3. Default Credentials

For initial setup/development, the system falls back to:
- Email: `admin@pmpuzzle.com`
- Password: `PMpuzzle2024!Admin`

**⚠️ WARNING**: Change these immediately in production!

## Usage

### 1. Admin Login Page

The admin login page (`/admin.html`) now includes:
- Email field (with autocomplete)
- Password field (with autocomplete)
- Enhanced error messaging
- Rate limit feedback

### 2. Reusable Auth Check Module

Include the auth check module in any protected page:

```html
<script src="/utils/auth-check.js"></script>
<script>
    window.addEventListener('DOMContentLoaded', async () => {
        try {
            const user = await authManager.checkAuth();
            console.log('Authenticated user:', user);
            // Proceed with protected content
        } catch (error) {
            // User will be redirected to login
        }
    });
</script>
```

### 3. Programmatic Authentication

Use the `AuthManager` class for custom authentication flows:

```javascript
// Login
const result = await authManager.login('admin@pmpuzzle.com', 'password');

// Check authentication
const user = await authManager.checkAuth();

// Logout
await authManager.logout();

// Start session monitoring
authManager.startSessionCheck(60000); // Check every minute
```

## Security Best Practices

1. **Always use HTTPS** in production
2. **Set strong passwords** and rotate regularly
3. **Use environment variables** for credentials
4. **Enable IP verification** for sensitive environments (`STRICT_IP_CHECK=true`)
5. **Monitor failed login attempts** in logs
6. **Implement audit logging** for admin actions

## Migration from Old System

The new system is fully backward compatible:

1. **Password-only login**: Still supported (username defaults to 'admin')
2. **Legacy endpoints**: Continue to work with existing code
3. **Session tokens**: Compatible format maintained

To migrate:
1. Set environment variables with bcrypt hashed password
2. Update login forms to include username field
3. Optionally migrate to new `/api/auth/*` endpoints
4. Use the reusable auth check module for new protected pages

## Troubleshooting

### Common Issues

1. **"Server configuration error"**
   - Ensure `ADMIN_PASSWORD` is set in environment variables
   - Check Vercel deployment logs

2. **"Too many failed attempts"**
   - Wait 15 minutes or restart the server (development)
   - Check IP-based rate limiting

3. **"Session invalid - IP mismatch"**
   - Disable strict IP checking: `STRICT_IP_CHECK=false`
   - Common with mobile networks or VPNs

### Debug Mode

Enable debug logging by checking the console for:
- Environment variable status
- Authentication attempts
- Session validation results

## API Reference

### POST /api/auth/login
```json
Request:
{
  "email": "admin@pmpuzzle.com",
  "password": "password"
}

Response:
{
  "success": true,
  "token": "...",
  "user": {
    "email": "admin@pmpuzzle.com",
    "username": "Admin"
  },
  "expiresIn": 86400
}
```

### POST /api/auth/verify
```json
Request:
{
  "token": "..."
}

Response:
{
  "success": true,
  "user": {
    "username": "admin",
    "email": "admin@pmpuzzle.com"
  },
  "expiresIn": 85000
}
```

### POST /api/auth/logout
```json
Request:
{
  "token": "..."
}

Response:
{
  "success": true,
  "message": "Logged out successfully"
}
```

## Future Enhancements

Potential improvements for consideration:

1. **Multi-factor Authentication (MFA)**
2. **Role-based Access Control (RBAC)**
3. **OAuth/SSO Integration**
4. **Password Reset Functionality**
5. **Session Management UI**
6. **Audit Log Persistence**
7. **Redis/Database Session Store**

## Support

For issues or questions:
- Check the console for debug information
- Review environment variable configuration
- Verify network connectivity to API endpoints