export const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'VaultVerse REST API',
    version: '1.0.0',
    description:
      'AI-Powered Secure Personal Data Management and Privacy Protection System — MERN Stack API Specification',
    contact: {
      name: 'VaultVerse Security Team',
    },
  },
  servers: [
    {
      url: 'http://localhost:5000',
      description: 'Local Development Server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
  paths: {
    '/api/auth/register': {
      post: {
        summary: 'Register a new user account',
        tags: ['Authentication'],
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password'],
                properties: {
                  name: { type: 'string', example: 'Alex Mercer' },
                  email: { type: 'string', format: 'email', example: 'alex@example.com' },
                  password: { type: 'string', minLength: 8, example: 'SuperSecurePass123!' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'User successfully created with JWT token' },
          400: { description: 'Validation error or weak password' },
          409: { description: 'Email already registered' },
        },
      },
    },
    '/api/auth/login': {
      post: {
        summary: 'Authenticate user and obtain JWT token',
        tags: ['Authentication'],
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email', example: 'alex@example.com' },
                  password: { type: 'string', example: 'SuperSecurePass123!' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Authentication successful' },
          401: { description: 'Invalid credentials' },
          403: { description: 'Account locked due to failed attempts' },
        },
      },
    },
    '/api/auth/logout': {
      post: {
        summary: 'Log out current session and record audit event',
        tags: ['Authentication'],
        responses: {
          200: { description: 'Successfully logged out' },
        },
      },
    },
    '/api/auth/me': {
      get: {
        summary: 'Get current authenticated user profile',
        tags: ['Authentication'],
        responses: {
          200: { description: 'User profile retrieved' },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/api/documents': {
      get: {
        summary: 'List user documents with optional filtering and pagination',
        tags: ['Documents'],
        parameters: [
          { name: 'category', in: 'query', schema: { type: 'string' } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
        ],
        responses: {
          200: { description: 'List of documents retrieved' },
        },
      },
    },
    '/api/documents/upload': {
      post: {
        summary: 'Upload and encrypt document using AES-256-GCM',
        tags: ['Documents'],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['file'],
                properties: {
                  file: { type: 'string', format: 'binary' },
                  title: { type: 'string' },
                  category: { type: 'string' },
                  tags: { type: 'string' },
                  notes: { type: 'string' },
                  retentionDays: { type: 'integer' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Document encrypted and stored' },
          400: { description: 'Missing file or bad input' },
          413: { description: 'File size exceeds limit' },
        },
      },
    },
    '/api/documents/{id}/download': {
      get: {
        summary: 'Download and decrypt AES-256-GCM document',
        tags: ['Documents'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Decrypted file binary stream' },
          403: { description: 'Unauthorized access' },
          404: { description: 'Document not found' },
        },
      },
    },
    '/api/documents/{id}': {
      delete: {
        summary: 'Soft-delete document and reclaim storage quota',
        tags: ['Documents'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Document deleted' },
          404: { description: 'Document not found' },
        },
      },
    },
    '/api/share': {
      post: {
        summary: 'Create time-limited, view-limited, scoped share link',
        tags: ['Sharing'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['documentId'],
                properties: {
                  documentId: { type: 'string' },
                  recipientEmail: { type: 'string' },
                  permission: { type: 'string', enum: ['VIEW', 'DOWNLOAD'] },
                  maxViews: { type: 'integer' },
                  expiresInHours: { type: 'integer' },
                  passphrase: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Share link created' },
        },
      },
    },
    '/api/share/access/{token}': {
      get: {
        summary: 'Public access to shared document metadata',
        tags: ['Sharing'],
        security: [],
        parameters: [
          { name: 'token', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'passphrase', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Document metadata returned' },
          401: { description: 'Passphrase required' },
          410: { description: 'Share link expired or view limit exceeded' },
        },
      },
    },
    '/api/emergency/profile': {
      get: {
        summary: 'Get emergency medical and disaster profile',
        tags: ['Emergency'],
        responses: {
          200: { description: 'Emergency profile retrieved' },
        },
      },
      put: {
        summary: 'Update emergency profile',
        tags: ['Emergency'],
        responses: {
          200: { description: 'Emergency profile updated' },
        },
      },
    },
    '/api/trusted-contacts': {
      get: {
        summary: 'List trusted contacts',
        tags: ['Trusted Contacts'],
        responses: {
          200: { description: 'List of trusted contacts' },
        },
      },
      post: {
        summary: 'Add a new trusted contact',
        tags: ['Trusted Contacts'],
        responses: {
          201: { description: 'Trusted contact added' },
        },
      },
    },
    '/api/privacy/overview': {
      get: {
        summary: 'Get aggregated privacy health posture & score',
        tags: ['Privacy Engine'],
        responses: {
          200: { description: 'Privacy overview score and remediation actions' },
        },
      },
    },
    '/api/audit': {
      get: {
        summary: 'Get tamper-evident audit log records',
        tags: ['Audit Logs'],
        responses: {
          200: { description: 'List of forensic audit records' },
        },
      },
    },
    '/api/audit/verify': {
      get: {
        summary: 'Cryptographically verify entire SHA-256 audit log hash chain',
        tags: ['Audit Logs'],
        responses: {
          200: { description: 'Integrity verification result' },
        },
      },
    },
  },
};

