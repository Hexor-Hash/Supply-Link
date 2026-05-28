import { describe, it, expect } from 'vitest';
import { validateEventMetadata, eventMetadataSchemas } from '@/lib/api/eventMetadataSchemas';

describe('validateEventMetadata', () => {
  it('rejects unknown event type', () => {
    const result = validateEventMetadata('UNKNOWN', '{}');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Unknown event type');
  });

  it('accepts empty object for any valid event type', () => {
    for (const type of Object.keys(eventMetadataSchemas)) {
      const result = validateEventMetadata(type, '{}');
      expect(result.valid).toBe(true);
    }
  });

  it('rejects invalid JSON', () => {
    const result = validateEventMetadata('HARVEST', 'not-json');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('valid JSON');
  });

  it('rejects JSON array (non-object)', () => {
    const result = validateEventMetadata('HARVEST', '[1, 2, 3]');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('JSON object');
  });

  it('rejects JSON null', () => {
    const result = validateEventMetadata('HARVEST', 'null');
    expect(result.valid).toBe(false);
  });

  describe('HARVEST', () => {
    it('accepts valid HARVEST metadata', () => {
      const result = validateEventMetadata(
        'HARVEST',
        JSON.stringify({ batchNumber: 'B001', quantity: 100, unit: 'kg' }),
      );
      expect(result.valid).toBe(true);
      expect(result.data?.batchNumber).toBe('B001');
    });

    it('rejects invalid unit enum', () => {
      const result = validateEventMetadata('HARVEST', JSON.stringify({ unit: 'gallons' }));
      expect(result.valid).toBe(false);
    });

    it('rejects negative quantity', () => {
      const result = validateEventMetadata('HARVEST', JSON.stringify({ quantity: -5 }));
      expect(result.valid).toBe(false);
    });

    it('rejects certifications array exceeding 10 items', () => {
      const result = validateEventMetadata(
        'HARVEST',
        JSON.stringify({ certifications: Array(11).fill('cert') }),
      );
      expect(result.valid).toBe(false);
    });

    it('rejects batchNumber exceeding 64 characters', () => {
      const result = validateEventMetadata(
        'HARVEST',
        JSON.stringify({ batchNumber: 'x'.repeat(65) }),
      );
      expect(result.valid).toBe(false);
    });
  });

  describe('PROCESSING', () => {
    it('accepts valid PROCESSING metadata', () => {
      const result = validateEventMetadata(
        'PROCESSING',
        JSON.stringify({ facilityId: 'FAC-001', qualityGrade: 'A', inspector: 'Jane Doe' }),
      );
      expect(result.valid).toBe(true);
    });

    it('rejects facilityId exceeding 128 characters', () => {
      const result = validateEventMetadata(
        'PROCESSING',
        JSON.stringify({ facilityId: 'x'.repeat(129) }),
      );
      expect(result.valid).toBe(false);
    });
  });

  describe('SHIPPING', () => {
    it('accepts valid SHIPPING metadata', () => {
      const result = validateEventMetadata(
        'SHIPPING',
        JSON.stringify({ carrier: 'DHL', trackingNumber: 'TRK-123456' }),
      );
      expect(result.valid).toBe(true);
    });

    it('rejects carrier exceeding 128 characters', () => {
      const result = validateEventMetadata(
        'SHIPPING',
        JSON.stringify({ carrier: 'x'.repeat(129) }),
      );
      expect(result.valid).toBe(false);
    });
  });

  describe('RETAIL', () => {
    it('accepts valid RETAIL metadata', () => {
      const result = validateEventMetadata(
        'RETAIL',
        JSON.stringify({ storeId: 'STORE-001', price: 9.99, currency: 'USD' }),
      );
      expect(result.valid).toBe(true);
    });

    it('rejects negative price', () => {
      const result = validateEventMetadata('RETAIL', JSON.stringify({ price: -10 }));
      expect(result.valid).toBe(false);
    });

    it('rejects non-integer stockLevel', () => {
      const result = validateEventMetadata('RETAIL', JSON.stringify({ stockLevel: 1.5 }));
      expect(result.valid).toBe(false);
    });

    it('rejects negative stockLevel', () => {
      const result = validateEventMetadata('RETAIL', JSON.stringify({ stockLevel: -1 }));
      expect(result.valid).toBe(false);
    });

    it('rejects currency exceeding 8 characters', () => {
      const result = validateEventMetadata(
        'RETAIL',
        JSON.stringify({ currency: 'TOOLONGCURRENCY' }),
      );
      expect(result.valid).toBe(false);
    });
  });
});
