import type { Integration } from './IntegrationCard'

export type { Integration }

export const AVAILABLE_INTEGRATIONS: Integration[] = [
  {
    id: 'stripe',
    name: 'Stripe',
    description: 'Payment processing and billing',
    icon: '⚡',
    status: 'connected',
    statusText: 'Connected',
  },
  {
    id: 'google-drive',
    name: 'Google Drive',
    description: 'File storage and document management',
    icon: '📁',
    status: 'connected',
    statusText: 'Connected',
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Team notifications and alerts',
    icon: '💬',
    status: 'connected',
    statusText: 'Connected',
  },
  {
    id: 'github',
    name: 'GitHub',
    description: 'Code repositories and CI/CD',
    icon: '🐙',
    status: 'error',
    statusText: 'Reconnect needed',
  },
  {
    id: 'salesforce',
    name: 'Salesforce',
    description: 'Customer relationship management',
    icon: '☁️',
    status: 'available',
    statusText: 'Available',
  },
  {
    id: 'mailchimp',
    name: 'Mailchimp',
    description: 'Email marketing campaigns',
    icon: '✉️',
    status: 'available',
    statusText: 'Available',
  },
  {
    id: 'jira',
    name: 'Jira',
    description: 'Project management and issue tracking',
    icon: '📋',
    status: 'available',
    statusText: 'Available',
  },
  {
    id: 'figma',
    name: 'Figma',
    description: 'Design collaboration and prototyping',
    icon: '🎨',
    status: 'available',
    statusText: 'Available',
  },
]
