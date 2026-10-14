/**
 * Numbers of decimal digits to round to
 */
const scale = 2;

/**
 * Points for rank 1 (at 100%)
 */
const TOP_SCORE = 350;

/**
 * Points for the LAST level on the list (at 100%), however long the list is
 */
const MIN_SCORE = 27;

/**
 * Curve shape - the only number you need to tune.
 * Smaller = steeper drop at the very top, bigger = flatter / more gradual.
 * 0.1112 is fitted so that on a 100-level list: rank 1 = 350, rank 10 ~ 180, rank 100 = 27.
 */
const SHAPE = 0.111;

/**
 * Exponent, solved automatically so the last level always lands on MIN_SCORE
 */
const RANK_P = Math.log(TOP_SCORE / MIN_SCORE) / Math.log((1 + SHAPE) / SHAPE);

/**
 * Used only if score() is called without the list length
 */
const DEFAULT_TOTAL_LEVELS = 100;

/**
 * Points for a rank on a list of a given length (at 100%).
 * Rank 1 -> TOP_SCORE exactly, last rank -> MIN_SCORE exactly.
 * @param {Number} rank Position on the list (1 = hardest)
 * @param {Number} totalLevels How many levels are on the list
 * @returns {Number}
 */
function rankScore(rank, totalLevels) {
    if (totalLevels <= 1) {
        return TOP_SCORE;
    }
    // 0 at rank 1, 1 at the last rank
    const t = (rank - 1) / (totalLevels - 1);
    return TOP_SCORE * Math.pow(SHAPE / (t + SHAPE), RANK_P);
}

/**
 * Calculate the score awarded when having a certain percentage on a list level
 * @param {Number} rank Position on the list
 * @param {Number} percent Percentage of completion
 * @param {Number} minPercent Minimum percentage required
 * @param {Number} totalLevels Number of levels currently on the list
 * @returns {Number}
 */
export function score(rank, percent, minPercent, totalLevels) {
    // Stopgap: if the caller doesn't pass the list length yet, assume 100
    // levels instead of returning NaN. Pass the real length (list.length)
    // from every place that calls score() so the curve scales properly.
    if (!Number.isFinite(totalLevels)) {
        totalLevels = DEFAULT_TOTAL_LEVELS;
    }

    if (rank > totalLevels) {
        return 0;
    }

    let score = rankScore(rank, totalLevels) *
        ((percent - (minPercent - 1)) / (100 - (minPercent - 1)));

    score = Math.max(0, score);

    if (percent != 100) {
        return round(score - score / 3);
    }

    return Math.max(round(score), 0);
}

export function round(num) {
    if (!('' + num).includes('e')) {
        return +(Math.round(num + 'e+' + scale) + 'e-' + scale);
    } else {
        var arr = ('' + num).split('e');
        var sig = '';
        if (+arr[1] + scale > 0) {
            sig = '+';
        }
        return +(
            Math.round(+arr[0] + 'e' + sig + (+arr[1] + scale)) +
            'e-' +
            scale
        );
    }
}
