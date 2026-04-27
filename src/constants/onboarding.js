export const PROFILE_FIELDS = {
  Candidate: [
    {
      name: 'targetRole',
      label: 'Target Role',
      type: 'text',
      required: true,
    },
    {
      name: 'yearsOfExperience',
      label: 'Years of Experience',
      type: 'number',
      min: 0,
      required: true,
    },
  ],
  Interviewer: [
    {
      name: 'domain',
      label: 'Domain',
      type: 'select',
      options: ['Backend', 'Frontend', 'DevOps', 'AI/ML'],
      required: true,
    },
    {
      name: 'experienceLevel',
      label: 'Experience Level',
      type: 'select',
      options: ['Senior', 'Staff', 'Principal'],
      required: true,
    },
    {
      name: 'sessionPrice',
      label: 'Session Price ($)',
      type: 'number',
      min: 0,
      required: true,
    },
  ],
};

// Each entry is a predicate: (backendProfileResponse) => boolean
export const COMPLETION_CHECK = {
  Candidate: (data) => !!data?.candidateProfile?.targetRole,
  Interviewer: (data) => !!data?.interviewerProfile?.domain,
};
