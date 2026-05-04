// @ts-check

/**
 * @param {string | null | undefined} str
 * @param {number} n
 * @returns {string | null | undefined}
 */
const truncate = (str, n) => {
  return str && str.length > n ? str.substring(0, n - 1) + '...' : str;
};

export default truncate;
