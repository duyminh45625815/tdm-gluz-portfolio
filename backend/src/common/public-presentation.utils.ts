import { BadRequestException } from '@nestjs/common';

export type PublicPresentation = 'home' | 'about';

export function resolvePresentation(
  value?: string,
): PublicPresentation | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === 'home' || value === 'about') {
    return value;
  }

  throw new BadRequestException('Unsupported presentation.');
}

export function presentationFilter(
  presentation?: PublicPresentation,
): Record<string, unknown> {
  return presentation
    ? { [`presentations.${presentation}`]: true }
    : {
        $or: [
          { 'presentations.home': true },
          { 'presentations.about': true },
        ],
      };
}

export function isPresented(
  presentations: { home?: boolean; about?: boolean } | undefined,
  presentation?: PublicPresentation,
): boolean {
  return presentation
    ? presentations?.[presentation] === true
    : presentations?.home === true || presentations?.about === true;
}
