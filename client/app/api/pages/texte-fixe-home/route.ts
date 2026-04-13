import { NextRequest, NextResponse } from 'next/server';

import { toAppLocale } from '@/lib/i18n';
import {
  HOME_FIXED_TEXT_SLUG,
  createEmptyHomeFixedTextPayload,
  type HomeFixedTextPayload,
} from '@/lib/home-fixed-text/homeFixedText';
import { createAdminClient } from '@/lib/supabase/admin';

type HomeFixedTextRow = {
  slug: string;
  locale: string;
  titre: string | null;
  contenu_markdown: string | null;
  date_mise_a_jour: string | null;
};

function hasRequiredConfig(): boolean {
  return (
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
  );
}

export async function GET(request: NextRequest) {
  const locale = toAppLocale(request.nextUrl.searchParams.get('locale'));
  const emptyPayload = createEmptyHomeFixedTextPayload(locale);

  if (!hasRequiredConfig()) {
    return NextResponse.json(emptyPayload);
  }

  try {
    const supabaseAdmin = createAdminClient();

    const { data, error } = await supabaseAdmin
      .from('contenu_editorial')
      .select('slug, locale, titre, contenu_markdown, date_mise_a_jour')
      .eq('slug', HOME_FIXED_TEXT_SLUG)
      .eq('locale', locale)
      .maybeSingle();

    if (error) {
      console.error('Erreur lecture texte fixe home', {
        locale,
        error,
      });

      return NextResponse.json(emptyPayload);
    }

    const row = (data as HomeFixedTextRow | null) ?? null;

    if (!row) {
      return NextResponse.json(emptyPayload);
    }

    const payload: HomeFixedTextPayload = {
      slug: HOME_FIXED_TEXT_SLUG,
      locale,
      title: row.titre,
      contentMarkdown: row.contenu_markdown ?? '',
      updatedAt: row.date_mise_a_jour,
      isFallbackData: false,
    };

    return NextResponse.json(payload);
  } catch (error) {
    console.error('Erreur inattendue lecture texte fixe home', {
      locale,
      error,
    });

    return NextResponse.json(emptyPayload);
  }
}
