const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
} = require('docx');
const fs = require('fs');

const doc = new Document({
  sections: [
    {
      properties: {},
      children: [
        // Title
        new Paragraph({
          text: 'RefreshLawn UI/UX Redesign & Brand Refresh',
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
        }),
        new Paragraph({
          text: 'Complete Navigation Architecture Overhaul',
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        }),
        new Paragraph({
          text: `Date: ${new Date().toLocaleDateString()}`,
          alignment: AlignmentType.CENTER,
          spacing: { after: 600 },
        }),

        // Executive Summary
        new Paragraph({
          text: 'Executive Summary',
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: 'This document details the comprehensive UI/UX redesign implemented for RefreshLawn, a lawn care service management SaaS application. The redesign addresses critical navigation bugs, introduces a modern brand identity, and implements production-grade UI components.',
            }),
          ],
          spacing: { after: 200 },
        }),

        // Key Achievements
        new Paragraph({
          text: 'Key Achievements:',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 150 },
        }),
        new Paragraph({
          text: '✓ Fixed navigation bugs across all user roles (Customer, Technician, Admin)',
          bullet: { level: 0 },
        }),
        new Paragraph({
          text: '✓ Reduced admin tab count from 8 to 5 (improved UX)',
          bullet: { level: 0 },
        }),
        new Paragraph({
          text: '✓ Implemented drawer navigation for secondary admin functions',
          bullet: { level: 0 },
        }),
        new Paragraph({
          text: '✓ Created professional component library (7 new components)',
          bullet: { level: 0 },
        }),
        new Paragraph({
          text: '✓ Refreshed brand colors from bland to vibrant lawn care theme',
          bullet: { level: 0 },
          spacing: { after: 400 },
        }),

        // Phase 1: Design System
        new Paragraph({
          text: 'Phase 1: Design System Enhancement',
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        }),
        new Paragraph({
          text: 'Brand Color Palette',
          heading: HeadingLevel.HEADING_2,
          spacing: { after: 150 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Primary Brand Color: ', bold: true }),
            new TextRun({ text: '#22c55e (Fresh Grass Green)' }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Before: ', bold: true }),
            new TextRun({ text: '#10b981 (Generic emerald green)' }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'After: ', bold: true }),
            new TextRun({
              text: '#22c55e with full 50-900 shade scale for consistency',
            }),
          ],
          spacing: { after: 200 },
        }),

        new Paragraph({
          text: 'Enhanced Features:',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 150 },
        }),
        new Paragraph({
          text: 'Gradient utilities for modern UI (gradient-primary, gradient-soft, etc.)',
          bullet: { level: 0 },
        }),
        new Paragraph({
          text: 'Custom shadow system (soft, primary, primary-lg, elevated)',
          bullet: { level: 0 },
        }),
        new Paragraph({
          text: 'Animation keyframes (fadeIn, slideUp, pulseSoft)',
          bullet: { level: 0 },
        }),
        new Paragraph({
          text: 'Semantic colors (success, warning, error, info)',
          bullet: { level: 0 },
          spacing: { after: 400 },
        }),

        // Phase 2: Navigation Fixes
        new Paragraph({
          text: 'Phase 2: Navigation Architecture Fixes',
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        }),

        // Customer Role
        new Paragraph({
          text: 'Customer Role Navigation',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 150 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Primary Tabs (4): ', bold: true }),
            new TextRun({ text: 'Home, Services, History, Profile' }),
          ],
        }),
        new Paragraph({
          children: [new TextRun({ text: 'Hidden Screens (7): ', bold: true })],
          spacing: { after: 100 },
        }),
        new Paragraph({
          text: 'booking.tsx - Booking flow wizard',
          bullet: { level: 0 },
        }),
        new Paragraph({
          text: 'booking-details/[id] - Dynamic booking detail view',
          bullet: { level: 0 },
        }),
        new Paragraph({
          text: 'booking-details.tsx - Legacy detail screen',
          bullet: { level: 0 },
        }),
        new Paragraph({
          text: 'payment-complete.tsx - Post-payment success screen',
          bullet: { level: 0 },
        }),
        new Paragraph({
          text: 'saved-properties.tsx - Property management',
          bullet: { level: 0 },
        }),
        new Paragraph({
          text: 'notifications.tsx - Notification center',
          bullet: { level: 0 },
        }),
        new Paragraph({
          text: 'notification-preferences.tsx - Settings',
          bullet: { level: 0 },
          spacing: { after: 300 },
        }),

        // Technician Role
        new Paragraph({
          text: 'Technician Role Navigation',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 150 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Primary Tabs (4): ', bold: true }),
            new TextRun({ text: 'Dashboard, Schedule, Jobs, Profile' }),
          ],
        }),
        new Paragraph({
          children: [new TextRun({ text: 'Hidden Screens (3): ', bold: true })],
          spacing: { after: 100 },
        }),
        new Paragraph({
          text: 'job-details/[id] - Job detail + photo upload',
          bullet: { level: 0 },
        }),
        new Paragraph({
          text: 'notifications.tsx - Notification center',
          bullet: { level: 0 },
        }),
        new Paragraph({
          text: 'notification-preferences.tsx - Settings',
          bullet: { level: 0 },
          spacing: { after: 300 },
        }),

        // Admin Role
        new Paragraph({
          text: 'Admin Role Navigation (Major Redesign)',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 150 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'BEFORE: ', bold: true, color: 'FF0000' }),
            new TextRun({
              text: '8 cramped tabs (Dashboard, Bookings, Users, Services, Feedback, Analytics, Billing, Settings)',
            }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'AFTER: ', bold: true, color: '22c55e' }),
            new TextRun({
              text: '5 clean tabs (Dashboard, Bookings, Users, Services, More)',
            }),
          ],
          spacing: { after: 200 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Innovation: ', bold: true }),
            new TextRun({
              text: "Drawer navigation accessible via 'More' tab for secondary functions",
            }),
          ],
          spacing: { after: 100 },
        }),
        new Paragraph({
          text: 'Drawer Contents:',
          spacing: { after: 100 },
        }),
        new Paragraph({
          text: 'Analytics - Revenue trends & insights',
          bullet: { level: 0 },
        }),
        new Paragraph({
          text: 'Billing Hub - Payments & invoices',
          bullet: { level: 0 },
        }),
        new Paragraph({
          text: 'Feedback - Customer reviews',
          bullet: { level: 0 },
        }),
        new Paragraph({
          text: 'Settings - App configuration',
          bullet: { level: 0 },
          spacing: { after: 400 },
        }),

        // Phase 3: Component Library
        new Paragraph({
          text: 'Phase 3: Production-Grade Component Library',
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        }),
        new Paragraph({
          text: 'Created 7 new reusable components following industry best practices:',
          spacing: { after: 200 },
        }),

        new Paragraph({
          text: '1. DrawerNavigation.tsx',
          heading: HeadingLevel.HEADING_3,
          spacing: { after: 100 },
        }),
        new Paragraph({
          text: 'Beautiful slide-out menu with gradient header and smooth animations',
          bullet: { level: 0 },
        }),
        new Paragraph({
          text: "Accessible via 'More' tab in admin interface",
          bullet: { level: 0 },
        }),
        new Paragraph({
          text: 'Includes logout functionality and app version info',
          bullet: { level: 0 },
          spacing: { after: 200 },
        }),

        new Paragraph({
          text: '2. FloatingActionButton.tsx',
          heading: HeadingLevel.HEADING_3,
          spacing: { after: 100 },
        }),
        new Paragraph({
          text: 'Reusable FAB with customizable position, size, and variant',
          bullet: { level: 0 },
        }),
        new Paragraph({
          text: 'Entry animation with spring effect',
          bullet: { level: 0 },
        }),
        new Paragraph({
          text: 'Subtle pulse animation for attention',
          bullet: { level: 0 },
          spacing: { after: 200 },
        }),

        new Paragraph({
          text: '3. GradientButton.tsx',
          heading: HeadingLevel.HEADING_3,
          spacing: { after: 100 },
        }),
        new Paragraph({
          text: 'Primary action buttons with brand gradients',
          bullet: { level: 0 },
        }),
        new Paragraph({
          text: 'Multiple variants (primary, secondary, success, warning, error)',
          bullet: { level: 0 },
        }),
        new Paragraph({
          text: 'Loading state with spinner',
          bullet: { level: 0 },
          spacing: { after: 200 },
        }),

        new Paragraph({
          text: '4. EmptyState.tsx',
          heading: HeadingLevel.HEADING_3,
          spacing: { after: 100 },
        }),
        new Paragraph({
          text: 'Beautiful empty state illustrations for no data scenarios',
          bullet: { level: 0 },
        }),
        new Paragraph({
          text: 'Multiple icon types (inbox, calendar, users, search, etc.)',
          bullet: { level: 0 },
        }),
        new Paragraph({
          text: 'Optional action button slot',
          bullet: { level: 0 },
          spacing: { after: 200 },
        }),

        new Paragraph({
          text: '5. LoadingSpinner.tsx',
          heading: HeadingLevel.HEADING_3,
          spacing: { after: 100 },
        }),
        new Paragraph({
          text: 'Branded loading animation with three variants',
          bullet: { level: 0 },
        }),
        new Paragraph({
          text: 'Full-screen option for page-level loading',
          bullet: { level: 0 },
        }),
        new Paragraph({
          text: 'Fade-in animation on appearance',
          bullet: { level: 0 },
          spacing: { after: 200 },
        }),

        new Paragraph({
          text: '6. MetricCard.tsx',
          heading: HeadingLevel.HEADING_3,
          spacing: { after: 100 },
        }),
        new Paragraph({
          text: 'Dashboard metric cards with icons and trend indicators',
          bullet: { level: 0 },
        }),
        new Paragraph({
          text: 'Color-coded variants (success, warning, error, info)',
          bullet: { level: 0 },
        }),
        new Paragraph({
          text: 'Optional onPress for navigation',
          bullet: { level: 0 },
          spacing: { after: 200 },
        }),

        new Paragraph({
          text: '7. Enhanced NotificationsButton',
          heading: HeadingLevel.HEADING_3,
          spacing: { after: 100 },
        }),
        new Paragraph({
          text: 'Bell shake animation on new notifications',
          bullet: { level: 0 },
        }),
        new Paragraph({
          text: 'Badge pulse animation',
          bullet: { level: 0 },
        }),
        new Paragraph({
          text: 'Real-time unread count updates',
          bullet: { level: 0 },
          spacing: { after: 400 },
        }),

        // Updated Components
        new Paragraph({
          text: 'Updated Logo Component',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 150 },
        }),
        new Paragraph({
          text: 'Brand name: GreenScape → RefreshLawn',
          bullet: { level: 0 },
        }),
        new Paragraph({
          text: 'Added gradient variant for modern look',
          bullet: { level: 0 },
        }),
        new Paragraph({
          text: "Tagline: 'Lawn Care Services' → 'Professional Lawn Care'",
          bullet: { level: 0 },
          spacing: { after: 400 },
        }),

        // Testing Instructions
        new Paragraph({
          text: 'Manual Testing Guide',
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        }),
        new Paragraph({
          text: 'Customer Role Testing',
          heading: HeadingLevel.HEADING_2,
          spacing: { after: 150 },
        }),
        new Paragraph({
          text: '1. Login as customer user',
          numbering: { reference: 'default-numbering', level: 0 },
        }),
        new Paragraph({
          text: '2. Verify ONLY 4 tabs visible: Home, Services, History, Profile',
          numbering: { reference: 'default-numbering', level: 0 },
        }),
        new Paragraph({
          text: '3. Verify booking screens accessible via navigation, not tabs',
          numbering: { reference: 'default-numbering', level: 0 },
        }),
        new Paragraph({
          text: '4. Check notification bell animation on new notification',
          numbering: { reference: 'default-numbering', level: 0 },
          spacing: { after: 200 },
        }),

        new Paragraph({
          text: 'Technician Role Testing',
          heading: HeadingLevel.HEADING_2,
          spacing: { after: 150 },
        }),
        new Paragraph({
          text: '1. Login as technician user',
          numbering: { reference: 'default-numbering', level: 0 },
        }),
        new Paragraph({
          text: '2. Verify ONLY 4 tabs visible: Dashboard, Schedule, Jobs, Profile',
          numbering: { reference: 'default-numbering', level: 0 },
        }),
        new Paragraph({
          text: '3. Verify job detail screens accessible via navigation',
          numbering: { reference: 'default-numbering', level: 0 },
          spacing: { after: 200 },
        }),

        new Paragraph({
          text: 'Admin Role Testing',
          heading: HeadingLevel.HEADING_2,
          spacing: { after: 150 },
        }),
        new Paragraph({
          text: '1. Login as admin user',
          numbering: { reference: 'default-numbering', level: 0 },
        }),
        new Paragraph({
          text: '2. Verify ONLY 5 tabs visible: Dashboard, Bookings, Users, Services, More',
          numbering: { reference: 'default-numbering', level: 0 },
        }),
        new Paragraph({
          text: "3. Click 'More' tab to open drawer navigation",
          numbering: { reference: 'default-numbering', level: 0 },
        }),
        new Paragraph({
          text: '4. Verify drawer contains: Analytics, Billing Hub, Feedback, Settings',
          numbering: { reference: 'default-numbering', level: 0 },
        }),
        new Paragraph({
          text: '5. Test drawer slide animation and close functionality',
          numbering: { reference: 'default-numbering', level: 0 },
          spacing: { after: 400 },
        }),

        // Files Modified
        new Paragraph({
          text: 'Files Modified',
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        }),
        new Paragraph({
          text: 'Configuration Files:',
          heading: HeadingLevel.HEADING_2,
          spacing: { after: 100 },
        }),
        new Paragraph({
          text: 'tailwind.config.js - Enhanced with brand colors and utilities',
          bullet: { level: 0 },
          spacing: { after: 200 },
        }),

        new Paragraph({
          text: 'Layout Files:',
          heading: HeadingLevel.HEADING_2,
          spacing: { after: 100 },
        }),
        new Paragraph({
          text: 'app/(customer)/_layout.tsx - Fixed navigation bugs, updated colors',
          bullet: { level: 0 },
        }),
        new Paragraph({
          text: 'app/(technician)/_layout.tsx - Fixed navigation bugs, updated colors',
          bullet: { level: 0 },
        }),
        new Paragraph({
          text: 'app/(admin)/_layout.tsx - Complete redesign with drawer navigation',
          bullet: { level: 0 },
          spacing: { after: 200 },
        }),

        new Paragraph({
          text: 'New Component Files:',
          heading: HeadingLevel.HEADING_2,
          spacing: { after: 100 },
        }),
        new Paragraph({
          text: 'app/components/common/DrawerNavigation.tsx',
          bullet: { level: 0 },
        }),
        new Paragraph({
          text: 'app/components/common/FloatingActionButton.tsx',
          bullet: { level: 0 },
        }),
        new Paragraph({
          text: 'app/components/common/GradientButton.tsx',
          bullet: { level: 0 },
        }),
        new Paragraph({
          text: 'app/components/common/EmptyState.tsx',
          bullet: { level: 0 },
        }),
        new Paragraph({
          text: 'app/components/common/LoadingSpinner.tsx',
          bullet: { level: 0 },
        }),
        new Paragraph({
          text: 'app/components/common/MetricCard.tsx',
          bullet: { level: 0 },
        }),
        new Paragraph({
          text: 'app/(admin)/more.tsx - Placeholder for More tab',
          bullet: { level: 0 },
          spacing: { after: 200 },
        }),

        new Paragraph({
          text: 'Updated Component Files:',
          heading: HeadingLevel.HEADING_2,
          spacing: { after: 100 },
        }),
        new Paragraph({
          text: 'app/components/common/Logo.tsx - Brand refresh with gradients',
          bullet: { level: 0 },
        }),
        new Paragraph({
          text: 'app/components/common/NotificationsButton.tsx - Added animations',
          bullet: { level: 0 },
          spacing: { after: 400 },
        }),

        // Success Metrics
        new Paragraph({
          text: 'Success Metrics & Outcomes',
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        }),
        new Paragraph({
          text: '✓ Zero unwanted tabs in navigation across all roles',
          bullet: { level: 0 },
        }),
        new Paragraph({
          text: '✓ Admin tabs reduced from 8 to 5 (37.5% reduction)',
          bullet: { level: 0 },
        }),
        new Paragraph({
          text: '✓ Modern, cohesive brand identity established',
          bullet: { level: 0 },
        }),
        new Paragraph({
          text: '✓ Production-ready component library created',
          bullet: { level: 0 },
        }),
        new Paragraph({
          text: '✓ Cross-platform visual consistency achieved',
          bullet: { level: 0 },
        }),
        new Paragraph({
          text: '✓ Industry-standard UX patterns implemented',
          bullet: { level: 0 },
          spacing: { after: 400 },
        }),

        // Conclusion
        new Paragraph({
          text: 'Conclusion',
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: 'This comprehensive redesign transforms RefreshLawn from a functional application into a production-grade, visually stunning lawn care SaaS platform. The navigation architecture improvements eliminate user confusion, the modern brand identity establishes market presence, and the professional component library ensures consistency and scalability for future development.',
            }),
          ],
        }),
      ],
    },
  ],
});

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync('RefreshLawn_UI_UX_Redesign_Documentation.docx', buffer);
  console.log('Document created successfully!');
});
