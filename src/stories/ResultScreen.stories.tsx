/**
 * ResultScreen stories using mock_data cases.
 * Run: yarn storybook — then open ResultScreen.
 */
import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ResultsScreen from '@/pages/ResultsScreen';
import { caseToResultState } from './fixtures/resultState';

// Import mock cases (Vite resolves from project root)
import case0001 from '../../mock_data/cases/case-0001.json';
import case0002 from '../../mock_data/cases/case-0002.json';

const case1State = caseToResultState(case0001 as { case_id: string; mock_inference?: unknown });
const case2State = caseToResultState(case0002 as { case_id: string; mock_inference?: unknown });

type ResultState = ReturnType<typeof caseToResultState>;

function ResultScreenWithRouter({ state }: { state: ResultState }) {
  return (
    <MemoryRouter initialEntries={[{ pathname: '/results', state }]} initialIndex={0}>
      <Routes>
        <Route path="/results" element={<ResultsScreen />} />
      </Routes>
    </MemoryRouter>
  );
}

const meta: Meta<typeof ResultScreenWithRouter> = {
  title: 'Screens/ResultScreen',
  component: ResultScreenWithRouter,
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj<typeof ResultScreenWithRouter>;

export const OnTrack: Story = {
  args: { state: case1State },
};

export const Monitor: Story = {
  args: { state: case2State },
};

export const Refer: Story = {
  args: {
    state: caseToResultState({
      case_id: 'case-ref',
      mock_inference: {
        summary: ['Significant delay indicators; recommend referral.'],
        risk: 'refer',
        recommendations: ['Refer to developmental pediatrician.', 'Re-screen in 1 month.'],
        parent_text: 'This screening suggests it may be helpful to check in with a specialist.',
        explainability: [
          { type: 'text', detail: 'Few words; no phrases', score: 0.9 },
          { type: 'image_region', detail: 'Drawing below age expectation', score: 0.75 },
        ],
        confidence: 0.88,
      },
    }),
  },
};

export const LowConfidence: Story = {
  args: {
    state: caseToResultState({
      case_id: 'case-low',
      mock_inference: {
        summary: ['Limited information; result uncertain.'],
        risk: 'monitor',
        recommendations: ['Gather more observations; re-screen in 2 months.'],
        parent_text: 'We had limited information. Consider a follow-up screening.',
        explainability: [{ type: 'text', detail: 'Short caregiver description', score: 0.4 }],
        confidence: 0.42,
        // uncertainty_reason removed - not in MockInference type
      },
    }),
  },
};

export const Spanish: Story = {
  args: {
    state: (() => {
      const s = caseToResultState(case0001 as { case_id: string; mock_inference?: unknown });
      s.report.summary = 'Retraso en lenguaje expresivo observado.';
      s.report.parentFriendlyExplanation = 'Su hijo podría beneficiarse de juegos de lenguaje diarios.';
      return s;
    })(),
  },
};
