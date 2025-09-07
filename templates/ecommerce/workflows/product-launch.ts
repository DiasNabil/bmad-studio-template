import { z } from 'zod';
import { PrismaClient } from '@prisma/client';

// Comprehensive Zod Validation Schemas
const ProductLaunchSchema = z.object({
  productName: z.string().min(3, 'Product name must be at least 3 characters'),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  price: z.number().positive('Price must be a positive number'),
  category: z.enum([
    'technology', 
    'fashion', 
    'food', 
    'art', 
    'crafts', 
    'services', 
    'digital-products'
  ]),
  culturalTags: z.array(z.string()).optional(),
  vendorId: z.string().min(1, 'Vendor ID is required'),
  targetMarkets: z.array(z.string()).min(1, 'At least one target market is required')
});

const PricingStrategySchema = z.object({
  basePrice: z.number().positive(),
  discountRates: z.record(z.string(), z.number().min(0).max(1)).optional(),
  regionalPricing: z.record(z.string(), z.number().positive()).optional()
});

// Type Definitions
type ProductLaunch = z.infer<typeof ProductLaunchSchema>;
type PricingStrategy = z.infer<typeof PricingStrategySchema>;

interface LaunchWorkflowResult {
  isSuccessful: boolean;
  productId?: string;
  culturalAdaptationScore: number;
  marketReadinessScore: number;
  recommendedActions: string[];
}

class ProductLaunchWorkflow {
  private readonly prisma: PrismaClient;
  private static readonly CULTURAL_KEYWORDS = [
    'community', 'heritage', 'empowerment', 
    'sustainable', 'inclusive', 'diaspora'
  ] as const;

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Comprehensive product launch validation
   * @param productData Product launch details
   * @returns Detailed launch workflow result
   */
  public async launchProduct(
    productData: ProductLaunch
  ): Promise<LaunchWorkflowResult> {
    try {
      // Validate product data
      const validatedProduct = ProductLaunchSchema.parse(productData);

      // Perform comprehensive checks
      const culturalScore = this.calculateCulturalRelevance(validatedProduct);
      const marketReadinessScore = this.assessMarketReadiness(validatedProduct);

      // Determine launch recommendation
      const recommendedActions: string[] = [];
      if (culturalScore < 0.7) {
        recommendedActions.push('Enhance cultural relevance');
      }
      if (marketReadinessScore < 0.6) {
        recommendedActions.push('Refine market targeting');
      }

      // Create product if scores are acceptable
      const isLaunchReady = culturalScore >= 0.7 && marketReadinessScore >= 0.6;
      
      let productId: string | undefined;
      if (isLaunchReady) {
        const createdProduct = await this.createProduct(validatedProduct);
        productId = createdProduct.id;
      }

      return {
        isSuccessful: isLaunchReady,
        productId,
        culturalAdaptationScore: culturalScore,
        marketReadinessScore,
        recommendedActions
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('Product validation failed:', error.errors);
        return {
          isSuccessful: false,
          culturalAdaptationScore: 0,
          marketReadinessScore: 0,
          recommendedActions: error.errors.map(err => err.message)
        };
      }
      throw error;
    }
  }

  /**
   * Calculate cultural relevance of the product
   * @param product Product details
   * @returns Cultural relevance score
   */
  private calculateCulturalRelevance(product: ProductLaunch): number {
    let score = 0;
    const description = product.description.toLowerCase();
    const name = product.productName.toLowerCase();

    // Cultural tags boost
    if (product.culturalTags && product.culturalTags.length > 0) {
      score += 0.3;
    }

    // Check description and name for cultural keywords
    ProductLaunchWorkflow.CULTURAL_KEYWORDS.forEach(keyword => {
      if (description.includes(keyword) || name.includes(keyword)) {
        score += 0.1;
      }
    });

    // Bonus for diaspora-specific categories
    const diasporaFriendlyCategories = [
      'art', 'crafts', 'food'
    ];
    if (diasporaFriendlyCategories.includes(product.category)) {
      score += 0.2;
    }

    return Math.min(score, 1);
  }

  /**
   * Assess market readiness for the product
   * @param product Product details
   * @returns Market readiness score
   */
  private assessMarketReadiness(product: ProductLaunch): number {
    let score = 0;

    // Multiple target markets boost
    score += Math.min(product.targetMarkets.length * 0.2, 0.4);

    // Price point assessment
    const priceRanges = {
      'technology': [50, 500],
      'fashion': [20, 200],
      'food': [10, 100],
      'art': [50, 500],
      'crafts': [20, 200],
      'services': [50, 500],
      'digital-products': [10, 100]
    };

    const [minPrice, maxPrice] = priceRanges[product.category];
    if (product.price >= minPrice && product.price <= maxPrice) {
      score += 0.3;
    }

    // Description quality
    if (product.description.length >= 50) {
      score += 0.3;
    }

    return Math.min(score, 1);
  }

  /**
   * Create product in the database
   * @param product Product details
   * @returns Created product
   */
  private async createProduct(product: ProductLaunch) {
    return this.prisma.product.create({
      data: {
        name: product.productName,
        description: product.description,
        price: product.price,
        vendorId: product.vendorId,
        status: 'ACTIVE',
        metadata: {
          category: product.category,
          culturalTags: product.culturalTags,
          targetMarkets: product.targetMarkets
        }
      }
    });
  }

  /**
   * Generate pricing strategy recommendations
   * @param product Product details
   * @returns Pricing strategy suggestions
   */
  public generatePricingStrategy(
    product: ProductLaunch
  ): PricingStrategy {
    const baseStrategy: PricingStrategy = {
      basePrice: product.price,
      discountRates: {
        'early-bird': 0.1,
        'diaspora-community': 0.15
      },
      regionalPricing: product.targetMarkets.reduce((acc, market) => {
        // Example regional price adjustments
        const priceAdjustments = {
          'africa': 0.9,
          'caribbean': 1.1,
          'europe': 1.2,
          'north-america': 1.3
        };
        
        acc[market] = product.price * (priceAdjustments[market] || 1);
        return acc;
      }, {} as Record<string, number>)
    };

    return baseStrategy;
  }

  /**
   * Cleanup resources
   */
  public async dispose(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

export default ProductLaunchWorkflow;