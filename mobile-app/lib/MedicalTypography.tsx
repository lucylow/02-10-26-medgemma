/**
 * Medical Typography System — Clinician-grade legibility
 */

import { styled, Text } from 'tamagui';

export const MedicalHeading = styled(Text, {
  fontFamily: '$body',
  fontWeight: '800',
  variants: {
    size: {
      h1: { fontSize: 32, lineHeight: 40 },
      h2: { fontSize: 28, lineHeight: 36 },
      h3: { fontSize: 24, lineHeight: 32 },
      h4: { fontSize: 20, lineHeight: 28 },
    },
  },
  defaultVariants: {
    size: 'h3',
  },
});

export const MedicalBody = styled(Text, {
  fontFamily: '$body',
  lineHeight: 22,
  fontSize: 16,
  color: '$gray11',
});

export const MedicalLabel = styled(Text, {
  fontFamily: '$body',
  fontWeight: '600',
  fontSize: 14,
  color: '$gray12',
  textTransform: 'uppercase',
  letterSpacing: 1,
});
