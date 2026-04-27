const SEARCH_API_URL = import.meta.env.VITE_SEARCH_API_URL;

/**
 * Fetch interviewers from the search service.
 *
 * @param {Object} filters
 * @param {string} [filters.domain]          - Exact domain value (e.g. "Backend")
 * @param {string} [filters.experienceLevel] - Exact level value (e.g. "Senior")
 * @param {number|string} [filters.maxPrice] - Upper bound for sessionPrice
 * @returns {Promise<Array>}
 */
export async function fetchInterviewers(filters = {}) {
  const params = new URLSearchParams();

  // Dropdown values are exact — use equals match mode so "Backend" doesn't
  // accidentally match "Backend + Frontend" composite strings.
  if (filters.domain) {
    params.set('domain', filters.domain);
    params.set('domainMatch', 'equals');
  }

  if (filters.experienceLevel) {
    params.set('experienceLevel', filters.experienceLevel);
    params.set('experienceMatch', 'equals');
  }

  if (filters.maxPrice !== '' && filters.maxPrice != null) {
    params.set('maxPrice', String(filters.maxPrice));
  }

  const query = params.toString();
  const url = `${SEARCH_API_URL}/api/search/interviewers${query ? `?${query}` : ''}`;

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Search request failed with status ${response.status}`);
  return response.json();
}
