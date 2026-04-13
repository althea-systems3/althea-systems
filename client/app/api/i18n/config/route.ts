import { NextResponse } from 'next/server';

import {
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
} from '@/lib/i18n/constants';

export async function GET() {
  return NextResponse.json({
    languages: SUPPORTED_LANGUAGES,
    default_language: DEFAULT_LANGUAGE,
  });
}
