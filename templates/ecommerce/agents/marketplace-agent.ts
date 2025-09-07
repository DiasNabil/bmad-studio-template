import { PrismaClient, User, Prisma } from '@prisma/client';
import { z } from 'zod';

// Zod schemas for type validation and runtime checking
const ProductSchema = z.object({
  name: z.string().min(3, 'Product name must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  price: z.number().positive('Price must be a positive number'),
  culturalTags: z.array(z.string()).optional()
});

const VendorSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  culturalBackground: z.string().optional()
});

// Type definitions with strict typing
type Product = z.infer<typeof ProductSchema>;
type Vendor = z.infer<typeof VendorSchema>;

interface MarketplaceConfig {
  readonly culturalAdaptation: boolean;
  readonly multiMarketSupport: boolean;
  readonly paymentGateways: ReadonlyArray<string>;
}

interface ProductValidationResult {
  isValid: boolean;
  culturalScore: number;
  recommendedAdaptations: ReadonlyArray<string>;
}

class MarketplaceAgent {
  private readonly prisma: PrismaClient;
  private readonly config: MarketplaceConfig;
  private static readonly CULTURAL_KEYWORDS = [
    'diaspora', 'community', 'heritage', 'tradition', 
    'empowerment', 'connection', 'roots'
  ] as const;

  constructor(config?: Partial<MarketplaceConfig>) {
    this.prisma = new PrismaClient();
    this.config = {
      culturalAdaptation: true,
      multiMarketSupport: true,
      paymentGateways: ['stripe', 'paypal', 'local-diaspora-payment'],
      ...config
    };
  }

  /**
   * Validate product for cultural appropriateness and market fit
   * @param productData Product details to validate
   * @returns Validation result with cultural insights
   */
  public async validateProductLaunch(
    productData: Product
  ): Promise<ProductValidationResult> {
    try {
      // Validate input using Zod
      const product = ProductSchema.parse(productData);
      
      // Cultural adaptation scoring
      const culturalScore = this.calculateCulturalRelevance(product);
      const recommendedAdaptations: string[] = [];

      if (culturalScore < 0.7) {
        recommendedAdaptations.push('Localize product description');
        recommendedAdaptations.push('Adjust pricing strategy');
      }

      return {
        isValid: culturalScore >= 0.7,
        culturalScore,
        recommendedAdaptations
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Product validation failed: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Calculate cultural relevance score for a product
   * @param product Product details
   * @returns Cultural relevance score (0-1)
   */
  private calculateCulturalRelevance(product: Product): number {
    let score = 0;
    const description = product.description.toLowerCase();
    const name = product.name.toLowerCase();

    // Check cultural tags
    if (product.culturalTags && product.culturalTags.length > 0) {
      score += 0.3;
    }

    // Check description for cultural keywords
    MarketplaceAgent.CULTURAL_KEYWORDS.forEach(keyword => {
      if (description.includes(keyword) || name.includes(keyword)) {
        score += 0.1;
      }
    });

    return Math.min(score, 1);
  }

  /**
   * Generate recommended payment and shipping strategies
   * @param product Product details
   * @returns Recommended strategies
   */
  public generateMarketStrategy(product: Product): {
    paymentMethods: ReadonlyArray<string>;
    shippingOptions: ReadonlyArray<string>;
  } {
    const paymentMethods = [...this.config.paymentGateways];
    const shippingOptions: string[] = [
      'standard-international',
      'diaspora-community-shipping'
    ];

    // Additional payment methods for specific cultural contexts
    if (product.culturalTags?.includes('african-market')) {
      paymentMethods.push('mobile-money');
    }

    return {
      paymentMethods,
      shippingOptions
    };
  }

  /**
   * Simulate vendor onboarding workflow
   * @param vendorData Vendor registration details
   * @returns Onboarding result
   */
  public async onboardVendor(
    vendorData: Vendor
  ): Promise<{
    isApproved: boolean;
    requiredDocuments?: ReadonlyArray<string>;
  }> {
    try {
      // Validate input using Zod
      const vendor = VendorSchema.parse(vendorData);
      
      // Prepare vendor data for database
      const vendorCreateInput: Prisma.UserCreateInput = {
        email: vendor.email,
        name: vendor.name,
        role: 'VENDOR',
        profileData: vendor.culturalBackground 
          ? { culturalBackground: vendor.culturalBackground } 
          : undefined
      };

      // Create vendor user
      const createdVendor = await this.prisma.user.create({
        data: vendorCreateInput
      });

      return {
        isApproved: !!createdVendor,
        requiredDocuments: createdVendor ? [] : ['identity-verification']
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          isApproved: false,
          requiredDocuments: ['identity-verification', 'business-license']
        };
      }
      
      console.error('Vendor onboarding failed', error);
      return {
        isApproved: false,
        requiredDocuments: ['identity-verification', 'business-license']
      };
    }
  }

  /**
   * Clean up resources
   */
  public async dispose(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

export default MarketplaceAgent;