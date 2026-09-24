/**
 * Numbers of decimal digits to round to
 */
const scale = 3;

/**
 * Last rank that still earns points
 */
const MAX_RANK = 75;

/**
 * Shifted power-law rank curve: score(rank) = A / (rank + C) ^ P
 *
 * This is a "Zipf-Mandelbrot"-style curve: like Zipf's law (1/rank^s) but with
 * a shift constant C that softens the drop-off between the very top ranks.
 *
 * Fitted to three anchor points:
 *   rank 1  -> 300
 *   rank 5  -> 160
 *   rank 75 -> 20
 *
 * If you want different anchors, these three constants need to be re-fit
 * (it's a small nonlinear solve, not a simple formula) - just ask.
 */
const RANK_C = 3.05;
const RANK_P = 0.9146;
const RANK_A = 1078.35;

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

    // Shifted power-law (Zipf-Mandelbrot-like) curve
    let rankScore = RANK_A / Math.pow(rank + RANK_C, RANK_P);

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
