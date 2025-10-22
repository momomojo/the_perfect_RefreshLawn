/**
 * Mock Stripe SDK for testing
 * Provides test doubles for Stripe functionality without hitting live API
 */

export const mockStripeClient = {
  paymentIntents: {
    create: jest.fn(async (params) => ({
      id: `pi_test_${Date.now()}`,
      object: 'payment_intent',
      amount: params.amount,
      currency: params.currency,
      status: 'requires_payment_method',
      client_secret: `pi_test_${Date.now()}_secret_test123`,
      metadata: params.metadata || {},
      created: Math.floor(Date.now() / 1000),
    })),
    retrieve: jest.fn(async (id) => ({
      id,
      object: 'payment_intent',
      amount: 1000,
      currency: 'usd',
      status: 'succeeded',
      client_secret: `${id}_secret_test123`,
      metadata: {},
      created: Math.floor(Date.now() / 1000),
    })),
    confirm: jest.fn(async (id) => ({
      id,
      object: 'payment_intent',
      amount: 1000,
      currency: 'usd',
      status: 'succeeded',
      metadata: {},
      created: Math.floor(Date.now() / 1000),
    })),
  },
  customers: {
    create: jest.fn(async (params) => ({
      id: `cus_test_${Date.now()}`,
      object: 'customer',
      email: params.email,
      name: params.name,
      metadata: params.metadata || {},
      created: Math.floor(Date.now() / 1000),
    })),
    retrieve: jest.fn(async (id) => ({
      id,
      object: 'customer',
      email: 'test@example.com',
      name: 'Test User',
      metadata: {},
      created: Math.floor(Date.now() / 1000),
    })),
  },
  ephemeralKeys: {
    create: jest.fn(async (params) => ({
      id: `ephkey_test_${Date.now()}`,
      object: 'ephemeral_key',
      associated_objects: [
        {
          type: 'customer',
          id: params.customer,
        },
      ],
      created: Math.floor(Date.now() / 1000),
      expires: Math.floor(Date.now() / 1000) + 3600,
      secret: `ek_test_secret_${Date.now()}`,
    })),
  },
  webhooks: {
    generateTestHeaderString: jest.fn(({ secret, payload }) => {
      // Mock Stripe signature generation
      return `t=${Date.now()},v1=mockedsignature`;
    }),
    constructEvent: jest.fn((payload, signature, secret) => {
      // Return the parsed event
      return JSON.parse(payload);
    }),
  },
};

// Mock the Stripe constructor
export const MockStripe = jest.fn(() => mockStripeClient);

export default MockStripe;
