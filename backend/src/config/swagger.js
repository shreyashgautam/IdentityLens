import swaggerUi from 'swagger-ui-express';

/**
 * OpenAPI 3.0.3 Specification for IdentityLens (IVIP Mini)
 * Conforms to docs/api-contract.md
 */
export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'IdentityLens (IVIP Mini) REST API',
    version: '0.1.0',
    description:
      'Identity Discovery & Risk Intelligence Platform API. Provides centralized identity inventory, application accounts, entitlement mappings, and deterministic risk detection.',
    contact: {
      name: 'IdentityLens Engineering'
    }
  },
  servers: [
    {
      url: 'http://localhost:5001',
      description: 'Local Development Server'
    }
  ],
  paths: {
    '/': {
      get: {
        summary: 'Root Informational Gateway',
        description: 'Returns server identity and links to documentation and health probes.',
        tags: ['System'],
        responses: {
          '200': {
            description: 'API Server Information',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', example: 'IVIP Mini API Server' },
                    health: { type: 'string', example: '/health' },
                    api_base: { type: 'string', example: '/api/v1' },
                    docs: { type: 'string', example: '/docs' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/health': {
      get: {
        summary: 'System Health & Metadata',
        description: 'Returns system operational status, server timestamp, service name, version, and uptime in seconds.',
        tags: ['System'],
        responses: {
          '200': {
            description: 'System health metadata',
            headers: {
              'X-Request-ID': {
                schema: { type: 'string', format: 'uuid' },
                description: 'Unique correlation ID for tracing'
              }
            },
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    timestamp: { type: 'string', format: 'date-time' },
                    service: { type: 'string', example: 'ivip-mini-backend' },
                    version: { type: 'string', example: '0.1.0' },
                    uptime_seconds: { type: 'integer', example: 120 }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/health/live': {
      get: {
        summary: 'Liveness Probe',
        description: 'Kubernetes/ECS container liveness check. Confirms the Node.js event loop and process are running.',
        tags: ['System'],
        responses: {
          '200': {
            description: 'Process is live and healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    timestamp: { type: 'string', format: 'date-time' },
                    checks: {
                      type: 'object',
                      properties: {
                        process: { type: 'string', example: 'up' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/health/ready': {
      get: {
        summary: 'Readiness Probe',
        description: 'Readiness check indicating whether the service is ready to receive network traffic.',
        tags: ['System'],
        responses: {
          '200': {
            description: 'Service is ready to handle requests',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    ready: { type: 'boolean', example: true },
                    timestamp: { type: 'string', format: 'date-time' },
                    checks: {
                      type: 'object',
                      properties: {
                        http: { type: 'string', example: 'ready' },
                        database: { type: 'string', example: 'pending_m3' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/v1': {
      get: {
        summary: 'API v1 Gateway Overview',
        description: 'Returns operational status and directory of registered resource routes.',
        tags: ['System'],
        responses: {
          '200': {
            description: 'List of registered API v1 resources',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    version: { type: 'string', example: 'v1' },
                    status: { type: 'string', example: 'operational' },
                    endpoints: {
                      type: 'array',
                      items: { type: 'string' },
                      example: ['/identities', '/applications', '/accounts', '/entitlements', '/risk-findings']
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/v1/identities': {
      get: {
        summary: 'List Canonical Identities',
        description: 'Retrieves a paginated list of canonical human and non-human identities with filtering, searching, and sorting.',
        tags: ['Identities'],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1, minimum: 1 }, description: 'One-based page number' },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, minimum: 1, maximum: 100 }, description: 'Records per page' },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['active', 'inactive', 'suspended', 'unknown'] } },
          { name: 'identity_type', in: 'query', schema: { type: 'string', enum: ['human', 'service_account', 'bot', 'ai_agent'] } },
          { name: 'department', in: 'query', schema: { type: 'string' } },
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Search across display name, email, title, and department' },
          { name: 'sort_by', in: 'query', schema: { type: 'string', enum: ['display_name', 'email', 'status', 'identity_type', 'department', 'created_at', 'updated_at'], default: 'created_at' } },
          { name: 'sort_order', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' } }
        ],
        responses: {
          '200': {
            description: 'Paginated list of identities',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/IdentityCollectionResponse' }
              }
            }
          },
          '422': {
            description: 'Validation Error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorEnvelope' }
              }
            }
          }
        }
      },
      post: {
        summary: 'Create Identity',
        description: 'Creates a new canonical identity record.',
        tags: ['Identities'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateIdentityInput' }
            }
          }
        },
        responses: {
          '201': {
            description: 'Identity created successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/IdentitySingleResponse' }
              }
            }
          },
          '422': {
            description: 'Validation Error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorEnvelope' }
              }
            }
          }
        }
      }
    },
    '/api/v1/identities/{identityId}': {
      get: {
        summary: 'Get Identity Details',
        description: 'Retrieves complete profile details for a canonical identity by UUID.',
        tags: ['Identities'],
        parameters: [
          { name: 'identityId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Target identity UUID' }
        ],
        responses: {
          '200': {
            description: 'Identity record details',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/IdentitySingleResponse' }
              }
            }
          },
          '404': {
            description: 'Identity not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorEnvelope' }
              }
            }
          },
          '422': {
            description: 'Validation Error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorEnvelope' }
              }
            }
          }
        }
      },
      patch: {
        summary: 'Update Identity',
        description: 'Partially updates an existing identity record. Enforces ownership hierarchy and cycle prevention.',
        tags: ['Identities'],
        parameters: [
          { name: 'identityId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Target identity UUID' }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  display_name: { type: 'string' },
                  identity_type: { type: 'string', enum: ['human', 'service_account', 'bot', 'ai_agent'] },
                  email: { type: 'string', format: 'email', nullable: true },
                  status: { type: 'string', enum: ['active', 'inactive', 'suspended', 'unknown'] },
                  owner_id: { type: 'string', format: 'uuid', nullable: true },
                  department: { type: 'string', nullable: true },
                  title: { type: 'string', nullable: true }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Updated identity record',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/IdentitySingleResponse' }
              }
            }
          },
          '400': {
            description: 'Bad Request - Empty body',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorEnvelope' }
              }
            }
          },
          '404': {
            description: 'Identity not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorEnvelope' }
              }
            }
          },
          '409': {
            description: 'Conflict - Ownership cycle detected',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorEnvelope' }
              }
            }
          },
          '422': {
            description: 'Validation Error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorEnvelope' }
              }
            }
          }
        }
      }
    },
    '/api/v1/applications': {
      get: {
        summary: 'List Applications',
        description: 'Lists connected SaaS platforms, cloud providers, and on-premises target systems with pagination, filtering, searching, and sorting.',
        tags: ['Applications'],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1, minimum: 1 }, description: 'One-based page number' },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, minimum: 1, maximum: 100 }, description: 'Records per page' },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['active', 'inactive', 'deprecated'] } },
          { name: 'auth_type', in: 'query', schema: { type: 'string' }, description: 'Authentication protocol (iam, oauth2, saml, sso, etc.)' },
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Search across application name, key, and description' },
          { name: 'sort_by', in: 'query', schema: { type: 'string', enum: ['name', 'key', 'status', 'auth_type', 'created_at', 'updated_at'], default: 'created_at' } },
          { name: 'sort_order', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' } }
        ],
        responses: {
          '200': {
            description: 'List of registered applications',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApplicationCollectionResponse' }
              }
            }
          },
          '422': {
            description: 'Validation Error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorEnvelope' }
              }
            }
          }
        }
      },
      post: {
        summary: 'Register Application',
        description: 'Registers a new target system application with unique key validation.',
        tags: ['Applications'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'key'],
                properties: {
                  name: { type: 'string', example: 'Salesforce Production' },
                  key: { type: 'string', example: 'salesforce_prod' },
                  description: { type: 'string', example: 'Corporate CRM system' },
                  status: { type: 'string', enum: ['active', 'inactive', 'deprecated'], default: 'active' },
                  auth_type: { type: 'string', example: 'saml', default: 'password' }
                }
              }
            }
          }
        },
        responses: {
          '201': {
            description: 'Application registered successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApplicationSingleResponse' }
              }
            }
          },
          '409': {
            description: 'Conflict - Application key already exists',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorEnvelope' }
              }
            }
          },
          '422': {
            description: 'Validation Error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorEnvelope' }
              }
            }
          }
        }
      }
    },
    '/api/v1/applications/{applicationId}': {
      get: {
        summary: 'Get Application Details',
        description: 'Retrieves complete configuration details for a target application by UUID.',
        tags: ['Applications'],
        parameters: [
          { name: 'applicationId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Target application UUID' }
        ],
        responses: {
          '200': {
            description: 'Application record details',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApplicationSingleResponse' }
              }
            }
          },
          '404': {
            description: 'Application not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorEnvelope' }
              }
            }
          },
          '422': {
            description: 'Validation Error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorEnvelope' }
              }
            }
          }
        }
      },
      patch: {
        summary: 'Update Application',
        description: 'Partially updates an existing target application record.',
        tags: ['Applications'],
        parameters: [
          { name: 'applicationId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Target application UUID' }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  key: { type: 'string' },
                  description: { type: 'string', nullable: true },
                  status: { type: 'string', enum: ['active', 'inactive', 'deprecated'] },
                  auth_type: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Updated application record',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApplicationSingleResponse' }
              }
            }
          },
          '400': {
            description: 'Bad Request - Empty body',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorEnvelope' }
              }
            }
          },
          '404': {
            description: 'Application not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorEnvelope' }
              }
            }
          },
          '409': {
            description: 'Conflict - Application key already taken',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorEnvelope' }
              }
            }
          },
          '422': {
            description: 'Validation Error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorEnvelope' }
              }
            }
          }
        }
      }
    },
    '/api/v1/accounts': {
      get: {
        summary: 'List Application Accounts',
        description: 'Retrieves all user and service accounts across connected target applications with pagination, filtering, search, and sorting.',
        tags: ['Accounts'],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1, minimum: 1 }, description: 'One-based page number' },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, minimum: 1, maximum: 100 }, description: 'Records per page' },
          { name: 'application_id', in: 'query', schema: { type: 'string', format: 'uuid' }, description: 'Filter by target application UUID' },
          { name: 'identity_id', in: 'query', schema: { type: 'string', format: 'uuid' }, description: 'Filter by owner identity UUID' },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['active', 'disabled', 'suspended', 'unknown'] } },
          { name: 'is_orphan', in: 'query', schema: { type: 'boolean' }, description: 'Filter for orphan accounts (identity_id is null)' },
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Search across external_id, account_name, and email' },
          { name: 'sort_by', in: 'query', schema: { type: 'string', enum: ['external_id', 'account_name', 'email', 'status', 'source', 'last_login_at', 'created_at', 'updated_at'], default: 'created_at' } },
          { name: 'sort_order', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' } }
        ],
        responses: {
          '200': {
            description: 'Paginated list of accounts',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AccountCollectionResponse' }
              }
            }
          },
          '422': {
            description: 'Validation Error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorEnvelope' }
              }
            }
          }
        }
      },
      post: {
        summary: 'Create Application Account',
        description: 'Registers a new target system account associated with an application.',
        tags: ['Accounts'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['application_id', 'external_id'],
                properties: {
                  application_id: { type: 'string', format: 'uuid' },
                  external_id: { type: 'string', example: 'usr-aws-developer' },
                  identity_id: { type: 'string', format: 'uuid', nullable: true },
                  account_name: { type: 'string', example: 'dev-ops-account' },
                  email: { type: 'string', format: 'email', example: 'dev@example.com' },
                  status: { type: 'string', enum: ['active', 'disabled', 'suspended', 'unknown'], default: 'active' },
                  source: { type: 'string', example: 'direct', default: 'direct' },
                  last_login_at: { type: 'string', format: 'date-time', nullable: true }
                }
              }
            }
          }
        },
        responses: {
          '201': {
            description: 'Account created successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AccountSingleResponse' }
              }
            }
          },
          '409': {
            description: 'Conflict - Duplicate external_id in this application',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorEnvelope' }
              }
            }
          },
          '422': {
            description: 'Validation Error - Missing required fields or invalid foreign key',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorEnvelope' }
              }
            }
          }
        }
      }
    },
    '/api/v1/accounts/{accountId}': {
      get: {
        summary: 'Get Account Details',
        description: 'Retrieves complete profile and configuration details for an account by UUID.',
        tags: ['Accounts'],
        parameters: [
          { name: 'accountId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Target account UUID' }
        ],
        responses: {
          '200': {
            description: 'Account record details',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AccountSingleResponse' }
              }
            }
          },
          '404': {
            description: 'Account not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorEnvelope' }
              }
            }
          },
          '422': {
            description: 'Validation Error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorEnvelope' }
              }
            }
          }
        }
      },
      patch: {
        summary: 'Update Account',
        description: 'Partially updates an existing account (including linking or unlinking canonical identity).',
        tags: ['Accounts'],
        parameters: [
          { name: 'accountId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Target account UUID' }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  external_id: { type: 'string' },
                  identity_id: { type: 'string', format: 'uuid', nullable: true },
                  account_name: { type: 'string', nullable: true },
                  email: { type: 'string', format: 'email', nullable: true },
                  status: { type: 'string', enum: ['active', 'disabled', 'suspended', 'unknown'] },
                  source: { type: 'string' },
                  last_login_at: { type: 'string', format: 'date-time', nullable: true }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Updated account record',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AccountSingleResponse' }
              }
            }
          },
          '400': {
            description: 'Bad Request - Empty body',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorEnvelope' }
              }
            }
          },
          '404': {
            description: 'Account not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorEnvelope' }
              }
            }
          },
          '409': {
            description: 'Conflict - Duplicate external_id in application',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorEnvelope' }
              }
            }
          },
          '422': {
            description: 'Validation Error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorEnvelope' }
              }
            }
          }
        }
      }
    },
    '/api/v1/identities/{identityId}/accounts': {
      get: {
        summary: 'List Accounts for Identity',
        description: 'Retrieves all application accounts linked to a canonical identity.',
        tags: ['Identities', 'Accounts'],
        parameters: [
          { name: 'identityId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Target identity UUID' },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1, minimum: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, minimum: 1, maximum: 100 } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['active', 'disabled', 'suspended', 'unknown'] } },
          { name: 'sort_by', in: 'query', schema: { type: 'string', enum: ['external_id', 'account_name', 'email', 'status', 'created_at'], default: 'created_at' } },
          { name: 'sort_order', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' } }
        ],
        responses: {
          '200': {
            description: 'List of accounts linked to the identity',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AccountCollectionResponse' }
              }
            }
          },
          '404': {
            description: 'Identity not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorEnvelope' }
              }
            }
          },
          '422': {
            description: 'Validation Error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorEnvelope' }
              }
            }
          }
        }
      }
    },
    '/api/v1/applications/{applicationId}/accounts': {
      get: {
        summary: 'List Accounts for Application',
        description: 'Retrieves all accounts provisioned within a target application.',
        tags: ['Applications', 'Accounts'],
        parameters: [
          { name: 'applicationId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Target application UUID' },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1, minimum: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, minimum: 1, maximum: 100 } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['active', 'disabled', 'suspended', 'unknown'] } },
          { name: 'is_orphan', in: 'query', schema: { type: 'boolean' } },
          { name: 'sort_by', in: 'query', schema: { type: 'string', enum: ['external_id', 'account_name', 'email', 'status', 'created_at'], default: 'created_at' } },
          { name: 'sort_order', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' } }
        ],
        responses: {
          '200': {
            description: 'List of accounts provisioned in the application',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AccountCollectionResponse' }
              }
            }
          },
          '404': {
            description: 'Application not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorEnvelope' }
              }
            }
          },
          '422': {
            description: 'Validation Error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorEnvelope' }
              }
            }
          }
        }
      }
    },
    '/api/v1/entitlements': {
      get: {
        summary: 'List Entitlements',
        description: 'Retrieves cataloged roles, groups, permissions, and licenses with pagination, filtering, search, and sorting.',
        tags: ['Entitlements'],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1, minimum: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, minimum: 1, maximum: 100 } },
          { name: 'application_id', in: 'query', schema: { type: 'string', format: 'uuid' }, description: 'Filter by target application' },
          { name: 'type', in: 'query', schema: { type: 'string', enum: ['role', 'group', 'permission', 'license'] } },
          { name: 'is_privileged', in: 'query', schema: { type: 'boolean' } },
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Case-insensitive search matching name or description' },
          { name: 'sort_by', in: 'query', schema: { type: 'string', enum: ['name', 'type', 'created_at', 'updated_at'], default: 'name' } },
          { name: 'sort_order', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'], default: 'asc' } }
        ],
        responses: {
          '200': {
            description: 'List of entitlement definitions',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/EntitlementCollectionResponse' }
              }
            }
          },
          '422': {
            description: 'Validation Error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorEnvelope' }
              }
            }
          }
        }
      },
      post: {
        summary: 'Create Entitlement Definition',
        description: 'Creates a new entitlement definition within an application.',
        tags: ['Entitlements'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateEntitlementInput' }
            }
          }
        },
        responses: {
          '201': {
            description: 'Entitlement definition created successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/EntitlementSingleResponse' }
              }
            }
          },
          '409': {
            description: 'Conflict - Duplicate entitlement name in the same application',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorEnvelope' }
              }
            }
          },
          '422': {
            description: 'Validation Error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorEnvelope' }
              }
            }
          }
        }
      }
    },
    '/api/v1/entitlements/{entitlementId}': {
      get: {
        summary: 'Retrieve Entitlement Definition by ID',
        description: 'Retrieves single entitlement metadata by UUID.',
        tags: ['Entitlements'],
        parameters: [
          { name: 'entitlementId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        ],
        responses: {
          '200': {
            description: 'Entitlement details',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/EntitlementSingleResponse' }
              }
            }
          },
          '404': {
            description: 'Entitlement not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorEnvelope' }
              }
            }
          },
          '422': {
            description: 'Validation Error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorEnvelope' }
              }
            }
          }
        }
      },
      patch: {
        summary: 'Partially Update Entitlement Definition',
        description: 'Updates permitted entitlement definition fields and refreshes updated_at timestamp.',
        tags: ['Entitlements'],
        parameters: [
          { name: 'entitlementId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateEntitlementInput' }
            }
          }
        },
        responses: {
          '200': {
            description: 'Entitlement updated successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/EntitlementSingleResponse' }
              }
            }
          },
          '400': {
            description: 'Bad Request - Empty update payload',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorEnvelope' }
              }
            }
          },
          '404': {
            description: 'Entitlement not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorEnvelope' }
              }
            }
          },
          '409': {
            description: 'Conflict - Duplicate entitlement name in the same application',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorEnvelope' }
              }
            }
          },
          '422': {
            description: 'Validation Error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorEnvelope' }
              }
            }
          }
        }
      }
    },
    '/api/v1/accounts/{accountId}/entitlements': {
      get: {
        summary: 'List Entitlements Assigned to Account',
        description: 'Retrieves all entitlements currently assigned to a target account.',
        tags: ['Accounts', 'Entitlements'],
        parameters: [
          { name: 'accountId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1, minimum: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, minimum: 1, maximum: 100 } },
          { name: 'type', in: 'query', schema: { type: 'string', enum: ['role', 'group', 'permission', 'license'] } },
          { name: 'is_privileged', in: 'query', schema: { type: 'boolean' } },
          { name: 'sort_by', in: 'query', schema: { type: 'string', enum: ['name', 'type', 'assigned_at'], default: 'assigned_at' } },
          { name: 'sort_order', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' } }
        ],
        responses: {
          '200': {
            description: 'List of account entitlements',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AccountEntitlementsListResponse' }
              }
            }
          },
          '404': {
            description: 'Account not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorEnvelope' }
              }
            }
          },
          '422': {
            description: 'Validation Error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorEnvelope' }
              }
            }
          }
        }
      },
      post: {
        summary: 'Assign Entitlement to Account',
        description: 'Assigns an entitlement to an account within an ACID transaction with row-level locks and application boundary enforcement.',
        tags: ['Accounts', 'Entitlements'],
        parameters: [
          { name: 'accountId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AssignEntitlementInput' }
            }
          }
        },
        responses: {
          '201': {
            description: 'Entitlement assigned successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AccountEntitlementAssignmentResponse' }
              }
            }
          },
          '404': {
            description: 'Account not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorEnvelope' }
              }
            }
          },
          '409': {
            description: 'Conflict - Entitlement already assigned to this account',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorEnvelope' }
              }
            }
          },
          '422': {
            description: 'Validation Error - Invalid payload, entitlement not found, or cross-application mismatch',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorEnvelope' }
              }
            }
          }
        }
      }
    },
    '/api/v1/accounts/{accountId}/entitlements/{entitlementId}': {
      delete: {
        summary: 'Remove Entitlement Assignment from Account',
        description: 'Removes the assignment relationship between an account and entitlement. Does not delete definitions.',
        tags: ['Accounts', 'Entitlements'],
        parameters: [
          { name: 'accountId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'entitlementId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        ],
        responses: {
          '204': {
            description: 'Entitlement unassigned successfully (No Content)'
          },
          '404': {
            description: 'Assignment relationship not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorEnvelope' }
              }
            }
          },
          '422': {
            description: 'Validation Error - Malformed UUID parameter',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorEnvelope' }
              }
            }
          }
        }
      }
    },
    '/api/v1/risk-findings': {
      get: {
        summary: 'List Risk Findings',
        description: 'Retrieves deterministic identity security risk findings (orphaned accounts, inactive users, privilege excess).',
        tags: ['Risk Intelligence'],
        parameters: [
          { name: 'severity', in: 'query', schema: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['open', 'resolved', 'suppressed'] } }
        ],
        responses: {
          '200': {
            description: 'List of risk findings'
          }
        }
      }
    }
  },
  components: {
    schemas: {
      IdentityCollectionResponse: {
        type: 'object',
        properties: {
          data: {
            type: 'array',
            items: { $ref: '#/components/schemas/IdentityItem' }
          },
          pagination: {
            type: 'object',
            properties: {
              page: { type: 'integer', example: 1 },
              limit: { type: 'integer', example: 20 },
              total: { type: 'integer', example: 105 },
              total_pages: { type: 'integer', example: 6 }
            }
          },
          meta: {
            type: 'object',
            properties: {
              request_id: { type: 'string', format: 'uuid' }
            }
          }
        }
      },
      IdentitySingleResponse: {
        type: 'object',
        properties: {
          data: { $ref: '#/components/schemas/IdentityItem' },
          meta: {
            type: 'object',
            properties: {
              request_id: { type: 'string', format: 'uuid' }
            }
          }
        }
      },
      IdentityItem: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', example: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d' },
          first_name: { type: 'string', example: 'Alex' },
          last_name: { type: 'string', example: 'Morgan' },
          email: { type: 'string', format: 'email', example: 'alex.morgan@example.com' },
          status: { type: 'string', example: 'active' },
          type: { type: 'string', example: 'human' },
          department: { type: 'string', example: 'Engineering' },
          created_at: { type: 'string', format: 'date-time' }
        }
      },
      CreateIdentityInput: {
        type: 'object',
        required: ['first_name', 'last_name', 'email'],
        properties: {
          first_name: { type: 'string', example: 'Alex' },
          last_name: { type: 'string', example: 'Morgan' },
          email: { type: 'string', format: 'email', example: 'alex.morgan@example.com' },
          status: { type: 'string', enum: ['active', 'inactive', 'suspended'], default: 'active' },
          type: { type: 'string', enum: ['human', 'service_account', 'bot'], default: 'human' },
          department: { type: 'string', example: 'Engineering' }
        }
      },
      ApplicationSingleResponse: {
        type: 'object',
        properties: {
          data: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              name: { type: 'string' },
              key: { type: 'string' },
              description: { type: 'string', nullable: true },
              status: { type: 'string', enum: ['active', 'inactive', 'deprecated'] },
              auth_type: { type: 'string' },
              created_at: { type: 'string', format: 'date-time' },
              updated_at: { type: 'string', format: 'date-time' }
            }
          },
          meta: {
            type: 'object',
            properties: {
              request_id: { type: 'string', format: 'uuid' }
            }
          }
        }
      },
      ApplicationCollectionResponse: {
        type: 'object',
        properties: {
          data: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                name: { type: 'string' },
                key: { type: 'string' },
                description: { type: 'string', nullable: true },
                status: { type: 'string', enum: ['active', 'inactive', 'deprecated'] },
                auth_type: { type: 'string' },
                created_at: { type: 'string', format: 'date-time' },
                updated_at: { type: 'string', format: 'date-time' }
              }
            }
          },
          pagination: {
            type: 'object',
            properties: {
              page: { type: 'integer' },
              limit: { type: 'integer' },
              total: { type: 'integer' },
              total_pages: { type: 'integer' },
              has_next: { type: 'boolean' },
              has_prev: { type: 'boolean' }
            }
          },
          meta: {
            type: 'object',
            properties: {
              request_id: { type: 'string', format: 'uuid' }
            }
          }
        }
      },
      AccountSingleResponse: {
        type: 'object',
        properties: {
          data: { $ref: '#/components/schemas/AccountItem' },
          meta: {
            type: 'object',
            properties: {
              request_id: { type: 'string', format: 'uuid' }
            }
          }
        }
      },
      AccountCollectionResponse: {
        type: 'object',
        properties: {
          data: {
            type: 'array',
            items: { $ref: '#/components/schemas/AccountItem' }
          },
          pagination: {
            type: 'object',
            properties: {
              page: { type: 'integer' },
              limit: { type: 'integer' },
              total: { type: 'integer' },
              total_pages: { type: 'integer' },
              has_next: { type: 'boolean' },
              has_prev: { type: 'boolean' }
            }
          },
          meta: {
            type: 'object',
            properties: {
              request_id: { type: 'string', format: 'uuid' }
            }
          }
        }
      },
      AccountItem: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          application_id: { type: 'string', format: 'uuid' },
          identity_id: { type: 'string', format: 'uuid', nullable: true },
          external_id: { type: 'string' },
          account_name: { type: 'string', nullable: true },
          email: { type: 'string', format: 'email', nullable: true },
          status: { type: 'string', enum: ['active', 'disabled', 'suspended', 'unknown'] },
          source: { type: 'string' },
          last_login_at: { type: 'string', format: 'date-time', nullable: true },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' }
        }
      },
      EntitlementItem: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          application_id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          type: { type: 'string', enum: ['role', 'group', 'permission', 'license'] },
          description: { type: 'string', nullable: true },
          is_privileged: { type: 'boolean' },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' }
        }
      },
      EntitlementSingleResponse: {
        type: 'object',
        properties: {
          data: { $ref: '#/components/schemas/EntitlementItem' },
          meta: {
            type: 'object',
            properties: {
              request_id: { type: 'string', format: 'uuid' }
            }
          }
        }
      },
      EntitlementCollectionResponse: {
        type: 'object',
        properties: {
          data: {
            type: 'array',
            items: { $ref: '#/components/schemas/EntitlementItem' }
          },
          pagination: {
            type: 'object',
            properties: {
              page: { type: 'integer' },
              limit: { type: 'integer' },
              total: { type: 'integer' },
              total_pages: { type: 'integer' },
              has_next: { type: 'boolean' },
              has_prev: { type: 'boolean' }
            }
          },
          meta: {
            type: 'object',
            properties: {
              request_id: { type: 'string', format: 'uuid' }
            }
          }
        }
      },
      CreateEntitlementInput: {
        type: 'object',
        required: ['application_id', 'name', 'type'],
        properties: {
          application_id: { type: 'string', format: 'uuid' },
          name: { type: 'string', maxLength: 255 },
          type: { type: 'string', enum: ['role', 'group', 'permission', 'license'] },
          description: { type: 'string', nullable: true },
          is_privileged: { type: 'boolean', default: false }
        }
      },
      UpdateEntitlementInput: {
        type: 'object',
        properties: {
          name: { type: 'string', maxLength: 255 },
          type: { type: 'string', enum: ['role', 'group', 'permission', 'license'] },
          description: { type: 'string', nullable: true },
          is_privileged: { type: 'boolean' }
        }
      },
      AccountAssignedEntitlementItem: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          application_id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          type: { type: 'string', enum: ['role', 'group', 'permission', 'license'] },
          description: { type: 'string', nullable: true },
          is_privileged: { type: 'boolean' },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
          assigned_at: { type: 'string', format: 'date-time' }
        }
      },
      AccountEntitlementsListResponse: {
        type: 'object',
        properties: {
          data: {
            type: 'array',
            items: { $ref: '#/components/schemas/AccountAssignedEntitlementItem' }
          },
          pagination: {
            type: 'object',
            properties: {
              page: { type: 'integer' },
              limit: { type: 'integer' },
              total: { type: 'integer' },
              total_pages: { type: 'integer' },
              has_next: { type: 'boolean' },
              has_prev: { type: 'boolean' }
            }
          },
          meta: {
            type: 'object',
            properties: {
              request_id: { type: 'string', format: 'uuid' }
            }
          }
        }
      },
      AssignEntitlementInput: {
        type: 'object',
        required: ['entitlement_id'],
        properties: {
          entitlement_id: { type: 'string', format: 'uuid' }
        }
      },
      AccountEntitlementAssignmentItem: {
        type: 'object',
        properties: {
          account_id: { type: 'string', format: 'uuid' },
          entitlement_id: { type: 'string', format: 'uuid' },
          assigned_at: { type: 'string', format: 'date-time' }
        }
      },
      AccountEntitlementAssignmentResponse: {
        type: 'object',
        properties: {
          data: { $ref: '#/components/schemas/AccountEntitlementAssignmentItem' },
          meta: {
            type: 'object',
            properties: {
              request_id: { type: 'string', format: 'uuid' }
            }
          }
        }
      },
      ErrorEnvelope: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'VALIDATION_ERROR' },
              message: { type: 'string', example: 'The request contains invalid fields.' },
              request_id: { type: 'string', format: 'uuid' },
              details: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    field: { type: 'string', example: 'email' },
                    message: { type: 'string', example: 'Invalid email address' }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
};

export const swaggerOptions = {
  customSiteTitle: 'IdentityLens API Documentation',
  customCss: '.swagger-ui .topbar { display: none }',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true
  }
};
