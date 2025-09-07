import { jest } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import VendorOnboardingWorkflow from './vendor-onboarding';

// Mock Prisma Client
jest.mock('@prisma/client', () => {
  return {
    PrismaClient: jest.fn().mockImplementation(() => ({
      user: {
        create: jest.fn(),
        findUnique: jest.fn()
      },
      product: {
        createMany: jest.fn()
      }
    }))
  };
});

describe('VendorOnboardingWorkflow', () => {
  let workflow: VendorOnboardingWorkflow;
  let mockPrisma: jest.Mocked<PrismaClient>;

  beforeEach(() => {
    workflow = new VendorOnboardingWorkflow();
    mockPrisma = jest.mocked(new PrismaClient());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateVendorProfile', () => {
    it('should validate a complete vendor profile', async () => {
      const validProfile = {
        businessName: 'Diaspora Marketplace',
        email: 'vendor@example.com',
        phoneNumber: '+1234567890',
        businessType: 'diaspora-owned',
        culturalBackground: 'African Diaspora Entrepreneur'
      };

      mockPrisma.user.findUnique.mockResolvedValue(null);

      const isValid = await workflow.validateVendorProfile(validProfile);
      
      expect(isValid).toBe(true);
    });

    it('should reject profile with invalid email', async () => {
      const invalidProfile = {
        businessName: 'Invalid Business',
        email: 'invalid-email',
        phoneNumber: '+1234567890',
        businessType: 'individual'
      };

      const isValid = await workflow.validateVendorProfile(invalidProfile);
      
      expect(isValid).toBe(false);
    });

    it('should reject profile with existing email', async () => {
      const duplicateProfile = {
        businessName: 'Duplicate Business',
        email: 'existing@example.com',
        phoneNumber: '+1234567890',
        businessType: 'small-business'
      };

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'existing-user-id',
        email: 'existing@example.com',
        name: 'Existing Business',
        role: 'VENDOR'
      });

      const isValid = await workflow.validateVendorProfile(duplicateProfile);
      
      expect(isValid).toBe(false);
    });
  });

  describe('performComplianceCheck', () => {
    it('should perform compliance check for a compliant profile', async () => {
      const compliantProfile = {
        businessName: 'Compliant Vendor',
        email: 'compliant@example.com',
        phoneNumber: '+1234567890',
        businessType: 'social-enterprise',
        culturalBackground: 'Empowering Community Initiatives',
        products: [
          {
            name: 'Community Product',
            category: 'Social Good',
            description: 'Supporting local communities'
          }
        ]
      };

      const complianceResult = await workflow.performComplianceCheck(compliantProfile);
      
      expect(complianceResult.isCompliant).toBe(true);
      expect(complianceResult.complianceScore).toBeGreaterThan(80);
      expect(complianceResult.requiredDocuments).toContain('social-impact-statement');
    });

    it('should flag non-compliant profile', async () => {
      const nonCompliantProfile = {
        businessName: 'Non-Compliant Vendor',
        email: 'noncompliant@example.com',
        phoneNumber: '+1234567890',
        businessType: 'individual',
        products: []
      };

      const complianceResult = await workflow.performComplianceCheck(nonCompliantProfile);
      
      expect(complianceResult.isCompliant).toBe(false);
      expect(complianceResult.complianceScore).toBeLessThan(50);
    });
  });

  describe('createVendorAccount', () => {
    it('should create vendor account successfully', async () => {
      const vendorProfile = {
        businessName: 'New Marketplace Vendor',
        email: 'newvendor@example.com',
        phoneNumber: '+1234567890',
        businessType: 'diaspora-owned',
        culturalBackground: 'Innovative Diaspora Entrepreneurs',
        products: [
          {
            name: 'Innovative Product',
            category: 'Technology',
            description: 'Empowering diaspora innovation'
          }
        ]
      };

      mockPrisma.user.create.mockResolvedValue({
        id: 'new-vendor-id',
        email: vendorProfile.email,
        name: vendorProfile.businessName,
        role: 'VENDOR'
      });

      mockPrisma.product.createMany.mockResolvedValue({ count: 1 });

      const vendorId = await workflow.createVendorAccount(vendorProfile);
      
      expect(vendorId).toBe('new-vendor-id');
      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: vendorProfile.email,
            name: vendorProfile.businessName
          })
        })
      );
      expect(mockPrisma.product.createMany).toHaveBeenCalled();
    });

    it('should throw error for invalid vendor account creation', async () => {
      const invalidProfile = {
        businessName: '',
        email: 'invalid@example.com',
        phoneNumber: '+1234567890',
        businessType: 'individual'
      };

      mockPrisma.user.create.mockRejectedValue(new Error('Creation failed'));

      await expect(workflow.createVendorAccount(invalidProfile))
        .rejects
        .toThrow('Failed to create vendor account');
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