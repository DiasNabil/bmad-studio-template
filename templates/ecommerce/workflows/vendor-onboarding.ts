import { z } from 'zod';
import { PrismaClient } from '@prisma/client';

// Validation Schemas
const VendorProfileSchema = z.object({
  businessName: z.string().min(2, 'Business name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number'),
  culturalBackground: z.string().optional(),
  businessType: z.enum([
    'individual', 
    'small-business', 
    'social-enterprise', 
    'diaspora-owned'
  ]),
  products: z.array(z.object({
    name: z.string().min(3, 'Product name must be at least 3 characters'),
    category: z.string(),
    description: z.string().optional()
  })).optional()
});

// Types
type VendorProfile = z.infer<typeof VendorProfileSchema>;

interface OnboardingWorkflow {
  validateVendorProfile(profile: VendorProfile): Promise<boolean>;
  performComplianceCheck(profile: VendorProfile): Promise<ComplianceResult>;
  createVendorAccount(profile: VendorProfile): Promise<string>;
}

interface ComplianceResult {
  isCompliant: boolean;
  requiredDocuments: string[];
  complianceScore: number;
}

class VendorOnboardingWorkflow implements OnboardingWorkflow {
  private readonly prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Validate vendor profile
   * @param profile Vendor profile to validate
   * @returns Validation result
   */
  public async validateVendorProfile(profile: VendorProfile): Promise<boolean> {
    try {
      // Validate using Zod
      VendorProfileSchema.parse(profile);
      
      // Additional custom validations
      const emailExists = await this.checkEmailUniqueness(profile.email);
      if (emailExists) {
        throw new Error('Email already registered');
      }

      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('Validation failed:', error.errors);
        return false;
      }
      console.error('Validation error:', error);
      return false;
    }
  }

  /**
   * Perform comprehensive compliance check
   * @param profile Vendor profile to check
   * @returns Compliance assessment
   */
  public async performComplianceCheck(
    profile: VendorProfile
  ): Promise<ComplianceResult> {
    const complianceChecks = [
      this.checkCulturalSensitivity(profile),
      this.checkBusinessEligibility(profile),
      this.checkProductCompliance(profile)
    ];

    const results = await Promise.all(complianceChecks);
    
    return {
      isCompliant: results.every(result => result),
      requiredDocuments: this.determineRequiredDocuments(profile),
      complianceScore: this.calculateComplianceScore(results)
    };
  }

  /**
   * Create vendor account
   * @param profile Vendor profile
   * @returns Created vendor ID
   */
  public async createVendorAccount(profile: VendorProfile): Promise<string> {
    try {
      const vendor = await this.prisma.user.create({
        data: {
          email: profile.email,
          name: profile.businessName,
          role: 'VENDOR',
          profileData: {
            businessType: profile.businessType,
            culturalBackground: profile.culturalBackground,
            phoneNumber: profile.phoneNumber
          }
        }
      });

      // Optional: Create associated products
      if (profile.products) {
        await this.createVendorProducts(vendor.id, profile.products);
      }

      return vendor.id;
    } catch (error) {
      console.error('Account creation failed:', error);
      throw new Error('Failed to create vendor account');
    }
  }

  /**
   * Check email uniqueness
   * @param email Email to check
   * @returns Whether email is already registered
   */
  private async checkEmailUniqueness(email: string): Promise<boolean> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email }
    });
    return !!existingUser;
  }

  /**
   * Check cultural sensitivity of vendor profile
   * @param profile Vendor profile
   * @returns Cultural compliance status
   */
  private async checkCulturalSensitivity(
    profile: VendorProfile
  ): Promise<boolean> {
    // Example cultural sensitivity checks
    const sensitivityKeywords = [
      'community', 'heritage', 'empowerment', 'inclusion'
    ];

    const checkDescription = (text?: string) => 
      text 
        ? sensitivityKeywords.some(keyword => 
            text.toLowerCase().includes(keyword)
          )
        : false;

    return profile.culturalBackground 
      ? checkDescription(profile.culturalBackground)
      : false;
  }

  /**
   * Check business eligibility
   * @param profile Vendor profile
   * @returns Business eligibility status
   */
  private async checkBusinessEligibility(
    profile: VendorProfile
  ): Promise<boolean> {
    const eligibleTypes = [
      'social-enterprise', 
      'diaspora-owned'
    ];

    return eligibleTypes.includes(profile.businessType);
  }

  /**
   * Check product compliance
   * @param profile Vendor profile
   * @returns Product compliance status
   */
  private async checkProductCompliance(
    profile: VendorProfile
  ): Promise<boolean> {
    if (!profile.products || profile.products.length === 0) {
      return false;
    }

    return profile.products.every(product => 
      product.name.length >= 3 && 
      product.category.length > 0
    );
  }

  /**
   * Determine required documents
   * @param profile Vendor profile
   * @returns List of required documents
   */
  private determineRequiredDocuments(
    profile: VendorProfile
  ): string[] {
    const documents: string[] = ['identity-verification'];

    if (profile.businessType === 'small-business') {
      documents.push('business-registration');
    }

    if (profile.businessType === 'social-enterprise') {
      documents.push('social-impact-statement');
    }

    return documents;
  }

  /**
   * Calculate compliance score
   * @param complianceResults Compliance check results
   * @returns Compliance score
   */
  private calculateComplianceScore(
    complianceResults: boolean[]
  ): number {
    const trueCount = complianceResults.filter(Boolean).length;
    return (trueCount / complianceResults.length) * 100;
  }

  /**
   * Create vendor's products
   * @param vendorId Vendor ID
   * @param products Products to create
   */
  private async createVendorProducts(
    vendorId: string, 
    products: NonNullable<VendorProfile['products']>
  ): Promise<void> {
    await this.prisma.product.createMany({
      data: products.map(product => ({
        name: product.name,
        description: product.description || '',
        vendorId: vendorId,
        status: 'DRAFT'
      }))
    });
  }

  /**
   * Cleanup resources
   */
  public async dispose(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

export default VendorOnboardingWorkflow;