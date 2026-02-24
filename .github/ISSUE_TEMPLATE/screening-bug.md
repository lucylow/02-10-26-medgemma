---
name: "🩺 Screening Bug Report"
description: File a bug with the screening functionality
title: "[Screening Bug] "
labels: ["bug", "screening", "triage"]
assignees: []

body:
  - type: textarea
    id: description
    attributes:
      label: What happened?
      placeholder: "The screening failed when I entered..."
    validations:
      required: true
  - type: textarea
    id: reproduction
    attributes:
      label: Steps to reproduce
      placeholder: |
        1. Go to screening page
        2. Enter age 24 months
        3. ...
  - type: dropdown
    id: domain
    attributes:
      label: Affected domain
      options:
        - Communication/Language
        - Motor Skills
        - Social-Emotional
        - Cognitive

