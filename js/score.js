/**
 * Numbers of decimal digits to round to
 */
const scale = 3;

/**
 * Top score, awarded at rank 1 (100%)
 */
const TOP_SCORE = 300;

/**
 * Score awarded at the last ranked spot (rank MAX_RANK, 100%)
 */
const MIN_SCORE = 20;

/**
 * Last rank that still earns points
 */
const MAX_RANK = 75;

/**
 * Exponent for the power-law (Zipf-like) rank curve, solved so that
 * TOP_SCORE / MAX_RANK^RANK_EXPONENT == MIN_SCORE
 */
const RANK_EXPONENT = Math.log(TOP_SCORE / MIN_SCORE) / Math.log(MAX_RANK);

/**
 * Calculate the score awarded when having a certain percentage on a list level
 * @param {Number} rank Position on the list
 * @param {Number} percent Percentage of completion
 * @param {Number} minPercent Minimum percentage required
 * @returns {Number}
 */
export function score(rank, percent, minPercent) {
    if (rank > MAX_RANK) {
        return 0;
    }

    // Zipf-like power-law curve: rank 1 -> TOP_SCORE, rank MAX_RANK -> MIN_SCORE
    let rankScore = TOP_SCORE / Math.pow(rank, RANK_EXPONENT);

    let score = rankScore *
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
