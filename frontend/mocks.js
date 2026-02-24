// Smart mock data for the PediScreen AI static demo.
// No real PHI – all names and details are fictitious and equity-focused.

window.MOCK_SCREENING_RESULT = {
  riskLevel: "medium",
  confidence: 82,
  summary:
    "For a 24‑month child with no two‑word phrases yet but good social engagement, PediScreen flags a moderate language delay risk. Motor skills appear on track.",
  evidence: [
    {
      type: "Language milestones",
      content: "No consistent two‑word phrases reported at 24 months; limited vocabulary in caregiver report.",
      influence: 0.42,
    },
    {
      type: "Social communication",
      content:
        "Child points, brings toys to caregiver, and responds to name, which lowers concern for global social delay.",
      influence: 0.28,
    },
    {
      type: "Motor profile",
      content: "Walks independently and climbs without support; fine motor appears age-appropriate in CHW notes.",
      influence: 0.16,
    },
    {
      type: "Environmental context",
      content:
        "Bilingual home environment; AI adjusts expectations to avoid over‑calling delay due to typical bilingual patterns.",
      influence: 0.14,
    },
  ],
  nextSteps: [
    "Share a brief, caregiver‑friendly explanation of language milestones expected around 24 months.",
    "Offer simple home activities that encourage two‑word phrases in the family's primary language.",
    "If concerns persist in 4–6 weeks, route to clinician for formal speech‑language evaluation.",
    "Consider screening for hearing and vision if not done in the last 6 months.",
  ],
};

window.MOCK_CLINICIAN_QUEUE = [
  {
    caseId: "#PS‑00123",
    childLabel: "Sarah K.",
    ageMonths: 24,
    chwName: "Amina (CHW)",
    location: "Rural clinic, Kenya",
    timeAgo: "12 min ago",
    riskLevel: "high",
    riskLabel: "HIGH RISK — LANGUAGE",
    aiSummary: "No two‑word phrases at 24 months, limited gesture use, frequent frustration during communication.",
    caregiverQuote: "She understands everything, but she can't find words to tell us what she wants.",
  },
  {
    caseId: "#PS‑00124",
    childLabel: "Baby J.",
    ageMonths: 10,
    chwName: "Luis (CHW)",
    location: "Urban home visit, Peru",
    timeAgo: "32 min ago",
    riskLevel: "medium",
    riskLabel: "MODERATE RISK — MOTOR",
    aiSummary: "Not yet sitting independently, spends most time lying on back; limited tummy time opportunities.",
    caregiverQuote: "We don't have much floor space, so he is mostly in the crib or carrier.",
  },
  {
    caseId: "#PS‑00125",
    childLabel: "Twin A",
    ageMonths: 18,
    chwName: "Joy (CHW)",
    location: "Mobile clinic, India",
    timeAgo: "58 min ago",
    riskLevel: "low",
    riskLabel: "LOW RISK — WATCH",
    aiSummary:
      "Language and motor skills broadly on track; caregiver notes shyness with unfamiliar adults but good play at home.",
    caregiverQuote: "He is quiet with new people but talks and plays a lot with his siblings.",
  },
];

