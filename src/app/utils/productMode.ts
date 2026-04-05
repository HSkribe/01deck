import type { WorkspaceSectionId } from '../context/AppContext';

export type ProductProfileId = 'deck' | 'foundry';

const requestedProfile = import.meta.env.VITE_PRODUCT_PROFILE;

export const PRODUCT_PROFILE: ProductProfileId = requestedProfile === 'foundry' ? 'foundry' : 'deck';
export const IS_FOUNDRY_PRODUCT = PRODUCT_PROFILE === 'foundry';
export const IS_DECK_PRODUCT = PRODUCT_PROFILE === 'deck';
export const SERIOUS_PRODUCT_MODE = IS_FOUNDRY_PRODUCT;

export const DEFAULT_WORKSPACE_SECTION: WorkspaceSectionId = IS_FOUNDRY_PRODUCT ? 'foundry' : 'deck';

export const DEFAULT_PAGE_CONTEXT = IS_FOUNDRY_PRODUCT
  ? { title: '01FOUNDRY', subtitle: 'Customer-support agent optimization' }
  : { title: '01DECK', subtitle: 'Agent workspace active' };

export const PRODUCT_DOCUMENT_TITLE = IS_FOUNDRY_PRODUCT ? '01Foundry' : '01Deck';
