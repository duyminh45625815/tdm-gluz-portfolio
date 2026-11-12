import type { Locale } from './localization.types.js';

type DraftLocalePath = `draft.${Locale}`;
type PublishedLocalePath = `published.${Locale}`;
type DraftLocaleReference = `$draft.${Locale}`;

export interface DraftLocaleUpdate<TContent> {
  $set: Partial<Record<DraftLocalePath, TContent>>;
}

export interface PublishLocaleUpdate {
  filter: Partial<Record<DraftLocalePath, { $type: 'object' }>>;
  options: { updatePipeline: true };
  pipeline: [
    {
      $set: Partial<Record<PublishedLocalePath, DraftLocaleReference>>;
    },
  ];
}

export function createDraftLocaleUpdate<TContent>(
  locale: Locale,
  content: TContent,
): DraftLocaleUpdate<TContent> {
  const path: DraftLocalePath = `draft.${locale}`;

  return {
    $set: { [path]: content } as Partial<
      Record<DraftLocalePath, TContent>
    >,
  };
}

export function createPublishLocaleUpdate(
  locale: Locale,
): PublishLocaleUpdate {
  const draftPath: DraftLocalePath = `draft.${locale}`;
  const publishedPath: PublishedLocalePath = `published.${locale}`;
  const draftReference: DraftLocaleReference = `$${draftPath}`;

  return {
    filter: { [draftPath]: { $type: 'object' } } as PublishLocaleUpdate['filter'],
    options: { updatePipeline: true },
    pipeline: [
      {
        $set: {
          [publishedPath]: draftReference,
        } as Partial<Record<PublishedLocalePath, DraftLocaleReference>>,
      },
    ],
  };
}
