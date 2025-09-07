import { jest } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import ProductLaunchWorkflow from './product-launch';

// Mock Prisma Client
jest.mock('@prisma/client', () => {
  return {
    PrismaClient: jest.fn().mockImplementation(() => ({
      product: {
        create: jest.fn()
      }
    }))
  };
});

describe('ProductLaunchWorkflow', () => {
  let workflow: ProductLaunchWorkflow;
  let mockPrisma: jest.Mocked<PrismaClient>;

  beforeEach(() => {
    workflow = new ProductLaunchWorkflow();
    mockPrisma = jest.mocked(new PrismaClient());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('launchProduct', () => {
    const validProductData = {
      productName: 'Diaspora Artisan Crafts',
      description: 'Empowering local artisans through sustainable craftsmanship',
      price: 75,
      category: 'crafts',
      vendorId: 'vendor-123',
      targetMarkets: ['africa', 'caribbean'],
      culturalTags: ['sustainable', 'community-driven']
    };

    it('should successfully launch a compliant product', async () => {
      mockPrisma.product.create.mockResolvedValue({
        id: 'product-123',
        name: validProductData.productName,
        description: validProductData.description,
        price: validProductData.price,
        vendorId: validProductData.vendorId,
        status: 'ACTIVE'
      });

      const result = await workflow.launchProduct(validProductData);

      expect(result.isSuccessful).toBe(true);
      expect(result.productId).toBeDefined();
      expect(result.culturalAdaptationScore).toBeGreaterThan(0.7);
      expect(result.marketReadinessScore).toBeGreaterThan(0.6);
      expect(result.recommendedActions).toHaveLength(0);
    });

    it('should reject product with insufficient cultural relevance', async () => {
      const lowCulturalRelevanceProduct = {
        ...validProductData,
        description: 'Just another product',
        culturalTags: []
      };

      const result = await workflow.launchProduct(lowCulturalRelevanceProduct);

      expect(result.isSuccessful).toBe(false);
      expect(result.productId).toBeUndefined();
      expect(result.culturalAdaptationScore).toBeLessThan(0.7);
      expect(result.recommendedActions).toContain('Enhance cultural relevance');
    });

    it('should validate input and reject invalid product data', async () => {
      const invalidProductData = {
        productName: 'A',
        description: 'Too short',
        price: -10,
        category: 'invalid-category',
        vendorId: '',
        targetMarkets: []
      };

      const result = await workflow.launchProduct(
        invalidProductData as unknown as Parameters<typeof workflow.launchProduct>[0]
      );

      expect(result.isSuccessful).toBe(false);
      expect(result.recommendedActions.length).toBeGreaterThan(0);
    });
  });

  describe('generatePricingStrategy', () => {
    const productData = {
      productName: 'Cultural Heritage Product',
      description: 'Celebrating diaspora traditions and craftsmanship',
      price: 100,
      category: 'art',
      vendorId: 'vendor-456',
      targetMarkets: ['africa', 'caribbean', 'europe']
    };

    it('should generate appropriate pricing strategy', () => {
      const pricingStrategy = workflow.generatePricingStrategy(productData);

      expect(pricingStrategy.basePrice).toBe(productData.price);
      expect(pricingStrategy.discountRates).toBeDefined();
      expect(pricingStrategy.regionalPricing).toBeDefined();

      // Check regional pricing adjustments
      expect(pricingStrategy.regionalPricing?.['africa']).toBeLessThan(productData.price);
      expect(pricingStrategy.regionalPricing?.['europe']).toBeGreaterThan(productData.price);
    });

    it('should handle multiple target markets in pricing', () => {
      const pricingStrategy = workflow.generatePricingStrategy(productData);

      expect(Object.keys(pricingStrategy.regionalPricing || {})).toEqual(
        expect.arrayContaining(['africa', 'caribbean', 'europe'])
      );
    });
  });

  describe('Resource Management', () => {
    it('should dispose resources correctly', async () => {
      const disconnectMock = jest.fn();
      mockPrisma.$disconnect = disconnectMock;

      await workflow.dispose();

      expect(disconnectMock).toHaveBeenCalled();
    });
  });
});