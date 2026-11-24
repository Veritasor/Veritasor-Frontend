export interface HelpArticleData {
  id: string
  title: string
  description: string
  keywords: string[]
  categories: string[]
  lastUpdated: string
  content: {
    intro: string
    sections: Array<{
      heading: string
      content: string
    }>
  }
}

export const HELP_ARTICLES_DATA: Record<string, HelpArticleData> = {
  'getting-started': {
    id: 'getting-started',
    title: 'Getting Started with Veritasor',
    description: 'Learn how to set up your workspace, connect revenue sources, and create your first attestation.',
    keywords: ['setup', 'workspace', 'first steps', 'introduction', 'onboarding', 'beginner'],
    categories: ['Getting Started'],
    lastUpdated: 'July 2026',
    content: {
      intro: 'Welcome to Veritasor. This guide covers the basics of setting up your workspace and creating your first attestation.',
      sections: [
        {
          heading: '1. Create a workspace',
          content: 'Sign up, then complete the onboarding wizard with your business details. Your workspace is created when you finish.',
        },
        {
          heading: '2. Add an attestation',
          content: 'Once your workspace is ready, connect a revenue source, then open the Attestations page to review runs and confirm the period summary.',
        },
        {
          heading: '3. Verify and share',
          content: 'After submission, attestation status updates appear in real time. You can share verifications with your team via the API or the built-in sharing controls.',
        },
      ],
    },
  },
  'connect-sources': {
    id: 'connect-sources',
    title: 'Connecting Revenue Sources',
    description: 'Integrate Stripe, Shopify, PayPal, and other platforms to pull revenue data for attestations.',
    keywords: ['stripe', 'shopify', 'paypal', 'integration', 'connect', 'api', 'revenue source'],
    categories: ['Revenue Sources', 'Integrations'],
    lastUpdated: 'July 2026',
    content: {
      intro: 'Connect your revenue sources to automatically pull transaction data for your attestations. Veritasor supports major payment platforms and custom integrations.',
      sections: [
        {
          heading: 'Supported platforms',
          content: 'We support Stripe, Shopify, PayPal, Square, and custom API integrations. Each platform provides different data formats, but we normalize them for consistent attestation.',
        },
        {
          heading: 'Connecting a source',
          content: 'Navigate to the Revenue Sources page and click "Connect Source". Follow the OAuth flow for supported platforms, or provide API credentials for custom integrations.',
        },
        {
          heading: 'Data sync frequency',
          content: 'Data is synced automatically when you trigger an attestation. For real-time monitoring, configure webhooks to receive updates as transactions occur.',
        },
      ],
    },
  },
  'create-attestation': {
    id: 'create-attestation',
    title: 'Creating an Attestation',
    description: 'Trigger a new revenue proof attestation—select sources, review data, and submit to chain.',
    keywords: ['attestation', 'proof', 'revenue', 'trigger', 'create', 'submit', 'on-chain'],
    categories: ['Attestations'],
    lastUpdated: 'July 2026',
    content: {
      intro: 'Attestations cryptographically prove your revenue data on-chain. This guide walks you through creating your first attestation.',
      sections: [
        {
          heading: 'Select a time period',
          content: 'Choose the date range for the attestation. We will aggregate all transactions from your connected sources within this period.',
        },
        {
          heading: 'Choose revenue sources',
          content: 'Select which connected sources to include. You can mix multiple platforms—Stripe, Shopify, PayPal—in a single attestation.',
        },
        {
          heading: 'Review and submit',
          content: 'Review the aggregated data summary. Once confirmed, we generate a Merkle tree and submit the root to the Stellar blockchain. You will receive a transaction hash for verification.',
        },
      ],
    },
  },
  'verify-proofs': {
    id: 'verify-proofs',
    title: 'Verifying Attestation Proofs',
    description: 'Understand Merkle roots, Stellar transaction hashes, and how to independently verify proofs.',
    keywords: ['merkle', 'stellar', 'hash', 'verify', 'proof', 'blockchain', 'transaction'],
    categories: ['Attestations', 'Security'],
    lastUpdated: 'July 2026',
    content: {
      intro: 'Attestation proofs allow anyone to independently verify your revenue data without accessing the underlying transactions.',
      sections: [
        {
          heading: 'Merkle tree structure',
          content: 'Your transaction data is organized into a Merkle tree. The root hash is committed to the Stellar blockchain, creating an immutable record.',
        },
        {
          heading: 'Independent verification',
          content: 'Anyone with the Merkle proof can verify that a specific transaction was included in the attestation by checking the proof against the on-chain root hash.',
        },
        {
          heading: 'Stellar transaction hash',
          content: 'Each attestation produces a Stellar transaction hash. You can look up this hash on Stellar explorers to confirm the attestation was submitted.',
        },
      ],
    },
  },
  'api-keys': {
    id: 'api-keys',
    title: 'Managing API Keys',
    description: 'Create, rotate, and revoke API keys for programmatic access to the Veritasor verification API.',
    keywords: ['api', 'key', 'secret', 'rotate', 'revoke', 'token', 'authentication'],
    categories: ['Settings', 'Security'],
    lastUpdated: 'July 2026',
    content: {
      intro: 'API keys allow programmatic access to the Veritasor API for triggering attestations and retrieving proofs.',
      sections: [
        {
          heading: 'Creating an API key',
          content: 'Navigate to Settings > API Keys and click "Create API Key". Give it a descriptive name and select the required scopes.',
        },
        {
          heading: 'Key scopes',
          content: 'Scopes limit what an API key can do. Available scopes include: attestations:read, attestations:create, sources:read, and proofs:verify.',
        },
        {
          heading: 'Rotation and revocation',
          content: 'For security, rotate API keys regularly. Use the "Rotate" button to create a new key while keeping the old one temporarily active. Revoke keys that are no longer needed.',
        },
      ],
    },
  },
  'team-access': {
    id: 'team-access',
    title: 'Managing Team Access & Permissions',
    description: 'Invite team members, assign roles, and configure workspace-level access controls.',
    keywords: ['team', 'permissions', 'roles', 'access', 'invite', 'members', 'rbac'],
    categories: ['Settings', 'Team'],
    lastUpdated: 'July 2026',
    content: {
      intro: 'Manage who can access your workspace and what they can do with role-based access control.',
      sections: [
        {
          heading: 'Inviting team members',
          content: 'Go to Settings > Team and click "Invite Member". Enter their email address and assign a role. They will receive an invitation to join.',
        },
        {
          heading: 'Available roles',
          content: 'Owner: Full access including billing and team management. Admin: Manage attestations and sources. Member: View attestations and create new ones. Viewer: Read-only access.',
        },
        {
          heading: 'Access controls',
          content: 'Configure workspace-level restrictions such as IP allowlists and required MFA for sensitive operations.',
        },
      ],
    },
  },
  'webhooks': {
    id: 'webhooks',
    title: 'Configuring Webhooks',
    description: 'Set up webhook endpoints to receive real-time attestation status updates and event notifications.',
    keywords: ['webhook', 'endpoint', 'event', 'notification', 'real-time', 'callback'],
    categories: ['Settings', 'Integrations'],
    lastUpdated: 'July 2026',
    content: {
      intro: 'Webhooks enable real-time notifications when attestation events occur, such as completion, failure, or verification.',
      sections: [
        {
          heading: 'Creating a webhook',
          content: 'Navigate to Settings > Webhooks and click "Add Webhook". Provide your endpoint URL and select which events to subscribe to.',
        },
        {
          heading: 'Event types',
          content: 'Available events include: attestation.completed, attestation.failed, attestation.verified, and source.sync_completed.',
        },
        {
          heading: 'Security',
          content: 'Each webhook delivery includes a signature header. Verify this signature with your webhook secret to ensure the request is from Veritasor.',
        },
      ],
    },
  },
  'billing': {
    id: 'billing',
    title: 'Understanding Billing & Plans',
    description: 'Explore pricing tiers, view invoices, update payment methods, and manage your subscription.',
    keywords: ['billing', 'plan', 'invoice', 'payment', 'subscription', 'pricing', 'upgrade'],
    categories: ['Settings', 'Billing'],
    lastUpdated: 'July 2026',
    content: {
      intro: 'Understand your subscription, view invoices, and manage payment methods.',
      sections: [
        {
          heading: 'Pricing tiers',
          content: 'Starter: Free for up to 10 attestations per month. Pro: $49/month for 100 attestations. Enterprise: Custom pricing for unlimited attestations and dedicated support.',
        },
        {
          heading: 'Viewing invoices',
          content: 'Invoices are available in Settings > Billing. Download PDF copies for your records.',
        },
        {
          heading: 'Payment methods',
          content: 'Add or update credit cards in Settings > Billing. We accept Visa, Mastercard, and American Express.',
        },
      ],
    },
  },
  'troubleshooting': {
    id: 'troubleshooting',
    title: 'Troubleshooting Failed Attestations',
    description: 'Diagnose common attestation failures—network timeouts, data mismatches, and remediation steps.',
    keywords: ['failed', 'error', 'timeout', 'troubleshoot', 'diagnose', 'retry', 'remediation'],
    categories: ['Troubleshooting'],
    lastUpdated: 'July 2026',
    content: {
      intro: 'Learn how to diagnose and resolve common attestation failures.',
      sections: [
        {
          heading: 'Network timeouts',
          content: 'If attestation fails due to timeout, check your internet connection and retry. Persistent timeouts may indicate issues with the Stellar network.',
        },
        {
          heading: 'Data mismatches',
          content: 'Ensure your revenue sources are synced correctly. If transaction data is incomplete, the attestation may fail validation.',
        },
        {
          heading: 'Remediation steps',
          content: 'Review the error message in the attestation detail view. Fix the underlying issue (e.g., re-sync sources) and retry the attestation.',
        },
      ],
    },
  },
  'security': {
    id: 'security',
    title: 'Security Best Practices',
    description: 'Enable MFA, manage session timeouts, and follow recommendations to keep your account secure.',
    keywords: ['security', 'mfa', '2fa', 'session', 'password', 'authentication', 'hardware key'],
    categories: ['Security', 'Getting Started'],
    lastUpdated: 'July 2026',
    content: {
      intro: 'Follow these security best practices to protect your account and attestation data.',
      sections: [
        {
          heading: 'Enable multi-factor authentication',
          content: 'MFA adds an extra layer of security. Enable it in Settings > Security. We support TOTP apps (Google Authenticator, Authy) and hardware keys (YubiKey).',
        },
        {
          heading: 'Session management',
          content: 'Configure session timeouts in Settings > Security. Shorter timeouts reduce risk if your device is compromised.',
        },
        {
          heading: 'API key security',
          content: 'Never commit API keys to version control. Rotate keys regularly and revoke unused keys. Use environment variables in production.',
        },
      ],
    },
  },
  'export-data': {
    id: 'export-data',
    title: 'Exporting Attestation Data',
    description: 'Download attestation records and revenue proofs in CSV, JSON, or PDF formats.',
    keywords: ['export', 'download', 'csv', 'json', 'pdf', 'data', 'report'],
    categories: ['Attestations'],
    lastUpdated: 'July 2026',
    content: {
      intro: 'Export your attestation data for offline analysis, reporting, or record-keeping.',
      sections: [
        {
          heading: 'Export formats',
          content: 'CSV: Spreadsheet-compatible with transaction-level detail. JSON: Machine-readable for programmatic processing. PDF: Human-readable summary for sharing.',
        },
        {
          heading: 'Exporting from the UI',
          content: 'Open an attestation detail view and click "Export". Choose your preferred format and download.',
        },
        {
          heading: 'API export',
          content: 'Use the API to programmatically export attestations. The /attestations/{id}/export endpoint supports all formats.',
        },
      ],
    },
  },
  'data-sources': {
    id: 'data-sources',
    title: 'Supported Data Sources & Formats',
    description: 'Review the list of supported revenue platforms, file formats, and data schema requirements.',
    keywords: ['format', 'schema', 'csv', 'api', 'supported', 'platform', 'compatible'],
    categories: ['Revenue Sources', 'Getting Started'],
    lastUpdated: 'July 2026',
    content: {
      intro: 'Understand which data sources and formats are compatible with Veritasor attestations.',
      sections: [
        {
          heading: 'Supported platforms',
          content: 'Stripe, Shopify, PayPal, Square, and custom API integrations. Each platform provides different data fields which we normalize.',
        },
        {
          heading: 'File formats',
          content: 'For manual uploads, we support CSV files with headers: date, amount, currency, description, and transaction_id.',
        },
        {
          heading: 'Schema requirements',
          content: 'Transactions must include a unique ID, timestamp, amount, and currency. Missing or invalid fields will cause attestation failures.',
        },
      ],
    },
  },
  'onboarding': {
    id: 'onboarding',
    title: 'Business Onboarding (KYB/KYC)',
    description: 'Complete identity verification for your business—upload documents, selfie capture, and bank details.',
    keywords: ['kyb', 'kyc', 'onboarding', 'verification', 'document', 'identity', 'business'],
    categories: ['Getting Started'],
    lastUpdated: 'July 2026',
    content: {
      intro: 'Complete business verification to unlock full access to Veritasor features.',
      sections: [
        {
          heading: 'Business details',
          content: 'Provide your legal business name, address, tax ID, and industry classification.',
        },
        {
          heading: 'Document upload',
          content: 'Upload government-issued business documents such as articles of incorporation or business licenses.',
        },
        {
          heading: 'Owner verification',
          content: 'Complete identity verification with a selfie and government ID. This step ensures authorized control of the business.',
        },
        {
          heading: 'Bank details',
          content: 'Link a business bank account for verification and future payouts if applicable.',
        },
      ],
    },
  },
  'density-theme': {
    id: 'density-theme',
    title: 'Customizing Display Density & Theme',
    description: 'Switch between comfortable and compact density modes, and toggle light/dark/system themes.',
    keywords: ['density', 'theme', 'dark mode', 'light mode', 'compact', 'comfortable', 'display'],
    categories: ['Settings'],
    lastUpdated: 'July 2026',
    content: {
      intro: 'Personalize your Veritasor experience with display density and theme options.',
      sections: [
        {
          heading: 'Display density',
          content: 'Comfortable: More whitespace, larger text, easier to read. Compact: Denser layout, more information on screen, suited for power users.',
        },
        {
          heading: 'Theme options',
          content: 'Light: High contrast, suited for bright environments. Dark: Reduced eye strain, suited for low-light environments. System: Automatically follows your OS preference.',
        },
        {
          heading: 'Changing settings',
          content: 'Navigate to Settings > Display to configure density and theme. Changes apply immediately.',
        },
      ],
    },
  },
  'shortcuts': {
    id: 'shortcuts',
    title: 'Keyboard Shortcuts Reference',
    description: 'Full list of keyboard shortcuts for navigation, actions, and power-user workflows.',
    keywords: ['shortcut', 'keyboard', 'hotkey', 'navigation', 'quick', 'productivity'],
    categories: ['Getting Started'],
    lastUpdated: 'July 2026',
    content: {
      intro: 'Master these keyboard shortcuts to navigate Veritasor more efficiently.',
      sections: [
        {
          heading: 'Global shortcuts',
          content: 'Cmd/Ctrl + K: Open command palette. Cmd/Ctrl + ?: Open help search. Escape: Close modals and overlays.',
        },
        {
          heading: 'Navigation',
          content: 'G then D: Go to Dashboard. G then A: Go to Attestations. G then S: Go to Sources. G then T: Go to Settings.',
        },
        {
          heading: 'Actions',
          content: 'N: Create new attestation. /: Focus search. F: Forward (if applicable).',
        },
      ],
    },
  },
}

export function getHelpArticle(id: string): HelpArticleData | undefined {
  return HELP_ARTICLES_DATA[id]
}

export function getAllHelpArticles(): HelpArticleData[] {
  return Object.values(HELP_ARTICLES_DATA)
}
