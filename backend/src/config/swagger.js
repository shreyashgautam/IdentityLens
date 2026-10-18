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
        description: 'Retrieves a paginated list of canonical human and non-human identities.',
        tags: ['Identities'],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['active', 'inactive', 'suspended'] } },
          { name: 'type', in: 'query', schema: { type: 'string', enum: ['human', 'service_account', 'bot'] } }
        ],
        responses: {
          '200': {
            description: 'Paginated list of identities',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/IdentityCollectionResponse' }
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
    '/api/v1/identities/{id}': {
      get: {
        summary: 'Get Identity Details',
        description: 'Retrieves complete profile details for a canonical identity by UUID.',
        tags: ['Identities'],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
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
          }
        }
      },
      patch: {
        summary: 'Update Identity',
        description: 'Partially updates an existing identity record.',
        tags: ['Identities'],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string', enum: ['active', 'inactive', 'suspended'] },
                  department: { type: 'string' },
                  title: { type: 'string' }
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
          }
        }
      }
    },
    '/api/v1/applications': {
      get: {
        summary: 'List Applications',
        description: 'Lists connected SaaS platforms, cloud providers, and on-premises target systems.',
        tags: ['Applications'],
        responses: {
          '200': {
            description: 'List of registered applications',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApplicationCollectionResponse' }
              }
            }
          }
        }
      },
      post: {
        summary: 'Register Application',
        description: 'Registers a new target system application.',
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
                  description: { type: 'string', example: 'Corporate CRM system' }
                }
              }
            }
          }
        },
        responses: {
          '201': {
            description: 'Application registered successfully'
          }
        }
      }
    },
    '/api/v1/accounts': {
      get: {
        summary: 'List Application Accounts',
        description: 'Retrieves all user and service accounts across connected target applications.',
        tags: ['Accounts'],
        parameters: [
          { name: 'identity_id', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'application_id', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['active', 'disabled', 'orphaned'] } }
        ],
        responses: {
          '200': {
            description: 'List of accounts',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AccountCollectionResponse' }
              }
            }
          }
        }
      }
    },
    '/api/v1/entitlements': {
      get: {
        summary: 'List Entitlements',
        description: 'Retrieves all cataloged roles, groups, and permissions.',
        tags: ['Entitlements'],
        parameters: [
          { name: 'application_id', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'is_privileged', in: 'query', schema: { type: 'boolean' } }
        ],
        responses: {
          '200': {
            description: 'List of entitlements'
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
                description: { type: 'string' }
              }
            }
          }
        }
      },
      AccountCollectionResponse: {
        type: 'object',
        properties: {
          data: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                external_id: { type: 'string' },
                account_name: { type: 'string' },
                status: { type: 'string' },
                identity_id: { type: 'string', format: 'uuid', nullable: true },
                application_id: { type: 'string', format: 'uuid' }
              }
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
