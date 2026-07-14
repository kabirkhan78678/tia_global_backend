const VALID_ROLES = ['parent', 'teacher', 'student'];
const VALID_RECIPIENT_ROLES = ['parent', 'teacher', 'student'];
const MAX_MESSAGE_LENGTH = 4000;
const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;

const normalizeRole = (role) => String(role || '').trim().toLowerCase();

const normalizeId = (value) => {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }

  return id;
};

const normalizeMessageBody = (body) => String(body || '').trim();

const parsePagination = ({ limit, beforeMessageId, page }) => {
  const parsedLimit = Number(limit);
  const parsedPage = Number(page);

  return {
    limit:
      Number.isInteger(parsedLimit) && parsedLimit > 0
        ? Math.min(parsedLimit, MAX_LIMIT)
        : DEFAULT_LIMIT,
    beforeMessageId: normalizeId(beforeMessageId),
    page: Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1,
  };
};

module.exports = {
  DEFAULT_LIMIT,
  MAX_LIMIT,
  MAX_MESSAGE_LENGTH,
  VALID_RECIPIENT_ROLES,
  VALID_ROLES,
  normalizeId,
  normalizeMessageBody,
  normalizeRole,
  parsePagination,
};
