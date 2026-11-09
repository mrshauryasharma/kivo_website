import {
  getCmsPublished,
  getCmsDraft,
  saveCmsDraft,
  publishCms,
  revertCms,
  getCmsHistory,
  DEFAULT_CMS_CONTENT,
} from './db.js';

// Deep sanitization helper to disallow script tags or javascript: URIs in CMS inputs
function sanitizeCmsInput(val) {
  if (typeof val === 'string') {
    // Strip malicious tags
    return val
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
  }
  if (Array.isArray(val)) {
    return val.map(sanitizeCmsInput);
  }
  if (val !== null && typeof val === 'object') {
    const clean = {};
    for (const [k, v] of Object.entries(val)) {
      clean[k] = sanitizeCmsInput(v);
    }
    return clean;
  }
  return val;
}

// -------------------------------------------------------------
// Public Controller: Get Published Website Content
// -------------------------------------------------------------
export function handleGetPublishedContent(req, res) {
  try {
    const content = getCmsPublished();
    // Allow lightweight client caching with ETag or 60s max-age
    res.setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');
    res.status(200).json({
      success: true,
      content,
    });
  } catch (err) {
    console.error('[KIVO CMS] Error getting published content:', err);
    res.status(200).json({
      success: true,
      content: DEFAULT_CMS_CONTENT,
    });
  }
}

// -------------------------------------------------------------
// Admin Controllers: CMS Management
// -------------------------------------------------------------
export function handleGetAdminCms(req, res) {
  try {
    const draft = getCmsDraft();
    const published = getCmsPublished();
    const history = getCmsHistory();

    res.status(200).json({
      draft,
      published,
      history,
    });
  } catch (err) {
    console.error('[KIVO CMS] Error fetching admin CMS state:', err);
    res.status(500).json({ error: 'Failed to retrieve CMS content.' });
  }
}

export function handleSaveDraft(req, res) {
  try {
    const { draft } = req.body || {};
    if (!draft || typeof draft !== 'object') {
      return res.status(400).json({ error: 'Invalid draft payload.' });
    }

    const sanitizedDraft = sanitizeCmsInput(draft);
    const saved = saveCmsDraft(sanitizedDraft);

    res.status(200).json({
      success: true,
      message: 'Draft saved successfully.',
      draft: saved,
    });
  } catch (err) {
    console.error('[KIVO CMS] Error saving draft:', err);
    res.status(500).json({ error: 'Failed to save CMS draft.' });
  }
}

export function handlePublishCms(req, res) {
  try {
    const { draft, note } = req.body || {};
    const author = req.adminUser?.username || 'admin';

    // If draft content is provided with publish, save it atomically first
    if (draft && typeof draft === 'object') {
      const sanitizedDraft = sanitizeCmsInput(draft);
      saveCmsDraft(sanitizedDraft);
    }

    const result = publishCms(author, typeof note === 'string' ? note.slice(0, 200) : undefined);

    res.status(200).json({
      success: true,
      message: 'Website content published to live site successfully!',
      published: result.published,
      revisionId: result.revisionId,
    });
  } catch (err) {
    console.error('[KIVO CMS] Error publishing content:', err);
    res.status(500).json({ error: 'Failed to publish website content.' });
  }
}

export function handleRevertCms(req, res) {
  try {
    const { revisionId } = req.body || {};
    if (!revisionId) {
      return res.status(400).json({ error: 'Revision ID is required.' });
    }

    const result = revertCms(revisionId);

    res.status(200).json({
      success: true,
      message: `Successfully reverted website content to revision ${revisionId}.`,
      published: result.restored,
    });
  } catch (err) {
    console.error('[KIVO CMS] Error reverting content:', err);
    res.status(400).json({ error: err.message || 'Failed to revert to specified revision.' });
  }
}

export function handleGetHistory(req, res) {
  try {
    const history = getCmsHistory();
    res.status(200).json({ history });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch revision history.' });
  }
}
