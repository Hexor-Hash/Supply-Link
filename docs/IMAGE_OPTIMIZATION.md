# Issue #92: Next.js Image Optimization

## Summary

Configured Next.js Image optimization for the Supply-Link frontend.

## Changes Made

1. **Updated `next.config.ts`**:
   - Added `images.remotePatterns` configuration to allow external image sources
   - Configured to accept HTTPS images from any domain (wildcard pattern)

2. **Current Image Usage**:
   - The app primarily uses **lucide-react** for icons (no optimization needed)
   - Inline SVGs are used for custom graphics (no optimization needed)
   - QR codes are generated dynamically via canvas (no optimization needed)
   - No static image files (PNG, JPG, etc.) are currently used

## Future Considerations

When adding external images (e.g., product photos, logos), follow these steps:

1. **Use Next.js Image component**:
   ```tsx
   import Image from "next/image";
   
   <Image
     src="/path/to/image.jpg"
     alt="Description"
     width={400}
     height={300}
     priority={false}
   />
   ```

2. **Set appropriate props**:
   - `width` and `height`: Required for optimization
   - `priority`: Set to `true` for above-the-fold images
   - `alt`: Always provide descriptive alt text for accessibility

3. **For external images**:
   - Ensure the domain is added to `remotePatterns` in `next.config.ts`
   - Use specific domain patterns instead of wildcards when possible

## Benefits

- Automatic format conversion (WebP, AVIF)
- Responsive image serving
- Lazy loading by default
- Reduced bundle size
- Improved Core Web Vitals
