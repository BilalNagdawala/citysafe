export const DEMO_GUARDIAN_PROFILE = {
  id: 'g-123',
  name: 'Aisha Khan',
  verified: true,
  organization: 'Safe Mumbai Foundation',
  assignedRegion: 'Mumbai Central',
  role: 'Verified Guardian',
  phone: '+91 98765 43210',
  email: 'aisha.khan@safemumbai.org',
  permissions: ['view_reports', 'manage_cases', 'view_intelligence', 'contact_users']
};

export const DEMO_STATS = {
  totalReports: 128,
  activeAlerts: 17,
  openCases: 9,
  resolvedCases: 43
};

export const DEMO_REPORTS = [
  {
    id: 'RPT-8892',
    type: 'Suspicious Activity',
    location: 'Mumbai Central Station, Platform 1',
    coordinates: { lat: 18.9690, lng: 72.8193 },
    time: '10 mins ago',
    severity: 'MEDIUM',
    description: 'Group of individuals loitering near the isolated exit gate, behaving aggressively towards passersby.',
    evidence: true,
    verificationStatus: 'Unverified',
    status: 'New',
    assignedOrg: null
  },
  {
    id: 'RPT-8891',
    type: 'Harassment',
    location: 'Grant Road East, near cafe',
    coordinates: { lat: 18.9620, lng: 72.8150 },
    time: '25 mins ago',
    severity: 'HIGH',
    description: 'Verbal harassment reported. User shared audio evidence and moved to a safe location.',
    evidence: true,
    verificationStatus: 'Verified',
    status: 'Assigned',
    assignedOrg: 'Safe Mumbai Foundation'
  },
  {
    id: 'RPT-8885',
    type: 'Poor Street Lighting',
    location: 'Tardeo Road, stretch between cross-streets',
    coordinates: { lat: 18.9650, lng: 72.8120 },
    time: '2 hours ago',
    severity: 'LOW',
    description: 'Multiple street lights are out on this block making it completely dark at night.',
    evidence: false,
    verificationStatus: 'Verified',
    status: 'Under Review',
    assignedOrg: 'Civic Infrastructure Dept'
  }
];

export const DEMO_ALERTS = [
  {
    id: 'ALT-101',
    type: 'Multiple Reports',
    severity: 'HIGH',
    location: 'Grant Road East',
    message: '3 incidents reported within 500m radius in the last hour.',
    time: '5 mins ago'
  },
  {
    id: 'ALT-102',
    type: 'SOS Alert',
    severity: 'CRITICAL',
    location: 'Tardeo Road',
    message: 'Active SOS triggered by user in your assigned zone.',
    time: '12 mins ago'
  }
];

export const DEMO_CASES = [
  {
    id: 'CASE-442',
    incident: 'Harassment',
    location: 'Grant Road East',
    assignedGuardian: 'Aisha Khan',
    partnerNgo: 'Safe Mumbai Foundation',
    priority: 'High',
    createdDate: 'Oct 22, 19:45',
    lastUpdated: 'Oct 22, 20:10',
    status: 'In Progress'
  },
  {
    id: 'CASE-439',
    incident: 'Theft',
    location: 'Mumbai Central Terminus',
    assignedGuardian: 'Rahul Desai',
    partnerNgo: 'Railway Police Help Desk',
    priority: 'Medium',
    createdDate: 'Oct 22, 14:30',
    lastUpdated: 'Oct 22, 16:15',
    status: 'Resolved'
  }
];

export const DEMO_NGOS = [
  {
    id: 'NGO-01',
    name: 'Safe Mumbai Foundation',
    verified: true,
    focus: 'Women\'s Safety & Community Support',
    locations: ['Mumbai Central', 'Andheri', 'Bandra'],
    services: ['Emergency Response', 'Legal Aid', 'Safe Shelter'],
    activeVolunteers: 45
  },
  {
    id: 'NGO-02',
    name: 'Night Owls Community Watch',
    verified: true,
    focus: 'Neighborhood Patrol',
    locations: ['South Mumbai', 'Tardeo'],
    services: ['Escorts', 'Area Monitoring'],
    activeVolunteers: 12
  }
];

export const DEMO_GUARDIANS = [
  {
    id: 'g-401',
    name: 'Rahul Desai',
    organization: 'Night Owls Community Watch',
    role: 'Patrol Leader',
    verified: true,
    location: 'Tardeo (0.8km away)',
    status: 'Available',
    workload: 1
  },
  {
    id: 'g-402',
    name: 'Priya Mehta',
    organization: 'Safe Mumbai Foundation',
    role: 'Crisis Counselor',
    verified: true,
    location: 'Mumbai Central (0.2km away)',
    status: 'Busy',
    workload: 3
  },
  {
    id: 'g-403',
    name: 'Vikram Singh',
    organization: 'Independent',
    role: 'Community Volunteer',
    verified: true,
    location: 'Grant Road (1.2km away)',
    status: 'Responding',
    workload: 2
  }
];
